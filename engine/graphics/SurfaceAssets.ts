
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";
import { VFXFactory } from "./VFXFactory";

// --- PRECOMPUTED GEOMETRY ---
const START_ANGLE = Math.PI / 6 + Math.PI / 4; 
const HEX_COS: number[] = [];
const HEX_SIN: number[] = [];

for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    HEX_COS.push(Math.cos(angle));
    HEX_SIN.push(Math.sin(angle));
}

export const GEOMETRY = {
    HEX_COS,
    HEX_SIN,
    START_ANGLE
};

export const SurfaceAssets = {

    traceHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
        ctx.beginPath();
        const startX = x + radius * HEX_COS[0];
        const startY = y + radius * HEX_SIN[0] * ISO_SCALE_Y;
        ctx.moveTo(startX, startY);
        
        for (let i = 1; i < 6; i++) {
            const vx = x + radius * HEX_COS[i];
            const vy = y + radius * HEX_SIN[i] * ISO_SCALE_Y;
            ctx.lineTo(vx, vy);
        }
        ctx.closePath();
    },

    /**
     * NEW: Volumetric Hexagon
     * Renders a soft, glowing pillar base or fog pool.
     */
    drawVolumetricHex(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        color: string,
        opacity: number
    ) {
        // We use the "ATMOSPHERE" texture which is a perfect soft radial glow
        const texture = VFXFactory.getTexture('ATMOSPHERE', color);
        const size = radius * 2.8; // Oversize slightly for bleed

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); // Flatten to ground plane
        
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = 'screen';
        
        // Draw the soft fog texture
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        
        // Optional: Draw a second smaller, brighter core
        ctx.globalAlpha = opacity * 0.5;
        const coreSize = size * 0.6;
        ctx.drawImage(texture, -coreSize/2, -coreSize/2, coreSize, coreSize);
        
        ctx.restore();
    },

    /**
     * NEW: Hex Ripple (Volumetric Ring)
     */
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
        
        // Soft glow for the line
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 1.5;
        
        this.traceHex(ctx, x, y, radius);
        ctx.stroke();
        
        // Secondary white hot core
        ctx.lineWidth = width * 0.2;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = opacity * 0.8;
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.restore();
    },

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
        ctx.beginPath();
        const segments = 12; 
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            // More organic noise
            const noise = Math.sin(theta * 4 + time) * 3 + Math.cos(theta * 2 - time * 1.5) * 2; 
            const px = Math.cos(theta) * (r + noise);
            const py = Math.sin(theta) * (r + noise);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // 2. Deep Base
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8 * intensity;
        ctx.fill();

        // 3. Surface Ripples (Darker)
        ctx.globalCompositeOperation = 'multiply';
        ctx.beginPath();
        const rippleX = Math.sin(time) * 5;
        const rippleY = Math.cos(time * 0.8) * 5;
        ctx.ellipse(rippleX, rippleY, r * 0.6, r * 0.5, time*0.1, 0, Math.PI * 2);
        ctx.fill();

        // 4. Specular Highlights (Bubbles/Reflection)
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        
        const bX = Math.cos(time * 1.5) * r * 0.4;
        const bY = Math.sin(time * 1.5) * r * 0.4;
        ctx.beginPath(); ctx.ellipse(bX, bY, 6, 3, 0, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    },

    drawFog(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number
    ) {
        // Use the factory generated cloud texture for better performance & look
        const texture = VFXFactory.getTexture('SMOKE_PUFF', color);
        const size = HEX_SIZE * 3.0;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);

        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.15; // Very subtle

        const puffs = 3;
        for(let i=0; i<puffs; i++) {
            const angle = time * 0.2 + (i * Math.PI * 2 / puffs);
            const dist = 12 + Math.sin(time + i) * 6;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            
            // Breathe
            const pulse = 1.0 + Math.sin(time * 1.5 + i) * 0.1;
            const pSize = size * 0.5 * pulse;
            
            ctx.drawImage(texture, px - pSize/2, py - pSize/2, pSize, pSize);
        }
        
        // Center Core
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
        
        const staticRot = (x + y) * 0.1; // Consistent rotation based on position
        ctx.rotate(staticRot);

        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    drawExtrusion(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
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
            
            const x1 = x + HEX_SIZE * HEX_COS[i];
            const y1 = HEX_SIZE * HEX_SIN[i] * ISO_SCALE_Y; 
            
            const x2 = x + HEX_SIZE * HEX_COS[j];
            const y2 = HEX_SIZE * HEX_SIN[j] * ISO_SCALE_Y; 

            // Gradient for 3D depth
            const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent'); // Fade into ground

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x1, topY + y1);
            ctx.lineTo(x2, topY + y2);
            ctx.lineTo(x2, bottomY + y2);
            ctx.lineTo(x1, bottomY + y1);
            ctx.closePath();
            ctx.fill();
            
            // Edges
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity * 0.5;
            ctx.stroke();
            ctx.globalAlpha = opacity;
        }

        // Top Cap
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity * 0.6;
        this.traceHex(ctx, x, topY, HEX_SIZE);
        ctx.fill();
        
        // Rim
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = opacity;
        ctx.stroke();

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

        // Simple deterministic random
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
             // Circuit lines
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
            // Generic
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
    },
};
