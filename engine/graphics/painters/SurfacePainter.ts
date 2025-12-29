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

        const r = HEX_SIZE * 0.95;
        
        ctx.beginPath();
        const segments = 12; 
        const twoPi = Math.PI * 2;
        
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * twoPi;
            const noise = Math.sin(theta * 2 + time) * 4 + Math.cos(theta * 3 - time * 0.5) * 2; 
            const px = Math.cos(theta) * (r + noise);
            const py = Math.sin(theta) * (r + noise);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85 * intensity;
        ctx.fill();

        ctx.globalCompositeOperation = 'multiply';
        ctx.beginPath();
        const rippleX = Math.sin(time * 0.5) * 6;
        const rippleY = Math.cos(time * 0.4) * 6;
        ctx.ellipse(rippleX, rippleY, r * 0.7, r * 0.6, time * 0.05, 0, twoPi);
        ctx.fill();

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.4;
        const bX = Math.cos(time * 1.2) * r * 0.5;
        const bY = Math.sin(time * 1.1) * r * 0.5;
        ctx.beginPath(); ctx.ellipse(bX, bY, 8, 4, 0, 0, twoPi); ctx.fill();
        
        ctx.restore();
    },

    drawFog(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number
    ) {
        const texture = VFXFactory.getTexture('SMOKE_PUFF', color);
        const size = HEX_SIZE * 3.2;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);

        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.12; 

        const puffs = 4;
        const twoPi = Math.PI * 2;
        
        for(let i=0; i<puffs; i++) {
            const angle = time * 0.15 + (i * twoPi / puffs);
            const dist = 15 + Math.sin(time * 0.8 + i) * 8;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            
            const pulse = 1.0 + Math.sin(time * 1.2 + i) * 0.15;
            const pSize = size * 0.55 * pulse;
            
            ctx.drawImage(texture, px - pSize/2, py - pSize/2, pSize, pSize);
        }
        
        ctx.globalAlpha = 0.18;
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
        const size = HEX_SIZE * 2.4; 

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); 

        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity;
        
        ctx.rotate((x * 0.001) + (y * 0.001)); 

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
        const variant = Math.abs(Math.floor(seed * 100));
        const texture = VFXFactory.getTerrainDetail(type, color, variant);
        const size = texture.width;

        ctx.drawImage(texture, x - size/2, y - size/2);
    }
};