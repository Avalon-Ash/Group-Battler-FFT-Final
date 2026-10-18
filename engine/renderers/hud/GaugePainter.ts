// ╔══════════════════════════════════════════════════════════╗
// ║  GaugePainter — 單位頭頂的圓形量表（控制剩餘時間／詠唱進度） ║
// ║  上游：HUDRenderer（UnitFrame.hudAnchorY、footX）、HUD_GAUGE、 ║
// ║        STATUS_VISUALS（控制的顏色＝狀態 SSOT）、AssetManager  ║
// ║        （技能／狀態圖示，已快取）                             ║
// ║  [ARCH] 光暈用一道較寬的半透明描邊代替 shadowBlur。           ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../game";
import { AssetManager } from "../../assets";
import { HUD_GAUGE } from "../../../constants";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

const TAU = Math.PI * 2;

export const GaugePainter = {

    drawUnitStatusGauges(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number) {
        let activeTimer = 0;
        let maxTimer = 0;
        let iconType: 'POLYMORPH' | 'STASIS' | 'BANISH' | 'STUN' | 'SILENCE' | '' = '';

        if (agent.banished) {
            activeTimer = agent.banishTimer;
            maxTimer = agent.banishMax || activeTimer;
            iconType = agent.visualStatus === 'POLYMORPH' ? 'POLYMORPH' : agent.visualStatus === 'STASIS' ? 'STASIS' : 'BANISH';
        } else if (agent.stunTimer > 0) {
            activeTimer = agent.stunTimer;
            maxTimer = agent.stunMax || activeTimer;
            iconType = 'STUN';
        } else if (agent.silenceTimer > 0) {
            activeTimer = agent.silenceTimer;
            maxTimer = agent.silenceMax || activeTimer;
            iconType = 'SILENCE';
        } else if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                const progress = 1 - (agent.castTimer / skill.cast);
                this.drawCircularGauge(ctx, x, y, progress, skill.visual || HUD_GAUGE.DEFAULT_SKILL_VISUAL, skill.color, true);
                return;
            }
        }

        if (iconType && maxTimer > 0) {
            this.drawCircularGauge(ctx, x, y, activeTimer / maxTimer, iconType, STATUS_VISUALS[iconType].primaryColor, false);
        }
    },

    drawCircularGauge(ctx: CanvasRenderingContext2D, x: number, y: number, pct: number, visualKey: string, color: string, isSkill: boolean) {
        const G = HUD_GAUGE;
        const radius = G.RADIUS;
        const iconY = y - G.LIFT;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, iconY, radius, 0, TAU);
        ctx.fillStyle = G.BG;
        ctx.fill();
        ctx.save();
        ctx.clip();
        const icon = isSkill ? AssetManager.getSkillIcon(visualKey, color) : AssetManager.getStatusIcon(visualKey);
        ctx.globalAlpha = G.ICON_ALPHA;
        if (icon) ctx.drawImage(icon, x - radius, iconY - radius, radius * 2, radius * 2);
        ctx.restore();

        ctx.strokeStyle = G.RIM;
        ctx.lineWidth = G.RIM_WIDTH;
        ctx.stroke();

        const safePct = Math.max(0, Math.min(1, pct));
        if (safePct > 0) {
            ctx.beginPath();
            ctx.arc(x, iconY, radius, -Math.PI / 2, -Math.PI / 2 + TAU * safePct);
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.globalAlpha = G.GLOW_ALPHA;
            ctx.lineWidth = G.ARC_WIDTH + G.GLOW_WIDTH;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = G.ARC_WIDTH;
            ctx.stroke();
        }

        ctx.restore();
    }
};
