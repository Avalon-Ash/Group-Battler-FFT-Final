
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";
import { VFXFactory } from "./VFXFactory";

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
    // OPTIMIZED: Reduced segment count and simplified noise calculation
    drawLiquidSurface(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        intensity: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y); 

        // Optimized Wobbly Circle
        ctx.beginPath();
        const r = HEX_SIZE * 0.9;
        const segments = 8; // Reduced from 12
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            // Simplified noise: Single sin wave + time offset
            // We removed the inner cos calculation to save CPU
            const noise = Math.sin(angle * 3 + time * 3) * 2.5; 
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
        // Grouped Composite Operations to reduce state changes
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Specular Highlights
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#fff';
        
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.6, r * 0.4, 4, 0, 0, Math.PI*2);
        ctx.fill();
        
        const bubbleX = Math.sin(time) * r * 0.3;
        const bubbleY = Math.cos(time) * r * 0.3;
        ctx.beginPath(); ctx.arc(bubbleX, bubbleY, 3, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    },

    // 2. VOLUMETRIC FOG (Poison, Smoke)
    // OPTIMIZED: Uses cached GLOW texture instead of real-time gradients
    drawVolumetricFog(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number
    ) {
        const puffTexture = VFXFactory.getTexture('GLOW', color);
        const textureSize = puffTexture.width;
        const halfSize = textureSize / 2;

        ctx.save();
        ctx.translate(x, y);
        
        ctx.globalCompositeOperation = 'screen'; 
        ctx.globalAlpha = 0.2; 

        // Create cloud puffs
        const puffs = 4; // Reduced from 5
        for(let i=0; i<puffs; i++) {
            // Orbiting motion logic preserved
            const angle = time * 0.5 + i * (Math.PI * 2 / puffs);
            const dist = Math.sin(time * 0.2 + i) * 15;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist * ISO_SCALE_Y - 15; 
            
            const scale = (1.0 + Math.sin(time + i) * 0.2) * 0.5; // Scale relative to texture size
            const size = textureSize * scale;
            
            // Draw Cached Texture
            ctx.drawImage(puffTexture, px - size/2, py - size/2, size, size);
        }
        
        // Ground Haze (Base layer) using same texture stretched
        ctx.scale(1, ISO_SCALE_Y);
        ctx.globalAlpha = 0.15;
        const baseSize = HEX_SIZE * 2.5;
        ctx.drawImage(puffTexture, -baseSize/2, -baseSize/2, baseSize, baseSize);

        ctx.restore();
    },

    // 3. GROUND CRACKS (Smash, Earthquake)
    // OPTIMIZED: Uses pre-baked CRACKS texture instead of procedural drawing
    drawGroundCracks(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        intensity: number
    ) {
        const texture = VFXFactory.generateCracks(color);
        const size = HEX_SIZE * 2.2; 
        const half = size / 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);

        ctx.globalCompositeOperation = 'lighter'; 
        ctx.globalAlpha = intensity;
        
        // Slight rotation for variety based on position (pseudo-random)
        // using x coordinate as seed to keep it static per tile
        const staticRot = (x % 3) * (Math.PI / 3);
        ctx.rotate(staticRot);

        ctx.drawImage(texture, -half, -half, size, size);

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

            // NOTE: Gradient here is still needed for depth, but it's only 3 per hex
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
        // Optimized Seed: Use bitwise ops for speed
        // const n = Math.sin(q * 12.9898 + r * 78.233) * 43758.5453;
        // const seed = n - Math.floor(n);
        // Simple hash is faster for pure visuals
        const seed = ((q * 73856093) ^ (r * 19349663)) / 2147483647; 
        const normalizedSeed = Math.abs(seed - Math.floor(seed));

        if (type === 'MAGMA') {
            if (normalizedSeed > 0.5) {
                // Now uses cached texture logic inside SurfaceAssets? 
                // Actually SurfaceAssets calls drawGroundCracks itself sometimes? 
                // No, TerrainRenderer calls drawTexture directly.
                // We reimplement a simple crack draw here or use the cached one.
                
                // Using the optimized drawGroundCracks which now uses cache
                this.drawGroundCracks(ctx, cx, cy, '#ef4444', 0.6);
            }
        } else if (type === 'VOID') {
            // VOID texture logic remains simple rects, but use context save/restore carefully
            if (normalizedSeed > 0.7) {
                ctx.save();
                ctx.fillStyle = '#38bdf8';
                ctx.globalAlpha = 0.4;
                ctx.fillRect(cx - 2, cy - 2, 4, 4);
                
                ctx.strokeStyle = color;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+10, cy-5); ctx.stroke();
                ctx.restore();
            }
        }
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
