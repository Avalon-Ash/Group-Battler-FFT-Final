import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { drawPart, partFrameAt } from "../../../../renderers/vfxparts/VFXPartStore";
import type { HexLayout } from "../../../../../types";
import { VFX_PARTS } from "../../../../../data/vfx/parts/partConfig";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";
import { quantizeSize } from "../../../../renderers/vfxparts/PartSpec";
import { BEAM_STYLES, type BeamStyleId } from "../../../../../data/vfx/beam_styles";
import { partAnimEase as ease } from "../../partAnimEase";

/**
 * PartPainter — 以 V1 特效零件（預烘焙 PartSprite）繪製粒子（ART_SPEC §7、§8）。
 * 執行期只有 drawImage／alpha／混合模式／變換；外形與色階全在烘焙時決定，粒子 color 不參與。
 */
export const PartPainter = {
    /** 目前進度下的縮放（排序計算地面法陣範圍時也用同一公式） */
    scaleAt(p: Particle, progress: number): number {
        const a = p.partAnim;
        const t = Math.max(0, Math.min(1, progress));
        return ((a?.scaleFrom ?? 1) + ((a?.scaleTo ?? 1) - (a?.scaleFrom ?? 1)) * ease(t, a?.ease)) * (p.fxScale ?? 1);
    },

    draw(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number, layout: HexLayout): void {
        const sprite = p.part;
        if (!sprite) return;
        const a = p.partAnim;
        const t = Math.max(0, Math.min(1, progress));
        const scale = PartPainter.scaleAt(p, progress);
        let alpha = a?.alpha ?? 1;
        const fadeIn = a?.fadeIn ?? 0;
        const fadeOut = a?.fadeOut ?? 0;
        if (fadeIn > 0 && t < fadeIn) alpha *= t / fadeIn;
        if (fadeOut > 0 && t > 1 - fadeOut) alpha *= (1 - t) / fadeOut;
        if (alpha <= 0) return;
        const ground = p.type === 'PART_GROUND';
        drawPart(ctx, sprite, drawX, drawY, {
            frame: partFrameAt(sprite, p.maxLife - p.life),
            scale,
            scaleY: ground ? ISO_SCALE_Y : 1,
            // 零件以 VFX_PARTS.HEX 的起始角（平頂）烘焙；貼地零件在地面平面轉到地圖版面方向（FLAT 為 0，POINTY 為 π/6）
            rotation: ground ? p.rotation + HexGeometry.alignRotation(layout, VFX_PARTS.HEX.ANGLE_OFFSET_RAD) : p.rotation,
            alpha,
            blend: p.blendMode,
        });
    },

    /**
     * 光束零件：把光管磚（kind 'beam'，錨點在左端中線）沿起點→終點平鋪，裁在 [0, 長度]。
     * 呼叫時 ctx 未平移；(drawX, drawY) 是起點的繪製位置（含起點格漂浮位移，RenderSpec §5）。
     * sx/sy/tx/ty 是螢幕座標、beamEndDy 是兩端漂浮位移差（VFXRenderer 每幀寫入，RenderSpec §5）。
     * 寬度隨進度收窄（死光 1.5→0.5，其餘 1→0），整排磚往終點捲動，兩端裁成尖頭。
     */
    drawBeam(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number, now: number): void {
        const sprite = p.part;
        if (!sprite || p.sx === undefined || p.sy === undefined || p.tx === undefined || p.ty === undefined) return;
        const relX = p.tx - p.sx;
        const relY = (p.ty - (p.tz ?? 0)) - (p.sy - (p.sz ?? 0)) + (p.beamEndDy ?? 0);
        const dist = Math.sqrt(relX * relX + relY * relY);
        if (dist < 1) return;
        const t = Math.max(0, Math.min(1, progress));
        const widthMul = BEAM_STYLES[p.style as BeamStyleId]?.dashedEdges ? 1.5 - t : 1 - t;
        if (widthMul <= 0) return;
        // 磚以量化後的寬度烘焙；縱向縮放回實際寬度再乘收窄係數
        const sy = (p.size / quantizeSize(p.size)) * widthMul;
        const tile = sprite.width;
        const h = sprite.height * sy;
        const top = -sprite.anchorY * sy;
        const img = sprite.frames[partFrameAt(sprite, p.maxLife - p.life)];
        const x0 = ((now * VFX_PARTS.BEAM.SCROLL_PX_S) % tile) - tile;
        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(Math.atan2(relY, relX));
        ctx.globalCompositeOperation = p.blendMode ?? sprite.blend;
        // 兩端尖頭：裁切成拉長的六邊形，避免光暈在終點留下直角方框
        const tip = Math.min(dist / 2, h * VFX_PARTS.BEAM.TIP_RATIO);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tip, top);
        ctx.lineTo(dist - tip, top);
        ctx.lineTo(dist, 0);
        ctx.lineTo(dist - tip, top + h);
        ctx.lineTo(tip, top + h);
        ctx.closePath();
        ctx.clip();
        for (let x = x0; x < dist; x += tile) ctx.drawImage(img, x, top, tile, h);
        ctx.restore();

        // 兩端光點：發射口（較小）與命中點，跟著光束收窄淡出
        const end = p.beamEnd;
        if (end) {
            const B = VFX_PARTS.BEAM;
            const pulse = 1 + Math.sin(now * Math.PI * 2 * B.END_PULSE_HZ) * B.END_PULSE;
            const alpha = B.END_ALPHA * Math.min(1, widthMul);
            const base = p.size * B.END_GLOW_RATIO / quantizeSize(p.size * B.END_GLOW_RATIO);
            drawPart(ctx, end, drawX, drawY, { scale: base * B.START_SCALE * pulse, alpha, blend: p.blendMode });
            drawPart(ctx, end, drawX + relX, drawY + relY, { scale: base * pulse, alpha, blend: p.blendMode });
        }
    },
};
