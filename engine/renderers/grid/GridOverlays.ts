
import { TerrainRenderer } from "./TerrainRenderer";
import { ZoneRenderer } from "./ZoneRenderer";

// Updated Interface matching GridSystem
interface ZoneInfo {
    type: 'CAST' | 'FIELD';
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
        zoneInfo: ZoneInfo | undefined, // Replaces dangerInfo
        lightColor: string | null,
        lightIntensity: number,
        isRange: boolean,
        rangeColor: string,
        isHover: boolean,
        hasUnit: boolean,
        q: number, r: number,
        globalTime: number
    ) {
        const trace = () => TerrainRenderer.traceTopFace(ctx, x, y);

        // 1. SPECIAL STATUS FLOOR EFFECT
        if (specialStatus) {
            trace(); 
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            if (specialStatus === 'FROZEN') {
                ctx.fillStyle = '#bae6fd'; 
                ctx.globalAlpha = 0.6;
            } else if (specialStatus === 'POLYMORPH') {
                ctx.fillStyle = '#d8b4fe'; 
                ctx.globalAlpha = 0.5;
            } else if (specialStatus === 'STASIS') {
                ctx.fillStyle = '#fde047';
                ctx.globalAlpha = 0.5;
            }
            ctx.fill(); 
            ctx.restore();
        }

        // 2. ZONE RENDERING (Cast Ripple / Persistent Fields)
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

        // 3. Dynamic Lighting
        if (lightColor && lightIntensity > 0) {
            trace(); 
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.globalAlpha = lightIntensity * 0.8; 
            ctx.fillStyle = lightColor;
            ctx.fill();
            ctx.restore();
        }

        // 4. Interactive Highlights
        if (isRange || isHover || hasUnit) {
            ctx.save();
            trace(); 

            if (isRange) { 
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.1;
                ctx.fill();
                ctx.strokeStyle = rangeColor; 
                ctx.lineWidth = 2; 
                ctx.globalAlpha = 0.6; 
                ctx.stroke();
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
