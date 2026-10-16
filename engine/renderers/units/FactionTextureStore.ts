/**
 * FactionTextureStore — 陣營貼圖槽的載入與查詢
 * -----------------------------------------------------------------------------
 *  - 啟動時讀 public/assets/factions/manifest.json，只載入 manifest 登記的檔案（不會盲目 404）。
 *  - manifest 缺席、檔案載入失敗 → 該槽退回程序化繪製；警告只在非同步載入階段印一次，渲染迴圈零輸出。
 *  - 每完成一批載入 revision++，SpriteManager 依 revision 丟棄舊的棋座／圖示烘焙快取（不增加每幀成本）。
 */

import { Team, Role, BodyTypeId } from '../../../types';
import {
    FactionAssetManifest,
    FactionTextureSlot,
    FACTION_ASSET_ROOT,
    FACTION_MANIFEST_PATH,
    resolveTextureSlot,
} from '../../../data/units/factionSkin';
import { resolveAssetUrl } from './SpriteAtlasStore';

export class FactionTextureStore {
    private manifest: FactionAssetManifest | null = null;
    private readonly images = new Map<string, HTMLImageElement>();
    private readonly warned = new Set<string>();
    private _revision = 0;
    public readonly readyPromise: Promise<void>;

    constructor() {
        this.readyPromise = this.load();
    }

    /** 每次有新貼圖可用就遞增；烘焙快取以此判斷是否失效 */
    public get revision(): number {
        return this._revision;
    }

    /**
     * 查詢某單位某槽位的已載入貼圖；未登記或尚未載入回傳 null（呼叫端改走程序化）。
     */
    public getTexture(team: Team, slot: FactionTextureSlot, role: Role, body: BodyTypeId): CanvasImageSource | null {
        const resolved = resolveTextureSlot(this.manifest, team, slot, role, body);
        if (resolved.kind !== 'asset') return null;
        return this.images.get(resolved.path) ?? null;
    }

    private async load(): Promise<void> {
        if (typeof window === 'undefined' || typeof fetch === 'undefined' || typeof Image === 'undefined') return;
        const url = resolveAssetUrl(FACTION_MANIFEST_PATH);
        try {
            const res = await fetch(url);
            if (!res.ok) {
                this.warnOnce(`faction manifest unavailable at ${url} (status ${res.status}); using procedural pedestals`);
                return;
            }
            this.manifest = (await res.json()) as FactionAssetManifest;
        } catch (err) {
            this.warnOnce(`faction manifest failed to load: ${String(err)}; using procedural pedestals`);
            return;
        }

        const paths = new Set<string>();
        for (const entries of Object.values(this.manifest?.factions ?? {})) {
            for (const file of Object.values(entries ?? {})) {
                if (typeof file === 'string' && file.length > 0) paths.add(file);
            }
        }
        if (paths.size === 0) return;

        await Promise.all(Array.from(paths, (file) => this.loadImage(file)));
        this._revision++;
    }

    private loadImage(file: string): Promise<void> {
        // manifest 的檔名相對於 FACTION_ASSET_ROOT；resolveTextureSlot 回傳的 path 也同樣前綴
        const relPath = `${FACTION_ASSET_ROOT}${file}`;
        const url = resolveAssetUrl(relPath);
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.images.set(relPath, img);
                resolve();
            };
            img.onerror = () => {
                this.warnOnce(`faction texture failed to load: ${url}; slot falls back to procedural`);
                resolve();
            };
            img.src = url;
        });
    }

    private warnOnce(msg: string): void {
        if (this.warned.has(msg)) return;
        this.warned.add(msg);
        console.warn(`[FactionTextureStore] ${msg}`);
    }
}

export const factionTextureStore = new FactionTextureStore();
