import { Agent } from "../../../core/Agent";
import { Team } from "../../../../types";
import { FACTION_VISUALS, FactionVisualDef } from "../../../../data/vfx/faction_visuals";
import { UNIT_SCALE } from "../../../../constants";

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

        const inv = 1 / UNIT_SCALE;

        if (agent.team === Team.BLUE) {
            this.drawImperialAmbient(ctx, agent, t, faction, inv);
        } else {
            this.drawKhorneAmbient(ctx, agent, t, faction, inv);
        }
    },

    drawImperialAmbient(ctx: CanvasRenderingContext2D, _agent: Agent, t: number, faction: FactionVisualDef, inv: number) {
        // 護甲接縫呼吸光
        const pulse = 0.5 + Math.sin(t * 3.0) * 0.2;
        ctx.save();
        ctx.scale(inv, inv);
        ctx.globalAlpha = pulse;
        ctx.shadowColor = faction.ambientGlowColor || '#60a5fa';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = faction.ambientGlowColor || '#60a5fa';
        ctx.lineWidth = 1.5;
        
        // 護甲橫縫線 (座標根據 UNIT_SCALE=0.65 調整，對齊胸甲與腰部)
        ctx.beginPath();
        ctx.moveTo(-9, -23); ctx.lineTo(9, -23);
        ctx.moveTo(-7, -13); ctx.lineTo(7, -13);
        ctx.stroke();
        ctx.restore();
    },

    drawKhorneAmbient(ctx: CanvasRenderingContext2D, agent: Agent, t: number, faction: FactionVisualDef, inv: number) {
        const hpRatio = Math.max(0, agent.hp / agent.maxHp);
        // HP 越低，血腥感越強
        const intensity = 0.4 + (1 - hpRatio) * 0.6;

        ctx.save();
        ctx.scale(inv, inv);

        // 1. 血腥環境暈：只靠 shadowBlur，不畫實體形狀，移除「護盾泡泡」感
        ctx.shadowColor = faction.ambientGlowColor || '#dc2626';
        ctx.shadowBlur = (faction.ambientGlowRadius || 10) * intensity * 2;
        ctx.globalAlpha = 0; // 隱形觸發點
        ctx.beginPath();
        ctx.arc(0, -20, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0; // 重置避免污染

        // 2. 血滴粒子（從肩部與身體各處滴落/噴濺）
        const dropCount = 6;
        const particleColor = faction.ambientParticleColor || '#7f1d1d';
        
        for (let i = 0; i < dropCount; i++) {
            const offset = i * (1.0 / dropCount);
            const cycle = ((t * 0.8 + offset) % 1);
            if (cycle < 0.05) continue; 
            
            // 加入上限保護，最高 50% 不透明度
            const intensityAlpha = Math.min(0.5, intensity * 0.7);
            
            ctx.globalAlpha = Math.sin(cycle * Math.PI) * intensityAlpha;
            ctx.fillStyle = particleColor;
            ctx.beginPath();

            if (i % 2 === 0) {
                // 橫向飛濺：X 方向快，Y 方向慢
                const splashX = Math.sin(i * 1.5) * cycle * 40;
                const splashY = -35 + cycle * 20;
                ctx.ellipse(splashX, splashY, 4, 2, Math.sin(i) * 0.8, 0, Math.PI * 2);
            } else {
                // 垂直滴落
                const dropX = Math.sin(i * 2.1 + t * 0.3) * 22;
                const startY = -45 + (i % 3) * 8;
                const dropY = startY + cycle * 70; 
                ctx.ellipse(dropX, dropY, 3, 5, 0, 0, Math.PI * 2); 
            }
            ctx.fill();
        }

        ctx.restore();
    }
};
