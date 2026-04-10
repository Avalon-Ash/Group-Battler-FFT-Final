
import { HEX_SIZE, ISO_SCALE_Y } from "../../../../constants";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../../types";

export const UnitIndicatorPainter = {
    
    drawSkillGroundIndicator(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        color: string, 
        t: number, 
        progress: number, 
        skillRadius: number, 
        type: string, 
        isAOE: boolean,
        layout: HexLayout
    ) {
        // Strict Mathematical Radius
        const maxPixelRadius = Math.max(1, skillRadius) * HEX_SIZE;
        const currentRadius = maxPixelRadius * progress;
        
        // Alpha pulse
        const opacity = 0.3 + Math.sin(t * 8) * 0.1;

        // 1. Volumetric Glow (Floor lighting)
        VolumePainter.drawVolumetricHex(ctx, x, y, currentRadius, color, opacity);
        
        // 2. Vector Ring (Precision geometry)
        ctx.save();
        ctx.translate(x, y);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = opacity * 1.5;
        
        // Draw expanding hex
        HexGeometry.traceHex(ctx, 0, 0, currentRadius, true, layout);
        ctx.stroke();
        
        // Inner Echo
        ctx.lineWidth = 1;
        ctx.globalAlpha = opacity * 0.8;
        HexGeometry.traceHex(ctx, 0, 0, currentRadius * 0.8, true, layout);
        ctx.stroke();

        ctx.restore();
    }
};
