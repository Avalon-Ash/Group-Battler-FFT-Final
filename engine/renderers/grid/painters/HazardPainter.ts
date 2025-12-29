
import { GroundHazard } from "../../../../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../../../constants";
import { HAZARD_VISUALS } from "../../../../../data/vfx/hazard_visuals";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { SurfacePainter } from "../../../graphics/painters/SurfacePainter";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const HazardPainter = {
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, hazard: GroundHazard, globalTime: number) {
        const def = HAZARD_VISUALS[hazard.type] || HAZARD_VISUALS['GENERIC'];
        
        // Fade in/out logic based on duration
        let fade = 1.0;
        if (hazard.duration < 0.5) fade = hazard.duration * 2;
        
        ctx.save();
        ctx.globalAlpha = fade;

        if (def.type === 'FOG') {
            const texture = VFXFactory.getTexture('SMOKE', def.primaryColor);
            const size = HEX_SIZE * 1.3; // Increased size slightly
            const speed = globalTime * def.speed;

            ctx.save();
            ctx.translate(x, y - 4); 
            ctx.scale(1, ISO_SCALE_Y);
            
            ctx.globalCompositeOperation = (hazard.type === 'POISON') ? 'screen' : 'lighter';
            
            // Core Layer
            ctx.save();
            ctx.rotate(speed * 0.15);
            ctx.globalAlpha = def.intensity * 0.7; // Boosted alpha
            ctx.drawImage(texture, -size/2, -size/2, size, size);
            ctx.restore();

            // Subtle Pulse Layer
            ctx.save();
            ctx.rotate(-speed * 0.1 + 1.5);
            ctx.scale(0.9, 0.9);
            ctx.globalAlpha = def.intensity * 0.4;
            ctx.drawImage(texture, -size/2, -size/2, size, size);
            ctx.restore();

            ctx.restore();
        }
        else if (def.type === 'LIQUID') {
            const speed = globalTime * def.speed;
            const intensity = def.intensity * (0.8 + Math.sin(speed) * 0.2);
            SurfacePainter.drawLiquid(ctx, x, y, def.primaryColor, speed, intensity);
            if (def.cracks) SurfacePainter.drawCracks(ctx, x, y, def.secondaryColor, intensity);
        }
        else if (def.type === 'CRYSTAL') {
            if (def.extrude) VolumePainter.drawExtrusion(ctx, x, y, HEX_SIZE * 0.75, 6, def.primaryColor, 0.6);
            
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            const texture = VFXFactory.getTexture('ROCK', def.secondaryColor);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.5;
            ctx.drawImage(texture, -12, -12, 24, 24);
            ctx.restore();
        }
        else if (def.type === 'VOID_HOLE') {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.6, 0, Math.PI*2); ctx.fill();
            
            const grad = ctx.createRadialGradient(0,0,HEX_SIZE*0.3, 0,0,HEX_SIZE * 0.7);
            grad.addColorStop(0, def.primaryColor);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = def.intensity;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.8, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
        
        ctx.restore();
    }
};
