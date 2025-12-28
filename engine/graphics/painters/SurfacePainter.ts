
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
import { VFXFactory } from "../VFXFactory";

export const SurfacePainter = {
    
    drawLiquid(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        intensity: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); 

        const r = HEX_SIZE * 0.9;
        
        // 1. Base Liquid Shape (Wobbly)
        // OPTIMIZED: Reduced segments from 12 to 8. Pre-calculated constants where possible.
        ctx.beginPath();
        const segments = 8; 
        const twoPi = Math.PI * 2;
        
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * twoPi;
            // Simplified noise math
            const noise = Math.sin(theta * 3 + time) * 3 + Math.cos(theta * 2 - time) * 2; 
            const px = Math.cos(theta) * (r + noise);
            const py = Math.sin(theta) * (r + noise);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8 * intensity;
        ctx.fill();

        // 3. Surface Ripples (Darker)
        ctx.globalCompositeOperation = 'multiply';
        ctx.beginPath();
        // Optimized ripple math
        const rippleX = Math.sin(time) * 4;
        const rippleY = Math.cos(time * 0.7) * 4;
        ctx.ellipse(rippleX, rippleY, r * 0.6, r * 0.5, time * 0.1, 0, twoPi);
        ctx.fill();

        // 4. Specular Highlights (Bubbles/Reflection)
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        
        const bX = Math.cos(time * 1.5) * r * 0.4;
        const bY = Math.sin(time * 1.5) * r * 0.4;
        ctx.beginPath(); ctx.ellipse(bX, bY, 6, 3, 0, 0, twoPi); ctx.fill();
        
        ctx.restore();
    },

    drawFog(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number
    ) {
        const texture = VFXFactory.getTexture('SMOKE_PUFF', color);
        const size = HEX_SIZE * 3.0;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);

        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.15; 

        const puffs = 3;
        const twoPi = Math.PI * 2;
        
        for(let i=0; i<puffs; i++) {
            const angle = time * 0.2 + (i * twoPi / puffs);
            const dist = 12 + Math.sin(time + i) * 6;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            
            const pulse = 1.0 + Math.sin(time * 1.5 + i) * 0.1;
            const pSize = size * 0.5 * pulse;
            
            ctx.drawImage(texture, px - pSize/2, py - pSize/2, pSize, pSize);
        }
        
        ctx.globalAlpha = 0.2;
        ctx.drawImage(texture, -size/2, -size/2, size, size);

        ctx.restore();
    },

    drawCracks(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        intensity: number
    ) {
        const texture = VFXFactory.generateCracks(color);
        const size = HEX_SIZE * 2.2; 

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); 

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity;
        
        const staticRot = (x + y) * 0.1; 
        ctx.rotate(staticRot);

        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    drawDetailTexture(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        type: string,
        color: string,
        seed: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        
        ctx.fillStyle = color;
        ctx.globalAlpha = type === 'VOID' ? 0.1 : 0.3;

        const rnd = (offset: number) => {
            const v = Math.sin(seed + offset) * 1000;
            return v - Math.floor(v);
        };

        if (type === 'FOREST') {
            for(let i=0; i<8; i++) {
                const px = (rnd(i) - 0.5) * HEX_SIZE * 1.4;
                const py = (rnd(i+10) - 0.5) * HEX_SIZE * 1.4;
                if (px*px + py*py > (HEX_SIZE*0.7)**2) continue;
                
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px - 1.5, py - 5);
                ctx.lineTo(px + 1.5, py - 5);
                ctx.fill();
            }
        } else if (type === 'DESERT') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            for(let i=0; i<3; i++) {
                const py = (rnd(i) - 0.5) * HEX_SIZE;
                ctx.beginPath();
                ctx.moveTo(-10, py);
                ctx.quadraticCurveTo(0, py + 4, 10, py);
                ctx.stroke();
            }
        } else if (type === 'VOID') {
             ctx.strokeStyle = color;
             ctx.lineWidth = 1;
             ctx.beginPath();
             const px = (rnd(1) - 0.5) * HEX_SIZE;
             const py = (rnd(2) - 0.5) * HEX_SIZE;
             ctx.moveTo(px, py);
             ctx.lineTo(px + 10, py);
             ctx.lineTo(px + 15, py + 5);
             ctx.stroke();
             ctx.fillStyle = color;
             ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI*2); ctx.fill();
        } else {
            for(let i=0; i<5; i++) {
                const px = (rnd(i*2) - 0.5) * HEX_SIZE * 1.2;
                const py = (rnd(i*2+1) - 0.5) * HEX_SIZE * 1.2;
                if (px*px + py*py > (HEX_SIZE*0.7)**2) continue;
                ctx.beginPath();
                ctx.arc(px, py, 1.5 + rnd(i*3), 0, Math.PI*2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
};
