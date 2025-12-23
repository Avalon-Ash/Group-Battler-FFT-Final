
import { TerrainRenderer } from "./TerrainRenderer";

export const GridOverlays = {
    
    drawOverlays(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, // Note: y here should be the "visual top" y (y - topY)
        size: number,
        specialStatus: string | undefined,
        dangerInfo: {color: string, progress: number} | undefined,
        lightColor: string | null,
        lightIntensity: number,
        flash: any,
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

        // 2. AOE TELEGRAPH (Danger Zone)
        if (dangerInfo) {
            trace(); 
            ctx.save();
            // Tile Coloring
            const opacity = 0.1 + dangerInfo.progress * 0.6;
            ctx.fillStyle = dangerInfo.color;
            ctx.globalAlpha = opacity;
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.fill(); 
            
            // Glowing Border
            ctx.strokeStyle = dangerInfo.color;
            ctx.lineWidth = 1 + dangerInfo.progress * 2;
            ctx.globalAlpha = 0.8;
            ctx.stroke();

            // Rising Particles
            if (dangerInfo.progress > 0.2) {
                const particleCount = 3 + Math.floor(dangerInfo.progress * 5);
                ctx.fillStyle = dangerInfo.color;
                ctx.globalCompositeOperation = 'lighter'; 
                
                for(let i=0; i<particleCount; i++) {
                    const seed = (Math.abs(q * 100 + r * 10) + i * 123.45);
                    const speed = 20 + (seed % 20);
                    const t = (globalTime * speed * 0.05 + seed) % 1; 
                    const pAlpha = 1 - t;
                    
                    // Simple particle offset logic relative to tile center
                    const pX = x + Math.sin(t * 10 + seed) * (size * 0.5);
                    const pY = y - (t * 40); 
                    
                    ctx.globalAlpha = pAlpha * opacity; 
                    const pSize = 1 + (seed % 2);
                    
                    ctx.beginPath();
                    ctx.arc(pX, pY, pSize, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            ctx.restore();
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

        // 4. Interactive Highlights (Hover/Range/Flash)
        if (flash || isRange || isHover || hasUnit) {
            ctx.save();
            trace(); 

            if (isRange) { 
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.2; 
                ctx.fill();
                ctx.strokeStyle = rangeColor; 
                ctx.lineWidth = 2; 
                ctx.globalAlpha = 0.8; 
                ctx.stroke();
            }
            
            if (isHover) { 
                ctx.fillStyle = 'rgba(255,255,255,0.15)'; 
                ctx.globalAlpha = 1.0;
                ctx.fill(); 
                ctx.strokeStyle = '#fff'; 
                ctx.lineWidth = 3; 
                ctx.stroke(); 
            }
            
            if (flash) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = flash.color;
                ctx.globalAlpha = 0.6;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            if (hasUnit && !isHover && !dangerInfo) {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
};
