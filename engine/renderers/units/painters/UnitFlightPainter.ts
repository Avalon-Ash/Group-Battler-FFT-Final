
import { Agent } from "../../../game";
import { Team } from "../../../../types";
import { ISO_SCALE_Y, UNIT_SCALE } from "../../../../constants";
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
        
        ctx.translate(physX, physY); // Anchor at ground point
        ctx.scale(UNIT_SCALE, UNIT_SCALE); // Scale everything

        // Draws from 0 (surface) UP to physZ (body)
        // Since we scaled context, we must unscale the height (physZ) if we want it to reach the actual body height?
        // Wait, physZ is World Units. If we ctx.scale(0.7), drawing a rect of height physZ will be 0.7 * physZ.
        // But the body is drawn at world Y - physZ. 
        // So the visual gap IS physZ.
        // If we want the line to connect, we must draw it at length physZ / UNIT_SCALE.
        // OR easier: Don't scale the height, just the width and anchor graphic.
        
        ctx.save();
        ctx.scale(1 / UNIT_SCALE, 1 / UNIT_SCALE); // Reset scale for the line height calculation
        
        const w = 3 * UNIT_SCALE; // Scale width manually
        ctx.fillRect(-w/2, 0, w, -physZ); // Draw upwards (negative Y in canvas space relative to ground)
        ctx.restore();
        
        // 2. Ground Anchor Reticle (Where the unit effectively "is")
        // Context is already scaled by UNIT_SCALE
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
        // Context here is already scaled by UnitBodyPainter
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
