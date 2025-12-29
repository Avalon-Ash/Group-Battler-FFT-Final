
import { HexGeometry } from "../utils/HexGeometry";

export const GeometryPainter = {
    drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: 'FILL' | 'STROKE' | 'BOTH' = 'FILL', applyIso: boolean = true) {
        HexGeometry.traceHex(ctx, x, y, r, applyIso);
        
        if (style === 'FILL' || style === 'BOTH') ctx.fill();
        if (style === 'STROKE' || style === 'BOTH') ctx.stroke();
    },

    drawJaggedShape(ctx: CanvasRenderingContext2D, r: number) {
        // Jagged shapes (Fireballs) are usually chaotic and don't need strict ISO alignment,
        // but if used on ground, the caller should handle scale.
        ctx.beginPath();
        const spikes = 8;
        for(let i=0; i<spikes*2; i++) {
            const angle = (Math.PI * i) / spikes;
            const dist = (i % 2 === 0) ? r : r * 0.4;
            ctx.lineTo(Math.cos(angle)*dist, Math.sin(angle)*dist);
        }
        ctx.closePath();
        ctx.fill();
    }
};
