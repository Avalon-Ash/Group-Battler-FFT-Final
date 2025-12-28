
import { Agent } from "../../../game";
import { Team } from "../../../../types";
import { ISO_SCALE_Y } from "../../../../constants";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { VFXFactory } from "../../../graphics/VFXFactory";

export const UnitFlightPainter = {
    
    drawFlyingAnchor(ctx: CanvasRenderingContext2D, agent: Agent, t: number, physX: number, physY: number, physZ: number) {
        const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
        const color = faction.flightTrailColor; 
        
        ctx.save();
        
        // 1. Vertical Energy Beam (Stem)
        const grad = ctx.createLinearGradient(0, 0, 0, physZ);
        grad.addColorStop(0, color); 
        grad.addColorStop(0.5, 'rgba(255,255,255,0.2)'); 
        grad.addColorStop(1, 'rgba(0,0,0,0)'); 
        
        ctx.globalAlpha = 0.6;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        
        const w = 3;
        ctx.fillRect(-w/2, 0, w, physZ); // Draws from 0 (surface) UP to physZ (body)
        
        // 2. Ground Anchor Reticle (Where the unit effectively "is")
        ctx.translate(0, 0); // At Surface
        ctx.scale(1, ISO_SCALE_Y); 
        
        const glow = VFXFactory.getTexture('GLOW', color);
        const sz = 48;
        
        // Pulse animation
        const pulse = 1.0 + Math.sin(t * 5) * 0.2;
        ctx.scale(pulse, pulse);
        
        ctx.globalAlpha = 0.4;
        ctx.drawImage(glow, -sz/2, -sz/2, sz, sz);
        
        // Crisp Ring
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.stroke();

        ctx.restore();
    },

    drawFlightVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
        const color = faction.flightTrailColor;
        const glow = VFXFactory.getTexture('GLOW', color);

        ctx.save();
        ctx.translate(0, 10); // Offset to engines/feet
        
        for(let i = -1; i <= 1; i += 2) {
            ctx.save();
            const offsetX = i * 10;
            const pulse = Math.sin(t * 20 + i) * 0.2 + 0.8;
            ctx.translate(offsetX, 0);
            ctx.scale(0.5 * pulse, 1.0 * pulse);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.6;
            ctx.drawImage(glow, -16, 0, 32, 48); 
            ctx.restore();
        }
        ctx.restore();
    }
};
