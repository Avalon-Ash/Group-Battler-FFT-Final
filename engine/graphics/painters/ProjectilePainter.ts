
import { GeometryPainter } from "./GeometryPainter";

export const ProjectilePainter = {
    drawImperialSniper(ctx: CanvasRenderingContext2D, color: string) {
        // Tech Dart / Kinetic Rod
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        // Inner Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(25, 0); 
        ctx.lineTo(-15, -4);
        ctx.lineTo(-15, 4);
        ctx.fill();

        // Energy Shell
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(-10, -6);
        ctx.lineTo(-20, 0);
        ctx.lineTo(-10, 6);
        ctx.closePath();
        ctx.stroke();
        
        // Mach Rings
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(10, 0, 4, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.stroke();
    },

    drawImperialCrystal(ctx: CanvasRenderingContext2D, color: string) {
        // Faceted Diamond
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, 0); 
        ctx.lineTo(0, -8); 
        ctx.lineTo(-10, 0); 
        ctx.lineTo(0, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Highlights
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.fill();
    },

    drawImperialOrb(ctx: CanvasRenderingContext2D, color: string) {
        // Perfect Sphere with Halo
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
        grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, color); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 4, Math.PI/2, 0, Math.PI * 2); ctx.stroke();
    },

    drawCovenantBolt(ctx: CanvasRenderingContext2D, color: string) {
        // Jagged Harpoon / Rusty Metal
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = '#450a0a'; // Dark Iron
        ctx.beginPath();
        ctx.moveTo(20, 0); 
        ctx.lineTo(-10, -8); 
        ctx.lineTo(-5, -2);
        ctx.lineTo(-20, -4); // Jagged tail
        ctx.lineTo(-20, 4);
        ctx.lineTo(-5, 2);
        ctx.lineTo(-10, 8);
        ctx.fill();
        
        ctx.strokeStyle = color; // Burning edge
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    drawCovenantAxe(ctx: CanvasRenderingContext2D, color: string) {
        // Spinning Blade
        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        // Axe Head 1
        ctx.moveTo(5, -5); ctx.bezierCurveTo(15, -20, -15, -20, -5, -5);
        // Axe Head 2
        ctx.moveTo(5, 5); ctx.bezierCurveTo(15, 20, -15, 20, -5, 5);
        ctx.fill();
        ctx.stroke();
        
        // Center rivet
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
    },

    drawCovenantFireball(ctx: CanvasRenderingContext2D, color: string) {
        // Unstable Core
        ctx.shadowColor = color;
        ctx.shadowBlur = 25;
        
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
        grad.addColorStop(0, '#fff'); 
        grad.addColorStop(0.2, '#fca5a5'); 
        grad.addColorStop(0.6, color); 
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        
        // Chaotic shape
        GeometryPainter.drawJaggedShape(ctx, 16);
    },

    drawBomb(ctx: CanvasRenderingContext2D, color: string) {
        // Physical Bomb
        ctx.fillStyle = '#1e293b'; 
        ctx.strokeStyle = '#94a3b8'; 
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        
        // Fuse spark
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(8, -8, 3, 0, Math.PI * 2); ctx.fill();
    }
};
