
import { Agent } from "../../../game";
import { Team } from "../../../../types";
import { ISO_SCALE_Y } from "../../../../constants";
import { FACTION_VISUALS } from "../../../../data/vfx/faction_visuals";
import { VFXFactory } from "../../../graphics/VFXFactory";

export const UnitFlightPainter = {
    
    drawFlyingAnchor(ctx: CanvasRenderingContext2D, agent: Agent, t: number, physX: number, physY: number, physZ: number) {
        const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
        const color = faction.deathSpiritColor; 
        
        ctx.save();
        const grad = ctx.createLinearGradient(0, 0, 0, physZ);
        grad.addColorStop(0, 'rgba(0,0,0,0)'); 
        grad.addColorStop(0.5, color);        
        grad.addColorStop(1, 'rgba(0,0,0,0)'); 
        
        ctx.globalAlpha = 0.3 + Math.sin(t * 5) * 0.1;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        
        const w = 4;
        ctx.fillRect(-w/2, 0, w, physZ);
        
        ctx.translate(0, physZ);
        ctx.scale(1, ISO_SCALE_Y); 
        
        const glow = VFXFactory.getTexture('GLOW', color);
        const sz = 32;
        ctx.drawImage(glow, -sz/2, -sz/2, sz, sz);

        ctx.restore();
    },

    drawFlightVFX(ctx: CanvasRenderingContext2D, agent: Agent, t: number) {
        const faction = FACTION_VISUALS[agent.team] || FACTION_VISUALS[Team.BLUE];
        const color = faction.flightTrailColor;
        const glow = VFXFactory.getTexture('GLOW', color);

        ctx.save();
        ctx.translate(0, 10); 
        
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
