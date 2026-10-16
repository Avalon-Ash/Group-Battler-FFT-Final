/**
 * VFXPartStore — 特效零件的烘焙快取與執行期繪製（ART_SPEC §7、§8）
 * -----------------------------------------------------------------------------
 *  - get(spec)：參數量化 → 依品質階層決定影格數 → 快取命中直接回傳，否則烘焙。
 *  - 快取鍵只含參數與影格數，不含時間；超過 MAX_ENTRIES 時丟最久未使用者（LRU）。
 *  - drawPart：執行期只用 drawImage／globalAlpha／globalCompositeOperation／平移縮放旋轉。
 *  - 純衍生資源快取（不持遊戲狀態），可注入 createSurface 與 getTier 供測試。
 */

import { VFX_PARTS } from '../../../data/vfx/parts/partConfig';
import { createCanvas } from '../../graphics/CanvasUtils';
import { getQualityTier } from '../RenderQuality';
import { type PartSpec, type PartKind, normalizePartSpec, partKey, partBounds, partBlend, frameCountForTier, baseFrameCount } from './PartSpec';
import { bakePart } from './PartBakers';

export interface PartSprite {
    /** 烘焙影格（靜態零件只有一張） */
    frames: HTMLCanvasElement[];
    /** 世界單位尺寸與錨點 */
    width: number;
    height: number;
    anchorX: number;
    anchorY: number;
    blend: GlobalCompositeOperation;
    /** 建議播放速率：影格數因品質階層減少時同步降低，循環週期不變 */
    fps: number;
    /** 估算記憶體（RGBA bytes，含全部影格） */
    bytes: number;
    key: string;
}

export type PartSurfaceFactory = (width: number, height: number) => { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

export interface DrawPartOptions {
    frame?: number;
    scale?: number;
    /** 垂直額外縮放（貼地零件用 ISO_SCALE_Y 壓扁；在旋轉之後套用，等同先在地面旋轉再投影） */
    scaleY?: number;
    /** 弧度 */
    rotation?: number;
    alpha?: number;
    /** 覆寫零件預設混合模式 */
    blend?: GlobalCompositeOperation;
}

function basePartFps(kind: PartKind): number {
    if (kind === 'flame') return VFX_PARTS.FPS.flame;
    if (kind === 'bolt') return VFX_PARTS.FPS.bolt;
    return 0;
}

export function createVFXPartStore(createSurface: PartSurfaceFactory = createCanvas, getTier: () => number = getQualityTier) {
    const cache = new Map<string, PartSprite>();
    const stats = { hits: 0, misses: 0, evictions: 0 };
    let bytes = 0;

    function bake(n: PartSpec, frameCount: number, key: string): PartSprite {
        const b = partBounds(n);
        const s = VFX_PARTS.BAKE_SCALE;
        const pw = Math.max(1, Math.ceil(b.width * s));
        const ph = Math.max(1, Math.ceil(b.height * s));
        const frames: HTMLCanvasElement[] = [];
        for (let f = 0; f < frameCount; f++) {
            const { canvas, ctx } = createSurface(pw, ph);
            ctx.setTransform(s, 0, 0, s, b.anchorX * s, b.anchorY * s);
            bakePart(ctx, n, f, frameCount);
            frames.push(canvas);
        }
        const fps = basePartFps(n.kind) * (frameCount / baseFrameCount(n.kind));
        return { frames, width: b.width, height: b.height, anchorX: b.anchorX, anchorY: b.anchorY, blend: partBlend(n), fps, bytes: pw * ph * 4 * frameCount, key };
    }

    function get(spec: PartSpec): PartSprite {
        const n = normalizePartSpec(spec);
        const frameCount = frameCountForTier(n.kind, getTier());
        const key = partKey(n, frameCount);
        const hit = cache.get(key);
        if (hit) {
            stats.hits++;
            cache.delete(key);
            cache.set(key, hit);
            return hit;
        }
        stats.misses++;
        const sprite = bake(n, frameCount, key);
        cache.set(key, sprite);
        bytes += sprite.bytes;
        while (cache.size > 1 && (cache.size > VFX_PARTS.MAX_ENTRIES || bytes > VFX_PARTS.MAX_BYTES)) {
            const oldest = cache.keys().next().value;
            if (oldest === undefined) break;
            const old = cache.get(oldest);
            if (old) bytes -= old.bytes;
            cache.delete(oldest);
            stats.evictions++;
        }
        return sprite;
    }

    return {
        get,
        size: () => cache.size,
        bytes: () => bytes,
        stats: () => ({ ...stats }),
        clear: () => { cache.clear(); bytes = 0; },
    };
}

export type VFXPartStore = ReturnType<typeof createVFXPartStore>;

/** 共用實例（遊戲內使用）。 */
export const vfxPartStore: VFXPartStore = createVFXPartStore();

/**
 * 依經過秒數選影格（循環）；預設用 sprite.fps，品質降階時循環週期不變。
 * 呼叫端應持有 get() 回傳的 sprite，不要每幀每粒子重新 get()（get 會量化參數並組快取鍵）。
 */
export function partFrameAt(sprite: PartSprite, seconds: number, fps: number = sprite.fps): number {
    const n = sprite.frames.length;
    if (n <= 1 || fps <= 0) return 0;
    return ((Math.floor(seconds * fps) % n) + n) % n;
}

export function drawPart(ctx: CanvasRenderingContext2D, sprite: PartSprite, x: number, y: number, opts: DrawPartOptions = {}): void {
    const n = sprite.frames.length;
    const img = sprite.frames[(((opts.frame ?? 0) % n) + n) % n];
    const scale = opts.scale ?? 1;
    const alpha = opts.alpha ?? 1;
    if (alpha <= 0 || scale <= 0) return;
    const prevAlpha = ctx.globalAlpha;
    const prevBlend = ctx.globalCompositeOperation;
    ctx.globalAlpha = prevAlpha * alpha;
    ctx.globalCompositeOperation = opts.blend ?? sprite.blend;
    const w = sprite.width * scale;
    const h = sprite.height * scale;
    const sy = opts.scaleY ?? 1;
    if (opts.rotation || sy !== 1) {
        ctx.save();
        ctx.translate(x, y);
        if (sy !== 1) ctx.scale(1, sy);
        if (opts.rotation) ctx.rotate(opts.rotation);
        ctx.drawImage(img, -sprite.anchorX * scale, -sprite.anchorY * scale, w, h);
        ctx.restore();
    } else {
        ctx.drawImage(img, x - sprite.anchorX * scale, y - sprite.anchorY * scale, w, h);
    }
    ctx.globalAlpha = prevAlpha;
    ctx.globalCompositeOperation = prevBlend;
}
