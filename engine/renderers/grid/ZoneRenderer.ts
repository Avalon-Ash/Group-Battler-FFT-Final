
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { ISO_SCALE_Y } from "../../../constants";

export const ZoneRenderer = {
    
    /**
     * Renders zone effects on a SPECIFIC TILE.
     * Calculated based on distance from the Zone Center.
     */
    drawTileZoneEffect(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, // Tile center
        size: number,
        distToCenter: number, // Distance from this tile to zone origin (in hex units)
        zoneRadius: number,
        color: string,
        progress: number, // 0.0 to 1.0 (Cast progress)
        isEnemy: boolean
    ) {
        ctx.save();
        ctx.translate(x, y);

        // --- PHYSICS OF THE WAVE ---
        // Wave expands from 0 to Radius
        const currentWaveRadius = progress * (zoneRadius + 0.5);
        
        // Calculate "Wave Presence" on this specific tile
        // 1.0 = Right on the wave edge, 0.0 = Far away
        const distDiff = Math.abs(distToCenter - currentWaveRadius);
        const waveWidth = 1.5; // Width of the ripple band in hex units
        
        let waveIntensity = 0;
        if (distDiff < waveWidth) {
            // Cosine curve for smooth ripple peak
            waveIntensity = (Math.cos((distDiff / waveWidth) * Math.PI) + 1) * 0.5;
        }

        // Fill Logic: Are we "Inside" the expanded zone?
        const isInside = distToCenter < currentWaveRadius;

        // --- DRAWING ---
        const drawColor = isEnemy ? '#ef4444' : color;

        // 1. Base Fill (If inside or Enemy Warning)
        // Enemy zones always show full area faintly so you know where NOT to stand
        let baseAlpha = 0;
        if (isEnemy) baseAlpha = 0.2; // Constant warning
        if (isInside && !isEnemy) baseAlpha = 0.15; // Friendly fill

        if (baseAlpha > 0) {
            ctx.fillStyle = drawColor;
            ctx.globalAlpha = baseAlpha;
            HexGeometry.traceHex(ctx, 0, 0, size * 0.95, true);
            ctx.fill();
        }

        // 2. The Ripple (Wavefront)
        if (waveIntensity > 0.05) {
            ctx.strokeStyle = drawColor;
            ctx.lineWidth = 2 + waveIntensity * 2; // Thicker at peak
            ctx.globalAlpha = waveIntensity;
            
            // Pulse size slightly for visual pop
            const pulseSize = size * (0.9 + waveIntensity * 0.1);
            
            HexGeometry.traceHex(ctx, 0, 0, pulseSize, true);
            ctx.stroke();
            
            // Add a second inner line for "High Tech" feel
            ctx.lineWidth = 1;
            HexGeometry.traceHex(ctx, 0, 0, pulseSize * 0.7, true);
            ctx.stroke();
        }

        // 3. Border (Static perimeter)
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
