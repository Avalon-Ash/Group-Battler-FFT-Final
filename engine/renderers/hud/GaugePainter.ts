// ╔══════════════════════════════════════════════════════════╗
// ║  GaugePainter — 單位頭頂的圓形詠唱量表                      ║
// ║  職責：詠唱中的技能圖示＋進度弧（控制與增益的剩餘時間改由    ║
// ║        StatusStripPainter 的圖示列顯示）                      ║
// ║  [ARCH] 光暈用一道較寬的半透明描邊代替 shadowBlur；有圖示列時  ║
// ║  呼叫端把 y 往上抬，量表不蓋住圖示列。                        ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent } from "../../game";
import { AssetManager } from "../../assets";
import { HUD_GAUGE } from "../../../constants";

const TAU = Math.PI * 2;

export const GaugePainter = {

    /** 詠唱進度量表。lift＝圖示列佔用的高度（沒有圖示列為 0），量表整個往上抬這麼多。 */
    drawCastGauge(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, lift: number) {
        if (agent.castingSkillIdx === -1) return;
        const skill = agent.skills[agent.castingSkillIdx];
        if (!skill) return;
        const progress = 1 - (agent.castTimer / skill.cast);
        this.drawCircularGauge(ctx, x, y - lift, progress, skill.visual || HUD_GAUGE.DEFAULT_SKILL_VISUAL, skill.color);
    },

    drawCircularGauge(ctx: CanvasRenderingContext2D, x: number, y: number, pct: number, visualKey: string, color: string) {
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
        const icon = AssetManager.getSkillIcon(visualKey, color);
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
