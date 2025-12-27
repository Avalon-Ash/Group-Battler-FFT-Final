
import { TerrainRenderer } from "./TerrainRenderer";
import { ZoneRenderer } from "./ZoneRenderer";
import { GroundHazard } from "../../../types";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

interface ZoneInfo {
    type: 'CAST';
    color: string;
    visual: string;
    progress: number;
    centerQ: number;
    centerR: number;
    radius: number;
    dist: number;
}

export const GridOverlays = {
    
    drawOverlays(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, // Visual top Y
        size: number,
        specialStatus: string | undefined,
        zoneInfo: ZoneInfo | undefined,
        lightColor: string | null,
        lightIntensity: number,
        isRange: boolean,
        rangeColor: string,
        isHover: boolean,
        hasUnit: boolean,
        q: number, r: number,
        globalTime: number,
        hazard: GroundHazard | undefined
    ) {
        const trace = () => TerrainRenderer.traceTopFace(ctx, x, y);

        // 1. HAZARDS (Persistent Ground Effects)
        if (hazard) {
            ZoneRenderer.drawActiveHazard(ctx, x, y, size, hazard, globalTime);
        }

        // 2. SPECIAL STATUS FLOOR EFFECT (Unit State)
        // Data-Driven Floor Tint
        if (specialStatus && specialStatus !== 'NONE') {
            const def = STATUS_VISUALS[specialStatus];
            if (def && def.floorColor) {
                trace(); 
                ctx.save();
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = def.floorColor;
                ctx.globalAlpha = def.floorOpacity || 0.5;
                ctx.fill(); 
                ctx.restore();
            }
        }

        // 3. ZONE RENDERING (Cast Ripple)
        if (zoneInfo) {
            ZoneRenderer.draw(
                ctx, x, y, size,
                zoneInfo.color,
                zoneInfo.type,
                zoneInfo.visual,
                zoneInfo.progress,
                globalTime,
                zoneInfo.dist,
                zoneInfo.radius
            );
        }

        // 4. Dynamic Lighting
        if (lightColor && lightIntensity > 0) {
            trace(); 
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.globalAlpha = lightIntensity * 0.8; 
            ctx.fillStyle = lightColor;
            ctx.fill();
            ctx.restore();
        }

        // 5. Interactive Highlights
        if (isRange || isHover || hasUnit) {
            ctx.save();
            trace(); 

            if (isRange) { 
                ctx.strokeStyle = rangeColor; 
                ctx.lineWidth = 1.5; 
                ctx.globalAlpha = 0.6; 
                ctx.stroke();
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.05; 
                ctx.fill();
            }
            
            if (isHover) { 
                ctx.fillStyle = 'rgba(255,255,255,0.1)'; 
                ctx.globalAlpha = 1.0;
                ctx.fill(); 
                ctx.strokeStyle = '#fff'; 
                ctx.lineWidth = 2; 
                ctx.stroke(); 
            }
            
            if (hasUnit && !isHover && !zoneInfo) {
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
};
