
import { GeometryPainter } from "./GeometryPainter";
import { HexGeometry } from "../utils/HexGeometry";

export const IconPainter = {
    drawHexHalo(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        
        // 1. Draw Outer Hex (Regular, no ISO squash for texture generation)
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'STROKE', false);
        
        // 2. Draw Corner Dots (Aligned to Geometry)
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        
        // Use Source of Truth for vertices to ensure dots match the line exactly
        const verts = HexGeometry.getVertices(r * 0.8, false); // applyIso=false
        
        verts.forEach(v => {
            ctx.beginPath(); 
            ctx.arc(v.x, v.y, 2, 0, Math.PI*2); 
            ctx.fill();
        });
    },

    drawHexLock(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        // Regular Hex for texture
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'FILL', false);
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
        ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
        ctx.stroke();
    }
};
