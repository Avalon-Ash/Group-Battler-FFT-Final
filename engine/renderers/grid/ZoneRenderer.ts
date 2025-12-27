
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
import { GroundHazard } from "../../../types";
import { HAZARD_VISUALS } from "../../../data/vfx/hazard_visuals";
import { CAST_VISUALS } from "../../../data/vfx/cast_visuals";

export const ZoneRenderer = {
    
    /**
     * Renders persistent ground hazards (Fire, Poison, etc.)
     */
    drawHazard(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        hazard: GroundHazard,
        globalTime: number
    ) {
        const def = HAZARD_VISUALS[hazard.type] || HAZARD_VISUALS['GENERIC'];
        
        // 1. LIQUID (Magma, Water)
        if (def.type === 'LIQUID') {
            const speed = globalTime * def.speed;
            const intensity = def.intensity * (0.85 + Math.sin(speed) * 0.15);
            
            SurfaceAssets.drawLiquid(ctx, x, y, def.primaryColor, speed, intensity);
            
            if (def.cracks) {
                SurfaceAssets.drawCracks(ctx, x, y, def.secondaryColor, intensity);
            }
        }
        // 2. FOG (Poison, Smoke)
        else if (def.type === 'FOG') {
            SurfaceAssets.drawFog(ctx, x, y, def.primaryColor, globalTime * def.speed);
        }
        // 3. CRYSTAL (Ice, Wall)
        else if (def.type === 'CRYSTAL') {
            if (def.extrude) {
                SurfaceAssets.drawExtrusion(ctx, x, y, 8, def.primaryColor, 0.5);
            }
            // Base Glow
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            ctx.fillStyle = def.secondaryColor;
            ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.8, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
        // 4. VOID HOLE (Gravity)
        else if (def.type === 'VOID_HOLE') {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            
            // Black Hole Center
            ctx.fillStyle = def.primaryColor; // Usually black
            ctx.globalAlpha = def.intensity;
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.7, 0, Math.PI*2); ctx.fill();
            
            // Accretion Disk (Rotating Ring)
            ctx.rotate(globalTime * def.speed);
            ctx.strokeStyle = def.secondaryColor;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 15]);
            ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE * 0.8, 0, Math.PI*2); ctx.stroke();
            
            ctx.restore();
        }
    },

    /**
     * Renders casting indicators and AOE warnings.
     * REFACTORED: Now uses a global ripple logic (Center -> Outwards)
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
        if (def.blendMode) ctx.globalCompositeOperation = def.blendMode;

        // --- MATH: GLOBAL RIPPLE PROPAGATION ---
        // We want a wave that travels from Dist 0 to Dist MaxRadius based on Progress
        // Normalized Distance (0.0 at center, 1.0 at edge)
        const normDist = dist / Math.max(1, maxRadius);
        
        // The "Wave Front" position (0.0 to 1.0)
        // We speed it up slightly (1.2) so it finishes expanding before the cast is fully done
        // allowing the full field to be lit up at the end.
        const wavePos = progress * 1.2; 
        
        // Calculate intensity based on proximity to the wave front
        // If wavePos > normDist, it means the wave has passed this tile -> It stays lit (Filled)
        // If wavePos is close to normDist, it's the "Leading Edge" (Bright)
        
        const isFilled = wavePos >= normDist;
        const distToWave = Math.abs(wavePos - normDist);
        const isLeadingEdge = distToWave < 0.15; // Width of the ripple ring

        const pulse = 1.0 + Math.sin(globalTime * def.pulseSpeed) * 0.1;
        
        // --- A. BASE FILL (Accumulates as wave passes) ---
        if (isFilled) {
            ctx.fillStyle = color;
            // Opacity increases as we get closer to completion
            ctx.globalAlpha = def.fillOpacityBase * pulse * progress; 
            SurfaceAssets.traceHex(ctx, x, y, size * 0.9);
            ctx.fill();
        }

        // --- B. LEADING EDGE RIPPLE (The moving ring) ---
        if (isLeadingEdge) {
            const edgeIntensity = 1.0 - (distToWave / 0.15); // Fade out at edges of the ring
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = (def.innerRingWidth || 2) * edgeIntensity;
            ctx.globalAlpha = def.fillOpacityMax * edgeIntensity;
            
            // Slight scale pop on the wave front
            SurfaceAssets.traceHex(ctx, x, y, size * (0.9 + 0.05 * edgeIntensity));
            ctx.stroke();
            
            // Add a glow to the leading edge
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.4 * edgeIntensity;
            ctx.fill();
        }

        // --- C. OUTER BORDER (Perimeter) ---
        // Only drawn on tiles at the edge of the radius
        if (dist >= maxRadius - 0.5) {
            // Only show border if the wave has reached it (or fade it in)
            const borderAlpha = Math.max(0, Math.min(1, (progress * 2) - 0.5)); // Fade in halfway through
            
            ctx.strokeStyle = color;
            ctx.lineWidth = def.baseRingWidth;
            ctx.globalAlpha = 0.8 * pulse * borderAlpha;
            
            if (def.dashed) ctx.setLineDash([10, 5]);
            SurfaceAssets.traceHex(ctx, x, y, size * 0.92);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }
};
