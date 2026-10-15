import { HEX_SIZE, ISO_SCALE_Y, RENDER_CACHE } from "../../../constants";
import { HexLayout } from "../../../types";
import { createCanvas } from "../../graphics/CanvasUtils";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { VFXFactory } from "../../graphics/VFXFactory";
import { GRASS_DETAIL, ICE_SHEEN, TERRAIN_LIQUID } from "../../../data/vfx/terrainAmbience";

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
}

interface IceFrameSet extends LoopFrameSet {
    size: number;
}

interface LiquidFrameSet extends LoopFrameSet {
    color: string;
    layout: HexLayout;
    level: number;
    lastUsedTick: number;
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
    _liquidTick: 0,
    _liquidBakes: 0,
    _liquidHits: 0,

    /** 清空所有循環影格（設定表改變後呼叫，下次取用時重新預渲染） */
    reset() {
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

    /** 取（顏色、layout、量化後 intensity）對應的液面循環組；槽數上限 RENDER_CACHE.LOOP_LIQUID_SLOTS，LRU 淘汰 */
    getLiquid(color: string, layout: HexLayout, intensity: number): LoopFrameSet {
        const level = Math.round(intensity / TERRAIN_LIQUID.intensityStep);
        const slots = this._liquid;
        for (let i = 0; i < slots.length; i++) {
            const s = slots[i];
            if (s.level === level && s.layout === layout && s.color === color) {
                s.lastUsedTick = ++this._liquidTick;
                this._liquidHits++;
                return s;
            }
        }
        const baked = this.bakeLiquid(color, layout, level);
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

    bakeGrass(color: string, variant: number): LoopFrameSet {
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

    bakeLiquid(color: string, layout: HexLayout, level: number): LiquidFrameSet {
        const c = TERRAIN_LIQUID;
        const intensity = level * c.intensityStep;
        const r = HEX_SIZE * c.radiusRatio;
        const totalSize = Math.ceil((r + c.pad) * 2);
        const center = totalSize / 2;
        const frames: HTMLCanvasElement[] = [];
        for (let i = 0; i < c.loop.frames; i++) {
            const u = i / c.loop.frames;
            const { canvas, ctx } = createCanvas(totalSize, totalSize);
            ctx.save();
            ctx.translate(center, center);

            HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
            ctx.fillStyle = color;
            ctx.globalAlpha = c.baseAlpha * intensity;
            ctx.fill();
            ctx.clip();

            const flowX = Math.sin(TWO_PI * c.flowHarmonicX * u) * c.flowAmplitude;
            const flowY = Math.cos(TWO_PI * c.flowHarmonicY * u) * c.flowAmplitude;

            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = c.shadeColor;
            ctx.beginPath();
            ctx.ellipse(flowX, flowY, r * c.shadeRadiusX, r * c.shadeRadiusY, 0, 0, TWO_PI);
            ctx.fill();

            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = c.bubbleColor;
            ctx.globalAlpha = c.bubbleAlpha;

            const bubbleX = Math.cos(TWO_PI * c.bubbleHarmonicX * u) * (r * c.bubbleOrbitRatio);
            const bubbleY = Math.sin(TWO_PI * c.bubbleHarmonicY * u) * (r * c.bubbleOrbitRatio) * ISO_SCALE_Y;

            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, r * c.bubbleRadiusRatio, 0, TWO_PI);
            ctx.fill();

            ctx.restore();
            frames.push(canvas);
        }
        this.bakeCount++;
        return { frames, anchorX: center, anchorY: center, color, layout, level, lastUsedTick: 0 };
    },
};
