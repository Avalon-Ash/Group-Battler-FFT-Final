
import { TerrainRenderer } from "./TerrainRenderer";
import { AOERenderer } from "./AOERenderer";

export const GridOverlays = {
    
    drawOverlays(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, // Note: y here should be the "visual top" y (y - topY)
        size: number,
        specialStatus: string | undefined,
        dangerInfo: {color: string, progress: number, visual: string, state: 'ACTIVE' | 'BROKEN', fadeRatio: number} | undefined,
        lightColor: string | null,
        lightIntensity: number,
        isRange: boolean,
        rangeColor: string,
        isHover: boolean,
        hasUnit: boolean,
        q: number, r: number,
        globalTime: number
    ) {
        // Helper to trace the hex shape at current position
        const trace = () => TerrainRenderer.traceTopFace(ctx, x, y);

        // 1. SPECIAL STATUS FLOOR EFFECT (Frozen/Polymorph)
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

        // 2. AOE TELEGRAPH (Danger Zone) - Delegated
        if (dangerInfo) {
            AOERenderer.draw(
                ctx, x, y, size, 
                dangerInfo.color, dangerInfo.visual, dangerInfo.progress, 
                globalTime, q, r,
                dangerInfo.state, 
                dangerInfo.fadeRatio
            );
        }

        // 3. Dynamic Lighting (Projectile Pass)
        if (lightColor && lightIntensity > 0) {
            trace(); 
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.globalAlpha = lightIntensity * 0.8; 
            ctx.fillStyle = lightColor;
            ctx.fill();
            ctx.restore();
        }

        // 4. Interactive Highlights (Hover/Range)
        if (isRange || isHover || hasUnit) {
            ctx.save();
            trace(); 

            if (isRange) { 
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.1; // Fainter fill
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
            
            // Only draw unit base ring if not hovering and no danger zone (cleaner look)
            if (hasUnit && !isHover && !dangerInfo) {
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
};
