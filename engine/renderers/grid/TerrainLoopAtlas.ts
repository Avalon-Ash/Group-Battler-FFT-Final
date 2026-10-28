import { mulberry32 as seeded } from '../../math/hash';
import { HEX_SIZE, ISO_SCALE_Y, RENDER_CACHE } from "../../../constants";
import { HexLayout } from "../../../types";
import { createCanvas } from "../../graphics/CanvasUtils";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { VFXFactory } from "../../graphics/VFXFactory";
import { GRASS_DETAIL, ICE_SHEEN, TERRAIN_LIQUID } from "../../../data/vfx/terrainAmbience";
import { obstacleSpriteStore } from "./ObstacleSpriteStore";

/**
 * 地表動態效果的循環影格快取（冰面反光、草叢風擺、熔岩液面）。
 * 第一次用到某組設定時，把一個完整週期預渲染成 N 張小 canvas；之後每格每幀只 drawImage 一張。
 * 所有動作都是週期函數，頭尾影格無縫銜接。執行期路徑不配置字串／物件、不建立漸層、不 clip。
 */

const TWO_PI = Math.PI * 2;

export interface LoopFrameSet {
    frames: HTMLCanvasElement[];
    /** drawImage 時，影格左上角相對於格心的偏移（畫在 x - anchorX, y - anchorY） */
    anchorX: number;
    anchorY: number;
    /** 有值時影格是高密度烘焙，繪製時縮成這個 canvas 單位尺寸 */
    width?: number;
    height?: number;
}

/**
 * 整組影格排在一張圖上（液面）：每格每幀只取不同的子矩形，來源永遠是同一張 canvas。
 * 每影格一張小 canvas 時，熔岩圖上百格各取不同影格，實測 p99 約 17 ms（關掉液面 3.7 ms）。
 */
interface LoopSheet {
    canvas: HTMLCanvasElement;
    cols: number;
    /** 單一影格的像素尺寸 */
    fw: number;
    fh: number;
    count: number;
}

interface IceFrameSet extends LoopFrameSet {
    size: number;
}

interface LiquidFrameSet extends LoopFrameSet {
    color: string;
    layout: HexLayout;
    level: number;
    variant: number;
    /** 烘焙密度（1 或 TERRAIN_LIQUID.bakeScale），依繪製時的渲染縮放級距選 */
    scale: number;
    sheet: LoopSheet;
    lastUsedTick: number;
}

type RGB = [number, number, number];

function parseHex(color: string): RGB {
    const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
    if (!m) return [239, 68, 68];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgbCss(c: RGB, alpha: number = 1): string {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;
}

function smoothstep(e0: number, e1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
}

/** 確定性亂數（硬殼格點、顆粒）：同一種子永遠同一串 */


/**
 * 無縫硬殼貼圖（地面座標，未壓扁）：環面 Voronoi，裂縫透明露出熔體，裂縫旁泛紅、板塊中央略亮。
 * 只在烘焙期跑一次（每個 bakeScale 一張）。
 */
function bakeCrustTile(scale: number): HTMLCanvasElement {
    const c = TERRAIN_LIQUID.crust;
    const size = Math.max(1, Math.round(c.tile * scale));
    const rnd = seeded(c.seed);
    const pts: number[] = [];
    for (let i = 0; i < c.cells; i++) pts.push(rnd() * c.tile, rnd() * c.tile);
    const crust = parseHex(c.color);
    const heat = parseHex(c.heatColor);
    const cellSpan = c.tile / Math.sqrt(c.cells);
    const { canvas, ctx } = createCanvas(size, size);
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const grain = seeded(c.seed * 31 + 1);
    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            const x = (px + 0.5) / scale, y = (py + 0.5) / scale;
            let d1 = Infinity, d2 = Infinity;
            for (let i = 0; i < pts.length; i += 2) {
                let dx = Math.abs(x - pts[i]); if (dx > c.tile / 2) dx = c.tile - dx;
                let dy = Math.abs(y - pts[i + 1]); if (dy > c.tile / 2) dy = c.tile - dy;
                const d = Math.hypot(dx, dy);
                if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
            }
            const edge = d2 - d1;
            const a = smoothstep(c.crack * 0.5, c.crack * 1.5, edge) * c.alpha;
            const hot = 1 - smoothstep(c.crack, c.crack + c.heat, edge);
            const plate = 1.12 - 0.3 * Math.min(1, d1 / cellSpan);
            const g = 1 + c.grain * (grain() - 0.5);
            const col = mixRgb(crust, heat, hot * 0.85);
            const k = (py * size + px) * 4;
            data[k] = Math.min(255, col[0] * plate * g);
            data[k + 1] = Math.min(255, col[1] * plate * g);
            data[k + 2] = Math.min(255, col[2] * plate * g);
            data[k + 3] = Math.round(a * 255);
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

/**
 * 週期內的影格索引：floor(((time mod period) / period + phase) 取小數部分 * count)。
 * time 跨過週期時回到 0；負時間、NaN 與浮點邊界都不會越界。phase 是週期的比例（0..1）。
 */
export function loopFrameIndex(time: number, period: number, count: number, phase: number = 0): number {
    let u = (time % period) / period + phase;
    u -= Math.floor(u);
    const idx = Math.floor(u * count);
    return idx >= 0 && idx < count ? idx : 0;
}

export const TerrainLoopAtlas = {
    /** 已預渲染的完整循環組數（冰、草、液面合計；測試以此驗證「第二次取用不重畫」） */
    bakeCount: 0,

    _ice: { FLAT: null, POINTY: null } as Record<HexLayout, IceFrameSet | null>,
    _grass: new Map<string, (LoopFrameSet | undefined)[]>(),
    _liquid: [] as LiquidFrameSet[],
    _crust: new Map<number, HTMLCanvasElement>(),
    _grassRev: -1,
    _liquidTick: 0,
    _liquidBakes: 0,
    _liquidHits: 0,

    /** 清空所有循環影格（設定表改變後呼叫，下次取用時重新預渲染） */
    reset() {
        this._crust.clear();
        this._ice.FLAT = null;
        this._ice.POINTY = null;
        this._grass.clear();
        this.resetLiquid();
        this.bakeCount = 0;
    },

    resetLiquid() {
        this._liquid.length = 0;
        this._liquidTick = 0;
        this._liquidBakes = 0;
        this._liquidHits = 0;
    },

    getLiquidStats() {
        return { slots: this._liquid.length, bakes: this._liquidBakes, hits: this._liquidHits };
    },

    getIce(layout: HexLayout, size: number): LoopFrameSet {
        const cached = this._ice[layout];
        if (cached && cached.size === size) return cached;
        const baked = this.bakeIce(layout, size);
        this._ice[layout] = baked;
        return baked;
    },

    getGrass(color: string, variant: number): LoopFrameSet {
        // 裝飾圖集載入後整批重烘（載入前用程序化草叢）
        if (this._grassRev !== obstacleSpriteStore.revision) {
            this._grassRev = obstacleSpriteStore.revision;
            this._grass.clear();
        }
        let bySprite = this._grass.get(color);
        if (!bySprite) {
            bySprite = [];
            this._grass.set(color, bySprite);
        }
        const cached = bySprite[variant];
        if (cached) return cached;
        const baked = this.bakeGrass(color, variant);
        bySprite[variant] = baked;
        return baked;
    },

    /** 取（顏色、layout、量化後 intensity、硬殼變體）對應的液面循環組；槽數上限 RENDER_CACHE.LOOP_LIQUID_SLOTS，LRU 淘汰 */
    getLiquid(color: string, layout: HexLayout, intensity: number, variant: number = 0, renderScale: number = TERRAIN_LIQUID.bakeScale): LiquidFrameSet {
        const level = Math.round(intensity / TERRAIN_LIQUID.intensityStep);
        // 縮放級距 ≤ 1 時用 1 倍烘焙：每格只是 1:1 貼圖，不必每幀把 2 倍影格縮小
        const scale = renderScale <= 1 ? 1 : TERRAIN_LIQUID.bakeScale;
        const slots = this._liquid;
        for (let i = 0; i < slots.length; i++) {
            const s = slots[i];
            if (s.level === level && s.layout === layout && s.color === color && s.variant === variant && s.scale === scale) {
                s.lastUsedTick = ++this._liquidTick;
                this._liquidHits++;
                return s;
            }
        }
        const baked = this.bakeLiquid(color, layout, level, variant, scale);
        baked.lastUsedTick = ++this._liquidTick;
        this._liquidBakes++;
        if (slots.length < RENDER_CACHE.LOOP_LIQUID_SLOTS) {
            slots.push(baked);
        } else {
            let oldest = 0;
            for (let i = 1; i < slots.length; i++) {
                if (slots[i].lastUsedTick < slots[oldest].lastUsedTick) oldest = i;
            }
            slots[oldest] = baked;
        }
        return baked;
    },

    bakeIce(layout: HexLayout, size: number): IceFrameSet {
        const c = ICE_SHEEN;
        const r = size * c.radiusRatio;
        const totalSize = Math.ceil((r + c.framePad) * 2);
        const center = totalSize / 2;
        const w = size * c.gradientSpan;
        const frames: HTMLCanvasElement[] = [];
        for (let i = 0; i < c.loop.frames; i++) {
            const slide = (i / c.loop.frames) * c.slideWrap - c.slideOffset;
            const { canvas, ctx } = createCanvas(totalSize, totalSize);
            ctx.translate(center, center);
            HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
            ctx.clip();
            if (Number.isFinite(w)) {
                const grad = ctx.createLinearGradient(-w, -w, w, w);
                grad.addColorStop(Math.max(0, Math.min(1, slide - c.bandHalfWidth)), c.bandEdgeColor);
                grad.addColorStop(Math.max(0, Math.min(1, slide)), c.bandPeakColor);
                grad.addColorStop(Math.max(0, Math.min(1, slide + c.bandHalfWidth)), c.bandEdgeColor);
                ctx.fillStyle = grad;
                ctx.fillRect(-size, -size, size * 2, size * 2);
            }
            ctx.strokeStyle = c.scratchColor;
            ctx.lineWidth = c.scratchWidth;
            ctx.beginPath();
            for (let s = 0; s < c.scratches.length; s++) {
                const seg = c.scratches[s];
                ctx.moveTo(seg[0], seg[1]);
                ctx.lineTo(seg[2], seg[3]);
            }
            ctx.stroke();
            frames.push(canvas);
        }
        this.bakeCount++;
        return { frames, anchorX: center, anchorY: center, size };
    },

    /** 預渲染草叢：每叢以底部為軸斜切擺動（頂端位移 windAmplitude），高密度烘焙後縮回 canvas 單位 */
    bakeGrassDecor(variant: number): LoopFrameSet | null {
        const c = GRASS_DETAIL;
        const d = c.decor;
        const n = obstacleSpriteStore.frameCount(d.type);
        if (n === 0) return null;
        // 這個 variant 擺幾叢（從 variant 起輪替位置，鄰格疏密不同）
        const count = Math.max(1, Math.min(c.tufts.length, d.countByVariant[variant % d.countByVariant.length]));
        const tufts = Array.from({ length: count }, (_, i) => c.tufts[(i + variant) % c.tufts.length]);
        const picks = tufts.map((t, i) => obstacleSpriteStore.getFrame(d.type, (t.sprite - 1) + variant * d.frameStep + i));
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < tufts.length; i++) {
            const f = picks[i];
            if (!f) continue;
            const k = f.k * d.scale;
            minX = Math.min(minX, tufts[i].x - f.ax * k - c.windAmplitude);
            maxX = Math.max(maxX, tufts[i].x + (f.sw - f.ax) * k + c.windAmplitude);
            minY = Math.min(minY, tufts[i].y - f.ay * k);
            maxY = Math.max(maxY, tufts[i].y + (f.sh - f.ay) * k);
        }
        if (!Number.isFinite(minX)) return null;
        const left = Math.floor(minX), top = Math.floor(minY);
        const width = Math.ceil(maxX) - left, height = Math.ceil(maxY) - top;
        const sc = d.bakeScale;
        const frames: HTMLCanvasElement[] = [];
        for (let fi = 0; fi < c.loop.frames; fi++) {
            const wind = Math.sin(TWO_PI * (fi / c.loop.frames)) * c.windAmplitude;
            const { canvas, ctx } = createCanvas(Math.ceil(width * sc), Math.ceil(height * sc));
            for (let i = 0; i < tufts.length; i++) {
                const f = picks[i];
                if (!f) continue;
                const k = f.k * d.scale;
                const h = Math.max(1, f.ay * k);
                // 底部（錨點）不動、頂端位移 wind：x' = x - (wind / h) * y（y 往上為負）
                ctx.setTransform(sc, 0, -sc * (wind / h), sc, (tufts[i].x - left) * sc, (tufts[i].y - top) * sc);
                ctx.drawImage(f.image, f.sx, f.sy, f.sw, f.sh, -f.ax * k, -f.ay * k, f.sw * k, f.sh * k);
            }
            frames.push(canvas);
        }
        this.bakeCount++;
        return { frames, anchorX: -left, anchorY: -top, width: Math.ceil(width * sc) / sc, height: Math.ceil(height * sc) / sc };
    },

    bakeGrass(color: string, variant: number): LoopFrameSet {
        const decor = this.bakeGrassDecor(variant);
        if (decor) return decor;
        const c = GRASS_DETAIL;
        const sp = c.sprite;
        const tufts = c.tufts;
        // 影格範圍 = 所有草叢精靈（含風擺幅度）的聯集，錨點為格心
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let t = 0; t < tufts.length; t++) {
            minX = Math.min(minX, tufts[t].x - sp.anchorX - c.windAmplitude);
            maxX = Math.max(maxX, tufts[t].x - sp.anchorX + sp.size + c.windAmplitude);
            minY = Math.min(minY, tufts[t].y - sp.anchorY);
            maxY = Math.max(maxY, tufts[t].y - sp.anchorY + sp.size);
        }
        const left = Math.floor(minX);
        const top = Math.floor(minY);
        const width = Math.ceil(maxX) - left;
        const height = Math.ceil(maxY) - top;
        const frames: HTMLCanvasElement[] = [];
        for (let i = 0; i < c.loop.frames; i++) {
            const windX = Math.sin(TWO_PI * (i / c.loop.frames)) * c.windAmplitude;
            const { canvas, ctx } = createCanvas(width, height);
            for (let t = 0; t < tufts.length; t++) {
                const spriteId = ((tufts[t].sprite - 1 + variant) % tufts.length) + 1;
                const sprite = VFXFactory.getGrassSprite(color, spriteId);
                ctx.drawImage(sprite, tufts[t].x + windX - sp.anchorX - left, tufts[t].y - sp.anchorY - top);
            }
            frames.push(canvas);
        }
        this.bakeCount++;
        return { frames, anchorX: -left, anchorY: -top };
    },

    bakeLiquid(color: string, layout: HexLayout, level: number, variant: number = 0, bakeScale: number = TERRAIN_LIQUID.bakeScale): LiquidFrameSet {
        const c = TERRAIN_LIQUID;
        const intensity = level * c.intensityStep;
        const r = HEX_SIZE * c.radiusRatio;
        const sc = bakeScale;
        const width = Math.ceil((r + c.pad) * 2);
        const height = Math.ceil((r * ISO_SCALE_Y + c.pad) * 2);
        const cx = width / 2, cy = height / 2;
        let crust = this._crust.get(sc);
        if (!crust) {
            crust = bakeCrustTile(sc);
            this._crust.set(sc, crust);
        }
        const base = parseHex(color);
        const m = c.melt;
        const core = mixRgb(base, parseHex(m.coreColor), m.coreMix);
        const hot = mixRgb(base, parseHex(m.hotColor), m.hotMix);
        const edge = mixRgb(base, [0, 0, 0], m.edgeDarken);
        const T = c.crust.tile;
        const shift = c.drift.variantShift * variant;
        const fw = Math.ceil(width * sc), fh = Math.ceil(height * sc);
        const cols = Math.max(1, Math.min(c.loop.frames, Math.floor(RENDER_CACHE.LOOP_SHEET_MAX_W / fw)));
        const rows = Math.ceil(c.loop.frames / cols);
        const { canvas: sheetCanvas, ctx } = createCanvas(fw * cols, fh * rows);
        for (let i = 0; i < c.loop.frames; i++) {
            const u = i / c.loop.frames;
            ctx.save();
            ctx.setTransform(sc, 0, 0, sc, (i % cols) * fw, Math.floor(i / cols) * fh);
            ctx.translate(cx, cy);
            ctx.globalAlpha = c.baseAlpha * intensity;
            HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
            ctx.clip();

            // 1. 熔體：放射漸層（地面座標畫，再壓扁成等距）＋亮度脈動
            ctx.save();
            ctx.scale(1, ISO_SCALE_Y);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            grad.addColorStop(0, rgbCss(core));
            grad.addColorStop(m.coreStop, rgbCss(core));
            grad.addColorStop(m.hotStop, rgbCss(hot));
            grad.addColorStop(1, rgbCss(edge));
            ctx.fillStyle = grad;
            ctx.fillRect(-r, -r, r * 2, r * 2);
            const pulse = c.pulse.amp * (0.5 + 0.5 * Math.sin(TWO_PI * c.pulse.harmonic * u));
            if (pulse > 0) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = c.baseAlpha * intensity * pulse;
                ctx.fillStyle = rgbCss(core);
                ctx.fillRect(-r, -r, r * 2, r * 2);
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = c.baseAlpha * intensity;
            }

            // 2. 硬殼：無縫貼圖沿圓周漂移（諧波整數 → 頭尾接上），變體錯開位置
            const ang = TWO_PI * c.drift.harmonic * u;
            let ox = (Math.cos(ang) * c.drift.radius + shift * T) % T;
            let oy = (Math.sin(ang) * c.drift.radius + shift * T * 0.61) % T;
            if (ox > 0) ox -= T;
            if (oy > 0) oy -= T;
            for (let tx = ox - Math.ceil((r + ox) / T) * T; tx < r; tx += T) {
                for (let ty = oy - Math.ceil((r + oy) / T) * T; ty < r; ty += T) {
                    ctx.drawImage(crust, tx, ty, T, T);
                }
            }

            // 3. 冒泡：每個泡泡在週期內生滅 harmonic 次，位置依變體錯開
            const bub = c.bubbles;
            const bubCol = parseHex(bub.color);
            for (let k = 0; k < bub.count; k++) {
                const ph = ((u * bub.harmonic + k / bub.count + variant * 0.17) % 1 + 1) % 1;
                if (ph >= 0.7) continue;
                const life = ph / 0.7;
                const rr = bub.radius * Math.sin(Math.PI * life);
                const a0 = TWO_PI * (k / bub.count) + variant * 1.3;
                const bx = Math.cos(a0) * r * bub.orbit, by = Math.sin(a0) * r * bub.orbit;
                ctx.fillStyle = rgbCss(bubCol, bub.alpha * (1 - life * 0.5));
                ctx.beginPath();
                ctx.arc(bx, by, Math.max(0.1, rr), 0, TWO_PI);
                ctx.fill();
            }
            ctx.restore();

            // 4. 岸邊暗環
            ctx.strokeStyle = c.rim.color;
            ctx.lineWidth = c.rim.width;
            HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
            ctx.stroke();
            ctx.restore();
        }
        this.bakeCount++;
        const sheet: LoopSheet = { canvas: sheetCanvas, cols, fw, fh, count: c.loop.frames };
        return { frames: [], sheet, anchorX: cx, anchorY: cy, width: fw / sc, height: fh / sc, color, layout, level, variant, scale: sc, lastUsedTick: 0 };
    },
};
