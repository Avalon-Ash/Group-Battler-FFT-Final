
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";

// Precomputed Hex for Geometry
const HEX_CORNERS: {x: number, y: number}[] = [];
for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 6 + Math.PI / 4) + i * Math.PI / 3;
    HEX_CORNERS.push({ 
        x: HEX_SIZE * Math.cos(angle), 
        y: HEX_SIZE * Math.sin(angle) * ISO_SCALE_Y 
    });
}

const VISIBLE_FACES = [0, 1, 5]; 

export const SurfaceAssets = {

    pathHex(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1.0) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const c = HEX_CORNERS[i];
            if (i === 0) ctx.moveTo(x + c.x * scale, y + c.y * scale);
            else ctx.lineTo(x + c.x * scale, y + c.y * scale);
        }
        ctx.closePath();
    },

    // 1. LIQUID SURFACE (Blood, Lava, Acid)
    // Concept: Wobbly meniscus inside the hex, specular highlights
    drawLiquidSurface(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        intensity: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); // Flatten to isometric plane

        // Wobbly Circle Base
        ctx.beginPath();
        const r = HEX_SIZE * 0.9;
        const segments = 12;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            // Noise offset based on time and angle to create surface tension wobble
            const noise = Math.sin(angle * 3 + time * 2) * 3 + Math.cos(angle * 5 - time) * 2;
            const px = Math.cos(angle) * (r + noise);
            const py = Math.sin(angle) * (r + noise);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Fluid Body
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8 * intensity;
        ctx.fill();

        // Inner darker pool (Depth)
        ctx.globalCompositeOperation = 'multiply';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = color; // Darker version via multiply
        ctx.globalAlpha = 0.5;
        ctx.fill();

        // Specular Highlights (Surface Tension)
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#fff';
        
        // Highlight 1 (Top Edge Reflection)
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.6, r * 0.4, 4, 0, 0, Math.PI*2);
        ctx.fill();
        
        // Highlight 2 (Bubble)
        const bubbleX = Math.sin(time) * r * 0.3;
        const bubbleY = Math.cos(time) * r * 0.3;
        ctx.beginPath(); ctx.arc(bubbleX, bubbleY, 3, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    },

    // 2. VOLUMETRIC FOG (Poison, Smoke)
    // Concept: Multiple drifting cloud puffs with soft gradients to simulate volume
    drawVolumetricFog(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        
        // Create cloud puffs
        const puffs = 5;
        for(let i=0; i<puffs; i++) {
            const tOffset = i * 1.5;
            
            // Orbiting motion around center of tile
            const angle = time * 0.5 + i * (Math.PI * 2 / puffs);
            const dist = Math.sin(time * 0.2 + i) * 15;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist * ISO_SCALE_Y - 15; // Floating slightly up
            
            // Breath (Scale)
            const scale = 1.0 + Math.sin(time + i) * 0.2;
            const radius = 25 * scale;

            const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');

            ctx.globalAlpha = 0.3; // Low alpha for stacking
            ctx.globalCompositeOperation = 'screen'; // Additive blending for gas
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Ground Haze (Base layer)
        ctx.globalCompositeOperation = 'source-over';
        ctx.scale(1, ISO_SCALE_Y);
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, HEX_SIZE, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    },

    // 3. GROUND CRACKS (Smash, Earthquake)
    // Concept: Jagged fractal lines radiating from center
    drawGroundCracks(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        intensity: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);

        ctx.strokeStyle = color; // Lava color or Energy color
        ctx.lineWidth = 2 * intensity;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalCompositeOperation = 'lighter'; // Glowing cracks
        
        const branches = 4;
        for(let i=0; i<branches; i++) {
            const angle = (i / branches) * Math.PI * 2 + (Math.random()*0.5);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            
            // Jagged segments
            let cx = 0, cy = 0;
            const len = HEX_SIZE * intensity;
            const steps = 3;
            for(let j=0; j<steps; j++) {
                const stepLen = len / steps;
                cx += Math.cos(angle) * stepLen + (Math.random()-0.5) * 8;
                cy += Math.sin(angle) * stepLen + (Math.random()-0.5) * 8;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }
        
        // Glowing Core
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, 8 * intensity, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    },

    // Original Extruded Hex (Kept for basic fields/walls/indicators)
    drawExtrudedHex(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        height: number,
        color: string,
        opacity: number,
        isHollow: boolean = false
    ) {
        const topY = y - height;
        const bottomY = y;

        ctx.save();
        ctx.globalAlpha = opacity * 0.6;
        
        for (const i of VISIBLE_FACES) {
            const idx1 = i;
            const idx2 = (i + 1) % 6;
            
            const c1 = HEX_CORNERS[idx1];
            const c2 = HEX_CORNERS[idx2];

            let shade = 1.0;
            if (i === 5) shade = 0.7; 
            if (i === 0) shade = 0.5; 
            if (i === 1) shade = 0.9; 

            const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x + c1.x, topY + c1.y);
            ctx.lineTo(x + c2.x, topY + c2.y);
            ctx.lineTo(x + c2.x, bottomY + c2.y);
            ctx.lineTo(x + c1.x, bottomY + c1.y);
            ctx.closePath();
            
            const oldAlpha = ctx.globalAlpha;
            ctx.globalAlpha = oldAlpha * shade;
            ctx.fill();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity * 0.8;
            ctx.beginPath();
            ctx.moveTo(x + c1.x, topY + c1.y);
            ctx.lineTo(x + c1.x, bottomY + c1.y);
            ctx.stroke();
            
            ctx.globalAlpha = oldAlpha;
        }

        if (!isHollow) {
            ctx.globalAlpha = opacity;
            ctx.fillStyle = color;
            this.pathHex(ctx, x, topY, 1.0);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = opacity * 0.5;
            this.pathHex(ctx, x, topY, 0.8);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = opacity;
        this.pathHex(ctx, x, topY, 1.0);
        ctx.stroke();

        ctx.restore();
    },

    drawTexture(
        ctx: CanvasRenderingContext2D, 
        cx: number, cy: number, 
        q: number, r: number, 
        type: string, 
        color: string,
        globalTime: number
    ) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        const n = Math.sin(q * 12.9898 + r * 78.233) * 43758.5453;
        const seed = n - Math.floor(n);

        if (type === 'MAGMA') {
            if (seed > 0.5) {
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(cx - 10, cy);
                ctx.lineTo(cx, cy + 5);
                ctx.lineTo(cx + 10, cy - 2);
                ctx.stroke();
            }
        } else if (type === 'VOID') {
            if (seed > 0.7) {
                ctx.fillStyle = '#38bdf8';
                ctx.globalAlpha = 0.4;
                ctx.fillRect(cx - 2, cy - 2, 4, 4);
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+10, cy-5); ctx.stroke();
            }
        }
        ctx.restore();
    },

    drawUnitRune(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        color: string, 
        t: number, 
        progress: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); 
        const r = HEX_SIZE * 0.8 * progress; 
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
        ctx.rotate(t * 2);
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI/4); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, Math.PI + Math.PI/4); ctx.stroke();
        ctx.restore();
    }
};
