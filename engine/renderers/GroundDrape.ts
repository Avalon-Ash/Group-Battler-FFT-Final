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
// ║  （ART_SPEC §13）。分類與參數：constants/vfx.ts GROUND_DRAPE。    ║
// ║  池化：登記項與離屏畫布皆重複使用，容量只增不減。            ║
// ║  除了粒子，也接受「繪製函式＋單位」（施法 AOE 地面預警），    ║
// ║  一律走離屏畫布；函式是靜態參考，不每幀配置閉包。            ║
// ║  懸空平面（planeZ，詠唱環）：不貼頂面，而是以固定高度逐格裁切；║
// ║  頂面高過平面的格子不畫（被擋住），施法者那格只畫後半，前半  ║
// ║  由 AURA op 在施法者之後補畫（RenderSpec §9）。              ║
// ╚══════════════════════════════════════════════════════════╝

import type { Particle } from "../presentation/vfx/state";
import type { HexLayout } from "../../types";
import { ParticleRenderer } from "../presentation/vfx/renderers/ParticleRenderer";
import { HexGeometry } from "../graphics/utils/HexGeometry";
import { GROUND_DRAPE, ISO_SCALE_Y, RENDER_QUALITY } from "../../constants";
import type { RenderOp } from "./RenderList";
import type { Agent } from "../core/Agent";

/** 以單位為參數、畫在原點（特效中心＝地平面）的貼地繪製函式。必須是靜態函式參考（不每幀建立閉包）。 */
export type DrapePainter = (ctx: CanvasRenderingContext2D, agent: Agent, battleTime: number, layout: HexLayout) => void;

interface DrapeEntry {
    p: Particle | null;
    /** 非粒子的鋪設來源（與 p 擇一） */
    painter: DrapePainter | null;
    painterAgent: Agent | null;
    /** 懸空平面的繪製用高度（NaN＝貼在各格頂面）；ownQ／ownR＝施法者腳下格（只畫後半） */
    planeZ: number;
    ownQ: number;
    ownR: number;
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
        p: null, painter: null, painterAgent: null, planeZ: NaN, ownQ: 0, ownR: 0, x: 0, footY: 0, reach: 0, extW: 0, extH: 0, progress: 0, offscreen: false,
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

    /** 此粒子型別是否以鋪設方式繪製（constants/vfx.ts GROUND_DRAPE.MODE；不在表內＝一般 op） */
    public static modeOf(type: string): 'DIRECT' | 'OFFSCREEN' | undefined {
        return GROUND_DRAPE.MODE[type];
    }

    public add(p: Particle, x: number, footY: number, halfW: number, progress: number): void {
        let e = this.entries[this.count];
        if (!e) { e = createEntry(); this.entries[this.count] = e; }
        this.count++;
        e.p = p;
        e.painter = null;
        e.painterAgent = null;
        e.planeZ = NaN;
        this.fill(e, x, footY, halfW);
        e.progress = progress;
        e.offscreen = GROUND_DRAPE.MODE[p.type] === 'OFFSCREEN';
    }

    /** 非粒子的貼地繪製（例：施法 AOE 預警）。painter 在原點畫出整個圖形；一律離屏畫一次、逐格貼。 */
    public addPainted(painter: DrapePainter, agent: Agent, x: number, footY: number, halfW: number): void {
        this.addEntryPainted(painter, agent, x, footY, halfW, NaN, 0, 0);
    }

    /**
     * 懸空平面（例：腰部高度的詠唱環）。planeZ＝平面的繪製用高度（已含施法者那格的漂浮位移）；
     * ownQ／ownR＝施法者腳下格：那格只畫平面的後半，前半由 AURA op 在施法者之後補畫。
     */
    public addPlane(painter: DrapePainter, agent: Agent, x: number, footY: number, halfW: number, planeZ: number, ownQ: number, ownR: number): void {
        this.addEntryPainted(painter, agent, x, footY, halfW, planeZ, ownQ, ownR);
    }

    private addEntryPainted(painter: DrapePainter, agent: Agent, x: number, footY: number, halfW: number, planeZ: number, ownQ: number, ownR: number): void {
        let e = this.entries[this.count];
        if (!e) { e = createEntry(); this.entries[this.count] = e; }
        this.count++;
        e.p = null;
        e.painter = painter;
        e.painterAgent = agent;
        e.planeZ = planeZ;
        e.ownQ = ownQ;
        e.ownR = ownR;
        // 繪製函式的零件外框（光暈、PAD）會略超出半徑，離屏畫布取正方形留餘量，避免上下被切成硬邊。
        this.fill(e, x, footY, halfW);
        e.extW = e.extH = halfW * GROUND_DRAPE.PAINTER_EXTENT + GROUND_DRAPE.CANVAS_PAD_PX;
        e.progress = 0;
        e.offscreen = true;
    }

    private fill(e: DrapeEntry, x: number, footY: number, halfW: number): void {
        e.x = x;
        e.footY = footY;
        e.reach = halfW * GROUND_DRAPE.REACH_MARGIN;
        e.extW = e.reach + GROUND_DRAPE.CANVAS_PAD_PX;
        e.extH = e.reach * ISO_SCALE_Y + GROUND_DRAPE.CANVAS_PAD_PX;
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
        let planes = 0;
        for (let i = 0; i < this.count; i++) {
            const e = this.entries[i];
            const p = e.p;
            if (!p && !e.painter) continue;
            const dx = op.tx - e.x;
            const dy = (op.y - e.footY) / ISO_SCALE_Y;
            const reach = e.reach + hexR;
            if (dx * dx + dy * dy > reach * reach) continue;
            if (!Number.isNaN(e.planeZ)) { planes++; continue; } // 懸空平面另一趟畫（不能套到頂面裁切）

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
            } else if (p) {
                ctx.translate(ox, oy);
                ParticleRenderer.drawSingleParticle(ctx, p, 0, 0, e.progress, layout, battleTime);
            }
            ctx.restore();
        }
        if (clipped) ctx.restore();
        if (planes === 0) return;
        for (let i = 0; i < this.count; i++) {
            const e = this.entries[i];
            if (Number.isNaN(e.planeZ) || !e.painter) continue;
            const dx = op.tx - e.x;
            const dy = (op.y - e.footY) / ISO_SCALE_Y;
            const reach = e.reach + hexR;
            if (dx * dx + dy * dy > reach * reach) continue;
            this.drawPlaneOnTile(ctx, e, op, snapX, hexR, bob, layout, battleTime);
        }
    }

    /**
     * 懸空平面在一格上的片段：平面高度上該格的六邊形裁切。該格頂面高過平面＝被擋住不畫；
     * 施法者那格只畫後半（平面中心線以上），前半由 AURA op 補畫。不與頂面鋪設共用裁切。
     */
    private drawPlaneOnTile(ctx: CanvasRenderingContext2D, e: DrapeEntry, op: RenderOp, snapX: number, hexR: number, bob: number, layout: HexLayout, battleTime: number): void {
        const tileTop = op.th - bob;
        if (tileTop > e.planeZ + GROUND_DRAPE.PLANE_OCCLUDE_EPS) return;
        const clipY = Math.round(op.y - e.planeZ);
        const ox = Math.round(e.x);
        const oy = Math.round(e.footY - e.planeZ);
        ctx.save();
        HexGeometry.traceHex(ctx, snapX, clipY, hexR + GROUND_DRAPE.CLIP_EXPAND_PX, true, layout);
        ctx.clip();
        if (op.tq === e.ownQ && op.tr === e.ownR) {
            ctx.beginPath();
            ctx.rect(snapX - hexR * 2, clipY - hexR * 2, hexR * 4, oy - (clipY - hexR * 2));
            ctx.clip();
        }
        this.blit(ctx, e, ox, oy, snapX, clipY, hexR, layout, battleTime);
        ctx.restore();
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
        ctx.globalCompositeOperation = e.p?.blendMode || (Number.isNaN(e.planeZ) ? GROUND_DRAPE.PAINTER_BLEND : GROUND_DRAPE.PLANE_BLEND);
        ctx.drawImage(canvas, (ix0 - dx0) * s, (iy0 - dy0) * s, (ix1 - ix0) * s, (iy1 - iy0) * s, ix0, iy0, ix1 - ix0, iy1 - iy0);
    }

    /** 本幀第一次需要時，把特效以目前裝置縮放畫進自己的離屏畫布（之後同一幀的其他格直接複製） */
    private ensureRendered(ctx: CanvasRenderingContext2D, e: DrapeEntry, layout: HexLayout, battleTime: number): boolean {
        if (e.drawnStamp === this.stamp) return e.drawnW > 0;
        e.drawnStamp = this.stamp;
        e.drawnW = 0;
        if (typeof document === 'undefined' || (!e.p && !e.painter)) return false;

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
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = RENDER_QUALITY.IMAGE_SMOOTHING;
        octx.globalAlpha = 1;
        octx.globalCompositeOperation = 'source-over';
        octx.clearRect(0, 0, w, h);
        octx.setTransform(s, 0, 0, s, w / 2, h / 2);
        if (e.p) ParticleRenderer.drawSingleParticle(octx, e.p, 0, 0, e.progress, layout, battleTime);
        else if (e.painter && e.painterAgent) e.painter(octx, e.painterAgent, battleTime, layout);
        octx.setTransform(1, 0, 0, 1, 0, 0);

        e.drawnW = w;
        e.drawnH = h;
        e.drawnScale = s;
        return true;
    }
}
