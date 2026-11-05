// ╔══════════════════════════════════════════════════════════╗
// ║ StatusArtPainter — 暈眩、粗藤、貼身火舌與毒泡附件         ║
// ║ [ARCH] 原點是精靈腳底，局部 UNIT_SCALE 反補償；不查地形。 ║
// ║ ROOT 後片→本體→火／泡→ROOT 前片→星環；都隨 UNIT op 排序。 ║
// ║ 上游 UnitBodyPainter；時間僅由 battleTime 傳入，無 timer。 ║
// ╚══════════════════════════════════════════════════════════╝
import type { Agent } from '../../../core/Agent';
import { UNIT_SCALE, UNIT_SPRITE } from '../../../../constants';
import { STATUS_ART as A, STATUS_ART_FIT } from '../../../../data/vfx/statusArt';
import { statusArtStore } from '../StatusArtStore';
import { getQualityTier } from '../../RenderQuality';
import { isStatusVisible } from '../StatusActivity';
import { SpriteUnitRenderer } from '../../units/factions/SpriteUnitRenderer';

function blit(ctx: CanvasRenderingContext2D, first: number, count: number, t: number,
    sx = 1, sy = 1, offsetY = 0): void {
    const image = statusArtStore.image;
    if (!image) return;
    const fps = A.fpsByTier[getQualityTier()];
    // Lower tiers sample the same one-second sequence, not a different animation speed.
    const phase = Math.floor(t * fps) / fps;
    const slot = first + Math.floor(phase * count) % count;
    ctx.drawImage(image, slot % A.columns * A.cell, Math.floor(slot / A.columns) * A.cell,
        A.cell, A.cell, -A.anchorX / A.pixelsPerUnit * sx / UNIT_SCALE,
        UNIT_SPRITE.footOffsetLocal + (-A.anchorY / A.pixelsPerUnit * sy + offsetY) / UNIT_SCALE,
        A.cell / A.pixelsPerUnit * sx / UNIT_SCALE, A.cell / A.pixelsPerUnit * sy / UNIT_SCALE);
}

export const StatusArtPainter = {
    stunned(a: Agent): boolean {
        return a.view.visualStatus !== 'POLYMORPH' && (isStatusVisible('STUN', a) || isStatusVisible('CC_INTERRUPT', a));
    },
    root(ctx: CanvasRenderingContext2D, a: Agent, t: number): void {
        if (!isStatusVisible('ROOT', a)) return;
        const width = a.view.visualStatus === 'POLYMORPH' ? A.sheep.rootScaleX : STATUS_ART_FIT[a.role].rootX;
        blit(ctx, A.root.first, A.root.count, t, width);
    },
    torso(ctx: CanvasRenderingContext2D, a: Agent, t: number): void {
        const fit = STATUS_ART_FIT[a.role], sheep = a.view.visualStatus === 'POLYMORPH';
        const sx = (sheep ? A.sheep.torsoScaleX : fit.torsoX) * (a.facing > 0 ? 1 : -1);
        const sy = sheep ? A.sheep.torsoScaleY : fit.torsoY;
        const dy = sheep ? 0 : fit.offsetY;
        if (isStatusVisible('BURN', a)) blit(ctx, A.burn.first, A.burn.count, t, sx, sy, dy);
        if (isStatusVisible('POISON', a)) blit(ctx, A.poison.first, A.poison.count, t, sx, sy, dy);
    },
    stars(ctx: CanvasRenderingContext2D, a: Agent, t: number): void {
        if (!this.stunned(a)) return;
        const height = SpriteUnitRenderer.getHeadHeight(a) ?? UNIT_SPRITE.targetHeightCanvasUnits;
        blit(ctx, A.stun.first, A.stun.count, t, 1, 1, A.stun.ringHeight - height - A.stun.headGap);
    },
};
