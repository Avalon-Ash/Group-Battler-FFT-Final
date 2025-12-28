
import { GeometryPainter } from "./GeometryPainter";

export const ParticlePainter = {
    drawAtmosphere(ctx: CanvasRenderingContext2D, r: number, color: string) {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff'); 
        grad.addColorStop(0.2, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        // Soft Hex shape instead of circle for stylistic consistency
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'FILL');
    },

    drawSmoke(ctx: CanvasRenderingContext2D, r: number, color: string) {
        const grad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r);
        grad.addColorStop(0, color); 
        grad.addColorStop(0.6, 'transparent');
        ctx.fillStyle = grad;
        
        // Draw clusters
        ctx.beginPath();
        ctx.arc(-r*0.3, -r*0.2, r*0.5, 0, Math.PI*2);
        ctx.arc(r*0.3, r*0.2, r*0.4, 0, Math.PI*2);
        ctx.arc(0, 0, r*0.4, 0, Math.PI*2);
        ctx.fill();
    },

    drawShockwave(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'STROKE');
        
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.6, 'STROKE');
    },

    drawSpike(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        // Star shape
        for(let i=0; i<4; i++) {
            const angle = (i * Math.PI) / 2;
            ctx.moveTo(0,0);
            ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
            ctx.lineTo(Math.cos(angle+0.2)*r*0.2, Math.sin(angle+0.2)*r*0.2);
        }
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, r*0.3, 0, Math.PI*2); ctx.fill();
    }
};
