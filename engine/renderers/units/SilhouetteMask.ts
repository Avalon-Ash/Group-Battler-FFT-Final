// ╔══════════════════════════════════════════════════════════╗
// ║  SilhouetteMask — 遮擋剪影只畫在擋住單位的東西上          ║
// ║  職責：把剪影裁成「前方高地塊柱」與「障礙物不透明像素」   ║
// ║  上游：RenderPipeline 剪影 pass（GridSpatial 遮擋來源＋    ║
// ║        當幀 TERRAIN／OBSTACLE op 的繪製位置）              ║
// ║  [ARCH] RenderSpec §13；座標一律取 op 的 snap 後繪製位置， ║
// ║        不自己重算高度或漂浮                               ║
// ╚══════════════════════════════════════════════════════════╝
//
// 以前剪影整個疊在被判定遮擋的單位上（25% 白），露在外面的身體也變灰白。

import { HEX_SIZE, SILHOUETTE_MASK } from "../../../constants";
import { HexLayout } from "../../../types";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SpriteManager } from "../../sprites";
import { RenderDispatcher } from "../RenderDispatcher";
import type { RenderOp } from "../RenderList";
import { createCanvas } from "../../graphics/CanvasUtils";

type Pt = { x: number; y: number };

/** 凸包（monotone chain），回傳逆時針頂點；同一方向的子路徑聯集時不會互相挖洞 */
export function convexHull(points: readonly Pt[]): Pt[] {
    const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    if (p.length < 3) return p;
    const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: Pt[] = [];
    for (const pt of p) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
        lower.push(pt);
    }
    const upper: Pt[] = [];
    for (let i = p.length - 1; i >= 0; i--) {
        const pt = p[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
        upper.push(pt);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

/** 地塊柱的外形（相對頂面中心）：頂面六角＋往下 COLUMN_DEPTH 的凸包。依 layout 快取 */
const columnShapes = new Map<HexLayout, Pt[]>();
export function columnShape(layout: HexLayout): Pt[] {
    let shape = columnShapes.get(layout);
    if (!shape) {
        const top = HexGeometry.getVertices(HEX_SIZE, true, layout);
        shape = convexHull([...top, ...top.map(v => ({ x: v.x, y: v.y + SILHOUETTE_MASK.COLUMN_DEPTH }))]);
        columnShapes.set(layout, shape);
    }
    return shape;
}

let scratch: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
function scratchOfSize(w: number, h: number): CanvasRenderingContext2D {
    if (!scratch) scratch = createCanvas(w, h);
    if (scratch.canvas.width < w) scratch.canvas.width = w;
    if (scratch.canvas.height < h) scratch.canvas.height = h;
    return scratch.ctx;
}

export const SilhouetteMask = {
    /**
     * 把一個單位的剪影只畫在擋住它的東西上。
     * tileOps：前方高地塊的 TERRAIN op（頂面中心＝snap(tx), snap(ty) − th）；obstacleOps：障礙物的 OBSTACLE op（頂面＝snap(ty)）。
     * drawSilhouette(c)：在 c 上以世界座標畫這個單位的剪影（UnitRenderSystem.drawSilhouette）。
     */
    draw(
        ctx: CanvasRenderingContext2D,
        tileOps: readonly RenderOp[],
        obstacleOps: readonly RenderOp[],
        layout: HexLayout,
        t: number,
        drawSilhouette: (c: CanvasRenderingContext2D) => void,
    ): void {
        if (tileOps.length > 0) {
            const shape = columnShape(layout);
            ctx.save();
            ctx.beginPath();
            for (const op of tileOps) {
                const cx = RenderDispatcher.snap(op.tx, 0);
                const cy = RenderDispatcher.snap(op.ty, 1) - op.th;
                ctx.moveTo(cx + shape[0].x, cy + shape[0].y);
                for (let i = 1; i < shape.length; i++) ctx.lineTo(cx + shape[i].x, cy + shape[i].y);
                ctx.closePath();
            }
            ctx.clip();
            drawSilhouette(ctx);
            ctx.restore();
        }

        if (obstacleOps.length > 0) {
            const m = ctx.getTransform();
            for (const op of obstacleOps) {
                const ob = SpriteManager.getObstacleSprite(op.ttype, layout, op.tq, op.tr, t);
                const sx = RenderDispatcher.snap(op.tx, 0) - ob.anchorX;
                const sy = RenderDispatcher.snap(op.ty, 1) - ob.anchorY;
                // 障礙物圖的外框換到裝置像素（剪影 pass 的變換只有縮放＋平移）
                const dx0 = Math.floor(m.a * sx + m.e);
                const dy0 = Math.floor(m.d * sy + m.f);
                const dw = Math.ceil(m.a * (sx + ob.width) + m.e) - dx0;
                const dh = Math.ceil(m.d * (sy + ob.height) + m.f) - dy0;
                if (dw <= 0 || dh <= 0) continue;
                const s = scratchOfSize(dw, dh);
                s.setTransform(1, 0, 0, 1, 0, 0);
                s.globalCompositeOperation = 'source-over';
                s.globalAlpha = 1;
                s.clearRect(0, 0, dw, dh);
                // 同一個世界→裝置變換，只是原點移到這個外框的左上角
                s.setTransform(m.a, m.b, m.c, m.d, m.e - dx0, m.f - dy0);
                drawSilhouette(s);
                // 只留障礙物圖不透明的地方
                s.globalCompositeOperation = 'destination-in';
                if (ob.sw !== undefined) s.drawImage(ob.image, ob.sx!, ob.sy!, ob.sw, ob.sh!, sx, sy, ob.width, ob.height);
                else s.drawImage(ob.image, sx, sy, ob.width, ob.height);
                s.globalCompositeOperation = 'source-over';
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.drawImage(s.canvas, 0, 0, dw, dh, dx0, dy0, dw, dh);
                ctx.restore();
            }
        }
    },
};
