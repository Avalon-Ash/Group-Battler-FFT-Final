/**
 * UnitGradientCache — 單位座標漸層快取（效能五）
 * -----------------------------------------------------------------------------
 * Canvas 的漸層座標是在「fill／stroke 當下」的 CTM 中解讀的。
 * 因此每種色彩只建立一次單位漸層（例如 (0,0)→(1,0)），繪製時再以
 * translate／rotate／scale 把單位區間對映到實際端點，像素結果與每幀
 * createLinearGradient／createRadialGradient 相同，但不再每幀配置 CanvasGradient。
 *
 * 每個使用點各自持有一個實例，以色彩字串為鍵（不需每幀組合鍵字串）。
 * 純衍生資源：不持遊戲狀態、容量上限保護。
 */

import { RENDER_HOTSPOT_CACHE } from '../../constants';

export type UnitGradientBuilder = (ctx: CanvasRenderingContext2D, color: string) => CanvasGradient;

export function createUnitGradientCache(build: UnitGradientBuilder) {
    const cache = new Map<string, CanvasGradient>();

    return {
        get(ctx: CanvasRenderingContext2D, color: string): CanvasGradient {
            const existing = cache.get(color);
            if (existing) return existing;
            if (cache.size >= RENDER_HOTSPOT_CACHE.MAX_UNIT_GRADIENTS) {
                const firstKey = cache.keys().next().value;
                if (firstKey !== undefined) cache.delete(firstKey);
            }
            const grad = build(ctx, color);
            cache.set(color, grad);
            return grad;
        },
        clear(): void {
            cache.clear();
        },
        size(): number {
            return cache.size;
        },
    };
}
