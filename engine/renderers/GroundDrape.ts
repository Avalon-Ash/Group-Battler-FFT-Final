// ╔══════════════════════════════════════════════════════════╗
// ║  GroundDrape — 貼地鋪設層（FFT 風格：法陣鋪在每格頂面）    ║
// ║  職責：本幀的大型平貼特效（法陣、震波、龜裂…）不進 RenderList ║
// ║        排序，登記在這裡；RenderDispatcher 畫每個 TERRAIN op  ║
// ║        時，貼到該格頂面六邊形、貼合該格高度與漂浮位移。     ║
// ║  [ARCH] 規則見 engine/renderers/RenderSpec.ts §1、§2、§9：    ║
// ║  鋪設特效不是排序 op，所以沒有「單位站在法陣上」的排序環；    ║
// ║  站在該格的單位在該格 TERRAIN 之後才畫，棋座壓在法陣上       ║
// ║  （ART_SPEC §13）。分類與參數：constants/vfx.ts GROUND_DRAPE。    ║
// ║  池化：登記項與離屏畫布皆重複使用。離屏畫布每 CANVAS_TRIM_FRAMES ║
// ║  幀檢查一次：這段期間沒用到的釋放（寬高設 0），需求遠小於容量   ║
// ║  的縮小（大範圍奧義會把畫布撐到 2048²，iPhone 長跑因此被系統   ║
// ║  回收分頁，2026-10-26）。                                     ║
// ║  除了粒子，也接受「繪製函式＋單位」（施法 AOE 地面預警），    ║
// ║  一律走離屏畫布；函式是靜態參考，不每幀配置閉包。            ║
// ║  懸空平面（planeZ，詠唱環）：不貼頂面，而是以固定高度逐格裁切；║
// ║  頂面高過平面的格子不畫（被擋住），施法者那格只畫後半，前半  ║
// ║  由 AURA op 在施法者之後補畫（RenderSpec §9）。              ║
// ║  不用路徑裁切（iPhone 上是最貴的一步）：貼頂面的特效依混合    ║
// ║  模式合成一張圖，懸空平面各自一張，都與預烘六角遮罩合成成     ║
// ║  三色層（DrapeHexMask），逐格只貼矩形。                       ║
// ╚══════════════════════════════════════════════════════════╝

import type { Particle } from "../presentation/vfx/state";
import type { HexLayout } from "../../types";
import { ParticleRenderer } from "../presentation/vfx/renderers/ParticleRenderer";
import { GROUND_DRAPE, ISO_SCALE_Y, RENDER_QUALITY } from "../../constants";
import type { RenderOp } from "./RenderList";
import { applyHexMask, tileMaskColor } from "./DrapeHexMask";
import { isMemoryConstrainedDevice } from "./RenderQuality";
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
    // ── 離屏畫布（只有懸空平面用；貼頂面的進合成圖） ──
    canvas: HTMLCanvasElement | null;
    cctx: CanvasRenderingContext2D | null;
    /** 本幀已畫好的區域（裝置像素）與縮放；drawnStamp !== 當前幀代表尚未畫 */
    drawnStamp: number;
    drawnW: number;
    drawnH: number;
    drawnScale: number;
    /** 本次整理週期內實際需要的最大寬高（裝置像素）；整理時據此縮小或釋放畫布，然後歸零 */
    peakW: number;
    peakH: number;
    /** 與預烘六角遮罩合成後的三色層（DrapeHexMask），用到才建；layerStamps 記每層本幀是否已合成 */
    layers: (HTMLCanvasElement | null)[];
    layerCtxs: (CanvasRenderingContext2D | null)[];
    layerStamps: number[];
}

/** 預烘遮罩的三色層與來源圖（DrapeEntry 與 DrapePlane 共用同一套合成） */
type MaskHolder = Pick<DrapeEntry, 'canvas' | 'drawnW' | 'drawnH' | 'drawnScale' | 'layers' | 'layerCtxs' | 'layerStamps'>;

/** 同一種混合模式的貼頂面特效合成的一張圖：不管場上幾個特效，每幀都只有這張加三色層 */
interface DrapePlane extends MaskHolder {
    blend: GlobalCompositeOperation;
    cctx: CanvasRenderingContext2D | null;
    /** 這張圖左上角的世界座標（足跡平面，不含高度與漂浮） */
    minX: number;
    minY: number;
    /** 本幀登記到這張圖的特效與其涵蓋範圍聯集 */
    members: DrapeEntry[];
    maxX: number;
    maxY: number;
    peakW: number;
    peakH: number;
    /** 這格已經貼過了（一格只貼一次，涵蓋它的特效都已合在圖裡） */
    lastTile: number;
}

function createEntry(): DrapeEntry {
    return {
        p: null, painter: null, painterAgent: null, planeZ: NaN, ownQ: 0, ownR: 0, x: 0, footY: 0, reach: 0, extW: 0, extH: 0, progress: 0,
        canvas: null, cctx: null, drawnStamp: -1, drawnW: 0, drawnH: 0, drawnScale: 1, peakW: 0, peakH: 0,
        layers: [null, null, null], layerCtxs: [null, null, null], layerStamps: [-1, -1, -1],
    };
}

/** 離屏畫布單邊上限：觸控裝置較低，避免合成圖加三色層吃太多記憶體 */
function maxCanvasPx(): number {
    return isMemoryConstrainedDevice() ? GROUND_DRAPE.MAX_CANVAS_PX_TOUCH : GROUND_DRAPE.MAX_CANVAS_PX;
}

export class GroundDrapeLayer {
    private readonly entries: DrapeEntry[] = [];
    private readonly planes = new Map<GlobalCompositeOperation, DrapePlane>();
    private planesStamp = -1;
    private tileToken = 0;
    private count = 0;
    private stamp = 0;

    /** 每幀提交之前呼叫一次 */
    public begin(): void {
        this.count = 0;
        this.stamp++;
        if (this.stamp % GROUND_DRAPE.CANVAS_TRIM_FRAMES === 0) this.trimCanvases();
    }

    /** 整理離屏畫布：整個週期沒用到的釋放；容量超過需求 CANVAS_SHRINK_RATIO 倍的縮到需求大小 */
    private trimCanvases(): void {
        const step = GROUND_DRAPE.CANVAS_GROW_STEP_PX;
        for (const plane of this.planes.values()) {
            if (plane.peakW === 0 && plane.canvas) {
                for (const c of [plane.canvas, ...plane.layers]) {
                    if (c) { c.width = 0; c.height = 0; }
                }
                plane.canvas = null;
                plane.cctx = null;
                plane.layers = [null, null, null];
                plane.layerCtxs = [null, null, null];
            }
            plane.peakW = 0;
            plane.peakH = 0;
        }
        for (const e of this.entries) {
            const c = e.canvas;
            if (c) {
                if (e.peakW === 0 || e.peakH === 0) {
                    for (let k = 0; k < e.layers.length; k++) {
                        const layer = e.layers[k];
                        if (layer) { layer.width = 0; layer.height = 0; }
                        e.layers[k] = null;
                        e.layerCtxs[k] = null;
                    }
                    // 寬高設 0 才會立刻還回點陣記憶體（WebKit 不等 GC）
                    c.width = 0;
                    c.height = 0;
                    e.canvas = null;
                    e.cctx = null;
                } else {
                    const needW = Math.ceil(e.peakW / step) * step;
                    const needH = Math.ceil(e.peakH / step) * step;
                    if (c.width * c.height > needW * needH * GROUND_DRAPE.CANVAS_SHRINK_RATIO) {
                        c.width = needW;
                        c.height = needH;
                        for (const layer of e.layers) {
                            if (layer) { layer.width = needW; layer.height = needH; }
                        }
                    }
                }
            }
            e.peakW = 0;
            e.peakH = 0;
        }
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
    }

    /** 非粒子的貼地繪製（例：施法 AOE 預警）。painter 在原點畫出整個圖形，和粒子一起進合成圖。 */
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
        this.renderPlanes(ctx, layout, battleTime);
        const tile = ++this.tileToken;
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
            const plane = this.planes.get(this.blendOf(e));
            if (plane && plane.lastTile !== tile) {
                plane.lastTile = tile;
                this.blitPlane(ctx, plane, op, snapX, topY, hexR, layout);
            }
        }
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
     * 懸空平面在一格上的片段：平面高度上該格的六邊形（三色層的矩形）。該格頂面高過平面＝被擋住不畫；
     * 施法者那格只畫後半（平面中心線以上，矩形裁切），前半由 AURA op 補畫。
     */
    private drawPlaneOnTile(ctx: CanvasRenderingContext2D, e: DrapeEntry, op: RenderOp, snapX: number, hexR: number, bob: number, layout: HexLayout, battleTime: number): void {
        const tileTop = op.th - bob;
        if (tileTop > e.planeZ + GROUND_DRAPE.PLANE_OCCLUDE_EPS) return;
        const clipY = Math.round(op.y - e.planeZ);
        const ox = Math.round(e.x);
        const oy = Math.round(e.footY - e.planeZ);
        ctx.save();
        if (op.tq === e.ownQ && op.tr === e.ownR) {
            ctx.beginPath();
            ctx.rect(snapX - hexR * 2, clipY - hexR * 2, hexR * 4, oy - (clipY - hexR * 2));
            ctx.clip();
        }
        this.blit(ctx, e, op, ox, oy, snapX, clipY, hexR, layout, battleTime);
        ctx.restore();
    }

    private blendOf(e: DrapeEntry): GlobalCompositeOperation {
        return e.p?.blendMode || GROUND_DRAPE.PAINTER_BLEND;
    }

    /** 本幀第一次畫地塊時，把所有貼頂面特效依混合模式合成各一張圖 */
    private renderPlanes(ctx: CanvasRenderingContext2D, layout: HexLayout, battleTime: number): void {
        if (this.planesStamp === this.stamp) return;
        this.planesStamp = this.stamp;
        for (const plane of this.planes.values()) {
            plane.members.length = 0;
            plane.minX = plane.minY = Infinity;
            plane.maxX = plane.maxY = -Infinity;
            plane.drawnW = 0;
            plane.lastTile = -1;
        }
        for (let i = 0; i < this.count; i++) {
            const e = this.entries[i];
            if ((!e.p && !e.painter) || !Number.isNaN(e.planeZ)) continue;
            const blend = this.blendOf(e);
            let plane = this.planes.get(blend);
            if (!plane) {
                plane = {
                    blend, canvas: null, cctx: null, drawnW: 0, drawnH: 0, drawnScale: 1, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity,
                    members: [], peakW: 0, peakH: 0, lastTile: -1, layers: [null, null, null], layerCtxs: [null, null, null], layerStamps: [-1, -1, -1],
                };
                this.planes.set(blend, plane);
            }
            plane.members.push(e);
            plane.minX = Math.min(plane.minX, e.x - e.extW);
            plane.maxX = Math.max(plane.maxX, e.x + e.extW);
            plane.minY = Math.min(plane.minY, e.footY - e.extH);
            plane.maxY = Math.max(plane.maxY, e.footY + e.extH);
        }

        const tf = ctx.getTransform();
        const deviceScale = Math.hypot(tf.a, tf.b) || 1;
        const maxPx = maxCanvasPx();
        const step = GROUND_DRAPE.CANVAS_GROW_STEP_PX;
        for (const plane of this.planes.values()) {
            if (plane.members.length === 0) continue;
            const worldW = plane.maxX - plane.minX;
            const worldH = plane.maxY - plane.minY;
            const s = Math.min(deviceScale, maxPx / worldW, maxPx / worldH);
            const w = Math.ceil(worldW * s);
            const h = Math.ceil(worldH * s);
            if (!plane.canvas) {
                plane.canvas = document.createElement('canvas');
                plane.cctx = plane.canvas.getContext('2d');
            }
            const octx = plane.cctx;
            if (!octx) continue;
            if (plane.canvas.width < w) plane.canvas.width = Math.ceil(w / step) * step;
            if (plane.canvas.height < h) plane.canvas.height = Math.ceil(h / step) * step;
            plane.peakW = Math.max(plane.peakW, w);
            plane.peakH = Math.max(plane.peakH, h);
            octx.setTransform(1, 0, 0, 1, 0, 0);
            octx.imageSmoothingEnabled = true;
            octx.imageSmoothingQuality = RENDER_QUALITY.IMAGE_SMOOTHING;
            octx.globalAlpha = 1;
            octx.globalCompositeOperation = 'source-over';
            octx.clearRect(0, 0, w, h);
            for (const e of plane.members) {
                octx.setTransform(s, 0, 0, s, (Math.round(e.x) - plane.minX) * s, (Math.round(e.footY) - plane.minY) * s);
                octx.globalAlpha = 1;
                octx.globalCompositeOperation = plane.blend;
                if (e.p) ParticleRenderer.drawSingleParticle(octx, e.p, 0, 0, e.progress, layout, battleTime);
                else if (e.painter && e.painterAgent) e.painter(octx, e.painterAgent, battleTime, layout);
            }
            octx.setTransform(1, 0, 0, 1, 0, 0);
            plane.drawnW = w;
            plane.drawnH = h;
            plane.drawnScale = s;
        }
    }

    /** 合成圖貼到這一格：來源矩形以格子在足跡平面的位置取，貼到該格頂面 */
    private blitPlane(ctx: CanvasRenderingContext2D, plane: DrapePlane, op: RenderOp, snapX: number, topY: number, hexR: number, layout: HexLayout): void {
        if (plane.drawnW === 0) return;
        const s = plane.drawnScale;
        const layer = this.maskedLayer(plane, op, layout, (op.tx - plane.minX) * s, (op.y - plane.minY) * s);
        if (!layer) return;
        const pad = GROUND_DRAPE.CLIP_EXPAND_PX + 1;
        const halfW = hexR + pad;
        const halfH = hexR * ISO_SCALE_Y + pad;
        // 世界座標的格子外框，裁到合成圖範圍內；世界與頂面只差一個平移
        const wx0 = Math.max(op.tx - halfW, plane.minX);
        const wy0 = Math.max(op.y - halfH, plane.minY);
        const wx1 = Math.min(op.tx + halfW, plane.minX + plane.drawnW / s);
        const wy1 = Math.min(op.y + halfH, plane.minY + plane.drawnH / s);
        if (wx1 <= wx0 || wy1 <= wy0) return;
        const prev = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = plane.blend;
        ctx.drawImage(layer, (wx0 - plane.minX) * s, (wy0 - plane.minY) * s, (wx1 - wx0) * s, (wy1 - wy0) * s, snapX + (wx0 - op.tx), topY + (wy0 - op.y), wx1 - wx0, wy1 - wy0);
        ctx.globalCompositeOperation = prev;
    }

    /** 懸空平面的三色層貼到這一格：只複製與該格外框相交的部分 */
    private blit(ctx: CanvasRenderingContext2D, e: DrapeEntry, op: RenderOp, ox: number, oy: number, hexX: number, hexTopY: number, hexR: number, layout: HexLayout, battleTime: number): void {
        if (!this.ensureRendered(ctx, e, layout, battleTime)) return;
        const canvas = this.maskedLayer(e, op, layout, e.drawnW / 2 + (op.tx - e.x) * e.drawnScale, e.drawnH / 2 + (op.y - e.footY) * e.drawnScale);
        if (!canvas) return;
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
        ctx.globalCompositeOperation = GROUND_DRAPE.PLANE_BLEND;
        ctx.drawImage(canvas, (ix0 - dx0) * s, (iy0 - dy0) * s, (ix1 - ix0) * s, (iy1 - iy0) * s, ix0, iy0, ix1 - ix0, iy1 - iy0);
    }

    /**
     * 本幀第一次需要這一色時，把離屏圖複製一份並套上預烘遮罩。格子與特效的相對位置和格高無關，
     * 所以同一層能給所有同色格用；矩形外框只碰得到相鄰格，而相鄰格在這層是透明的。
     */
    private maskedLayer(e: MaskHolder, op: RenderOp, layout: HexLayout, originX: number, originY: number): HTMLCanvasElement | null {
        const source = e.canvas;
        if (!source) return null;
        const k = tileMaskColor(op.tq, op.tr);
        if (e.layerStamps[k] === this.stamp) return e.layers[k];
        e.layerStamps[k] = this.stamp;
        let layer = e.layers[k];
        if (!layer) {
            layer = document.createElement('canvas');
            e.layers[k] = layer;
            e.layerCtxs[k] = layer.getContext('2d');
        }
        const lctx = e.layerCtxs[k];
        if (!lctx) return null;
        if (layer.width < source.width) layer.width = source.width;
        if (layer.height < source.height) layer.height = source.height;
        const w = e.drawnW, h = e.drawnH;
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.globalCompositeOperation = 'source-over';
        lctx.clearRect(0, 0, w, h);
        lctx.drawImage(source, 0, 0, w, h, 0, 0, w, h);
        return applyHexMask(lctx, layout, originX, originY, e.drawnScale, w, h) ? layer : null;
    }

    /** 本幀第一次需要時，把特效以目前裝置縮放畫進自己的離屏畫布（之後同一幀的其他格直接複製） */
    private ensureRendered(ctx: CanvasRenderingContext2D, e: DrapeEntry, layout: HexLayout, battleTime: number): boolean {
        if (e.drawnStamp === this.stamp) return e.drawnW > 0;
        e.drawnStamp = this.stamp;
        e.drawnW = 0;
        if (typeof document === 'undefined' || (!e.p && !e.painter)) return false;

        const tf = ctx.getTransform();
        const deviceScale = Math.hypot(tf.a, tf.b) || 1;
        const maxPx = maxCanvasPx();
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
        if (w > e.peakW) e.peakW = w;
        if (h > e.peakH) e.peakH = h;

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
