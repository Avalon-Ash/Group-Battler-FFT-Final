
import { TerrainRenderer } from "./TerrainRenderer";
import { ZoneRenderer } from "./ZoneRenderer";
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { GroundHazard } from "../../../types";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { HEX_SIZE } from "../../../constants";

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
        specialStatus: string | undefined, // Unit Status (e.g. Frozen)
        zoneInfo: ZoneInfo | undefined,    // Cast Range / AOE Warning
        
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
        // Persistent ground effects (Fire, Ice, Poison)
        if (hazard) {
            ZoneRenderer.drawHazard(ctx, x, y, hazard, globalTime);
        }

        // --- LAYER 2: UNIT STATUS FLOOR TINT ---
        // e.g. Polymorph creates a purple rune, Frozen creates ice patch
        if (specialStatus && specialStatus !== 'NONE') {
            const def = STATUS_VISUALS[specialStatus];
            if (def && def.floorColor) {
                ctx.save();
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = def.floorColor;
                ctx.globalAlpha = def.floorOpacity || 0.5;
                SurfaceAssets.traceHex(ctx, x, y, size);
                ctx.fill();
                ctx.restore();
            }
        }

        // --- LAYER 3: CAST ZONES & AOE WARNINGS ---
        // Dynamic casting indicators
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
        // Light from projectiles passing overhead
        if (lightColor && lightIntensity > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.globalAlpha = lightIntensity * 0.6; 
            ctx.fillStyle = lightColor;
            SurfaceAssets.traceHex(ctx, x, y, size);
            ctx.fill();
            ctx.restore();
        }

        // --- LAYER 5: INTERACTIVE UI HIGHLIGHTS ---
        if (isRange || isHover || hasUnit) {
            ctx.save();
            SurfaceAssets.traceHex(ctx, x, y, size);

            // Valid Move/Skill Range
            if (isRange) { 
                ctx.strokeStyle = rangeColor; 
                ctx.lineWidth = 2; 
                ctx.globalAlpha = 0.5; 
                ctx.stroke();
                
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.1; 
                ctx.fill();
            }
            
            // Mouse Hover
            if (isHover) { 
                ctx.fillStyle = 'rgba(255,255,255,0.15)'; 
                ctx.globalAlpha = 1.0;
                ctx.fill(); 
                
                ctx.strokeStyle = '#fff'; 
                ctx.lineWidth = 2; 
                ctx.stroke(); 
            }
            
            // Unit Position (Passive Indicator)
            if (hasUnit && !isHover && !zoneInfo) {
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
};
