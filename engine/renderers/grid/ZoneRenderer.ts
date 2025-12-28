
import { VolumePainter } from "../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { CAST_VISUALS } from "../../../data/vfx/cast_visuals";
import { VFXFactory } from "../../graphics/VFXFactory";
import { ISO_SCALE_Y } from "../../../constants";

export const ZoneRenderer = {
    
    /**
     * Optimized Zone Drawer using Sprites
     */
    drawZone(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        color: string,
        visualTag: string, 
        progress: number, // 0.0 (Start) -> 1.0 (Ready)
        globalTime: number,
        dist: number,     // Distance from center of zone (in tiles)
        maxRadius: number // Radius of zone (in tiles)
    ) {
        const isWarning = visualTag === 'AOE_WARNING';
        const isUlt = visualTag === 'ULT';
        
        const styleKey = isWarning ? 'AOE_WARNING' : (visualTag === 'ULT' ? 'ULT' : (visualTag === 'ACTIVE' ? 'ACTIVE' : 'BASIC'));
        const def = CAST_VISUALS[styleKey] || CAST_VISUALS['BASIC'];

        ctx.save();
        
        // --- 1. DYNAMIC EXPANSION ---
        const currentExpansion = progress * (maxRadius + 0.5); 
        const normDist = dist; 
        
        const isInsideWave = normDist <= currentExpansion;
        const isWaveEdge = Math.abs(normDist - currentExpansion) < 0.8;

        // --- 2. PULSE ---
        const pulse = isWarning 
            ? (0.5 + Math.abs(Math.sin(globalTime * 15)) * 0.5) 
            : (1.0 + Math.sin(globalTime * def.pulseSpeed) * 0.1);

        if (def.blendMode) ctx.globalCompositeOperation = def.blendMode;

        // A. INNER FILL (Using Sprites)
        if (isInsideWave || isWarning) {
            
            if (isWarning) {
                // Danger: Hatched Prism - Cached in VolumePainter
                VolumePainter.drawWarningBlock(ctx, x, y, size, color, pulse);
            } 
            else if (isUlt) {
                // Friendly Ult: Smooth Prism
                const height = 14;
                VolumePainter.draw3DPrism(ctx, x, y, size, height, color, 0.25 * pulse, 'SOLID');
            }
            else {
                // Basic/Active: Sprite Base
                const opacity = def.fillOpacityBase * pulse * (0.5 + progress * 0.5);
                const texture = VFXFactory.getTexture('ZONE_BASE', color);
                const drawSize = size * 2.8;
                
                ctx.translate(x, y);
                ctx.scale(1, ISO_SCALE_Y);
                ctx.globalAlpha = opacity;
                ctx.drawImage(texture, -drawSize/2, -drawSize/2, drawSize, drawSize);
                // Undo transform for next layers
                ctx.scale(1, 1/ISO_SCALE_Y);
                ctx.translate(-x, -y);
            }
        }

        // B. EXPANDING EDGE (Using Ripple Sprite)
        if (isWaveEdge) {
            const edgeOpacity = def.fillOpacityMax * pulse;
            const texture = VFXFactory.getTexture('ZONE_RIPPLE', color);
            const drawSize = size * 2.5;

            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            ctx.globalAlpha = edgeOpacity;
            ctx.drawImage(texture, -drawSize/2, -drawSize/2, drawSize, drawSize);
            // Undo
            ctx.scale(1, 1/ISO_SCALE_Y);
            ctx.translate(-x, -y);
        }

        // C. PERIMETER MARKER (Always Visible for Warning)
        // Optimized: Only trace path if strictly necessary (border logic)
        // Reduced frequency: only draw solid border, no dashed logic for standard tiles
        const showBorder = (!isWarning && !isUlt) && (dist >= maxRadius - 0.5);
        if (showBorder) {
            const borderAlpha = Math.max(0, Math.min(1, (progress * 3) - 0.5)) * 0.4;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1; 
            ctx.globalAlpha = borderAlpha;
            
            // Only use HexGeometry pathing here as it is efficient enough for single outline
            HexGeometry.traceHex(ctx, x, y, size);
            ctx.stroke();
        }

        ctx.restore();
    }
};
