
import { HexGeometry } from "../utils/HexGeometry";

export const GeometryPainter = {
    drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: 'FILL' | 'STROKE' | 'BOTH' = 'FILL') {
        // By default, GeometryPainter is used for VFX which are usually flat on ground, so applyIso = true
        HexGeometry.traceHex(ctx, x, y, r, true);
        
        if (style === 'FILL' || style === 'BOTH') ctx.fill();
        if (style === 'STROKE' || style === 'BOTH') ctx.stroke();
    },

    drawJaggedShape(ctx: CanvasRenderingContext2D, r: number) {
        ctx.beginPath();
        const spikes = 8;
        for(let i=0; i<spikes*2; i++) {
            const angle = (Math.PI * i) / spikes;
            const dist = (i % 2 === 0) ? r : r * 0.4;
            // Note: Jagged shapes (Fireballs) usually don't need strict ISO scaling, 
            // but if they are on the ground, they might. Assuming billboards here.
            ctx.lineTo(Math.cos(angle)*dist, Math.sin(angle)*dist);
        }
        ctx.closePath();
        ctx.fill();
    }
};
