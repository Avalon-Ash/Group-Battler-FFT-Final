/**
 * ParticleTextureStore — 純衍生特效粒子貼圖快取與預烘焙著色器
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 依據 VFX_SPRITES.textures 載入 Kenney CC0 灰階粒子貼圖 (light, spark, smoke, magic, star)。
 *  - 以色彩鍵預烘焙著色版本 (source-in 填色一次)，後續直接 blit 提升繪製效率。
 *  - 提供 readyPromise 與 window.__VFX_ASSETS_READY__ 供保真與測試環境等待。
 *  - 載入未就緒或失敗時平滑退回程序化外觀，不噴例外、不干擾主邏輯。
 */

import { VFX_SPRITES } from '../../constants';

export function resolveAssetUrl(relativePath: string): string {
    const base = (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.BASE_URL === 'string')
        ? import.meta.env.BASE_URL
        : './';
    const cleanRel = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return base.endsWith('/') ? `${base}${cleanRel}` : `${base}/${cleanRel}`;
}

export class ParticleTextureStore {
    private baseImages: Map<string, HTMLImageElement> = new Map();
    private tintedCache: Map<string, HTMLCanvasElement> = new Map();
    private warnedAssets: Set<string> = new Set();
    private _readyPromise: Promise<void>;

    constructor() {
        this._readyPromise = this.initLoads();
    }

    public get readyPromise(): Promise<void> {
        return this._readyPromise;
    }

    public isReady(key: string): boolean {
        return this.baseImages.has(key);
    }

    private initLoads(): Promise<void> {
        if (typeof Image === 'undefined') {
            return Promise.resolve();
        }

        const entries = Object.entries(VFX_SPRITES.textures);
        const loadPromises: Promise<void>[] = [];

        for (const [name, path] of entries) {
            const p = new Promise<void>((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    this.baseImages.set(name, img);
                    resolve();
                };
                img.onerror = () => {
                    if (!this.warnedAssets.has(path)) {
                        console.warn(`[ParticleTextureStore] 無法載入粒子貼圖: ${path}`);
                        this.warnedAssets.add(path);
                    }
                    resolve();
                };
                img.src = resolveAssetUrl(path);
            });
            loadPromises.push(p);
        }

        return Promise.all(loadPromises).then(() => {
            if (typeof window !== 'undefined') {
                (window as unknown as { __VFX_ASSETS_READY__?: boolean }).__VFX_ASSETS_READY__ = true;
            }
        });
    }

    /**
     * 取得預烘焙著色粒子貼圖（source-in 填色）。
     * 若底圖未就緒則回傳 null 由呼叫端退回程序化繪製。
     */
    public getTintedTexture(key: string, color: string, targetSize: number): HTMLCanvasElement | null {
        const baseImg = this.baseImages.get(key);
        if (!baseImg) return null;

        const roundedSize = Math.max(8, Math.min(256, Math.round(targetSize)));
        const cacheKey = `${key}_${color}_${roundedSize}`;

        const cached = this.tintedCache.get(cacheKey);
        if (cached) return cached;

        if (typeof document === 'undefined') return null;

        const canvas = document.createElement('canvas');
        canvas.width = roundedSize;
        canvas.height = roundedSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 1. 繪製原始灰階/白色粒子
        ctx.drawImage(baseImg, 0, 0, roundedSize, roundedSize);

        // 2. source-in 著色遮罩（僅保留粒子不透明度並填滿目標色彩）
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, roundedSize, roundedSize);

        this.tintedCache.set(cacheKey, canvas);
        return canvas;
    }

    /**
     * 清理著色快取（供測試或記憶體回收使用）
     */
    public reset(): void {
        this.tintedCache.clear();
        this.baseImages.clear();
        this.warnedAssets.clear();
        this._readyPromise = this.initLoads();
    }
}

export const particleTextureStore = new ParticleTextureStore();
