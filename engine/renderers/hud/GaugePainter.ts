
import { Agent } from "../../game";
import { AssetManager } from "../../assets";

export const GaugePainter = {
    
    drawUnitStatusGauges(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number) {
        let activeTimer = 0;
        let maxTimer = 0;
        let iconType = '';
        let gaugeColor = '';

        if (agent.banished) {
            activeTimer = agent.banishTimer;
            maxTimer = agent.banishMax || activeTimer;
            
            if (agent.visualStatus === 'POLYMORPH') {
                iconType = 'POLYMORPH'; gaugeColor = '#d8b4fe';
            } else if (agent.visualStatus === 'STASIS') {
                iconType = 'STASIS'; gaugeColor = '#facc15';
            } else {
                iconType = 'BANISH'; gaugeColor = '#7e22ce';
            }
        } else if (agent.stunTimer > 0) {
            activeTimer = agent.stunTimer;
            maxTimer = agent.stunMax || activeTimer;
            iconType = 'STUN'; gaugeColor = '#fbbf24';
        } else if (agent.silenceTimer > 0) {
            activeTimer = agent.silenceTimer;
            maxTimer = agent.silenceMax || activeTimer;
            iconType = 'SILENCE'; gaugeColor = '#94a3b8';
        } else if (agent.castingSkillIdx !== -1) {
            const skill = agent.skills[agent.castingSkillIdx];
            if (skill) {
                const progress = 1 - (agent.castTimer / skill.cast);
                this.drawCircularGauge(ctx, x, y, progress, skill.visual || 'BOLT', skill.color, true);
                return;
            }
        }

        if (iconType && maxTimer > 0) {
            const progress = activeTimer / maxTimer;
            this.drawCircularGauge(ctx, x, y, progress, iconType, gaugeColor, false);
        }
    },

    drawCircularGauge(ctx: CanvasRenderingContext2D, x: number, y: number, pct: number, visualKey: string, color: string, isSkill: boolean) {
        const radius = 14;
        const iconY = y - 24; 
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, iconY, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
        ctx.fill();
        ctx.save();
        ctx.clip();
        
        let icon;
        if (isSkill) {
            icon = AssetManager.getSkillIcon(visualKey, color);
        } else {
            icon = AssetManager.getStatusIcon(visualKey);
        }
        
        ctx.globalAlpha = 0.8;
        if (icon) ctx.drawImage(icon, x - radius, iconY - radius, radius * 2, radius * 2);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const safePct = Math.max(0, Math.min(1, pct));
        if (safePct > 0) {
            ctx.beginPath();
            ctx.arc(x, iconY, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * safePct));
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.stroke();
        }
        
        ctx.restore();
    }
};
