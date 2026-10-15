import { HEX_SIZE, ISO_SCALE_Y, RENDER_CACHE } from "../../../constants";
import { VFXFactory } from "../VFXFactory";
import { HexGeometry } from "../utils/HexGeometry";
import { HexLayout } from "../../../types";
import { createCanvas } from "../CanvasUtils";
import { RenderStats } from "../../renderers/RenderStats";
import { CtxOpCounter } from "../../renderers/CtxOpCounter";
import { SAND_RIPPLES } from "../../../data/vfx/terrainAmbience";

export interface LiquidCacheSlot {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    color: string;
    layout: HexLayout;
    quantizedTime: number;
    quantizedIntensity: number;
    center: number;
    lastUsedTick: number;
}

export const SurfacePainter = {
    _liquidSlots: [] as LiquidCacheSlot[],
    _liquidTick: 0,
    _liquidBakeCount: 0,
    _liquidHitCount: 0,
    _iceGrad: null as { grad: CanvasGradient; key: string } | null,

    resetLiquidStats() {
        this._liquidSlots.length = 0;
        this._liquidTick = 0;
        this._liquidBakeCount = 0;
        this._liquidHitCount = 0;
    },

    getLiquidStats() {
        return {
            slots: this._liquidSlots.length,
            bakes: this._liquidBakeCount,
            hits: this._liquidHitCount,
        };
    },
    
    drawLiquid(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        intensity: number,
        layout: HexLayout = 'FLAT' 
    ) {
        if (RenderStats.enabled) RenderStats.beginSubPhase('liquid');
        if (CtxOpCounter.enabled) CtxOpCounter.setScope('liquid');

        const r = HEX_SIZE * 0.9;
        const pad = 2;
        const totalSize = Math.ceil((r + pad) * 2);
        const center = totalSize / 2;
        const step = RENDER_CACHE.LIQUID_TIME_STEP;
        const quantizedTime = Math.round(time / step) * step;
        const quantizedIntensity = Math.round(intensity * 100) / 100;

        let slot: LiquidCacheSlot | undefined;
        for (let i = 0; i < this._liquidSlots.length; i++) {
            const candidate = this._liquidSlots[i];
            if (candidate.color === color && candidate.layout === layout) {
                slot = candidate;
                break;
            }
        }

        if (!slot) {
            if (this._liquidSlots.length < RENDER_CACHE.LIQUID_CACHE_SLOTS) {
                const { canvas, ctx: lCtx } = createCanvas(totalSize, totalSize);
                slot = {
                    canvas,
                    ctx: lCtx,
                    color,
                    layout,
                    quantizedTime: Number.NaN,
                    quantizedIntensity: Number.NaN,
                    center,
                    lastUsedTick: ++this._liquidTick,
                };
                this._liquidSlots.push(slot);
            } else {
                let oldestIdx = 0;
                for (let i = 1; i < this._liquidSlots.length; i++) {
                    if (this._liquidSlots[i].lastUsedTick < this._liquidSlots[oldestIdx].lastUsedTick) {
                        oldestIdx = i;
                    }
                }
                slot = this._liquidSlots[oldestIdx];
                slot.color = color;
                slot.layout = layout;
                slot.quantizedTime = Number.NaN;
                slot.quantizedIntensity = Number.NaN;
                slot.lastUsedTick = ++this._liquidTick;
            }
        } else {
            slot.lastUsedTick = ++this._liquidTick;
        }

        if (slot.quantizedTime !== quantizedTime || slot.quantizedIntensity !== quantizedIntensity) {
            this._liquidBakeCount++;
            const lCtx = slot.ctx;
            lCtx.clearRect(0, 0, totalSize, totalSize);
            lCtx.save();
            lCtx.translate(center, center);

            HexGeometry.traceHex(lCtx, 0, 0, r, true, layout);
            lCtx.fillStyle = color;
            lCtx.globalAlpha = 0.9 * quantizedIntensity;
            lCtx.fill();
            lCtx.clip();

            const flowX = Math.sin(quantizedTime * 0.5) * 8;
            const flowY = Math.cos(quantizedTime * 0.4) * 8;

            lCtx.globalCompositeOperation = 'multiply';
            lCtx.fillStyle = 'rgba(0,0,0,0.4)';
            lCtx.beginPath();
            lCtx.ellipse(flowX, flowY, r * 0.6, r * 0.4, 0, 0, Math.PI * 2);
            lCtx.fill();

            lCtx.globalCompositeOperation = 'overlay';
            lCtx.fillStyle = '#fff';
            lCtx.globalAlpha = 0.3;

            const bubbleX = Math.cos(quantizedTime * 0.8) * (r * 0.4);
            const bubbleY = Math.sin(quantizedTime * 0.9) * (r * 0.4) * ISO_SCALE_Y;

            lCtx.beginPath();
            lCtx.arc(bubbleX, bubbleY, r * 0.3, 0, Math.PI * 2);
            lCtx.fill();

            lCtx.restore();
            slot.quantizedTime = quantizedTime;
            slot.quantizedIntensity = quantizedIntensity;
        } else {
            this._liquidHitCount++;
        }

        ctx.drawImage(slot.canvas, x - center, y - center);

        if (RenderStats.enabled) RenderStats.endSubPhase('liquid');
    },

    /**
     * 高效能草地渲染器 v3.0 (Sprite Based)
     * 使用預渲染精靈取代即時幾何計算
     */
    drawGrass(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string, 
        density: number, 
        time: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        
        // 數學風力偏移：僅在 drawImage 時應用微小的 skew 或 translation，效能極高
        const windX = Math.sin(time * 1.2 + x * 0.05) * 4;
        
        const tufts = [
            { x: -14, y: -2,  v: 1 },
            { x: 12,  y: 4,   v: 2 },
            { x: -2,  y: 14,  v: 3 }
        ];

        for (let i = 0; i < tufts.length; i++) {
            const t = tufts[i];
            const sprite = VFXFactory.getGrassSprite(color, t.v);
            
            // 繪製預渲染的草叢 (含陰影與高光)
            // skrew 效果模擬風吹，比重新 pathTuft 快數百倍
            ctx.drawImage(sprite, t.x + windX - 32, t.y - 48);
        }
        
        ctx.restore();
    },

    drawIceSheen(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        time: number,
        layout: HexLayout = 'FLAT'
    ) {
        ctx.save();
        ctx.translate(x, y);
        HexGeometry.traceHex(ctx, 0, 0, size * 0.9, true, layout);
        ctx.clip();
        const slide = (time * 0.5) % 2.5 - 0.7; 
        const w = size * 2;
        const key = `${time}:${size}`;
        let grad = this._iceGrad?.key === key ? this._iceGrad.grad : null;
        if (!grad && Number.isFinite(w)) {
            grad = ctx.createLinearGradient(-w, -w, w, w);
            const start = slide - 0.3;
            const end = slide + 0.3;
            grad.addColorStop(Math.max(0, Math.min(1, start)), 'rgba(255,255,255,0)');
            grad.addColorStop(Math.max(0, Math.min(1, slide)), 'rgba(255,255,255,0.25)'); 
            grad.addColorStop(Math.max(0, Math.min(1, end)), 'rgba(255,255,255,0)');
            this._iceGrad = { grad, key };
        }
        if (grad) {
            ctx.fillStyle = grad;
            ctx.fillRect(-size, -size, size*2, size*2);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, 5); ctx.lineTo(5, -5);
        ctx.moveTo(2, 8); ctx.lineTo(8, 4);
        ctx.stroke();
        ctx.restore();
    },

    /**
     * 沙紋（靜態）：由 TerrainRenderer.bakeBlock 烘進地形 sprite，座標 (x, y) 為頂面中心。
     * 變化由地形 variant 決定（不再依螢幕座標）。
     */
    drawSandRipples(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        color: string,
        variant: number = 0
    ) {
        const c = SAND_RIPPLES;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        ctx.strokeStyle = color;
        ctx.lineWidth = c.lineWidth;
        ctx.globalAlpha = c.alpha;
        const offset = c.offsetAmplitude * c.variantPhases[variant % c.variantPhases.length];
        for (let i = c.rowFrom; i <= c.rowTo; i++) {
            const ly = i * c.rowSpacing + offset;
            ctx.beginPath();
            for (let lx = c.xFrom; lx <= c.xTo; lx += c.xStep) {
                const wave = Math.sin(lx * c.waveFrequency + offset) * c.waveAmplitude;
                if (lx === c.xFrom) ctx.moveTo(lx, ly + wave);
                else ctx.lineTo(lx, ly + wave);
            }
            ctx.stroke();
        }
        ctx.restore();
    },

    drawFog(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number
    ) {
        const texture = VFXFactory.getTexture('SMOKE_PUFF', color);
        const size = HEX_SIZE * 3.2;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.12; 
        const puffs = 4;
        const twoPi = Math.PI * 2;
        for(let i=0; i<puffs; i++) {
            const angle = time * 0.15 + (i * twoPi / puffs);
            const dist = 15 + Math.sin(time * 0.8 + i) * 8;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            const pulse = 1.0 + Math.sin(time * 1.2 + i) * 0.15;
            const pSize = size * 0.55 * pulse;
            ctx.drawImage(texture, px - pSize/2, py - pSize/2, pSize, pSize);
        }
        ctx.globalAlpha = 0.18;
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    drawCracks(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        intensity: number
    ) {
        const texture = VFXFactory.generateCracks(color);
        const size = HEX_SIZE * 2.4; 
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); 
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity;
        ctx.rotate((x * 0.001) + (y * 0.001)); 
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    /**
     * 地形紋路貼圖（靜態）：由 TerrainRenderer.bakeBlock 烘進地形 sprite，座標 (x, y) 為頂面中心。
     */
    drawDetailTexture(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        type: string,
        color: string,
        variant: number
    ) {
        const texture = VFXFactory.getTerrainDetail(type, color, variant);
        const size = texture.width;
        ctx.drawImage(texture, x - size/2, y - size/2);
    }
};
