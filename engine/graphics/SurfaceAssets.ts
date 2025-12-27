
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
     * Draws a soft, fog-like hexagon using pre-baked textures scaled to fit the grid.
     * Replaces hard vector fills for a more atmospheric look.
     */
    drawVolumetricHex(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        radius: number,
        color: string,
        opacity: number
    ) {
        const texture = VFXFactory.generateHexFog(color);
        const size = radius * 2.5; // Texture includes padding

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); // Match isometric projection
        
        ctx.globalAlpha = opacity;
        
        // Draw the soft fog texture
        ctx.drawImage(texture, -size/2, -size/2, size, size);
        
        ctx.restore();
    },

    /**
     * NEW: Hex Ripple
     * Draws a thick, blurred hexagonal stroke for expanding waves.
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
        
        // Soften the line
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 2;
        
        this.traceHex(ctx, x, y, radius);
        ctx.stroke();
        
        // Add a secondary thinner white core for "energy" feel
        ctx.lineWidth = width * 0.3;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = opacity * 0.5;
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
        
        ctx.beginPath();
        const segments = 10; 
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const noise = Math.sin(theta * 3 + time * 2) * 3 + Math.cos(theta * 5 - time) * 2; 
            const px = Math.cos(theta) * (r + noise);
            const py = Math.sin(theta) * (r + noise);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7 * intensity;
        ctx.fill();

        ctx.globalCompositeOperation = 'multiply';
        ctx.beginPath();
        ctx.arc(Math.sin(time) * 5, Math.cos(time * 0.8) * 5, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.4;
        
        const bX = Math.cos(time * 1.5) * r * 0.4;
        const bY = Math.sin(time * 1.5) * r * 0.4;
        ctx.beginPath(); ctx.arc(bX, bY, 4, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    },

    drawFog(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number
    ) {
        const texture = VFXFactory.getTexture('GLOW', color);
        const size = HEX_SIZE * 2.5;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);

        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.2;

        const puffs = 3;
        for(let i=0; i<puffs; i++) {
            const angle = time * 0.3 + (i * Math.PI * 2 / puffs);
            const dist = 10 + Math.sin(time + i) * 5;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            
            const pulse = 1.0 + Math.sin(time * 2 + i) * 0.2;
            const pSize = size * 0.6 * pulse;
            
            ctx.drawImage(texture, px - pSize/2, py - pSize/2, pSize, pSize);
        }
        
        ctx.globalAlpha = 0.15;
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
        ctx.globalAlpha = opacity * 0.5;
        this.traceHex(ctx, x, topY, HEX_SIZE);
        ctx.fill();
        
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
        if (type === 'MAGMA') {
            if (seed > 0.6) {
                this.drawCracks(ctx, x, y, '#ef4444', 0.6);
            }
        } else if (type === 'VOID') {
            if (seed > 0.7) {
                ctx.save();
                ctx.translate(x, y);
                ctx.scale(1, ISO_SCALE_Y);
                
                ctx.fillStyle = '#38bdf8';
                ctx.globalAlpha = 0.3;
                const s = 4;
                ctx.fillRect(-s/2, -s/2, s, s);
                
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(10, -5); ctx.stroke();
                
                ctx.restore();
            }
        }
    }
};
