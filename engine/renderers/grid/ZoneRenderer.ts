
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
import { GroundHazard } from "../../../types";
import { HAZARD_VISUALS } from "../../../data/vfx/hazard_visuals";
import { CAST_VISUALS } from "../../../data/vfx/cast_visuals";
import { VFXFactory } from "../../graphics/VFXFactory";

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
            // Uses new Volumetric Smoke Puff texture internally
            SurfaceAssets.drawFog(ctx, x, y, def.primaryColor, globalTime * def.speed);
        }
        else if (def.type === 'CRYSTAL') {
            if (def.extrude) SurfaceAssets.drawExtrusion(ctx, x, y, 8, def.primaryColor, 0.5);
            
            // Ground Crystal Glow
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            
            // Texture
            const texture = VFXFactory.getTexture('SHARD', def.secondaryColor);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.4;
            
            // Draw scattered crystal shards on floor
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
            
            // Dark Core
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.7, 0, Math.PI*2); ctx.fill();
            
            // Event Horizon Glow
            const grad = ctx.createRadialGradient(0,0,HEX_SIZE*0.5, 0,0,HEX_SIZE);
            grad.addColorStop(0, def.primaryColor);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = def.intensity;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE, 0, Math.PI*2); ctx.fill();
            
            // Rotating Accretion Disk
            ctx.rotate(globalTime * def.speed);
            ctx.strokeStyle = def.secondaryColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 10]);
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.8, 0, Math.PI*2); ctx.stroke();
            
            ctx.restore();
        }
    },

    /**
     * REFACTORED: Volumetric Hex Expansion with Warning Support
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
        // Warning Override: If color is red/enemy, assume warning logic
        const isWarning = visualTag === 'AOE_WARNING';
        
        const styleKey = isWarning ? 'AOE_WARNING' : (visualTag === 'ULT' ? 'ULT' : (visualTag === 'ACTIVE' ? 'ACTIVE' : 'BASIC'));
        const def = CAST_VISUALS[styleKey] || CAST_VISUALS['BASIC'];

        ctx.save();
        
        // --- 1. DYNAMIC EXPANSION ---
        // Progress determines how far out the "wave" has gone
        // progress 0.0 = center only
        // progress 1.0 = full radius coverage
        const currentExpansion = progress * (maxRadius + 0.5); 
        const normDist = dist; 
        
        const isInsideWave = normDist <= currentExpansion;
        const isWaveEdge = Math.abs(normDist - currentExpansion) < 0.8;

        // --- 2. WARNING PULSE (High Frequency) ---
        // Flash red vigorously if it's a warning
        const pulse = isWarning 
            ? (0.8 + Math.abs(Math.sin(globalTime * 15)) * 0.4) 
            : (1.0 + Math.sin(globalTime * def.pulseSpeed) * 0.1);

        if (def.blendMode) ctx.globalCompositeOperation = def.blendMode;

        // A. INNER FILL
        // For WARNINGS, we draw the solid fill regardless of "wave" expansion so it's instantly visible
        if (isInsideWave || isWarning) {
            
            if (isWarning) {
                // VISUAL FIX: Solid Danger Zone
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.3 * pulse; // Significant base opacity
                SurfaceAssets.traceHex(ctx, x, y, size * 0.95);
                ctx.fill();

                // Add Striped Texture (Hatching)
                SurfaceAssets.drawHatch(ctx, x, y, size, color, 0.4 * pulse);

            } else {
                // Friendly Volumetric Fog
                let fogOpacity = def.fillOpacityBase * pulse * (0.5 + progress * 0.5);
                SurfaceAssets.drawVolumetricHex(ctx, x, y, size * 0.9, color, fogOpacity);
            }
        }

        // B. EXPANDING EDGE (Ripple)
        if (isWaveEdge) {
            const edgeOpacity = def.fillOpacityMax * pulse;
            const edgeWidth = (def.baseRingWidth || 3);
            SurfaceAssets.drawHexRipple(ctx, x, y, size, color, edgeOpacity, edgeWidth);
        }

        // C. PERIMETER MARKER (Always Visible for Warning)
        const showBorder = isWarning || (dist >= maxRadius - 0.5);
        if (showBorder) {
            const borderAlpha = isWarning ? 0.9 * pulse : Math.max(0, Math.min(1, (progress * 3) - 0.5)) * 0.4;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = isWarning ? 3 : 1; 
            ctx.globalAlpha = borderAlpha;
            
            if (def.dashed) ctx.setLineDash([5, 5]);
            
            SurfaceAssets.traceHex(ctx, x, y, size);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }
};
