
import { HEX_SIZE, ISO_SCALE_Y } from "../../../../constants";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const UnitIndicatorPainter = {
    
    drawSkillGroundIndicator(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        color: string, 
        t: number, 
        progress: number, 
        skillRadius: number, 
        type: string, 
        isAOE: boolean
    ) {
        const pixelRadius = Math.max(1, skillRadius) * HEX_SIZE;
        const currentRadius = pixelRadius * progress;
        const opacity = 0.3 + Math.sin(t * 5) * 0.1;

        // Use volumetric for local skill indicator too
        VolumePainter.drawVolumetricHex(ctx, 0, 0, currentRadius, color, opacity);
        
        const ringSize = currentRadius * 2.5; 
        const ring = VFXFactory.getTexture('RING', color);
        
        ctx.save();
        ctx.scale(1, ISO_SCALE_Y); 
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = opacity * 1.2;
        ctx.drawImage(ring, -ringSize/2, -ringSize/2, ringSize, ringSize);
        ctx.restore();
    }
};
