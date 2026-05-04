import { Agent } from "../../../game";
import { Team } from "../../../../types";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";

export const UnitCorePainter = {
    draw(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        if (agent.hp <= 0 || agent.banished) return;

        const faction = FACTION_VISUALS[agent.team];
        const color = faction.secondaryColor;
        const hitTrauma = agent.hitFlashTimer > 0 ? (agent.hitFlashTimer / 0.1) : 0;
        const hpPct = Math.max(0, Math.min(1, agent.hp / agent.maxHp));

        ctx.save();
        
        // Core Jitter: Physical recoil visual
        if (hitTrauma > 0) {
            const jitter = hitTrauma * 8;
            ctx.translate((Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter);
            ctx.scale(1 + hitTrauma * 0.4, 1 + hitTrauma * 0.4);
        }

        ctx.globalCompositeOperation = hitTrauma > 0.05 ? 'screen' : 'source-over';
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = hitTrauma > 0.05 ? 8 + hitTrauma * 20 : 4;

        if (agent.team === Team.BLUE) {
            this.drawImperialCore(ctx, t, hitTrauma);
        } else {
            this.drawCovenantCore(ctx, t, hitTrauma, hpPct);
        }

        ctx.restore();
    },

    drawImperialCore(ctx: CanvasRenderingContext2D, t: number, trauma: number) {
        // Imperial: Order, Tech, Stable Pulse
        const pulse = 0.8 + Math.sin(t * 8) * 0.15;
        const size = 8 * pulse;
        
        ctx.lineWidth = 2.0;
        // Outer Hex
        HexGeometry.traceHex(ctx, 0, 0, size, false);
        ctx.stroke();
        
        // Inner Fill (Subtle Tech Glow)
        ctx.fillStyle = ctx.strokeStyle;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Trauma Ring
        if (trauma > 0.1) {
            ctx.globalAlpha = trauma * 0.8;
            ctx.lineWidth = 1;
            HexGeometry.traceHex(ctx, 0, 0, size * 1.6, false);
            ctx.stroke();
            ctx.globalAlpha = 1.0;  // ← 新增：立即歸一
        }

        // Center Dot
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
    },

    drawCovenantCore(ctx: CanvasRenderingContext2D, t: number, trauma: number, hpPct: number) {
        // Covenant: Chaos, Organic, Heartbeat linked to HP
        // Lower HP = Faster Beat & More erratic
        const rate = 2.0 + (1.0 - hpPct) * 5.0; // Higher rate for lower HP
        const cycle = (t * rate) % 1;
        let beat = 0;
        
        // Heartbeat pattern: Pump... pump... wait.
        // Intensity scales aggressively with HP loss
        const beatIntensity = 1.0 + (1.0 - hpPct) * 0.8;

        if (cycle < 0.2) beat = Math.sin(cycle * Math.PI * 5) * 0.3 * beatIntensity; 
        else if (cycle > 0.3 && cycle < 0.5) beat = Math.sin((cycle - 0.3) * Math.PI * 5) * 0.15 * beatIntensity; 
        
        const scale = 1.2 + beat + trauma * 0.5; // Base scale increased for visibility
        const size = 11 * scale; 
        
        ctx.lineWidth = 3.5; 
        ctx.beginPath();
        
        // Diamond / Spiked Shape
        const rot = Math.PI / 4; 
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + rot;
            const len = (i % 2 === 0) ? size * 1.2 : size * 0.8; 
            
            if (i===0) ctx.moveTo(Math.cos(angle) * len, Math.sin(angle) * len);
            else ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
        }
        ctx.closePath();
        ctx.stroke();

        // Blood Core Fill - Throb with heartbeat
        ctx.fillStyle = ctx.strokeStyle;
        ctx.globalAlpha = 0.7 + beat * 0.3; 
        ctx.fill();
        
        // Inner bright spark - flash red/white at low HP
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = hpPct < 0.3 && beat > 0.1 ? '#ff0000' : '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 3 + beat * 3, 0, Math.PI * 2);
        ctx.fill();
    }
};