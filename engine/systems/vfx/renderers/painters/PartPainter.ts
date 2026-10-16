import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { drawPart, partFrameAt } from "../../../../renderers/vfxparts/VFXPartStore";
import type { PartAnim } from "../../../../../types/VFXSchema";
import type { HexLayout } from "../../../../../types";
import { VFX_PARTS } from "../../../../../data/vfx/parts/partConfig";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";

/** 粒子型別 → 繪製方式：PART_GROUND 貼地（等距壓扁），其他為看板。 */
export const PART_PARTICLE_TYPES = new Set(['PART', 'PART_GROUND', 'PART_DEBRIS']);

function ease(t: number, kind: PartAnim['ease']): number {
    if (kind === 'in') return t * t * t;
    if (kind === 'linear') return t;
    return 1 - Math.pow(1 - t, 3);
}

/**
 * PartPainter — 以 V1 特效零件（預烘焙 PartSprite）繪製粒子（ART_SPEC §7、§8）。
 * 執行期只有 drawImage／alpha／混合模式／變換；外形與色階全在烘焙時決定，粒子 color 不參與。
 */
export const PartPainter = {
    /** 目前進度下的縮放（排序計算地面法陣範圍時也用同一公式） */
    scaleAt(p: Particle, progress: number): number {
        const a = p.partAnim;
        const t = Math.max(0, Math.min(1, progress));
        return (a?.scaleFrom ?? 1) + ((a?.scaleTo ?? 1) - (a?.scaleFrom ?? 1)) * ease(t, a?.ease);
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
};
