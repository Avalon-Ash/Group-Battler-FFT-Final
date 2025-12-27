
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

        // Logic for "Ripple" Effect
        // We want a ring that expands/contracts based on progress
        const radiusPx = (maxRadius + 0.5) * size * 1.5; // Approximate pixel radius of zone
        const myDistPx = dist * size * 1.5;
        
        // Normalized position within the zone (0 = center, 1 = edge)
        const normalizedPos = myDistPx / Math.max(1, radiusPx);
        
        // Pulse Logic
        const pulse = 1.0 + Math.sin(globalTime * def.pulseSpeed) * 0.1;
        
        // --- A. BASE FILL ---
        // Always draw a faint background for the zone
        ctx.fillStyle = color;
        ctx.globalAlpha = def.fillOpacityBase * pulse * (1 - normalizedPos * 0.5);
        SurfaceAssets.traceHex(ctx, x, y, size * 0.9);
        ctx.fill();

        // --- B. CHARGE RIPPLE ---
        // A band that moves inward or outward
        const waveWidth = 0.2;
        const wavePos = 1.0 - progress; // Move inward as cast completes
        
        if (Math.abs(normalizedPos - wavePos) < waveWidth) {
            ctx.globalAlpha = def.fillOpacityMax * pulse;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = def.innerRingWidth || 1;
            SurfaceAssets.traceHex(ctx, x, y, size * 0.85);
            if (def.innerRingWidth > 0) ctx.stroke();
            
            ctx.fillStyle = color;
            ctx.fill();
        }

        // --- C. OUTER BORDER (Perimeter) ---
        // Only drawn on tiles at the edge of the radius
        if (dist >= maxRadius - 0.5) {
            ctx.strokeStyle = color;
            ctx.lineWidth = def.baseRingWidth;
            ctx.globalAlpha = 0.8 * pulse;
            
            if (def.dashed) ctx.setLineDash([10, 5]);
            
            // Rotating Runes Effect (Simulated by rotating hex slightly? No, keeping it stable is better for grid)
            // Just draw the border
            SurfaceAssets.traceHex(ctx, x, y, size * 0.92);
            ctx.stroke();
            
            ctx.setLineDash([]);
        }

        ctx.restore();
    }
};
