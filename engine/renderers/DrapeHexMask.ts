// ╔══════════════════════════════════════════════════════════╗
// ║  DrapeHexMask — 貼地鋪設的預烘六角遮罩                    ║
// ║  職責：把地圖六角格分成三色（相鄰格必不同色），每種顏色   ║
// ║        的所有格子烘成一張可重複的遮罩。鋪設特效與遮罩合成 ║
// ║        一次後，逐格貼回時用矩形就夠：矩形外框只會碰到相鄰 ║
// ║        格，而相鄰格在這一層是透明的。                     ║
// ║  [ARCH] iPhone 實測：每幀約 100 次六角路徑裁切就佔掉一半  ║
// ║  幀時間，矩形裁切與貼圖幾乎不花時間（WORKLOG §2 BH）。    ║
// ║  規則見 engine/renderers/RenderSpec.ts §9。               ║
// ╚══════════════════════════════════════════════════════════╝

import type { HexLayout } from "../../types";
import { GROUND_DRAPE, HEX_SIZE } from "../../constants";
import { HexGeometry } from "../graphics/utils/HexGeometry";
import { HexMath } from "../math/HexMath";

const COLORS = GROUND_DRAPE.HEX_MASK_COLORS;

/** (q−r) mod 3：六個鄰格的差都是 ±1 或 ±2，所以相鄰格必不同色 */
export function tileMaskColor(q: number, r: number): number {
    return (((q - r) % COLORS) + COLORS) % COLORS;
}

interface MaskTile {
    canvas: HTMLCanvasElement;
    /** 重複週期（世界座標） */
    worldW: number;
    worldH: number;
    pattern: CanvasPattern;
}

const tiles = new Map<HexLayout, MaskTile>();

/** 同色格的矩形週期：FLAT 是 (q+2, r−1) 與 (q, r+3)，POINTY 是 (q+3, r) 與 (q−1, r+2) */
function periodOf(layout: HexLayout): { w: number; h: number } {
    const flat = layout === 'FLAT';
    return {
        w: flat ? HexMath.hexToPixel(2, -1, 0, 0, layout).x : HexMath.hexToPixel(3, 0, 0, 0, layout).x,
        h: flat ? HexMath.hexToPixel(0, 3, 0, 0, layout).y : HexMath.hexToPixel(-1, 2, 0, 0, layout).y,
    };
}

function bake(layout: HexLayout, ctx: CanvasRenderingContext2D): MaskTile | null {
    const { w, h } = periodOf(layout);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * GROUND_DRAPE.HEX_MASK_BAKE_SCALE);
    canvas.height = Math.ceil(h * GROUND_DRAPE.HEX_MASK_BAKE_SCALE);
    const mctx = canvas.getContext('2d');
    if (!mctx) return null;
    mctx.scale(canvas.width / w, canvas.height / h);
    mctx.fillStyle = GROUND_DRAPE.HEX_MASK_FILL;
    const reach = GROUND_DRAPE.HEX_MASK_LATTICE_REACH;
    for (let q = -reach; q <= reach; q++) {
        for (let r = -reach; r <= reach; r++) {
            if (tileMaskColor(q, r) !== 0) continue;
            const p = HexMath.hexToPixel(q, r, 0, 0, layout);
            HexGeometry.traceHex(mctx, p.x, p.y, HEX_SIZE + GROUND_DRAPE.CLIP_EXPAND_PX, true, layout);
            mctx.fill();
        }
    }
    const pattern = ctx.createPattern(canvas, 'repeat');
    return pattern ? { canvas, worldW: w, worldH: h, pattern } : null;
}

/**
 * 把遮罩套到 lctx 目前的內容上（destination-in）：只留下與 (originX, originY) 那格同色的格子。
 * originX／originY＝該格中心在 lctx 上的裝置座標，scale＝世界座標到 lctx 的縮放。
 */
export function applyHexMask(lctx: CanvasRenderingContext2D, layout: HexLayout, originX: number, originY: number, scale: number, w: number, h: number): boolean {
    let tile = tiles.get(layout) ?? null;
    if (!tile) {
        tile = bake(layout, lctx);
        if (!tile) return false;
        tiles.set(layout, tile);
    }
    const sx = scale * tile.worldW / tile.canvas.width;
    const sy = scale * tile.worldH / tile.canvas.height;
    tile.pattern.setTransform(new DOMMatrix([sx, 0, 0, sy, originX, originY]));
    lctx.globalCompositeOperation = 'destination-in';
    lctx.fillStyle = tile.pattern;
    lctx.fillRect(0, 0, w, h);
    lctx.globalCompositeOperation = 'source-over';
    return true;
}
