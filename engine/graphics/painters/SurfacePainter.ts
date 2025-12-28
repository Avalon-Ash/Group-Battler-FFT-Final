
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
        // Optimized: Reduced segments
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
        const rippleX = Math.sin(time) * 4;
        const rippleY = Math.cos(time * 0.7) * 4;
        ctx.ellipse(rippleX, rippleY, r * 0.6, r * 0.5, time * 0.1, 0, twoPi);
        ctx.fill();

        // 4. Specular Highlights
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

    /**
     * Optimized: Uses Cached Textures from VFXFactory instead of drawing paths every frame.
     */
    drawDetailTexture(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        type: string,
        color: string,
        seed: number
    ) {
        // Derive a stable variant index (0-3) from the seed or coords
        const variant = Math.abs(Math.floor(seed * 100));
        const texture = VFXFactory.getTerrainDetail(type, color, variant);
        const size = texture.width; // Should be HEX_SIZE * 2

        ctx.drawImage(texture, x - size/2, y - size/2);
    }
};
