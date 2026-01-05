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
        let fade = hazard.duration < 0.8 ? hazard.duration / 0.8 : 1.0;
        
        ctx.save();
        ctx.globalAlpha = fade;
        const drawY = VisualMath.applyLayerBias(y, 'HAZARD');

        if (def.type === 'FOG') {
            const texture = VFXFactory.getTexture('SMOKE', def.primaryColor);
            const size = HEX_SIZE * 3.0; 
            const speed = globalTime * def.speed;

            ctx.save();
            ctx.translate(x, drawY + VisualMath.Z_LAYERS.HAZARD_FOG); 
            ctx.scale(1, ISO_SCALE_Y);
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = def.intensity * 0.3;
            ctx.drawImage(texture, -size * 0.3, -size * 0.3, size * 0.6, size * 0.6);

            ctx.globalCompositeOperation = (hazard.type === 'POISON') ? 'screen' : 'lighter';
            ctx.save(); ctx.rotate(speed * 0.12); ctx.globalAlpha = def.intensity * 0.6; ctx.drawImage(texture, -size/2, -size/2, size, size); ctx.restore();
            ctx.save(); ctx.rotate(-speed * 0.08 + 2.0); ctx.scale(0.9, 0.9); ctx.globalAlpha = def.intensity * 0.4; ctx.drawImage(texture, -size/2, -size/2, size, size); ctx.restore();
            ctx.restore();
        }
        else if (def.type === 'LIQUID') {
            const speed = globalTime * def.speed;
            const intensity = def.intensity * (0.85 + Math.sin(speed * 0.8) * 0.15);
            const liquidY = drawY + VisualMath.Z_LAYERS.LIQUID_OFFSET;

            SurfacePainter.drawLiquid(ctx, x, liquidY, def.primaryColor, speed, intensity);
            if (def.cracks) SurfacePainter.drawCracks(ctx, x, liquidY, def.secondaryColor, intensity * 0.8);
            
            if (hazard.type === 'FIRE') {
                const flameTex = VFXFactory.getTexture('SMOKE', '#fca5a5');
                const rise = (globalTime * 50) % 30;
                ctx.save();
                ctx.translate(x, liquidY - 10 - rise);
                ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = (1 - rise/30) * intensity;
                ctx.drawImage(flameTex, -20, -60, 40, 60);
                ctx.restore();
            }
        }
        else if (def.type === 'CRYSTAL') {
            if (def.extrude) VolumePainter.drawExtrusion(ctx, x, drawY, HEX_SIZE * 0.8, 8, def.primaryColor, 0.7);
            ctx.save();
            ctx.translate(x, drawY - 5); ctx.scale(1, ISO_SCALE_Y);
            ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.6;
            ctx.drawImage(VFXFactory.getTexture('ROCK', def.secondaryColor), -15, -15, 30, 30);
            ctx.restore();
        }
        else if (def.type === 'VOID_HOLE') {
            const r = HEX_SIZE * 1.6;
            ctx.save();
            ctx.translate(x, drawY); ctx.scale(1, ISO_SCALE_Y);
            ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI*2); ctx.fill();
            ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 4; ctx.strokeStyle = def.secondaryColor;
            ctx.shadowColor = def.secondaryColor; ctx.shadowBlur = 20;
            ctx.rotate(globalTime * 3);
            ctx.beginPath();
            for(let i=0; i<3; i++) {
                const ang = i * (Math.PI*2/3); ctx.moveTo(0,0);
                ctx.quadraticCurveTo(Math.cos(ang)*r, Math.sin(ang)*r, Math.cos(ang+1)*r, Math.sin(ang+1)*r);
            }
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }
};