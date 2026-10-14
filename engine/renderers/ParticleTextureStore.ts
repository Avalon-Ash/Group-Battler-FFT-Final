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

/**
 * 將目標尺寸對齊至 VFX_SPRITES.tintSizes 中第一個 >= targetSize 的分級（最大 256）
 */
export function quantizeTintSize(
    targetSize: number,
    steps: readonly number[] = VFX_SPRITES.tintSizes
): number {
    for (let i = 0; i < steps.length; i++) {
        if (steps[i] >= targetSize) {
            return steps[i];
        }
    }
    return steps[steps.length - 1] ?? 256;
}

/**
 * 將色彩字串量化至每通道 colorQuantBits 位元，消滅連續色彩插值導致的快取 key 無上限膨脹
 */
export function quantizeTintColor(
    color: string,
    bits: number = VFX_SPRITES.colorQuantBits
): string {
    const trimmed = color.trim().toLowerCase();
    const shift = Math.max(0, 8 - bits);
    const step = 1 << shift;

    const qByte = (val: number): string => {
        const clamped = Math.max(0, Math.min(255, Math.round(val)));
        const quantized = Math.min(255, Math.round(clamped / step) * step);
        return quantized.toString(16).padStart(2, '0');
    };

    // #rrggbb
    if (/^#[0-9a-f]{6}$/.test(trimmed)) {
        const r = parseInt(trimmed.slice(1, 3), 16);
        const g = parseInt(trimmed.slice(3, 5), 16);
        const b = parseInt(trimmed.slice(5, 7), 16);
        return `#${qByte(r)}${qByte(g)}${qByte(b)}`;
    }
    // #rgb
    if (/^#[0-9a-f]{3}$/.test(trimmed)) {
        const r = parseInt(trimmed[1] + trimmed[1], 16);
        const g = parseInt(trimmed[2] + trimmed[2], 16);
        const b = parseInt(trimmed[3] + trimmed[3], 16);
        return `#${qByte(r)}${qByte(g)}${qByte(b)}`;
    }
    // rgb(...) or rgba(...)
    const rgbMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (rgbMatch) {
        const r = parseFloat(rgbMatch[1]);
        const g = parseFloat(rgbMatch[2]);
        const b = parseFloat(rgbMatch[3]);
        return `#${qByte(r)}${qByte(g)}${qByte(b)}`;
    }
    return trimmed;
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

    public getTintCacheSize(): number {
        return this.tintedCache.size;
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
     * 尺寸對齊至 VFX_SPRITES.tintSizes，色彩量化至 VFX_SPRITES.colorQuantBits，容量上限 VFX_SPRITES.maxTintCache。
     */
    public getTintedTexture(key: string, color: string, targetSize: number): HTMLCanvasElement | null {
        const baseImg = this.baseImages.get(key);
        if (!baseImg) return null;

        const quantizedSize = quantizeTintSize(targetSize);
        const quantizedColor = quantizeTintColor(color);
        const cacheKey = `${key}_${quantizedColor}_${quantizedSize}`;

        const cached = this.tintedCache.get(cacheKey);
        if (cached) return cached;

        if (typeof document === 'undefined') return null;

        const canvas = document.createElement('canvas');
        canvas.width = quantizedSize;
        canvas.height = quantizedSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 1. 繪製原始灰階/白色粒子
        ctx.drawImage(baseImg, 0, 0, quantizedSize, quantizedSize);

        // 2. source-in 著色遮罩（僅保留粒子不透明度並填滿量化後目標色彩）
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = quantizedColor;
        ctx.fillRect(0, 0, quantizedSize, quantizedSize);

        if (this.tintedCache.size >= VFX_SPRITES.maxTintCache) {
            const oldestKey = this.tintedCache.keys().next().value;
            if (oldestKey !== undefined) {
                this.tintedCache.delete(oldestKey);
            }
        }
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
