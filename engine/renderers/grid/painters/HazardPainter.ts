
import { GroundHazard } from "../../../../../types";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../../../constants";
import { HAZARD_VISUALS } from "../../../../../data/vfx/hazard_visuals";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { SurfacePainter } from "../../../graphics/painters/SurfacePainter";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

// 唯一數學常數：地面效果提升高度，杜絕穿插
const HAZARD_PLANE_LIFT = -3; 
const FOG_PLANE_LIFT = -15;

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
            ctx.translate(x, y + FOG_PLANE_LIFT); // 高度偏置
            ctx.scale(1, ISO_SCALE_Y);
            
            ctx.globalCompositeOperation = (hazard.type === 'POISON') ? 'screen' : 'lighter';
            
            // 多層旋轉噪波模擬煙霧流動
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
            // 諧波震盪：使邊緣產生律動感
            const intensity = def.intensity * (0.85 + Math.sin(speed * 0.8) * 0.15);
            
            ctx.save();
            ctx.translate(0, HAZARD_PLANE_LIFT); // 物理微抬升
            SurfacePainter.drawLiquid(ctx, x, y, def.primaryColor, speed, intensity);
            if (def.cracks) SurfacePainter.drawCracks(ctx, x, y, def.secondaryColor, intensity * 0.8);
            ctx.restore();
        }
        else if (def.type === 'CRYSTAL') {
            // 晶體類具備體積感
            if (def.extrude) VolumePainter.drawExtrusion(ctx, x, y + HAZARD_PLANE_LIFT, HEX_SIZE * 0.8, 8, def.primaryColor, 0.7);
            
            ctx.save();
            ctx.translate(x, y + HAZARD_PLANE_LIFT - 5); 
            ctx.scale(1, ISO_SCALE_Y);
            const texture = VFXFactory.getTexture('ROCK', def.secondaryColor);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.6;
            ctx.drawImage(texture, -15, -15, 30, 30);
            ctx.restore();
        }
        else if (def.type === 'VOID_HOLE') {
            ctx.save();
            ctx.translate(x, y + HAZARD_PLANE_LIFT);
            ctx.scale(1, ISO_SCALE_Y);
            
            const r = HEX_SIZE * 0.8;
            // 事件視界漸變
            const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
            grad.addColorStop(0, '#000');
            grad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
            grad.addColorStop(0.8, def.secondaryColor);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.8 * def.intensity;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
            
            // 吸入感動態環
            ctx.strokeStyle = def.secondaryColor;
            ctx.lineWidth = 2;
            const cycle = (globalTime * 2) % 1;
            ctx.globalAlpha = 0.4 * (1 - cycle);
            ctx.beginPath(); ctx.arc(0, 0, r * (1 - cycle), 0, Math.PI*2); ctx.stroke();
            
            ctx.restore();
        }
        
        ctx.restore();
    }
};
