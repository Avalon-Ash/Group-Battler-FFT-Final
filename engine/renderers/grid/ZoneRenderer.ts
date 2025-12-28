
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { ISO_SCALE_Y } from "../../../constants";

export const ZoneRenderer = {
    
    /**
     * Renders zone effects on a SPECIFIC TILE.
     * x, y should be the VISUAL SURFACE coordinates (Top of the block).
     */
    drawTileZoneEffect(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, // Visual Top Face
        size: number,
        distToCenter: number, 
        zoneRadius: number,
        color: string,
        progress: number, 
        isEnemy: boolean
    ) {
        ctx.save();
        ctx.translate(x, y);

        const currentWaveRadius = progress * (zoneRadius + 0.5);
        const distDiff = Math.abs(distToCenter - currentWaveRadius);
        const waveWidth = 1.5; 
        
        let waveIntensity = 0;
        if (distDiff < waveWidth) {
            waveIntensity = (Math.cos((distDiff / waveWidth) * Math.PI) + 1) * 0.5;
        }

        const isInside = distToCenter < currentWaveRadius;
        const drawColor = isEnemy ? '#ef4444' : color;

        // 1. Base Fill
        let baseAlpha = 0;
        if (isEnemy) baseAlpha = 0.2; 
        if (isInside && !isEnemy) baseAlpha = 0.15; 

        if (baseAlpha > 0) {
            ctx.fillStyle = drawColor;
            ctx.globalAlpha = baseAlpha;
            HexGeometry.traceHex(ctx, 0, 0, size * 0.95, true);
            ctx.fill();
        }

        // 2. The Ripple
        if (waveIntensity > 0.05) {
            ctx.strokeStyle = drawColor;
            ctx.lineWidth = 2 + waveIntensity * 2;
            ctx.globalAlpha = waveIntensity;
            
            const pulseSize = size * (0.9 + waveIntensity * 0.1);
            
            HexGeometry.traceHex(ctx, 0, 0, pulseSize, true);
            ctx.stroke();
            
            ctx.lineWidth = 1;
            HexGeometry.traceHex(ctx, 0, 0, pulseSize * 0.7, true);
            ctx.stroke();
        }

        // 3. Border
        if (isEnemy || isInside) {
            const isBorder = Math.abs(distToCenter - zoneRadius) < 0.5;
            if (isBorder) {
                ctx.strokeStyle = drawColor;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.5;
                if (isEnemy) ctx.setLineDash([4, 4]);
                HexGeometry.traceHex(ctx, 0, 0, size, true);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        ctx.restore();
    }
};
