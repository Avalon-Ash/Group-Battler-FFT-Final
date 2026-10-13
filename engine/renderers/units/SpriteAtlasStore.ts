/**
 * SpriteAtlasStore — 2.5D 單位預渲染精靈圖集快取與 Mip / 剪影預烘焙器
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 載入 public/assets/units/manifest.json 與各單位圖集。
 *  - 懶載入（依 manifestKey）與閒置預取。
 *  - 預烘焙「受擊白閃」剪影版本（source-in 填白，執行期零消耗直接 blit）。
 *  - 預烘焙縮小層級 Mip（1.0, 0.5, 0.25），依實際螢幕縮放選取最合適層級，消滅閃爍與鋸齒。
 *  - 純衍生資源快取，不含遊戲狀態；提供 readyPromise 與 window.__ASSETS_READY__。
 */

import { UNIT_SPRITE } from '../../../constants';

export interface UnitFrameDef {
    x: number;
    y: number;
    w: number;
    h: number;
    ox: number;
    oy: number;
}

export interface UnitAnimDef {
    fps: number;
    loop: boolean;
    frames: Record<string, UnitFrameDef[]>;
}

export interface UnitAtlasDef {
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
    units: Record<string, UnitAtlasDef>;
}

export interface BakedAtlasEntry {
    normalMips: Map<number, CanvasImageSource>;
    silhouetteMips: Map<number, CanvasImageSource>;
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
                return null;
            }
            const data = (await res.json()) as UnitManifest;
            this.manifest = data;
            this.revision++;

            // 預載場上最常用的 10 個核心單位圖集
            this.preloadCoreUnits();
            return data;
        } catch (err) {
            this.warnOnce(`Error loading sprite manifest: ${String(err)}`);
            return null;
        }
    }

    /**
     * 閒置時或背景預載所有現有單位圖集
     */
    private async preloadCoreUnits(): Promise<void> {
        if (!this.manifest) return;
        const keys = Object.keys(this.manifest.units);
        await Promise.all(keys.map(k => this.loadAtlas(k)));
        this.markReady();
    }

    private markReady(): void {
        if (typeof window !== 'undefined') {
            const win = window as unknown as { __UNIT_ASSETS_READY__?: boolean; __ASSETS_READY__?: boolean };
            win.__UNIT_ASSETS_READY__ = true;
            win.__ASSETS_READY__ = true;
        }
    }

    /**
     * 載入指定 key 之單位圖集（包含白閃剪影與 Mip 預烘焙）
     */
    public async loadAtlas(manifestKey: string): Promise<void> {
        if (this.atlases.has(manifestKey)) return;
        const existing = this.loadingPromises.get(manifestKey);
        if (existing) return existing;

        const promise = (async () => {
            if (!this.manifest) {
                await this.manifestPromise;
            }
            if (!this.manifest || !this.manifest.units[manifestKey]) {
                return;
            }

            const unitDef = this.manifest.units[manifestKey];
            const imgPath = resolveAssetUrl(`assets/units/${unitDef.file}`);

            if (typeof Image === 'undefined' || typeof document === 'undefined') {
                return;
            }

            const img = await new Promise<HTMLImageElement | null>((resolve) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => {
                    this.warnOnce(`Failed to load unit atlas image at ${imgPath}`);
                    resolve(null);
                };
                image.src = imgPath;
            });

            if (!img) return;

            const baked = this.bakeAtlas(img);
            this.atlases.set(manifestKey, baked);
            this.revision++;
        })();

        this.loadingPromises.set(manifestKey, promise);
        return promise;
    }

    /**
     * 預烘焙單張圖集的白閃剪影與所有 Mip 層級
     */
    private bakeAtlas(img: HTMLImageElement): BakedAtlasEntry {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        const normalMips = new Map<number, CanvasImageSource>();
        const silhouetteMips = new Map<number, CanvasImageSource>();

        // 1.0 原寸
        normalMips.set(1.0, img);

        // 1.0 白閃剪影（source-in 填白）
        const silCanvas = document.createElement('canvas');
        silCanvas.width = w;
        silCanvas.height = h;
        const silCtx = silCanvas.getContext('2d');
        if (silCtx) {
            silCtx.drawImage(img, 0, 0);
            silCtx.globalCompositeOperation = 'source-in';
            silCtx.fillStyle = '#ffffff';
            silCtx.fillRect(0, 0, w, h);
        }
        silhouetteMips.set(1.0, silCanvas);

        // 預烘焙縮小 Mip 層級 (0.5, 0.25)
        for (const level of UNIT_SPRITE.mipLevels) {
            if (level >= 1.0) continue;

            const mw = Math.max(1, Math.round(w * level));
            const mh = Math.max(1, Math.round(h * level));

            // 普通色彩 Mip
            const normCanvas = document.createElement('canvas');
            normCanvas.width = mw;
            normCanvas.height = mh;
            const normCtx = normCanvas.getContext('2d');
            if (normCtx) {
                normCtx.imageSmoothingEnabled = true;
                normCtx.imageSmoothingQuality = 'high';
                normCtx.drawImage(img, 0, 0, mw, mh);
            }
            normalMips.set(level, normCanvas);

            // 白閃剪影 Mip
            const silMipCanvas = document.createElement('canvas');
            silMipCanvas.width = mw;
            silMipCanvas.height = mh;
            const silMipCtx = silMipCanvas.getContext('2d');
            if (silMipCtx) {
                silMipCtx.imageSmoothingEnabled = true;
                silMipCtx.imageSmoothingQuality = 'high';
                silMipCtx.drawImage(silCanvas, 0, 0, mw, mh);
            }
            silhouetteMips.set(level, silMipCanvas);
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
        return Promise.all([this.manifestPromise, ...this.loadingPromises.values()]).then(() => undefined);
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

    public getAtlas(manifestKey: string, mipScale: number = 1.0): CanvasImageSource | null {
        const entry = this.atlases.get(manifestKey);
        if (!entry) return null;
        return entry.normalMips.get(mipScale) ?? entry.normalMips.get(1.0) ?? null;
    }

    public getSilhouette(manifestKey: string, mipScale: number = 1.0): CanvasImageSource | null {
        const entry = this.atlases.get(manifestKey);
        if (!entry) return null;
        return entry.silhouetteMips.get(mipScale) ?? entry.silhouetteMips.get(1.0) ?? null;
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
