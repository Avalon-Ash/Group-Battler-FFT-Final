/**
 * GlowTextCache — 預烘焙光暈文字／光暈矩形（效能五）
 * -----------------------------------------------------------------------------
 * 取代 TextPainter 詠唱條每幀的 shadowBlur：以 (文字, 字型, 色彩, 模糊, 量化縮放)
 * 為鍵，烘焙一次到離屏 canvas，之後每幀只 drawImage。
 *
 * shadowBlur 以裝置像素計（不受 CTM 影響），所以烘焙時依「呼叫端當下的裝置縮放」
 * 量化後放大繪製文字，模糊值維持裝置像素，畫面與原本即時 shadowBlur 等價
 * （量化誤差 ≤ RENDER_HOTSPOT_CACHE.GLOW_SCALE_STEP）。
 *
 * 純衍生資源：不持遊戲狀態、容量上限保護。
 */

import { RENDER_HOTSPOT_CACHE } from '../../../constants';
import { createCanvas } from '../../graphics/CanvasUtils';

export interface GlowSprite {
    canvas: HTMLCanvasElement;
    /** 以使用者座標表示的繪製偏移與大小（drawImage(canvas, x, y, w, h)） */
    x: number;
    y: number;
    w: number;
    h: number;
}

const cache = new Map<string, GlowSprite>();
let measureCtx: CanvasRenderingContext2D | null = null;

function store(key: string, sprite: GlowSprite): GlowSprite {
    if (cache.size >= RENDER_HOTSPOT_CACHE.MAX_GLOW_TEXT_SPRITES) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) cache.delete(firstKey);
    }
    cache.set(key, sprite);
    return sprite;
}

/** 由 CTM 推得裝置縮放並量化（每次 drawFloatingText 呼叫一次即可） */
export function quantizeDeviceScale(ctx: CanvasRenderingContext2D): number {
    const m = ctx.getTransform();
    const raw = Math.hypot(m.a, m.b);
    const step = RENDER_HOTSPOT_CACHE.GLOW_SCALE_STEP;
    const q = Math.ceil(raw / step) * step;
    return Math.min(RENDER_HOTSPOT_CACHE.GLOW_SCALE_MAX, Math.max(RENDER_HOTSPOT_CACHE.GLOW_SCALE_MIN, q));
}

export const GlowTextCache = {
    /** 以 (0,0) 為中心（textAlign center / baseline middle）的光暈文字 */
    getText(
        text: string,
        font: string,
        size: number,
        fill: string,
        glow: string,
        blur: number,
        scale: number,
    ): GlowSprite {
        const key = `t|${text}|${font}|${fill}|${glow}|${blur}|${scale}`;
        const existing = cache.get(key);
        if (existing) return existing;

        if (!measureCtx) measureCtx = createCanvas(1, 1).ctx;
        const measure = measureCtx;
        measure.font = font;
        const textW = measure.measureText(text).width;

        // 斜體字會超出量測寬度；四周保留 blur 的擴散範圍
        const padDev = Math.ceil(blur * RENDER_HOTSPOT_CACHE.GLOW_PAD_PER_BLUR);
        const boxW = textW + size * RENDER_HOTSPOT_CACHE.GLOW_TEXT_MARGIN_EM * 2;
        const boxH = size * (1 + RENDER_HOTSPOT_CACHE.GLOW_TEXT_MARGIN_EM * 2);
        const devW = Math.ceil(boxW * scale) + padDev * 2;
        const devH = Math.ceil(boxH * scale) + padDev * 2;

        const { canvas, ctx } = createCanvas(devW, devH);
        ctx.translate(devW / 2, devH / 2);
        ctx.scale(scale, scale);
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = fill;
        ctx.shadowColor = glow;
        ctx.shadowBlur = blur;
        ctx.fillText(text, 0, 0);

        const w = devW / scale;
        const h = devH / scale;
        return store(key, { canvas, x: -w / 2, y: -h / 2, w, h });
    },

    /** 以矩形左上角為原點的光暈實心矩形 */
    getRect(rectW: number, rectH: number, color: string, blur: number, scale: number): GlowSprite {
        const key = `r|${rectW}|${rectH}|${color}|${blur}|${scale}`;
        const existing = cache.get(key);
        if (existing) return existing;

        const padDev = Math.ceil(blur * RENDER_HOTSPOT_CACHE.GLOW_PAD_PER_BLUR);
        const devW = Math.ceil(rectW * scale) + padDev * 2;
        const devH = Math.ceil(rectH * scale) + padDev * 2;

        const { canvas, ctx } = createCanvas(devW, devH);
        ctx.translate(padDev, padDev);
        ctx.scale(scale, scale);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.fillRect(0, 0, rectW, rectH);

        const pad = padDev / scale;
        return store(key, { canvas, x: -pad, y: -pad, w: devW / scale, h: devH / scale });
    },

    clear(): void {
        cache.clear();
    },

    size(): number {
        return cache.size;
    },
};
