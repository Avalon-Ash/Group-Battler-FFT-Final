// 棋座共用幾何：六角輪廓、等距投影、側面厚度。供 Imperial／Covenant 棋座畫法與 UnitFactory 使用。
import { HexLayout } from "../../../types";
import { ISO_SCALE_Y } from "../../../constants";
import { HexGeometry } from "../utils/HexGeometry";
import { FactionSkin } from "../../../data/units/factionSkin";

/** 棋座頂面輪廓（已等距投影、以棋座中心為原點） */
export type PedestalOutline = { x: number; y: number }[];

/** 平面座標點 → 等距投影 */
export function projectIso(points: { x: number; y: number }[]): PedestalOutline {
    return points.map((p) => ({ x: p.x, y: p.y * ISO_SCALE_Y }));
}

/** 正六角輪廓（平面座標，未投影） */
export function hexPlane(radius: number, layout: HexLayout): { x: number; y: number }[] {
    return HexGeometry.getVertices(radius, false, layout);
}

export function tracePedestalOutline(ctx: CanvasRenderingContext2D, outline: PedestalOutline): void {
    ctx.beginPath();
    outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
}

/**
 * 實體棋座的厚度：落地陰影＋側面（每條邊往下延伸 thickness），之後由頂面蓋住背面。
 */
export function drawPedestalSlab(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline): void {
    const p = skin.pedestal;
    const t = p.thickness;

    // 落地陰影（比棋座略大、往下偏移）
    ctx.save();
    ctx.translate(0, t + 2);
    ctx.scale(1.08, 1.08);
    tracePedestalOutline(ctx, outline);
    ctx.fillStyle = p.dropShadow;
    ctx.fill();
    ctx.restore();

    // 側面：每條邊的四邊形，垂直漸層由亮到暗
    const sideGrad = ctx.createLinearGradient(0, 0, 0, t + outline.reduce((m, q) => Math.max(m, q.y), 0));
    sideGrad.addColorStop(0, p.sideColor);
    sideGrad.addColorStop(1, p.sideShadow);
    ctx.fillStyle = sideGrad;
    for (let i = 0; i < outline.length; i++) {
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(b.x, b.y + t);
        ctx.lineTo(a.x, a.y + t);
        ctx.closePath();
        ctx.fill();
    }
    // 底緣描邊，讓棋座從地面分離
    ctx.save();
    ctx.translate(0, t);
    tracePedestalOutline(ctx, outline);
    ctx.strokeStyle = p.sideShadow;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
}

/** 頂面徑向漸層（在等距壓扁的座標系建立，呈橢圓） */
export function fillPedestalTop(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline): void {
    const p = skin.pedestal;
    const r = p.radius;
    ctx.save();
    tracePedestalOutline(ctx, outline);
    ctx.clip();
    ctx.scale(1, ISO_SCALE_Y);
    const grad = ctx.createRadialGradient(-r * 0.28, -r * 0.35, r * 0.05, 0, 0, r);
    grad.addColorStop(0, p.topHighlight);
    grad.addColorStop(0.45, p.topBase);
    grad.addColorStop(0.85, p.topDeep);
    grad.addColorStop(1, p.topEdge);
    ctx.fillStyle = grad;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
}
