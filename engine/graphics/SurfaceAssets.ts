
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";
import { VFXFactory } from "./VFXFactory";

// --- PRECOMPUTED GEOMETRY ---
// Standard Flat-Top Hexagon Vertices (Radius 1.0)
// Rotated by 45deg (PI/4) + 30deg (PI/6) = 75deg to match the Grid Rotation
const START_ANGLE = Math.PI / 6 + Math.PI / 4; 
const HEX_COS: number[] = [];
const HEX_SIN: number[] = [];

for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    HEX_COS.push(Math.cos(angle));
    HEX_SIN.push(Math.sin(angle));
}

// Expose these for external renderers to use RAW vertices if needed (e.g. for custom gradients)
export const GEOMETRY = {
    HEX_COS,
    HEX_SIN,
    START_ANGLE
};

/**
 * SurfaceAssets 3.0
 * Provides high-level drawing primitives for grid surfaces.
 * STRICTLY distinguishes between:
 * 1. Geometric Drawing (Lines, Shapes) -> Uses manual vertex projection (y * ISO_SCALE).
 * 2. Organic Drawing (Fluids, Sprites) -> Uses context scaling (ctx.scale).
 */
export const SurfaceAssets = {

    /**
     * Traces a hex path using manual vertex projection.
     * Best for strokes, outlines, and UI elements to prevent line distortion.
     * Guaranteed to match TerrainRenderer geometry.
     */
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
     * 1. LIQUID SURFACE (Lava, Acid, Blood, Water)
     * Uses Noise + Context Scaling for organic feel.
     */
    drawLiquid(
        ctx: CanvasRenderingContext2D,
        x: number, y: number,
        color: string,
        time: number,
        intensity: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        // Squash context to fit ground plane
        ctx.scale(1, ISO_SCALE_Y); 

        const r = HEX_SIZE * 0.9;
        
        // Fluid noise shape
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

        // Main Body
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7 * intensity;
        ctx.fill();

        // Inner Flow
        ctx.globalCompositeOperation = 'multiply';
        ctx.beginPath();
        ctx.arc(Math.sin(time) * 5, Math.cos(time * 0.8) * 5, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Specular Highlight (Bubbles)
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.4;
        
        const bX = Math.cos(time * 1.5) * r * 0.4;
        const bY = Math.sin(time * 1.5) * r * 0.4;
        ctx.beginPath(); ctx.arc(bX, bY, 4, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    },

    /**
     * 2. VOLUMETRIC FOG (Poison Gas, Smoke, Steam)
     * Uses Sprite scaling.
     */
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
        ctx.scale(1, ISO_SCALE_Y); // Flatten sprites to ground

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
        
        // Base Haze
        ctx.globalAlpha = 0.15;
        ctx.drawImage(texture, -size/2, -size/2, size, size);

        ctx.restore();
    },

    /**
     * 3. GROUND CRACKS (Earthquake, Magma Crust)
     * Uses Texture scaling.
     */
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
        
        // Random static rotation based on coordinate hash would be better, 
        // but here we rotate based on x/y to keep it deterministic per tile
        const staticRot = (x + y) * 0.1;
        ctx.rotate(staticRot);

        ctx.drawImage(texture, -size/2, -size/2, size, size);
        ctx.restore();
    },

    /**
     * 4. EXTRUDED PRISM (Ice, Crystal, Walls)
     * Uses Geometric Projection (Vertex Math) for correct vertical walls.
     */
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

        // Draw Sides (Only front 3 faces needed for standard view)
        const visibleFaces = [5, 0, 1]; // Front-Right, Front-Bottom, Front-Left
        
        for (const i of visibleFaces) {
            const j = (i + 1) % 6;
            
            // Vertices using Shared Geometry
            const x1 = x + HEX_SIZE * HEX_COS[i];
            const y1 = HEX_SIZE * HEX_SIN[i] * ISO_SCALE_Y; // Relative Y
            
            const x2 = x + HEX_SIZE * HEX_COS[j];
            const y2 = HEX_SIZE * HEX_SIN[j] * ISO_SCALE_Y; // Relative Y

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
            
            // Edge
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity * 0.5;
            ctx.stroke();
            ctx.globalAlpha = opacity;
        }

        // Top Face
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

    /**
     * 5. TERRAIN DETAIL (Texture Overlay)
     * Used for Void grids, Magma veins etc.
     */
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
                // Tech Square
                const s = 4;
                ctx.fillRect(-s/2, -s/2, s, s);
                
                // Tech Line
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(10, -5); ctx.stroke();
                
                ctx.restore();
            }
        }
    }
};
