
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
import { GroundHazard } from "../../../types";

// Helper
function traceHex(ctx: CanvasRenderingContext2D, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

export const ZoneRenderer = {
    
    drawActiveHazard(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        hazard: GroundHazard,
        globalTime: number
    ) {
        if (hazard.type === 'POISON' || hazard.type === 'GENERIC') {
            SurfaceAssets.drawVolumetricFog(ctx, x, y, hazard.color, globalTime);
        }
        else if (hazard.type === 'FIRE') {
            const intensity = 0.8 + Math.sin(globalTime * 3) * 0.2;
            SurfaceAssets.drawLiquidSurface(ctx, x, y, hazard.color, globalTime, intensity);
            SurfaceAssets.drawGroundCracks(ctx, x, y, '#fdba74', intensity);
        }
        else if (hazard.type === 'ICE') {
            SurfaceAssets.drawExtrudedHex(ctx, x, y, 5, hazard.color, 0.4, false);
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            traceHex(ctx, size*0.8);
            ctx.fill();
            ctx.restore();
        }
        else if (hazard.type === 'GRAVITY') {
            // Hexagonal Black Hole
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, ISO_SCALE_Y);
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.7;
            traceHex(ctx, size * 0.9);
            ctx.fill();
            
            ctx.rotate(globalTime * 2);
            ctx.strokeStyle = hazard.color;
            ctx.lineWidth = 2;
            traceHex(ctx, size * 0.6); ctx.stroke();
            
            ctx.rotate(1); // Offset ring
            traceHex(ctx, size * 0.4); ctx.stroke();
            
            ctx.restore();
        }
    },

    draw(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        color: string,
        type: 'CAST',
        visual: string,
        progress: number, 
        globalTime: number,
        dist: number, 
        maxRadius: number
    ) {
        const snapX = Math.floor(x);
        const snapY = Math.floor(y);

        ctx.save();
        ctx.translate(snapX, snapY);
        ctx.scale(1, ISO_SCALE_Y); 

        if (type === 'CAST') {
            const totalRadiusPx = Math.max(1, maxRadius) * HEX_SIZE * 1.5;
            const tileDistPx = dist * HEX_SIZE * 1.5;
            const normalizedDist = tileDistPx / totalRadiusPx;
            const wavePos = progress; 
            const bandWidth = 0.15;
            const distFromWave = Math.abs(normalizedDist - wavePos);
            
            // Draw Hex Ripple
            if (distFromWave < bandWidth) {
                const intensity = (1 - distFromWave / bandWidth);
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                
                const alpha = intensity * (1.0 - progress * 0.5) * 0.8;
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                traceHex(ctx, size * 0.9);
                ctx.fill();
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = alpha;
                traceHex(ctx, size * 0.9);
                ctx.stroke();
                
                ctx.restore();
            } else if (normalizedDist < wavePos) {
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.15 * (1.0 - progress * 0.5);
                traceHex(ctx, size * 0.8);
                ctx.fill();
            }

            const isUlt = visual === 'ULT' || maxRadius >= 3; 
            if (isUlt && dist >= maxRadius - 0.5) {
                ctx.save();
                ctx.rotate(globalTime * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 5]);
                traceHex(ctx, size * 0.95);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        ctx.restore();
    }
};
