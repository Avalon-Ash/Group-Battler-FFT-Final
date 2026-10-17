// ╔══════════════════════════════════════════════════════════╗
// ║  GroundDrape — 貼地鋪設層（FFT 風格：法陣鋪在每格頂面）    ║
// ║  職責：本幀的大型平貼特效（法陣、震波、龜裂…）不進 RenderList ║
// ║        排序，登記在這裡；RenderDispatcher 畫每個 TERRAIN op  ║
// ║        時，裁切到該格頂面六邊形、貼合該格高度與漂浮位移後畫。║
// ║  上游：VFXRenderer.submitRenderables（登記）、RenderPipeline  ║
// ║        （每幀 begin、持有）、RenderDispatcher（逐格繪製）。  ║
// ║  [ARCH] 規則見 engine/renderers/RenderSpec.ts §1、§2、§9：    ║
// ║  鋪設特效不是排序 op，所以沒有「單位站在法陣上」的排序環；    ║
// ║  站在該格的單位在該格 TERRAIN 之後才畫，棋座壓在法陣上       ║
// ║  （ART_SPEC §13）。分類與參數：constants.ts GROUND_DRAPE。    ║
// ║  池化：登記項與離屏畫布皆重複使用，容量只增不減。            ║
// ╚══════════════════════════════════════════════════════════╝

import type { Particle } from "../systems/vfx/state";
import type { HexLayout } from "../../types";
import { ParticleRenderer } from "../systems/vfx/renderers/ParticleRenderer";
import { HexGeometry } from "../graphics/utils/HexGeometry";
import { GROUND_DRAPE, ISO_SCALE_Y } from "../../constants";
import type { RenderOp } from "./RenderList";

interface DrapeEntry {
    p: Particle | null;
    /** 特效中心的世界 X（螢幕 X） */
    x: number;
    /** 特效中心的足跡 Y（含轉場位移，不含高度與漂浮） */
    footY: number;
    /** 未投影的涵蓋半徑（已乘 REACH_MARGIN）：判斷哪些格被蓋到 */
    reach: number;
    /** 邏輯像素的半寬／半高（含餘量）：離屏畫布範圍 */
    extW: number;
    extH: number;
    progress: number;
    chaos: boolean;
    offscreen: boolean;
    // ── 離屏畫布（只有 OFFSCREEN 型別用） ──
    canvas: HTMLCanvasElement | null;
    cctx: CanvasRenderingContext2D | null;
    /** 本幀已畫好的區域（裝置像素）與縮放；drawnStamp !== 當前幀代表尚未畫 */
    drawnStamp: number;
    drawnW: number;
    drawnH: number;
    drawnScale: number;
}

function createEntry(): DrapeEntry {
    return {
        p: null, x: 0, footY: 0, reach: 0, extW: 0, extH: 0, progress: 0, chaos: false, offscreen: false,
        canvas: null, cctx: null, drawnStamp: -1, drawnW: 0, drawnH: 0, drawnScale: 1,
    };
}

export class GroundDrapeLayer {
    private readonly entries: DrapeEntry[] = [];
    private count = 0;
    private stamp = 0;

    /** 每幀提交之前呼叫一次 */
    public begin(): void {
        this.count = 0;
        this.stamp++;
    }

    public get size(): number { return this.count; }

    /** 此粒子型別是否以鋪設方式繪製（constants.ts GROUND_DRAPE.MODE；不在表內＝一般 op） */
    public static modeOf(type: string): 'DIRECT' | 'OFFSCREEN' | undefined {
        return GROUND_DRAPE.MODE[type];
    }

    public add(p: Particle, x: number, footY: number, halfW: number, progress: number, chaos: boolean): void {
        let e = this.entries[this.count];
        if (!e) { e = createEntry(); this.entries[this.count] = e; }
        this.count++;
        e.p = p;
        e.x = x;
        e.footY = footY;
        e.reach = halfW * GROUND_DRAPE.REACH_MARGIN;
        e.extW = e.reach + GROUND_DRAPE.CANVAS_PAD_PX;
        e.extH = e.reach * ISO_SCALE_Y + GROUND_DRAPE.CANVAS_PAD_PX;
        e.progress = progress;
        e.chaos = chaos;
        e.offscreen = GROUND_DRAPE.MODE[p.type] === 'OFFSCREEN';
        e.drawnStamp = -1;
    }

    /**
     * 畫一個 TERRAIN op 的格子頂面上，所有蓋到它的鋪設特效。
     * 位置：特效的足跡 Y 加上「該格漂浮位移」、減去「該格高度」＝特效地平面貼在這格頂面。
     * 掉落中的地塊（op.z < 0）不畫。
     */
    public drawOnTile(ctx: CanvasRenderingContext2D, op: RenderOp, snapX: number, snapY: number, layout: HexLayout, battleTime: number): void {
        if (this.count === 0 || op.z < 0) return;
        const hexR = op.tsize;
        const topY = snapY - op.th;
        const bob = op.ty - op.y;
        let clipped = false;
        for (let i = 0; i < this.count; i++) {
            const e = this.entries[i];
            const p = e.p;
            if (!p) continue;
            const dx = op.tx - e.x;
            const dy = (op.y - e.footY) / ISO_SCALE_Y;
            const reach = e.reach + hexR;
            if (dx * dx + dy * dy > reach * reach) continue;

            // 裁切路徑每格只設一次：同一格被多個特效蓋到時共用（路徑與裁切是這裡最貴的部分）
            if (!clipped) {
                clipped = true;
                ctx.save();
                HexGeometry.traceHex(ctx, snapX, topY, hexR + GROUND_DRAPE.CLIP_EXPAND_PX, true, layout);
                ctx.clip();
            }
            const ox = Math.round(e.x);
            const oy = Math.round(e.footY + bob - op.th);
            ctx.save();
            if (e.offscreen) {
                this.blit(ctx, e, ox, oy, snapX, topY, hexR, layout, battleTime);
            } else {
                ctx.translate(ox, oy);
                ParticleRenderer.drawSingleParticle(ctx, p, 0, 0, e.progress, e.chaos, layout, battleTime);
            }
            ctx.restore();
        }
        if (clipped) ctx.restore();
    }

    /** 離屏畫布貼到目前裁切區：只複製與該格外框相交的部分 */
    private blit(ctx: CanvasRenderingContext2D, e: DrapeEntry, ox: number, oy: number, hexX: number, hexTopY: number, hexR: number, layout: HexLayout, battleTime: number): void {
        if (!this.ensureRendered(ctx, e, layout, battleTime)) return;
        const canvas = e.canvas!;
        const s = e.drawnScale;
        const w = e.drawnW, h = e.drawnH;
        // 離屏畫布中心 (w/2, h/2) 對應世界 (ox, oy)
        const dx0 = ox - w / (2 * s);
        const dy0 = oy - h / (2 * s);
        const pad = GROUND_DRAPE.CLIP_EXPAND_PX + 1;
        const bx0 = hexX - hexR - pad, bx1 = hexX + hexR + pad;
        const bh = hexR * ISO_SCALE_Y + pad;
        const by0 = hexTopY - bh, by1 = hexTopY + bh;
        const ix0 = Math.max(dx0, bx0), ix1 = Math.min(dx0 + w / s, bx1);
        const iy0 = Math.max(dy0, by0), iy1 = Math.min(dy0 + h / s, by1);
        if (ix1 <= ix0 || iy1 <= iy0) return;
        ctx.globalCompositeOperation = e.p!.blendMode || 'screen';
        ctx.drawImage(canvas, (ix0 - dx0) * s, (iy0 - dy0) * s, (ix1 - ix0) * s, (iy1 - iy0) * s, ix0, iy0, ix1 - ix0, iy1 - iy0);
    }

    /** 本幀第一次需要時，把特效以目前裝置縮放畫進自己的離屏畫布（之後同一幀的其他格直接複製） */
    private ensureRendered(ctx: CanvasRenderingContext2D, e: DrapeEntry, layout: HexLayout, battleTime: number): boolean {
        if (e.drawnStamp === this.stamp) return e.drawnW > 0;
        e.drawnStamp = this.stamp;
        e.drawnW = 0;
        if (typeof document === 'undefined' || !e.p) return false;

        const tf = ctx.getTransform();
        const deviceScale = Math.hypot(tf.a, tf.b) || 1;
        const maxPx = GROUND_DRAPE.MAX_CANVAS_PX;
        const s = Math.min(deviceScale, maxPx / (2 * e.extW), maxPx / (2 * e.extH));
        // 偶數寬高：中心落在整數裝置像素，貼回主畫布時與直接繪製對得上
        const w = Math.ceil(e.extW * s) * 2;
        const h = Math.ceil(e.extH * s) * 2;

        if (!e.canvas) {
            e.canvas = document.createElement('canvas');
            e.cctx = e.canvas.getContext('2d');
        }
        const c = e.canvas;
        const octx = e.cctx;
        if (!octx) return false;
        const step = GROUND_DRAPE.CANVAS_GROW_STEP_PX;
        if (c.width < w) c.width = Math.ceil(w / step) * step;
        if (c.height < h) c.height = Math.ceil(h / step) * step;

        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.globalAlpha = 1;
        octx.globalCompositeOperation = 'source-over';
        octx.clearRect(0, 0, w, h);
        octx.setTransform(s, 0, 0, s, w / 2, h / 2);
        ParticleRenderer.drawSingleParticle(octx, e.p, 0, 0, e.progress, e.chaos, layout, battleTime);
        octx.setTransform(1, 0, 0, 1, 0, 0);

        e.drawnW = w;
        e.drawnH = h;
        e.drawnScale = s;
        return true;
    }
}
