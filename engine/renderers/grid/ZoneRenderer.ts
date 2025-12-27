
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
import { GroundHazard } from "../../../types";
import { HAZARD_VISUALS } from "../../../data/vfx/hazard_visuals";
import { CAST_VISUALS } from "../../../data/vfx/cast_visuals";

export const ZoneRenderer = {
    
    drawHazard(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        hazard: GroundHazard,
        globalTime: number
    ) {
        const def = HAZARD_VISUALS[hazard.type] || HAZARD_VISUALS['GENERIC'];
        
        if (def.type === 'LIQUID') {
            const speed = globalTime * def.speed;
            const intensity = def.intensity * (0.85 + Math.sin(speed) * 0.15);
            SurfaceAssets.drawLiquid(ctx, x, y, def.primaryColor, speed, intensity);
            if (def.cracks) SurfaceAssets.drawCracks(ctx, x, y, def.secondaryColor, intensity);
        }
        else if (def.type === 'FOG') {
            SurfaceAssets.drawFog(ctx, x, y, def.primaryColor, globalTime * def.speed);
        }
        else if (def.type === 'CRYSTAL') {
            if (def.extrude) SurfaceAssets.drawExtrusion(ctx, x, y, 8, def.primaryColor, 0.5);
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            ctx.fillStyle = def.secondaryColor;
            ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.8, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
        else if (def.type === 'VOID_HOLE') {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            ctx.fillStyle = def.primaryColor;
            ctx.globalAlpha = def.intensity;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.7, 0, Math.PI*2); ctx.fill();
            ctx.rotate(globalTime * def.speed);
            ctx.strokeStyle = def.secondaryColor;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 15]);
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.8, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
    },

    /**
     * REFACTORED: Volumetric Hex Expansion
     * Replaces the thin "Ripple" logic with a growing, soft hexagon volume.
     * STRICTLY follows the Hexagonal shape rule for Standard AOE.
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
        // Resolve Config
        const styleKey = (visualTag === 'ULT') ? 'ULT' : 
                         (visualTag === 'ACTIVE') ? 'ACTIVE' : 
                         (visualTag === 'AOE_WARNING') ? 'AOE_WARNING' : 'BASIC';
                         
        const def = CAST_VISUALS[styleKey] || CAST_VISUALS['BASIC'];

        ctx.save();
        
        // 1. Blend Mode Correction (Avoid Exposure Blowout)
        // Default to screen or source-over for volumetric fog, lighter only for intense sparks
        if (def.blendMode) ctx.globalCompositeOperation = def.blendMode;

        // --- VOLUMETRIC WAVE LOGIC ---
        // Instead of a thin line, we draw a "Volume" that fills up.
        
        const normDist = dist / Math.max(1, maxRadius);
        // The wave expands slightly past 1.0 to ensure full coverage
        const wavePos = progress * 1.1; 
        
        const isInsideWave = wavePos >= normDist;
        const distToEdge = Math.abs(wavePos - normDist);
        const isEdge = distToEdge < 0.2; // Broader edge for volume

        // Pulse effect
        const pulse = 1.0 + Math.sin(globalTime * def.pulseSpeed) * 0.1;
        
        // A. INNER VOLUME (The Fog)
        if (isInsideWave) {
            // Opacity ramps up as skill completes
            const fogOpacity = def.fillOpacityBase * pulse * (0.5 + progress * 0.5);
            
            // Draw Volumetric Hex (Soft Gradient Fill)
            SurfaceAssets.drawVolumetricHex(ctx, x, y, size * 0.95, color, fogOpacity);
        }

        // B. EXPANDING EDGE (The Shockwave)
        if (isEdge) {
            const edgeIntensity = 1.0 - (distToEdge / 0.2); 
            const edgeOpacity = def.fillOpacityMax * edgeIntensity;
            const edgeWidth = (def.baseRingWidth || 3) * edgeIntensity * 2;

            // Draw thick, blurred hex stroke
            SurfaceAssets.drawHexRipple(ctx, x, y, size, color, edgeOpacity, edgeWidth);
        }

        // C. PERIMETER MARKER (Static Border)
        // Only drawn on tiles at the exact edge of the radius to define the boundary clearly
        // But softer now.
        if (dist >= maxRadius - 0.5) {
            const borderAlpha = Math.max(0, Math.min(1, (progress * 3) - 0.5)) * 0.5; // Fade in later, lower alpha
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1; // Thin guide line
            ctx.globalAlpha = borderAlpha;
            
            if (def.dashed) ctx.setLineDash([5, 5]);
            SurfaceAssets.traceHex(ctx, x, y, size);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }
};
