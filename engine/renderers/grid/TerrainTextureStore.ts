/**
 * TerrainTextureStore — 純衍生地形貼圖快取與模式建構器
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 依據 TERRAIN_SKIN.themes 以 Image / createImageBitmap 載入頂面與側面 WebP 貼圖。
 *  - 於 CanvasRenderingContext2D 上建構重複平鋪模式 (createPattern)。
 *  - 載入完成前維持程序化外觀，完成後觸發 revision 遞增，令 TerrainBlockCache 重繪。
 *  - 提供 readyPromise 與 window.__TERRAIN_ASSETS_READY__ 供保真與效能測試等待。
 */

import { TERRAIN_SKIN } from '../../../constants';

export function resolveAssetUrl(relativePath: string): string {
    const base = (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.BASE_URL === 'string')
        ? import.meta.env.BASE_URL
        : './';
    const cleanRel = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return base.endsWith('/') ? `${base}${cleanRel}` : `${base}/${cleanRel}`;
}

export class TerrainTextureStore {
    private topImages: Map<string, HTMLImageElement> = new Map();
    private sideImages: Map<string, HTMLImageElement> = new Map();
    private topPatterns: Map<string, CanvasPattern> = new Map();
    private sidePatterns: Map<string, CanvasPattern> = new Map();
    private warnedAssets: Set<string> = new Set();
    private revision: number = 0;
    private _readyPromise: Promise<void>;

    constructor() {
        this._readyPromise = this.initLoads();
    }

    private initLoads(): Promise<void> {
        if (typeof Image === 'undefined') {
            return Promise.resolve();
        }

        const entries = Object.entries(TERRAIN_SKIN.themes);
        const loadPromises: Promise<void>[] = [];

        for (const [themeKey, paths] of entries) {
            const key = themeKey.toUpperCase();

            // Load top
            const topPromise = new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.topImages.set(key, img);
                    this.revision++;
                    resolve();
                };
                img.onerror = () => {
                    this.warnOnce(`Failed to load top texture for ${key} at ${paths.top}`);
                    resolve();
                };
                img.src = resolveAssetUrl(paths.top);
            });
            loadPromises.push(topPromise);

            // Load side
            const sidePromise = new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.sideImages.set(key, img);
                    this.revision++;
                    resolve();
                };
                img.onerror = () => {
                    this.warnOnce(`Failed to load side texture for ${key} at ${paths.side}`);
                    resolve();
                };
                img.src = resolveAssetUrl(paths.side);
            });
            loadPromises.push(sidePromise);
        }

        return Promise.all(loadPromises).then(() => {
            if (typeof window !== 'undefined') {
                const win = window as unknown as { __TERRAIN_ASSETS_READY__?: boolean };
                win.__TERRAIN_ASSETS_READY__ = true;
            }
        });
    }

    private warnOnce(msg: string): void {
        if (!this.warnedAssets.has(msg)) {
            this.warnedAssets.add(msg);
            console.warn(`[TerrainTextureStore] ${msg}`);
        }
    }

    public get readyPromise(): Promise<void> {
        return this._readyPromise;
    }

    public getRevision(): number {
        return this.revision;
    }

    public isReady(theme: string): boolean {
        const key = theme.toUpperCase();
        return this.topImages.has(key) && this.sideImages.has(key);
    }

    public areAllReady(): boolean {
        const themes = Object.keys(TERRAIN_SKIN.themes);
        return themes.every(t => this.isReady(t));
    }

    public getTopImage(theme: string): HTMLImageElement | null {
        return this.topImages.get(theme.toUpperCase()) ?? null;
    }

    public getSideImage(theme: string): HTMLImageElement | null {
        return this.sideImages.get(theme.toUpperCase()) ?? null;
    }

    public getTopPattern(ctx: CanvasRenderingContext2D, theme: string): CanvasPattern | null {
        const key = theme.toUpperCase();
        const existing = this.topPatterns.get(key);
        if (existing) return existing;

        const img = this.topImages.get(key);
        if (!img) return null;

        const pattern = ctx.createPattern(img, 'repeat');
        if (pattern) {
            this.topPatterns.set(key, pattern);
        }
        return pattern;
    }

    public getSidePattern(ctx: CanvasRenderingContext2D, theme: string): CanvasPattern | null {
        const key = theme.toUpperCase();
        const existing = this.sidePatterns.get(key);
        if (existing) return existing;

        const img = this.sideImages.get(key);
        if (!img) return null;

        const pattern = ctx.createPattern(img, 'repeat');
        if (pattern) {
            this.sidePatterns.set(key, pattern);
        }
        return pattern;
    }

    /** 用於測試或強制重設 */
    public clearPatterns(): void {
        this.topPatterns.clear();
        this.sidePatterns.clear();
    }
}

export const terrainTextureStore = new TerrainTextureStore();
