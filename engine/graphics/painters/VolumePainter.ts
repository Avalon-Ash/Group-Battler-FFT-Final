import { ISO_SCALE_Y } from "../../../constants";
import { HEX_VERTICES, HexGeometry } from "../utils/HexGeometry";
import { VFXFactory } from "../VFXFactory";

export const VolumePainter = {
    
    /**
     * Renders a soft, glowing pillar base or fog pool.
     */
    drawVolumetricHex(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        color: string,
        opacity: number
    ) {
        const texture = VFXFactory.getTexture('ATMOSPHERE', color);
        const size = radius * 2.8; 

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); 
        
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = 'screen';
        
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        
        ctx.globalAlpha = opacity * 0.5;
        const coreSize = size * 0.6;
        ctx.drawImage(texture, -coreSize/2, -coreSize/2, coreSize, coreSize);
        
        ctx.restore();
    },

    /**
     * Draw Hatching Pattern (Stripes) for Warnings
     * OPTIMIZED: Use cached texture instead of complex clipping/compositing in main loop.
     */
    drawHatch(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        color: string,
        opacity: number
    ) {
        // Use pre-rendered texture. It's safer and faster.
        const texture = VFXFactory.getTexture('WARNING_HATCH', color);
        const size = radius * 2.2;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = 'source-over'; // Standard blend
        
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        
        ctx.restore();
    }
    ,

    /**
     * Generalized 3D Prism
     */
    draw3DPrism(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        height: number,
        color: string,
        opacity: number,
        style: 'SOLID' | 'GRADIENT_FADE' | 'HATCHED_WARNING'
    ) {
        const topY = y - height;

        ctx.save();
        
        const indices = [5, 0, 1]; 
        
        for (const i of indices) {
            const j = (i + 1) % 6;
            
            const x1 = x + radius * HEX_VERTICES[i].x;
            const y1 = y + radius * HEX_VERTICES[i].y * ISO_SCALE_Y;
            
            const x2 = x + radius * HEX_VERTICES[j].x;
            const y2 = y + radius * HEX_VERTICES[j].y * ISO_SCALE_Y;
            
            const grad = ctx.createLinearGradient(0, topY, 0, y);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent'); 
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = opacity * 0.5; 
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2, y2 - height);
            ctx.lineTo(x1, y1 - height);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1, y1 - height);
            ctx.stroke();
            
            if (i === 1) {
                 ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2, y2 - height); ctx.stroke();
            }
        }

        ctx.fillStyle = color;
        ctx.globalAlpha = opacity * 0.3;
        
        if (style === 'HATCHED_WARNING') {
            // Draw Hatch on top face
            this.drawHatch(ctx, x, topY, radius, '#ffffff', opacity);
            
        } else if (style === 'SOLID') {
            ctx.fillStyle = color;
            ctx.globalAlpha = opacity * 0.2;
            HexGeometry.traceHex(ctx, x, topY, radius);
            ctx.fill();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = Math.min(1.0, opacity * 3.0 + 0.4); 
            HexGeometry.traceHex(ctx, x, topY, radius);
            ctx.stroke();
        } else {
            // Gradient Fade
            ctx.fillStyle = color;
            ctx.globalAlpha = opacity * 0.3;
            HexGeometry.traceHex(ctx, x, topY, radius);
            ctx.fill();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            HexGeometry.traceHex(ctx, x, topY, radius);
            ctx.stroke();
        }

        if (radius > 20) {
            ctx.globalCompositeOperation = 'screen';
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity * 0.5;
            HexGeometry.traceHex(ctx, x, topY, radius * 0.8);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawWarningBlock(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        color: string,
        pulse: number
    ) {
        const height = 14; 
        const opacity = 0.1 + pulse * 0.15;
        this.draw3DPrism(ctx, x, y, radius, height, color, opacity, 'HATCHED_WARNING');
    },

    drawHexRipple(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        color: string,
        opacity: number,
        width: number
    ) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 1.5;
        
        HexGeometry.traceHex(ctx, x, y, radius);
        ctx.stroke();
        
        ctx.lineWidth = width * 0.2;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = opacity * 0.8;
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.restore();
    },

    drawExtrusion(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        height: number,
        color: string,
        opacity: number
    ) {
        const topY = y - height;
        const bottomY = y;

        ctx.save();
        ctx.globalAlpha = opacity;

        const visibleFaces = [5, 0, 1]; 
        
        for (const i of visibleFaces) {
            const j = (i + 1) % 6;
            
            const x1 = x + radius * HEX_VERTICES[i].x;
            const y1 = radius * HEX_VERTICES[i].y * ISO_SCALE_Y; 
            
            const x2 = x + radius * HEX_VERTICES[j].x;
            const y2 = radius * HEX_VERTICES[j].y * ISO_SCALE_Y; 

            const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x1, topY + y1);
            ctx.lineTo(x2, topY + y2);
            ctx.lineTo(x2, bottomY + y2);
            ctx.lineTo(x1, bottomY + y1);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity * 0.5;
            ctx.stroke();
            ctx.globalAlpha = opacity;
        }

        ctx.fillStyle = color;
        ctx.globalAlpha = opacity * 0.6;
        HexGeometry.traceHex(ctx, x, topY, radius);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = opacity;
        ctx.stroke();

        ctx.restore();
    }
};