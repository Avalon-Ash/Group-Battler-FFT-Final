
import { HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
import { VFXFactory } from "../VFXFactory";
import { HexGeometry } from "../utils/HexGeometry";
import { HexLayout } from "../../../types";

export const SurfacePainter = {
    
    // Performance Optimized Liquid Renderer
    drawLiquid(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        intensity: number,
        layout: HexLayout = 'FLAT' 
    ) {
        ctx.save();
        const r = HEX_SIZE * 0.9;
        HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9 * intensity;
        ctx.fill();

        ctx.clip(); 

        const flowX = Math.sin(time * 0.5) * 8;
        const flowY = Math.cos(time * 0.4) * 8;

        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(flowX, flowY, r * 0.6, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.3;
        
        const bubbleX = Math.cos(time * 0.8) * (r * 0.4);
        const bubbleY = Math.sin(time * 0.9) * (r * 0.4) * ISO_SCALE_Y;
        
        ctx.beginPath(); 
        ctx.arc(bubbleX, bubbleY, r * 0.3, 0, Math.PI * 2); 
        ctx.fill();
        
        ctx.restore();
    },

    // --- BIOME SPECIFIC PAINTERS ---

    // 1. Procedural Grass (Optimized Tufts)
    drawGrass(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        density: number, // Unused in new logic, we fix count for perf
        time: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        
        // Static seed for positioning
        const seed = Math.sin(x * 0.12 + y * 0.12);
        
        // Unified wind calculation (Batched)
        const windForce = Math.sin(time * 1.5 + x * 0.02) * 6;
        
        // Define 3 tuft positions relative to hex center
        const tufts = [
            { x: -10, y: -6,  scale: 1.0, colorShift: 0 },
            { x: 8,   y: 0,   scale: 0.9, colorShift: 0.15 }, // Lighter
            { x: -4,  y: 10,  scale: 1.1, colorShift: -0.1 }  // Darker
        ];

        // Draw fills instead of strokes for cleaner look & better perf
        for (let i = 0; i < tufts.length; i++) {
            const t = tufts[i];
            
            // Randomize per tuft
            const localSeed = seed + i;
            const varianceX = Math.cos(localSeed * 5) * 4;
            const varianceY = Math.sin(localSeed * 5) * 4;
            
            const bx = t.x + varianceX;
            const by = t.y + varianceY;
            
            // Apply color variation
            ctx.fillStyle = color;
            if (t.colorShift !== 0) {
                // Quick hack to vary lightness without parsing hex
                // Using globalAlpha or overlay to shift tone
                if (t.colorShift > 0) {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = '#ffffff';
                    ctx.globalAlpha = 0.15; // Tint white
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = '#000000';
                    ctx.globalAlpha = 0.15; // Tint black
                }
            } else {
                ctx.globalAlpha = 1.0;
            }

            // Draw Base Color First (if shifting)
            if (t.colorShift !== 0) {
               ctx.save();
               ctx.fillStyle = color;
               ctx.globalAlpha = 1.0;
               this.pathTuft(ctx, bx, by, windForce, t.scale);
               ctx.fill();
               ctx.restore();
            }
            
            // Draw Shift/Main
            this.pathTuft(ctx, bx, by, windForce, t.scale);
            ctx.fill();
        }
        
        ctx.restore();
    },

    // Helper to create the blade path
    pathTuft(ctx: CanvasRenderingContext2D, bx: number, by: number, wind: number, scale: number) {
        const h = 14 * scale;
        const w = 4 * scale;
        
        const tipX = bx + wind * scale;
        const tipY = by - h;

        ctx.beginPath();
        // Leaf shape
        ctx.moveTo(bx - w, by);
        ctx.quadraticCurveTo(bx - w*0.5, by - h*0.6, tipX, tipY); // Left curve
        ctx.quadraticCurveTo(bx + w*0.5, by - h*0.6, bx + w, by); // Right curve
        ctx.closePath();
    },

    // 2. Ice Sheen (Glossy Reflection)
    drawIceSheen(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        time: number,
        layout: HexLayout = 'FLAT'
    ) {
        ctx.save();
        ctx.translate(x, y);
        
        // Mask to Hex
        HexGeometry.traceHex(ctx, 0, 0, size * 0.9, true, layout);
        ctx.clip();

        // Moving light band
        const slide = (time * 0.5) % 2.5 - 0.7; // -0.7 to 1.8 range
        const w = size * 2;
        
        // Diagonal gradient
        const grad = ctx.createLinearGradient(-w, -w, w, w);
        const start = slide - 0.3;
        const end = slide + 0.3;
        
        // FIX: Clamp all gradient stops to [0, 1] range to prevent IndexSizeError
        grad.addColorStop(Math.max(0, Math.min(1, start)), 'rgba(255,255,255,0)');
        grad.addColorStop(Math.max(0, Math.min(1, slide)), 'rgba(255,255,255,0.25)'); // Specular highlight
        grad.addColorStop(Math.max(0, Math.min(1, end)), 'rgba(255,255,255,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(-size, -size, size*2, size*2);

        // Static scratch marks/cracks
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5, 5); ctx.lineTo(5, -5);
        ctx.moveTo(2, 8); ctx.lineTo(8, 4);
        ctx.stroke();

        ctx.restore();
    },

    // 3. Sand Ripples (Dunes)
    drawSandRipples(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        size: number,
        color: string
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ISO_SCALE_Y);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.15; // Very subtle

        const seed = Math.sin(x * 0.05 + y * 0.05);
        const offset = seed * 5;

        // Draw 3 wavy lines
        for(let i=-1; i<=1; i++) {
            const ly = i * 8 + offset;
            ctx.beginPath();
            for(let lx=-15; lx<=15; lx+=5) {
                const wave = Math.sin(lx * 0.3 + offset) * 2;
                if(lx === -15) ctx.moveTo(lx, ly + wave);
                else ctx.lineTo(lx, ly + wave);
            }
            ctx.stroke();
        }
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
