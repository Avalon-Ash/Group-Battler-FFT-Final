
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
    },

    drawHexPrism(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const size = r * 0.7;
        GeometryPainter.drawHex(ctx, 0, 0, size, 'STROKE', false);
        
        // Inner lines for prism effect
        ctx.beginPath();
        const verts = HexGeometry.getVertices(size, false);
        verts.forEach(v => {
            ctx.moveTo(0, 0);
            ctx.lineTo(v.x, v.y);
        });
        ctx.stroke();
    },

    drawHexRune(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        const size = r * 0.7;
        GeometryPainter.drawHex(ctx, 0, 0, size, 'STROKE', false);
        
        ctx.fillStyle = color;
        ctx.font = `bold ${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Ω', 0, 0);
    },

    drawHexShield(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        const size = r * 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.8, -size * 0.4);
        ctx.lineTo(size * 0.8, size * 0.4);
        ctx.quadraticCurveTo(0, size * 1.2, -size * 0.8, size * 0.4);
        ctx.lineTo(-size * 0.8, -size * 0.4);
        ctx.closePath();
        ctx.fill();
    },

    drawHexSkull(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        const size = r * 0.6;
        
        // Main skull head
        ctx.beginPath();
        ctx.arc(0, -size * 0.2, size, Math.PI * 0.8, Math.PI * 0.2, false);
        ctx.lineTo(size * 0.6, size * 0.8);
        ctx.lineTo(-size * 0.6, size * 0.8);
        ctx.closePath();
        ctx.fill();

        // Jaw line
        ctx.fillRect(-size * 0.4, size * 0.85, size * 0.8, size * 0.3);

        // Eyes (Empty)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(-size * 0.4, -size * 0.1, size * 0.3, 0, Math.PI * 2);
        ctx.arc(size * 0.4, -size * 0.1, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    },

    drawHexAngry(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        const size = r * 0.5;
        
        // Angry eyebrows (V shape)
        ctx.beginPath();
        ctx.moveTo(-size, -size * 0.5);
        ctx.lineTo(0, 0);
        ctx.lineTo(size, -size * 0.5);
        ctx.stroke();

        // Angry eyes lines
        ctx.beginPath();
        ctx.moveTo(-size * 0.8, size * 0.4);
        ctx.lineTo(-size * 0.2, size * 0.6);
        ctx.moveTo(size * 0.8, size * 0.4);
        ctx.lineTo(size * 0.2, size * 0.6);
        ctx.stroke();
    },

    drawHexEye(ctx: CanvasRenderingContext2D, r: number, color: string) {
        const size = r * 0.8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        
        // Eye shape
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.quadraticCurveTo(0, -size * 0.8, size, 0);
        ctx.quadraticCurveTo(0, size * 0.8, -size, 0);
        ctx.closePath();
        ctx.stroke();

        // Pupil
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
};
