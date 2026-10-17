// ╔══════════════════════════════════════════════════════════╗
// ║  UnitCorePainter — 棋座核心（懸浮六角晶體）              ║
// ║  世界觀：棋座才是本體，核心是把角色投影出來的投影器。    ║
// ║  位置的唯一定義在 VisualMath.coreAnchorAt（同一組        ║
// ║  CORE_VISUAL），施法／投射物／光束從這個點出發。         ║
// ║  只做 drawImage：晶體與光暈都是烘焙好的 sprite。         ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../../core/Agent";
import { BodyTypeId, HexLayout, Role, Team } from "../../../../types";
import { CORE_VISUAL, UNIT_SCALE } from "../../../../constants";
import { SpriteManager } from "../../../sprites";
import { resolveBodyType } from "../../../../data/units/appearance/bodyTypes";

const TWO_PI = Math.PI * 2;

export interface CoreDrawOptions {
    /** 施法中：光暈拉滿並略微放大 */
    casting: boolean;
    /** 整體不透明度（放置預覽用半透明） */
    alpha: number;
    /** 浮動相位偏移（讓同場單位的核心不同步） */
    phase: number;
}

export const UnitCorePainter = {
    /**
     * @param ctx 已平移到棋座中心（地面，與 UnitShadowPainter 同一原點）
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number, layout: HexLayout): void {
        if (agent.hp <= 0 || agent.banished || agent.outOfBounds) return;
        UnitCorePainter.drawCore(ctx, agent.team, agent.role, resolveBodyType(agent), layout, t, {
            casting: agent.castingSkillIdx !== -1,
            alpha: 1,
            phase: agent.q * 1.7 + agent.r * 2.9,
        });
    },

    drawCore(
        ctx: CanvasRenderingContext2D,
        team: Team, role: Role, body: BodyTypeId, layout: HexLayout,
        t: number, opts: CoreDrawOptions
    ): void {
        const { core } = SpriteManager.getUnitImages(role, team, body, layout);
        const bob = Math.sin((t / CORE_VISUAL.bobPeriod + opts.phase) * TWO_PI) * CORE_VISUAL.bobAmplitude;
        const pulse = Math.sin(t * 5 + opts.phase);
        const glow = opts.casting
            ? CORE_VISUAL.castGlow + pulse * CORE_VISUAL.castGlowPulse
            : CORE_VISUAL.idleGlow + pulse * CORE_VISUAL.idleGlowPulse;
        const scale = UNIT_SCALE * (opts.casting ? CORE_VISUAL.castScale : 1);
        const half = CORE_VISUAL.canvasSize / 2;

        ctx.save();
        ctx.translate(CORE_VISUAL.offsetX, -(CORE_VISUAL.hoverHeight + bob));
        ctx.scale(scale, scale);
        ctx.globalAlpha = opts.alpha * Math.min(1, Math.max(0, glow));
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(core.glow, -half, -half);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = opts.alpha;
        ctx.drawImage(core.body, -half, -half);
        ctx.restore();
    },
};
