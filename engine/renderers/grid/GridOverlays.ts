
import { ZoneRenderer } from "./ZoneRenderer";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { GroundHazard } from "../../../types";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

interface ZoneInfo {
    type: 'CAST';
    color: string;
    visual: string; // Skill visual tag
    progress: number;
    centerQ: number;
    centerR: number;
    radius: number;
    dist: number;
}

export const GridOverlays = {
    
    drawOverlays(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, // Visual Top Face Y
        size: number,
        
        // State Props
        specialStatus: string | undefined, 
        zoneInfo: ZoneInfo | undefined,    
        
        // Lighting
        lightColor: string | null,
        lightIntensity: number,
        
        // Interactive
        isRange: boolean,
        rangeColor: string,
        isHover: boolean,
        hasUnit: boolean,
        
        // Metadata
        q: number, r: number,
        globalTime: number,
        hazard: GroundHazard | undefined
    ) {
        // --- LAYER 1: HAZARDS ---
        if (hazard) {
            ZoneRenderer.drawHazard(ctx, x, y, hazard, globalTime);
        }

        // --- LAYER 2: UNIT STATUS FLOOR TINT ---
        if (specialStatus && specialStatus !== 'NONE') {
            const def = STATUS_VISUALS[specialStatus];
            if (def && def.floorColor) {
                ctx.save();
                // Use source-over for tinted glass look instead of additive
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = def.floorColor;
                ctx.globalAlpha = def.floorOpacity || 0.5;
                HexGeometry.traceHex(ctx, x, y, size);
                ctx.fill();
                ctx.restore();
            }
        }

        // --- LAYER 3: CAST ZONES (Volumetric) ---
        if (zoneInfo) {
            ZoneRenderer.drawZone(
                ctx, x, y, size,
                zoneInfo.color,
                zoneInfo.visual,
                zoneInfo.progress,
                globalTime,
                zoneInfo.dist,
                zoneInfo.radius
            );
        }

        // --- LAYER 4: DYNAMIC LIGHTING ---
        // Reduced intensity to prevent overexposure
        if (lightColor && lightIntensity > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen'; // Screen is safer than lighter
            ctx.globalAlpha = Math.min(0.5, lightIntensity * 0.4); 
            ctx.fillStyle = lightColor;
            HexGeometry.traceHex(ctx, x, y, size);
            ctx.fill();
            ctx.restore();
        }

        // --- LAYER 5: INTERACTIVE UI HIGHLIGHTS ---
        if (isRange || isHover || hasUnit) {
            ctx.save();
            
            // Use 'screen' for light projection look instead of flat paint
            ctx.globalCompositeOperation = 'screen';

            // Valid Move/Skill Range
            if (isRange) { 
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.2; 
                HexGeometry.traceHex(ctx, x, y, size);
                ctx.fill();
                
                ctx.strokeStyle = rangeColor; 
                ctx.lineWidth = 2; 
                ctx.globalAlpha = 0.5; 
                HexGeometry.traceHex(ctx, x, y, size);
                ctx.stroke();
            }
            
            // Mouse Hover - Bright Spotlight
            if (isHover) { 
                ctx.fillStyle = '#ffffff'; 
                ctx.globalAlpha = 0.2;
                HexGeometry.traceHex(ctx, x, y, size);
                ctx.fill(); 
                
                ctx.strokeStyle = '#fff'; 
                ctx.lineWidth = 2; 
                ctx.globalAlpha = 0.8;
                HexGeometry.traceHex(ctx, x, y, size);
                ctx.stroke(); 
            }
            
            // Unit Position - Subtle selection ring
            if (hasUnit && !isHover && !zoneInfo) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.3;
                HexGeometry.traceHex(ctx, x, y, size * 0.9);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
};
