// Ashen（RED）棋座程序化畫法：碎裂焦黑的六角，缺角、斷邊、裂縫透出餘燼。
// 顏色全部來自 FACTION_SKINS（data/units/factionSkin.ts）；手繪貼圖存在時由 UnitFactory 逐層取代。
import { HexLayout } from "../../../types";
import { FactionSkin } from "../../../data/units/factionSkin";
import type { PedestalPainter } from "../UnitFactory";
import {
    PedestalOutline,
    projectIso,
    hexPlane,
    tracePedestalOutline,
    drawPedestalSlab,
    fillPedestalTop,
} from "./PedestalGeometry";

/** 每個頂點的缺角比例（沿相鄰兩邊截掉的長度比例；固定值，烘焙結果可重現） */
const CORNER_CHIPS = [0.16, 0.04, 0.22, 0.07, 0.18, 0.1];
/** 邊框斷口：每條邊的描邊區段 [起, 迄]（0..1），沒列到的部分是斷口 */
const RIM_SEGMENTS: [number, number][][] = [
    [[0, 0.62], [0.74, 1]],
    [[0, 1]],
    [[0.08, 0.46], [0.58, 1]],
    [[0, 0.8]],
    [[0, 0.35], [0.5, 1]],
    [[0.12, 1]],
];
/** 裂縫：從中心附近往外的折線（以 radius 為單位的平面座標） */
const CRACKS: { x: number; y: number }[][] = [
    [{ x: 0.12, y: -0.05 }, { x: 0.38, y: -0.22 }, { x: 0.52, y: -0.18 }, { x: 0.78, y: -0.4 }],
    [{ x: -0.1, y: 0.08 }, { x: -0.32, y: 0.3 }, { x: -0.3, y: 0.48 }, { x: -0.55, y: 0.66 }],
    [{ x: 0.05, y: 0.14 }, { x: 0.22, y: 0.42 }, { x: 0.46, y: 0.5 }],
    [{ x: -0.14, y: -0.1 }, { x: -0.44, y: -0.2 }, { x: -0.7, y: -0.12 }],
];

function chippedHexPlane(radius: number, layout: HexLayout): { x: number; y: number }[] {
    const verts = hexPlane(radius, layout);
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < verts.length; i++) {
        const prev = verts[(i + verts.length - 1) % verts.length];
        const cur = verts[i];
        const next = verts[(i + 1) % verts.length];
        const chip = CORNER_CHIPS[i % CORNER_CHIPS.length];
        out.push({ x: cur.x + (prev.x - cur.x) * chip, y: cur.y + (prev.y - cur.y) * chip });
        out.push({ x: cur.x + (next.x - cur.x) * chip, y: cur.y + (next.y - cur.y) * chip });
    }
    return out;
}

export const CovenantTokenFactory: PedestalPainter = {

    outline(skin: FactionSkin, layout: HexLayout): PedestalOutline {
        return projectIso(chippedHexPlane(skin.pedestal.radius, layout));
    },

    drawSlab(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline): void {
        drawPedestalSlab(ctx, skin, outline);
    },

    drawTop(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline): void {
        const p = skin.pedestal;
        fillPedestalTop(ctx, skin, outline);

        // 裂縫：暗底＋餘燼亮芯
        ctx.save();
        tracePedestalOutline(ctx, outline);
        ctx.clip();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (const crack of CRACKS) {
            const pts = projectIso(crack.map((q) => ({ x: q.x * p.radius, y: q.y * p.radius })));
            ctx.beginPath();
            pts.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
            ctx.strokeStyle = p.sideShadow;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.strokeStyle = p.ember;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    },

    drawRim(ctx: CanvasRenderingContext2D, skin: FactionSkin, outline: PedestalOutline, layout: HexLayout): void {
        const p = skin.pedestal;
        ctx.save();
        ctx.lineCap = 'butt';

        // 焦黑底線沿整個缺角輪廓
        tracePedestalOutline(ctx, outline);
        ctx.strokeStyle = p.rimShadow;
        ctx.lineWidth = 4;
        ctx.stroke();

        // 斷裂的金屬邊：只沿正六角的部分區段描亮線
        const hex = projectIso(hexPlane(p.radius, layout));
        ctx.strokeStyle = p.rim;
        ctx.lineWidth = 2;
        for (let i = 0; i < hex.length; i++) {
            const a = hex[i];
            const b = hex[(i + 1) % hex.length];
            const chipA = CORNER_CHIPS[i % CORNER_CHIPS.length];
            const chipB = CORNER_CHIPS[(i + 1) % CORNER_CHIPS.length];
            for (const [s, e] of RIM_SEGMENTS[i % RIM_SEGMENTS.length]) {
                const from = Math.max(s, chipA);
                const to = Math.min(e, 1 - chipB);
                if (to <= from) continue;
                ctx.beginPath();
                ctx.moveTo(a.x + (b.x - a.x) * from, a.y + (b.y - a.y) * from);
                ctx.lineTo(a.x + (b.x - a.x) * to, a.y + (b.y - a.y) * to);
                ctx.stroke();
            }
        }

        // 內緣（齒尖金屬光）
        tracePedestalOutline(ctx, projectIso(chippedHexPlane(p.radius - 5, layout)));
        ctx.strokeStyle = p.innerRim;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 魔紋環（虛線六角）
        tracePedestalOutline(ctx, projectIso(hexPlane(p.radius * 0.6, layout)));
        ctx.strokeStyle = p.ring;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    },

    drawEmblem(ctx: CanvasRenderingContext2D, skin: FactionSkin, layout: HexLayout): void {
        // 程序化徽記：中央黑核（佔位，日後由 emblem 貼圖取代）
        const p = skin.pedestal;
        ctx.save();
        ctx.globalAlpha = p.emblemAlpha;
        tracePedestalOutline(ctx, projectIso(chippedHexPlane(p.radius * p.emblemScale, layout)));
        ctx.fillStyle = p.emblem;
        ctx.fill();
        ctx.restore();
    },
};
