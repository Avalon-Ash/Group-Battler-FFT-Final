// ╔══════════════════════════════════════════════════════════╗
// ║  SoftTile — 柔光格 sprite（半透明底＋模糊內緣光＋淡細芯線）  ║
// ║  上游：GridOverlays（預警／射程／滑過）、ZoneRenderer（區域  ║
// ║        波紋與邊界）；參數 GRID_OVERLAY.TILE                   ║
// ║  [ARCH] 2026-10-19 取代逐格描 1.5～2 px 實線六角（相鄰格雙邊  ║
// ║  排成密集網格，畫面毛刺、髒）。模糊只在烘焙時用；sprite 依外  ║
// ║  觀×尺寸×layout 快取，原點＝格中心（已含 ISO 壓扁）。         ║
// ╚══════════════════════════════════════════════════════════╝

import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { createCanvas } from "../../graphics/CanvasUtils";
import { HexLayout } from "../../../types";
import { GRID_OVERLAY } from "../../../constants";

export interface SoftTileLook { fill: string; edge: string; fillAlpha: number; edgeAlpha: number; coreAlpha: number }

const cache = new Map<string, HTMLCanvasElement>();

function sprite(look: SoftTileLook, size: number, layout: HexLayout): HTMLCanvasElement {
    const key = `${look.fill}|${look.edge}|${look.fillAlpha}|${look.edgeAlpha}|${look.coreAlpha}|${size}|${layout}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const T = GRID_OVERLAY.TILE;
    const half = size + T.PAD;
    const side = Math.ceil(half * 2 * T.BAKE_SCALE);
    const { canvas, ctx } = createCanvas(side, side);
    ctx.scale(T.BAKE_SCALE, T.BAKE_SCALE);
    ctx.translate(half, half);
    if (look.fillAlpha > 0) {
        ctx.fillStyle = look.fill;
        ctx.globalAlpha = look.fillAlpha;
        HexGeometry.traceHex(ctx, 0, 0, size * T.FILL_RADIUS, true, layout);
        ctx.fill();
    }
    ctx.strokeStyle = look.edge;
    ctx.lineJoin = 'round';
    if (look.edgeAlpha > 0) {
        ctx.filter = `blur(${T.EDGE_BLUR * T.BAKE_SCALE}px)`;
        ctx.lineWidth = T.EDGE_W;
        ctx.globalAlpha = look.edgeAlpha;
        HexGeometry.traceHex(ctx, 0, 0, size * T.EDGE_RADIUS, true, layout);
        ctx.stroke();
        ctx.filter = 'none';
    }
    if (look.coreAlpha > 0) {
        ctx.lineWidth = T.CORE_W;
        ctx.globalAlpha = look.coreAlpha;
        HexGeometry.traceHex(ctx, 0, 0, size * T.EDGE_RADIUS, true, layout);
        ctx.stroke();
    }
    cache.set(key, canvas);
    return canvas;
}

export const SoftTile = {
    /** 在原點畫一格柔光格；scale 放大整格（區域波紋的擴張） */
    draw(ctx: CanvasRenderingContext2D, look: SoftTileLook, size: number, layout: HexLayout, scale = 1): void {
        const half = (size + GRID_OVERLAY.TILE.PAD) * scale;
        ctx.drawImage(sprite(look, size, layout), -half, -half, half * 2, half * 2);
    },

    /** 測試／工具用 */
    reset(): void {
        cache.clear();
    },
};
