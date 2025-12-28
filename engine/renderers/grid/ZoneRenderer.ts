
import { VolumePainter } from "../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { CAST_VISUALS } from "../../../data/vfx/cast_visuals";

export const ZoneRenderer = {
    
    /**
     * Volumetric Hex Expansion with Warning Support
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

        // A. INNER FILL
        // For WARNINGS & ULTS, we draw volumetric fill
        if (isInsideWave || isWarning) {
            
            if (isWarning) {
                // Danger: Hatched Prism (Height 14, Opacity ~0.2)
                VolumePainter.drawWarningBlock(ctx, x, y, size, color, pulse);
            } 
            else if (isUlt) {
                // Friendly Ult: Smooth Prism
                // Balance intensity with warning (Height 30 -> 14, Opacity 0.4 -> 0.25)
                const height = 14;
                VolumePainter.draw3DPrism(ctx, x, y, size, height, color, 0.25 * pulse, 'SOLID');
            }
            else {
                // Basic/Active: Fog
                let fogOpacity = def.fillOpacityBase * pulse * (0.5 + progress * 0.5);
                VolumePainter.drawVolumetricHex(ctx, x, y, size * 0.9, color, fogOpacity);
            }
        }

        // B. EXPANDING EDGE (Ripple)
        if (isWaveEdge) {
            const edgeOpacity = def.fillOpacityMax * pulse;
            const edgeWidth = (def.baseRingWidth || 3);
            VolumePainter.drawHexRipple(ctx, x, y, size, color, edgeOpacity, edgeWidth);
        }

        // C. PERIMETER MARKER (Always Visible for Warning)
        // If it's a warning or ult, the block already handles the rim
        const showBorder = (!isWarning && !isUlt) && (dist >= maxRadius - 0.5);
        if (showBorder) {
            const borderAlpha = Math.max(0, Math.min(1, (progress * 3) - 0.5)) * 0.4;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1; 
            ctx.globalAlpha = borderAlpha;
            
            if (def.dashed) ctx.setLineDash([5, 5]);
            
            HexGeometry.traceHex(ctx, x, y, size);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }
};
