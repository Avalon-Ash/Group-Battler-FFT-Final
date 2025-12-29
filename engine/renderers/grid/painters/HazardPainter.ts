import { GroundHazard } from "../../../../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../../../constants";
import { HAZARD_VISUALS } from "../../../../../data/vfx/hazard_visuals";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { SurfacePainter } from "../../../graphics/painters/SurfacePainter";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const HazardPainter = {
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, hazard: GroundHazard, globalTime: number) {
        const def = HAZARD_VISUALS[hazard.type] || HAZARD_VISUALS['GENERIC'];
        
        let fade = 1.0;
        if (hazard.duration < 0.8) fade = hazard.duration / 0.8;
        
        ctx.save();
        ctx.globalAlpha = fade;

        if (def.type === 'FOG') {
            const texture = VFXFactory.getTexture('SMOKE', def.primaryColor);
            const size = HEX_SIZE * 1.5;
            const speed = globalTime * def.speed;

            ctx.save();
            ctx.translate(x, y - 2); 
            ctx.scale(1, ISO_SCALE_Y);
            
            ctx.globalCompositeOperation = (hazard.type === 'POISON') ? 'screen' : 'lighter';
            
            ctx.save();
            ctx.rotate(speed * 0.12);
            ctx.globalAlpha = def.intensity * 0.8;
            ctx.drawImage(texture, -size/2, -size/2, size, size);
            ctx.restore();

            ctx.save();
            ctx.rotate(-speed * 0.08 + 1);
            ctx.scale(0.85, 0.85);
            ctx.globalAlpha = def.intensity * 0.5;
            ctx.drawImage(texture, -size/2, -size/2, size, size);
            ctx.restore();

            ctx.restore();
        }
        else if (def.type === 'LIQUID') {
            const speed = globalTime * def.speed;
            const intensity = def.intensity * (0.85 + Math.sin(speed * 0.8) * 0.15);
            SurfacePainter.drawLiquid(ctx, x, y, def.primaryColor, speed, intensity);
            if (def.cracks) SurfacePainter.drawCracks(ctx, x, y, def.secondaryColor, intensity * 0.8);
        }
        else if (def.type === 'CRYSTAL') {
            if (def.extrude) VolumePainter.drawExtrusion(ctx, x, y, HEX_SIZE * 0.8, 8, def.primaryColor, 0.7);
            
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            const texture = VFXFactory.getTexture('ROCK', def.secondaryColor);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.6;
            ctx.drawImage(texture, -15, -15, 30, 30);
            ctx.restore();
        }
        else if (def.type === 'VOID_HOLE') {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            
            // 使用徑向漸變製作「事件視界」效果，取代純黑圓塊
            const r = HEX_SIZE * 0.8;
            const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
            grad.addColorStop(0, '#000');
            grad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
            grad.addColorStop(0.8, def.secondaryColor);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.8 * def.intensity;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
            
            // 增加中心吸入感的動態環
            ctx.strokeStyle = def.secondaryColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.4 * (0.5 + Math.sin(globalTime * 5) * 0.5);
            ctx.beginPath(); ctx.arc(0, 0, r * 0.9 * (1 - (globalTime % 1)), 0, Math.PI*2); ctx.stroke();
            
            ctx.restore();
        }
        
        ctx.restore();
    }
};