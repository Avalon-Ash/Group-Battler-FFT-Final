// ╔══════════════════════════════════════════════════════════╗
// ║  UnitAfterimagePainter — 衝刺／高速移動殘影                ║
// ║  職責：在本體後面畫幾個「同一張精靈影格」的半透明複製，      ║
// ║        染成陣營軌跡色，沿 trailHistory 的過去位置遞減淡出    ║
// ║  上游：UnitBodyPainter（本體之前呼叫）、UnitFrame.ghosts     ║
// ║        （偏移已換算好，Afterimage.ts）、SpriteUnitRenderer.   ║
// ║        resolveFrame（與本體同一影格、同一朝向）              ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §10：      ║
// ║  ctx 原點＝單位目前腳底繪製點；殘影屬於單位 op 的一部分，    ║
// ║  跟著單位排序，沒有新的 op。                                 ║
// ║  [ARCH] 染色影格快取：每個 (圖集, Mip, 影格, 顏色) 一張小    ║
// ║  畫布，只在第一次用到時建立；每幀零分配，數量有上限          ║
// ║  （AFTERIMAGE.MAX_TINTED_FRAMES）。品質階層越低殘影越少。    ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../../game";
import { AFTERIMAGE, UNIT_SCALE } from "../../../../constants";
import { VisualMath } from "../../../math/VisualMath";
import { getFactionSkin } from "../../../../data/units/factionSkin";
import { spriteAtlasStore } from "../SpriteAtlasStore";
import { SpriteUnitRenderer, createResolvedSpriteFrame } from "../factions/SpriteUnitRenderer";
import { getQualityTier } from "../../RenderQuality";
import type { UnitFrame } from "../../frame/UnitFrame";
import { createCanvas } from "../../../graphics/CanvasUtils";

const tintedFrames = new Map<string, HTMLCanvasElement>();
const resolved = createResolvedSpriteFrame();

function getTintedFrame(
    manifestKey: string, mip: number,
    fx: number, fy: number, fw: number, fh: number, color: string
): HTMLCanvasElement | null {
    const key = `${manifestKey}|${mip}|${fx}|${fy}|${color}`;
    const hit = tintedFrames.get(key);
    if (hit) return hit;

    const atlas = spriteAtlasStore.getAtlas(manifestKey, mip);
    if (!atlas) return null;
    const sw = Math.max(1, Math.round(fw * mip));
    const sh = Math.max(1, Math.round(fh * mip));
    const { canvas, ctx } = createCanvas(sw, sh);
    ctx.drawImage(atlas, fx * mip, fy * mip, fw * mip, fh * mip, 0, 0, sw, sh);
    // 只染在有像素的地方（保留角色細節，再疊上陣營軌跡色）
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = AFTERIMAGE.TINT_STRENGTH;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, sw, sh);

    if (tintedFrames.size >= AFTERIMAGE.MAX_TINTED_FRAMES) {
        const oldest = tintedFrames.keys().next().value;
        if (oldest !== undefined) tintedFrames.delete(oldest);
    }
    tintedFrames.set(key, canvas);
    return canvas;
}

export const UnitAfterimagePainter = {
    /**
     * @param rotation   本體這一幀用的旋轉（physics.angle + 速度傾斜）；殘影重現同一個姿勢
     * @param bodyFloat  本體這一幀的上下漂浮（已含在本體 translate 內）
     */
    draw(
        ctx: CanvasRenderingContext2D, agent: Agent, frame: UnitFrame,
        t: number, rotation: number, bodyFloat: number
    ) {
        const n = Math.min(frame.ghostCount, AFTERIMAGE.GHOSTS_BY_TIER[getQualityTier()]);
        if (n <= 0) return;
        if (!SpriteUnitRenderer.resolveFrame(agent, t, resolved) || !resolved.frame || !resolved.rect) return;

        const f = resolved.frame;
        const rect = resolved.rect;
        const color = getFactionSkin(agent.team).projection.trailColor;
        const img = getTintedFrame(resolved.manifestKey, resolved.mipLevel, f.x, f.y, f.w, f.h, color);
        if (!img) return;

        ctx.save();
        // 最遠的先畫（在最底下），近的疊在上面
        for (let i = n - 1; i >= 0; i--) {
            const g = frame.ghosts[i];
            ctx.globalAlpha = g.alpha;
            ctx.save();
            ctx.translate(g.dx, VisualMath.getVisualBodyCenterY(g.dy, g.z));
            ctx.scale(UNIT_SCALE, UNIT_SCALE);
            ctx.rotate(rotation);
            ctx.translate(0, bodyFloat);
            ctx.drawImage(img, rect.dx, rect.dy, rect.dw, rect.dh);
            ctx.restore();
        }
        ctx.restore();
    }
};
