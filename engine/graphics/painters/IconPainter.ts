
import { GeometryPainter } from "./GeometryPainter";

export const IconPainter = {
    drawHexHalo(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'STROKE');
        
        // Corner dots
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6; 
            const px = Math.cos(angle) * r * 0.8;
            const py = Math.sin(angle) * r * 0.8;
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
        }
    },

    drawHexLock(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'FILL');
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
        ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
        ctx.stroke();
    }
};
