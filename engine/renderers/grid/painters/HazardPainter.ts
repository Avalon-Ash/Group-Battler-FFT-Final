
import { GroundHazard } from "../../../../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../../../constants";
import { HAZARD_VISUALS } from "../../../../../data/vfx/hazard_visuals";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { SurfacePainter } from "../../../graphics/painters/SurfacePainter";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const HazardPainter = {
    // x, y here are now VISUAL SURFACE COORDINATES (Top of the block)
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, hazard: GroundHazard, globalTime: number) {
        const def = HAZARD_VISUALS[hazard.type] || HAZARD_VISUALS['GENERIC'];
        
        if (def.type === 'FOG') {
            const texture = VFXFactory.getTexture('CLOUD', def.primaryColor);
            const size = HEX_SIZE * 3.5;
            const speed = globalTime * def.speed;

            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = def.intensity * 0.4;

            ctx.save();
            ctx.rotate(speed * 0.2);
            ctx.drawImage(texture, -size/2, -size/2, size, size);
            ctx.restore();

            ctx.save();
            ctx.rotate(-speed * 0.3 + 1.0);
            ctx.scale(0.7, 0.7);
            ctx.globalAlpha = def.intensity * 0.6;
            ctx.drawImage(texture, -size/2, -size/2, size, size);
            ctx.restore();

            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.2;
            const glow = VFXFactory.getTexture('GLOW', def.secondaryColor);
            ctx.drawImage(glow, -size*0.4, -size*0.4, size*0.8, size*0.8);

            ctx.restore();
        }
        else if (def.type === 'LIQUID') {
            const speed = globalTime * def.speed;
            const intensity = def.intensity * (0.85 + Math.sin(speed) * 0.15);
            SurfacePainter.drawLiquid(ctx, x, y, def.primaryColor, speed, intensity);
            if (def.cracks) SurfacePainter.drawCracks(ctx, x, y, def.secondaryColor, intensity);
        }
        else if (def.type === 'CRYSTAL') {
            if (def.extrude) VolumePainter.drawExtrusion(ctx, x, y, HEX_SIZE, 8, def.primaryColor, 0.5);
            
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            
            const texture = VFXFactory.getTexture('SHARD', def.secondaryColor);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.4;
            
            for(let i=0; i<3; i++) {
                const angle = i * 2.0;
                const dist = 10;
                const px = Math.cos(angle) * dist;
                const py = Math.sin(angle) * dist;
                ctx.drawImage(texture, px-10, py-10, 20, 20);
            }
            ctx.restore();
        }
        else if (def.type === 'VOID_HOLE') {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.7, 0, Math.PI*2); ctx.fill();
            
            const grad = ctx.createRadialGradient(0,0,HEX_SIZE*0.5, 0,0,HEX_SIZE);
            grad.addColorStop(0, def.primaryColor);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = def.intensity;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE, 0, Math.PI*2); ctx.fill();
            
            ctx.rotate(globalTime * def.speed);
            ctx.strokeStyle = def.secondaryColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 10]);
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.8, 0, Math.PI*2); ctx.stroke();
            
            ctx.restore();
        }
    }
};
