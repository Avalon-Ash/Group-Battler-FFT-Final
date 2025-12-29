
import { GroundHazard } from "../../../../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../../../constants";
import { HAZARD_VISUALS } from "../../../../../data/vfx/hazard_visuals";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { SurfacePainter } from "../../../graphics/painters/SurfacePainter";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";
import { VisualMath } from "../../../math/VisualMath";

export const HazardPainter = {
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, hazard: GroundHazard, globalTime: number) {
        const def = HAZARD_VISUALS[hazard.type] || HAZARD_VISUALS['GENERIC'];
        
        let fade = 1.0;
        if (hazard.duration < 0.8) fade = hazard.duration / 0.8;
        
        ctx.save();
        ctx.globalAlpha = fade;

        // SSOT: Use centralized Z-Layer bias
        const drawY = VisualMath.applyLayerBias(y, 'HAZARD');

        if (def.type === 'FOG') {
            const texture = VFXFactory.getTexture('SMOKE', def.primaryColor);
            // Increased scale for visibility
            const size = HEX_SIZE * 3.0; 
            const speed = globalTime * def.speed;

            ctx.save();
            ctx.translate(x, drawY - 15); // Fog floats a bit higher naturally
            ctx.scale(1, ISO_SCALE_Y);
            
            // 1. Base Body (Darker, Opaque-ish) for Volume
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = def.intensity * 0.3;
            ctx.drawImage(texture, -size * 0.3, -size * 0.3, size * 0.6, size * 0.6);

            // 2. Swirling Light Layers
            ctx.globalCompositeOperation = (hazard.type === 'POISON') ? 'screen' : 'lighter';
            
            ctx.save();
            ctx.rotate(speed * 0.12);
            ctx.globalAlpha = def.intensity * 0.6;
            ctx.drawImage(texture, -size/2, -size/2, size, size);
            ctx.restore();

            ctx.save();
            ctx.rotate(-speed * 0.08 + 2.0);
            ctx.scale(0.9, 0.9);
            ctx.globalAlpha = def.intensity * 0.4;
            ctx.drawImage(texture, -size/2, -size/2, size, size);
            ctx.restore();

            ctx.restore();
        }
        else if (def.type === 'LIQUID') {
            const speed = globalTime * def.speed;
            const intensity = def.intensity * (0.85 + Math.sin(speed * 0.8) * 0.15);
            
            ctx.save();
            ctx.translate(0, 0); // No extra translate, drawY is passed
            
            // Base Puddle
            SurfacePainter.drawLiquid(ctx, x, drawY, def.primaryColor, speed, intensity);
            if (def.cracks) SurfacePainter.drawCracks(ctx, x, drawY, def.secondaryColor, intensity * 0.8);
            
            // Rising Heat/Flames (Visual Boost)
            if (hazard.type === 'FIRE') {
                const flameTex = VFXFactory.getTexture('SMOKE', '#fca5a5'); // Bright core color
                const flameH = 60;
                const flameW = 40;
                const rise = (globalTime * 50) % 30;
                
                ctx.translate(x, drawY - 10 - rise);
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = (1 - rise/30) * intensity;
                
                // Draw 2 flame tongues
                ctx.drawImage(flameTex, -flameW/2, -flameH, flameW, flameH);
                ctx.drawImage(flameTex, -flameW * 0.3, -flameH * 0.8, flameW * 0.6, flameH * 0.8);
            }

            ctx.restore();
        }
        else if (def.type === 'CRYSTAL') {
            if (def.extrude) VolumePainter.drawExtrusion(ctx, x, drawY, HEX_SIZE * 0.8, 8, def.primaryColor, 0.7);
            
            ctx.save();
            ctx.translate(x, drawY - 5); 
            ctx.scale(1, ISO_SCALE_Y);
            const texture = VFXFactory.getTexture('ROCK', def.secondaryColor);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.6;
            ctx.drawImage(texture, -15, -15, 30, 30);
            ctx.restore();
        }
        else if (def.type === 'VOID_HOLE') {
            ctx.save();
            ctx.translate(x, drawY);
            ctx.scale(1, ISO_SCALE_Y);
            
            // Massive Radius
            const r = HEX_SIZE * 1.6;
            
            // 1. The Void (Pitch Black Core) - Source Over to eat pixels
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI*2); ctx.fill();

            // 2. Event Horizon (Purple Ring)
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 4;
            ctx.strokeStyle = def.secondaryColor;
            ctx.shadowColor = def.secondaryColor;
            ctx.shadowBlur = 20;
            
            const rot = globalTime * 3;
            ctx.save();
            ctx.rotate(rot);
            // Spiral draw
            ctx.beginPath();
            for(let i=0; i<3; i++) {
                const ang = i * (Math.PI*2/3);
                ctx.moveTo(0,0);
                ctx.quadraticCurveTo(Math.cos(ang)*r, Math.sin(ang)*r, Math.cos(ang+1)*r, Math.sin(ang+1)*r);
            }
            ctx.stroke();
            ctx.restore();

            // 3. Accretion Disk Gradient
            const grad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
            grad.addColorStop(0, def.secondaryColor);
            grad.addColorStop(0.5, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
            
            ctx.restore();
        }
        
        ctx.restore();
    }
};
