/**
 * SpriteAtlasStore — 2.5D 單位預渲染精靈圖集快取與 Mip / 剪影預烘焙器
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 載入 public/assets/units/manifest.json 與各單位圖集。
 *  - 依目前陣容載入，最多兩張同時解碼；換隊釋放不用的圖集。
 *  - 預烘焙「受擊白閃」剪影版本（source-in 填白，執行期零消耗直接 blit）。
 *  - 預烘焙 UNIT_SPRITE.mipLevels 列出的縮小層級（目前只有 0.5：選層級的縮放 screenScale 約 0.37，
 *    從來選不到 1.0 與 0.25），原圖與全尺寸暫存畫布烘完即釋放。
 *  - 純衍生資源快取，不含遊戲狀態；提供 readyPromise 與 window.__UNIT_ASSETS_READY__。
 */

import { UNIT_SPRITE } from '../../../constants';
import type { Team, Role, BodyTypeId } from '../../../types';
import { lookupSpriteAppearance } from '../../../data/units/appearance/sprite';
import { resolveBodyType } from '../../../data/units/appearance/bodyTypes';
import { getFactionSkinByAtlasKey } from '../../../data/units/factionSkin';

export interface UnitFrameDef {
    x: number;
    y: number;
    w: number;
    h: number;
    ox: number;
    oy: number;
}

interface UnitAnimDef {
    fps: number;
    loop: boolean;
    frames: Record<string, UnitFrameDef[]>;
}

interface UnitAtlasDef {
    file: string;
    atlas: { w: number; h: number };
    idleHeightPx: number;
    anims: Record<string, UnitAnimDef>;
}

export interface UnitManifest {
    version: number;
    cellPx: number;
    anchor: { x: number; y: number };
    pxPerWorldUnit: number;
    elevationDeg: number;
    directions: string[];
    referenceHeightPx: number;
    /** Delivery pixel scale; frame rectangles remain in full logical coordinates. */
    atlasScale?: number;
    units: Record<string, UnitAtlasDef>;
}

interface BakedAtlasEntry {
    normalMips: Map<number, HTMLCanvasElement>;
    silhouetteMips: Map<number, HTMLCanvasElement>;
}

/**
 * resolveAssetUrl — 依據 Vite BASE_URL 解析相對資產路徑
 */
export function resolveAssetUrl(relativePath: string): string {
    const base = (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.BASE_URL === 'string')
        ? import.meta.env.BASE_URL
        : './';
    const cleanRel = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return base.endsWith('/') ? `${base}${cleanRel}` : `${base}/${cleanRel}`;
}

/**
 * selectMipLevel — 純函式：依目標縮放比例選取最接近且不小於需求之 Mip 層級
 * @param desiredScale 實際在畫面上之整體縮放（例如 camera.zoom * spriteScale）
 * @param mipLevels 可用層級清單（預設 [1.0, 0.5, 0.25]）
 */
export function selectMipLevel(
    desiredScale: number,
    mipLevels: readonly number[] = UNIT_SPRITE.mipLevels
): number {
    if (!mipLevels || mipLevels.length === 0) return 1.0;
    // 降序排列
    const sorted = [...mipLevels].sort((a, b) => b - a);
    let best = sorted[0];
    for (const level of sorted) {
        if (level >= desiredScale) {
            best = level;
        } else {
            break;
        }
    }
    return best;
}

export class SpriteAtlasStore {
    private manifest: UnitManifest | null = null;
    private atlases: Map<string, BakedAtlasEntry> = new Map();
    private loadingPromises: Map<string, Promise<void>> = new Map();
    private manifestPromise: Promise<UnitManifest | null>;
    private warnedAssets: Set<string> = new Set();
    private revision: number = 0;
    private wantedKeys = new Set<string>();
    private nextKeys = new Set<string>();
    private rosterKnown = false;
    private failedKeys = new Set<string>();
    private activeLoads = 0;
    private queue: { key: string; finish: () => void }[] = [];
    private releaseListeners = new Set<(key: string) => void>();

    constructor() {
        this.manifestPromise = this.loadManifest();
    }

    /**
     * 載入 manifest.json
     */
    private async loadManifest(): Promise<UnitManifest | null> {
        if (typeof window === 'undefined' || typeof fetch === 'undefined') {
            return null;
        }
        try {
            const url = resolveAssetUrl(UNIT_SPRITE.manifestPath);
            const res = await fetch(url);
            if (!res.ok) {
                this.warnOnce(`Failed to fetch sprite manifest from ${url} (status: ${res.status})`);
                this.markReady();
                return null;
            }
            const data = (await res.json()) as UnitManifest;
            this.manifest = data;
            this.revision++;

            this.markReady();
            return data;
        } catch (err) {
            this.warnOnce(`Error loading sprite manifest: ${String(err)}`);
            this.markReady();
            return null;
        }
    }

    /** Keep only the current roster's derived resources; never mutate agents. */
    public syncRoster(agents: readonly { team: Team; role: Role; bodyType?: BodyTypeId }[]): void {
        this.nextKeys.clear();
        for (const agent of agents) {
            const appearance = lookupSpriteAppearance(agent.team, agent.role, resolveBodyType(agent));
            if (appearance) this.nextKeys.add(appearance.manifestKey);
        }
        this.rosterKnown = true;
        for (const key of this.wantedKeys) {
            if (!this.nextKeys.has(key)) {
                this.failedKeys.delete(key);
                this.releaseAtlas(key);
            }
        }
        const previous = this.wantedKeys;
        this.wantedKeys = this.nextKeys;
        this.nextKeys = previous;
        for (const key of this.wantedKeys) {
            if (!this.atlases.has(key) && !this.loadingPromises.has(key) && !this.failedKeys.has(key)) void this.loadAtlas(key);
        }
        this.markReady();
    }

    public onRelease(listener: (key: string) => void): () => void {
        this.releaseListeners.add(listener);
        return () => { this.releaseListeners.delete(listener); };
    }

    private releaseAtlas(key: string): void {
        const entry = this.atlases.get(key);
        if (!entry) return;
        for (const levels of [entry.normalMips, entry.silhouetteMips]) {
            for (const canvas of levels.values()) canvas.width = canvas.height = 0;
            levels.clear();
        }
        this.atlases.delete(key);
        for (const listener of this.releaseListeners) listener(key);
        this.revision++;
    }

    private markReady(): void {
        if (typeof window !== 'undefined') {
            const win = window as unknown as { __UNIT_ASSETS_READY__?: boolean };
            let ready = !!this.manifest && this.rosterKnown;
            for (const key of this.wantedKeys) if (!this.atlases.has(key)) { ready = false; break; }
            win.__UNIT_ASSETS_READY__ = ready;
        }
    }

    public loadAtlas(manifestKey: string): Promise<void> {
        if (this.atlases.has(manifestKey) || this.failedKeys.has(manifestKey)) return Promise.resolve();
        const existing = this.loadingPromises.get(manifestKey);
        if (existing) return existing;
        if (typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve();
        let finish!: () => void;
        const promise = new Promise<void>(resolve => { finish = resolve; });
        this.loadingPromises.set(manifestKey, promise);
        this.queue.push({ key: manifestKey, finish });
        void this.manifestPromise.then(() => this.pumpQueue());
        return promise;
    }

    private pumpQueue(): void {
        while (this.activeLoads < UNIT_SPRITE.maxConcurrentLoads && this.queue.length) {
            const job = this.queue.shift()!;
            if (!this.manifest?.units[job.key] || (this.rosterKnown && !this.wantedKeys.has(job.key))) {
                if (this.wantedKeys.has(job.key)) this.failedKeys.add(job.key);
                this.loadingPromises.delete(job.key);
                job.finish();
                continue;
            }
            this.activeLoads++;
            void this.decodeAtlas(job.key).catch(error => {
                if (!this.rosterKnown || this.wantedKeys.has(job.key)) this.failedKeys.add(job.key);
                this.warnOnce(`Error loading ${job.key}: ${String(error)}`);
            }).finally(() => {
                this.activeLoads--;
                this.loadingPromises.delete(job.key);
                job.finish();
                this.markReady();
                this.pumpQueue();
            });
        }
    }

    private async decodeAtlas(key: string): Promise<void> {
        const unit = this.manifest!.units[key];
        const imgPath = resolveAssetUrl(`assets/units/${unit.file}`);
        const img = await new Promise<HTMLImageElement | null>(resolve => {
            const image = new Image();
            image.onload = () => { image.onload = image.onerror = null; resolve(image); };
            image.onerror = () => { image.onload = image.onerror = null; resolve(null); };
            image.src = imgPath;
        });
        // A roster may change while decoding. Do not bake or retain obsolete assets.
        if (this.rosterKnown && !this.wantedKeys.has(key)) return;
        if (!img) {
            this.failedKeys.add(key);
            this.warnOnce(`Failed to load unit atlas image at ${imgPath}`);
            return;
        }
        this.atlases.set(key, this.bakeAtlas(img, getFactionSkinByAtlasKey(key)?.sprite.tint ?? null));
        this.revision++;
    }

    /**
     * 預烘焙單張圖集：只留 UNIT_SPRITE.mipLevels 列出的層級（彩色＋白閃剪影）。
     * 原圖與染色用的全尺寸暫存畫布烘完即釋放，不留在記憶體（2026-10-26：全尺寸從未被畫到螢幕上，
     * 10 張圖集的全尺寸副本與原圖佔約 240 MB，iPhone 長跑因此被系統回收分頁）。
     */
    private bakeAtlas(sourceImg: HTMLImageElement, tint: { color: string; strength: number } | null): BakedAtlasEntry {
        const w = sourceImg.naturalWidth || sourceImg.width;
        const h = sourceImg.naturalHeight || sourceImg.height;

        const normalMips = new Map<number, HTMLCanvasElement>();
        const silhouetteMips = new Map<number, HTMLCanvasElement>();

        // 陣營皮膚染色槽（FACTION_SKINS.sprite.tint）：烘焙期一次性疊色，執行期零成本
        let src: HTMLImageElement | HTMLCanvasElement = sourceImg;
        let tinted: HTMLCanvasElement | null = null;
        if (tint && tint.strength > 0) {
            tinted = document.createElement('canvas');
            tinted.width = w;
            tinted.height = h;
            const tctx = tinted.getContext('2d');
            if (tctx) {
                tctx.drawImage(sourceImg, 0, 0);
                tctx.globalCompositeOperation = 'source-atop';
                tctx.globalAlpha = tint.strength;
                tctx.fillStyle = tint.color;
                tctx.fillRect(0, 0, w, h);
                src = tinted;
            }
        }

        for (const level of UNIT_SPRITE.mipLevels) {
            const mw = Math.max(1, Math.round(w * level / (this.manifest?.atlasScale ?? 1)));
            const mh = Math.max(1, Math.round(h * level / (this.manifest?.atlasScale ?? 1)));

            // 彩色層級
            const normCanvas = document.createElement('canvas');
            normCanvas.width = mw;
            normCanvas.height = mh;
            const normCtx = normCanvas.getContext('2d');
            if (normCtx) {
                normCtx.imageSmoothingEnabled = true;
                normCtx.imageSmoothingQuality = 'high';
                if (level === (this.manifest?.atlasScale ?? 1)) normCtx.drawImage(src, 0, 0);
                else normCtx.drawImage(src, 0, 0, mw, mh);
            }
            normalMips.set(level, normCanvas);

            // 白閃剪影：同層級的彩色圖直接 source-in 填白（不另建全尺寸剪影）
            const silCanvas = document.createElement('canvas');
            silCanvas.width = mw;
            silCanvas.height = mh;
            const silCtx = silCanvas.getContext('2d');
            if (silCtx) {
                silCtx.drawImage(normCanvas, 0, 0);
                silCtx.globalCompositeOperation = 'source-in';
                silCtx.fillStyle = '#ffffff';
                silCtx.fillRect(0, 0, mw, mh);
            }
            silhouetteMips.set(level, silCanvas);
        }

        // 寬高設 0 立刻還回點陣記憶體；原圖由呼叫端丟掉參照後回收
        if (tinted) {
            tinted.width = 0;
            tinted.height = 0;
        }
        return { normalMips, silhouetteMips };
    }

    private warnOnce(msg: string): void {
        if (!this.warnedAssets.has(msg)) {
            this.warnedAssets.add(msg);
            console.warn(`[SpriteAtlasStore] ${msg}`);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 公開查詢 API
    // ─────────────────────────────────────────────────────────────

    public get readyPromise(): Promise<void> {
        return this.manifestPromise.then(() => Promise.all(this.loadingPromises.values())).then(() => undefined);
    }

    public isReady(manifestKey?: string): boolean {
        if (!this.manifest) return false;
        if (manifestKey) {
            return this.atlases.has(manifestKey);
        }
        return true;
    }

    public getRevision(): number {
        return this.revision;
    }

    public getManifest(): UnitManifest | null {
        return this.manifest;
    }

    public getUnitDef(manifestKey: string): UnitAtlasDef | null {
        return this.manifest?.units[manifestKey] ?? null;
    }

    public getAtlas(manifestKey: string, mipScale: number = UNIT_SPRITE.mipLevels[0]): CanvasImageSource | null {
        const entry = this.atlases.get(manifestKey);
        if (!entry) return null;
        return entry.normalMips.get(mipScale) ?? entry.normalMips.get(UNIT_SPRITE.mipLevels[0]) ?? null;
    }

    public getSilhouette(manifestKey: string, mipScale: number = UNIT_SPRITE.mipLevels[0]): CanvasImageSource | null {
        const entry = this.atlases.get(manifestKey);
        if (!entry) return null;
        return entry.silhouetteMips.get(mipScale) ?? entry.silhouetteMips.get(UNIT_SPRITE.mipLevels[0]) ?? null;
    }

    public getFrame(
        manifestKey: string,
        animName: string,
        direction: string,
        frameIndex: number
    ): UnitFrameDef | null {
        const unit = this.getUnitDef(manifestKey);
        if (!unit) return null;
        const anim = unit.anims[animName];
        if (!anim) return null;
        const dirFrames = anim.frames[direction];
        if (!dirFrames || dirFrames.length === 0) return null;
        const idx = Math.max(0, Math.min(frameIndex, dirFrames.length - 1));
        return dirFrames[idx] ?? null;
    }

    /**
     * 測試輔助：手動設定 Manifest 與烘焙 Entry（供無網環境單元測試使用）
     */
    public setManifestForTesting(manifest: UnitManifest): void {
        this.manifest = manifest;
        this.revision++;
    }
}

export const spriteAtlasStore = new SpriteAtlasStore();
