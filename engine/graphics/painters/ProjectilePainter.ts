
import { GeometryPainter } from "./GeometryPainter";

export const ProjectilePainter = {
    // 🔹 IMPERIAL STYLES (Clean, Tech, Energy)
    drawImperialSniper(ctx: CanvasRenderingContext2D, color: string) {
        // High-velocity railgun slug
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        
        // Core
        ctx.fillStyle = '#fff';
        ctx.fillRect(-20, -3, 40, 6);
        
        // Energy Jacket
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-22, -5, 44, 10);
        
        // Trailing Mach Rings
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-30, -8); ctx.lineTo(-20, 0); ctx.lineTo(-30, 8);
        ctx.stroke();
    },

    drawImperialCrystal(ctx: CanvasRenderingContext2D, color: string) {
        // Ice Shard
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-5, -8);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-5, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Glint
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(5, -2, 2, 0, Math.PI*2); ctx.fill();
    },

    drawImperialOrb(ctx: CanvasRenderingContext2D, color: string) {
        // Perfect Sphere
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.4, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
        
        // Orbitals
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, Math.PI/4, 0, Math.PI*2); ctx.stroke();
    },

    // 👹 COVENANT STYLES (Jagged, Heavy, Raw)
    drawCovenantBolt(ctx: CanvasRenderingContext2D, color: string) {
        // Unstable energy tear
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -6);
        ctx.lineTo(-25, 0); // Long chaotic tail
        ctx.lineTo(-10, 6);
        ctx.fill();
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-15, -10);
        ctx.lineTo(-20, 10);
        ctx.closePath();
        ctx.stroke();
    },

    drawCovenantAxe(ctx: CanvasRenderingContext2D, color: string) {
        // Heavy Physical Object
        ctx.fillStyle = '#1c1917'; // Dark Iron
        ctx.strokeStyle = color;   // Energy edge
        ctx.lineWidth = 2;
        
        // Double Axe Head
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(0, 4); // Handle center
        
        // Blade L
        ctx.moveTo(-5, -8); 
        ctx.bezierCurveTo(-20, -15, -20, 15, -5, 8);
        ctx.lineTo(-2, 0);
        
        // Blade R
        ctx.moveTo(5, -8); 
        ctx.bezierCurveTo(20, -15, 20, 15, 5, 8);
        ctx.lineTo(2, 0);
        
        ctx.fill();
        ctx.stroke();
    },

    drawCovenantFireball(ctx: CanvasRenderingContext2D, color: string) {
        // Chaos Orb
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.3, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        
        // Irregular shape
        GeometryPainter.drawJaggedShape(ctx, 14);
    },

    drawBomb(ctx: CanvasRenderingContext2D, color: string) {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        
        // Fuse
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(6, -6, 3, 0, Math.PI*2); ctx.fill();
    }
};
