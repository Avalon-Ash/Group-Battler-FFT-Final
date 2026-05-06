import { Agent } from "../../../core/Agent";
import { Team } from "../../../../types";
import { FACTION_VISUALS, FactionVisualDef } from "../../../../data/vfx/faction_visuals";

export const UnitAmbientPainter = {
    /**
     * draw — 繪製單位常駐陣營特效
     * @param ctx 繪圖上下文（已在單位主體座標系內：px, bodyY）
     * @param agent 單位資料
     * @param t 全局時間
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        if (agent.hp <= 0 || agent.banished) return;
        if (agent.visualStatus !== 'NONE') return; // CC 狀態不疊加常駐 VFX

        const faction = FACTION_VISUALS[agent.team];
        if (!faction || !faction.ambientGlowColor) return;

        if (agent.team === Team.BLUE) {
            this.drawImperialAmbient(ctx, agent, t, faction);
        } else {
            this.drawKhorneAmbient(ctx, agent, t, faction);
        }
    },

    drawImperialAmbient(ctx: CanvasRenderingContext2D, _agent: Agent, t: number, faction: FactionVisualDef) {
        // 護甲接縫呼吸光
        const pulse = 0.4 + Math.sin(t * 3.0) * 0.15;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = faction.ambientGlowColor || '#60a5fa';
        ctx.shadowBlur = faction.ambientGlowRadius || 6;
        ctx.strokeStyle = faction.ambientGlowColor || '#60a5fa';
        ctx.lineWidth = 1;
        
        // 護甲橫縫線
        ctx.beginPath();
        ctx.moveTo(-14, -35); ctx.lineTo(14, -35);
        ctx.moveTo(-10, -20); ctx.lineTo(10, -20);
        ctx.stroke();
        ctx.restore();
    },

    drawKhorneAmbient(ctx: CanvasRenderingContext2D, agent: Agent, t: number, faction: FactionVisualDef) {
        const hpRatio = Math.max(0, agent.hp / agent.maxHp);
        // HP 越低，血腥感越強
        const intensity = 0.4 + (1 - hpRatio) * 0.6;

        ctx.save();

        // 1. 血光暈
        ctx.globalAlpha = intensity * 0.3;
        ctx.shadowColor = faction.ambientGlowColor || '#dc2626';
        ctx.shadowBlur = (faction.ambientGlowRadius || 10) * intensity;
        ctx.fillStyle = faction.ambientGlowColor || '#dc2626';
        
        ctx.beginPath();
        ctx.ellipse(0, -20, 18, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. 血滴粒子（從肩部緩慢滴落）
        const dropCount = 3;
        const particleColor = faction.ambientParticleColor || '#7f1d1d';
        
        for (let i = 0; i < dropCount; i++) {
            const offset = i * (1.0 / dropCount);
            const cycle = ((t * 0.8 + offset) % 1);
            if (cycle < 0.05) continue; 
            
            const dropX = (i - 1) * 10 + Math.sin(t * 2 + i) * 3;
            const dropY = -40 + cycle * 60; 
            const alpha = Math.sin(cycle * Math.PI) * intensity * 0.7;
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particleColor;
            ctx.beginPath();
            ctx.ellipse(dropX, dropY, 1.5, 2.5, 0, 0, Math.PI * 2); 
            ctx.fill();
        }

        ctx.restore();
    }
};
