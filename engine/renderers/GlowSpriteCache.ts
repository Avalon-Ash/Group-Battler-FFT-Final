/**
 * GlowSpriteCache — 純衍生光暈 Sprite 預烘焙快取
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 依照 RENDER_GLOW 量化參數預先烘焙純色形狀 + shadowBlur。
 *  - 執行期以 drawImage 取代即時 shadowBlur，完全消除軟體光柵羽化耗時。
 *  - 純衍生資源快取（不持遊戲狀態、容量上限保護、可注入 createSurface 供測試）。
 */

import { RENDER_GLOW } from '../../constants';
import { createCanvas } from '../graphics/CanvasUtils';

export type GlowShapeKind = 'disc' | 'ring' | 'rect';

export interface GlowSpriteEntry {
    canvas: HTMLCanvasElement;
    anchorX: number;
    anchorY: number;
    width: number;
    height: number;
}

export interface GlowOptions {
    width?: number;
    height?: number;
    lineWidth?: number;
    rx?: number;
}

export type SurfaceFactory = (width: number, height: number) => { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

export function quantizeGlowRadius(r: number, steps: readonly number[] = RENDER_GLOW.RADIUS_STEPS): number {
    for (let i = 0; i < steps.length; i++) {
        if (steps[i] >= r - 1e-4) return steps[i];
    }
    return steps[steps.length - 1];
}

export function quantizeGlowBlur(b: number, steps: readonly number[] = RENDER_GLOW.BLUR_STEPS): number {
    for (let i = 0; i < steps.length; i++) {
        if (steps[i] >= b - 1e-4) return steps[i];
    }
    return steps[steps.length - 1];
}

export function quantizeGlowRectWidth(w: number, steps: readonly number[] = RENDER_GLOW.RECT_WIDTH_STEPS): number {
    for (let i = 0; i < steps.length; i++) {
        if (steps[i] >= w - 1e-4) return steps[i];
    }
    return steps[steps.length - 1];
}

export function quantizeGlowRectHeight(h: number, steps: readonly number[] = RENDER_GLOW.RECT_HEIGHT_STEPS): number {
    for (let i = 0; i < steps.length; i++) {
        if (steps[i] >= h - 1e-4) return steps[i];
    }
    return steps[steps.length - 1];
}

export function createGlowSpriteStore(createSurface: SurfaceFactory = createCanvas) {
    const cache = new Map<string, GlowSpriteEntry>();
    let hits = 0;
    let misses = 0;

    function buildKey(kind: GlowShapeKind, colorKey: string, r: number, b: number, opts?: GlowOptions): string {
        const w = opts?.width ?? 0;
        const h = opts?.height ?? 0;
        const lw = opts?.lineWidth ?? 0;
        const rx = opts?.rx ?? 0;
        return `${kind}:${colorKey}:${r}:${b}:${w}:${h}:${lw}:${rx}`;
    }

    function getGlowSprite(
        kind: GlowShapeKind,
        colorKey: string,
        radius: number,
        blur: number,
        opts?: GlowOptions
    ): GlowSpriteEntry {
        const qRadius = quantizeGlowRadius(radius);
        const qBlur = quantizeGlowBlur(blur);
        const qW = opts?.width !== undefined ? quantizeGlowRectWidth(opts.width) : 0;
        const qH = opts?.height !== undefined ? quantizeGlowRectHeight(opts.height) : 0;
        const qOpts: GlowOptions = {
            width: qW,
            height: qH,
            lineWidth: opts?.lineWidth,
            rx: opts?.rx,
        };

        const key = buildKey(kind, colorKey, qRadius, qBlur, qOpts);
        const existing = cache.get(key);
        if (existing) {
            hits++;
            return existing;
        }

        misses++;

        // 容量上限保護：超過上限時清除最舊 entry
        if (cache.size >= RENDER_GLOW.MAX_GLOW_SPRITES) {
            const firstKey = cache.keys().next().value;
            if (firstKey !== undefined) {
                cache.delete(firstKey);
            }
        }

        const padding = Math.max(4, Math.ceil(qBlur * 2));
        let entry: GlowSpriteEntry;

        if (kind === 'disc') {
            const totalSize = Math.ceil((qRadius + padding) * 2);
            const { canvas, ctx } = createSurface(totalSize, totalSize);
            const center = padding + qRadius;

            ctx.shadowColor = colorKey;
            ctx.shadowBlur = qBlur;
            ctx.fillStyle = colorKey;
            ctx.beginPath();
            ctx.arc(center, center, qRadius, 0, Math.PI * 2);
            ctx.fill();

            entry = {
                canvas,
                anchorX: center,
                anchorY: center,
                width: totalSize,
                height: totalSize,
            };
        } else if (kind === 'ring') {
            const totalSize = Math.ceil((qRadius + padding) * 2);
            const { canvas, ctx } = createSurface(totalSize, totalSize);
            const center = padding + qRadius;

            ctx.shadowColor = colorKey;
            ctx.shadowBlur = qBlur;
            ctx.strokeStyle = colorKey;
            ctx.lineWidth = qOpts.lineWidth ?? 2;
            ctx.beginPath();
            ctx.arc(center, center, qRadius, 0, Math.PI * 2);
            ctx.stroke();

            entry = {
                canvas,
                anchorX: center,
                anchorY: center,
                width: totalSize,
                height: totalSize,
            };
        } else {
            // 'rect'
            const w = qW > 0 ? qW : qRadius * 2;
            const h = qH > 0 ? qH : qRadius;
            const totalW = Math.ceil(w + padding * 2);
            const totalH = Math.ceil(h + padding * 2);
            const rx = qOpts.rx ?? 2;
            const { canvas, ctx } = createSurface(totalW, totalH);

            ctx.shadowColor = colorKey;
            ctx.shadowBlur = qBlur;
            ctx.fillStyle = colorKey;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(padding, padding, w, h, rx);
            } else {
                ctx.rect(padding, padding, w, h);
            }
            ctx.fill();

            entry = {
                canvas,
                anchorX: padding,
                anchorY: padding,
                width: totalW,
                height: totalH,
            };
        }

        cache.set(key, entry);
        return entry;
    }

    function clear(): void {
        cache.clear();
        hits = 0;
        misses = 0;
    }

    function getStats(): { size: number; hits: number; misses: number } {
        return { size: cache.size, hits, misses };
    }

    return {
        getGlowSprite,
        clear,
        getStats,
    };
}

export const GlowSpriteCache = createGlowSpriteStore();

export function drawGlowSprite(
    ctx: CanvasRenderingContext2D,
    entry: GlowSpriteEntry,
    x: number,
    y: number,
    alpha: number = 1.0
): void {
    if (alpha <= 0) return;
    const prevAlpha = ctx.globalAlpha;
    if (alpha < 1.0) {
        ctx.globalAlpha = prevAlpha * alpha;
    }
    ctx.drawImage(entry.canvas, Math.round(x - entry.anchorX), Math.round(y - entry.anchorY));
    if (alpha < 1.0) {
        ctx.globalAlpha = prevAlpha;
    }
}
