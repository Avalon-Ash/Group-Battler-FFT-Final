
import { GeometryPainter } from "./GeometryPainter";

export const ParticlePainter = {
    drawAtmosphere(ctx: CanvasRenderingContext2D, r: number, color: string) {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff'); 
        grad.addColorStop(0.2, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        // Soft Hex shape: Use Regular (applyIso=false) because this is a texture generator.
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'FILL', false);
    },

    drawSmoke(ctx: CanvasRenderingContext2D, r: number, color: string) {
        const grad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r);
        grad.addColorStop(0, color); 
        grad.addColorStop(0.6, 'transparent');
        ctx.fillStyle = grad;
        
        // Draw clusters (Organic shapes don't strictly need ISO logic)
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
        // Shockwave texture MUST be Regular Hex. GroundPainter scales it.
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'STROKE', false);
        
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.6, 'STROKE', false);
    },

    drawSpike(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        // Star shape (Regular geometry)
        for(let i=0; i<4; i++) {
            const angle = (i * Math.PI) / 2;
            ctx.moveTo(0,0);
            ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
            ctx.lineTo(Math.cos(angle+0.2)*r*0.2, Math.sin(angle+0.2)*r*0.2);
        }
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, r*0.3, 0, Math.PI*2); ctx.fill();
    },

    drawCracks(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            let cx = 0, cy = 0;
            for (let j = 0; j < 3; j++) {
                cx += Math.cos(angle + (Math.random() - 0.5)) * (r / 3);
                cy += Math.sin(angle + (Math.random() - 0.5)) * (r / 3);
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
    },

    drawSlash(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        // Simple arc slash texture
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 1.5);
        ctx.stroke();
    },

    drawHexGrid(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        // Draw a small grid of hexagons
        const size = r * 0.3;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const ox = i * size * 1.5;
                const oy = j * size * 1.732 + (i % 2 === 0 ? 0 : size * 0.866);
                GeometryPainter.drawHex(ctx, ox, oy, size * 0.8, 'STROKE', false);
            }
        }
        ctx.globalAlpha = 1.0;
    },

    drawChaosRift(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        // Irregular jagged rift
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = r * (0.4 + Math.random() * 0.6);
            ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = r * (0.2 + Math.random() * 0.3);
            ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        }
        ctx.closePath();
        ctx.fill();
    },

    drawHexShard(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        // Draw sharp irregular shard
        ctx.beginPath();
        const verts = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < verts; i++) {
            const angle = (i / verts) * Math.PI * 2;
            const dist = r * (0.3 + Math.random() * 0.7);
            ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
        }
        ctx.closePath();
        ctx.fill();
    },

    drawRipple(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
};
