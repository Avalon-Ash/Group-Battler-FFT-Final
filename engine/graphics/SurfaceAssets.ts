
import { HEX_SIZE, ISO_SCALE_Y } from "../../constants";
import { isChaosStyle } from "../systems/vfx/utils";
import { Skill } from "../../types";

// Precomputed Hex for Geometry
const HEX_CORNERS: {x: number, y: number}[] = [];
for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 6 + Math.PI / 4) + i * Math.PI / 3;
    HEX_CORNERS.push({ 
        x: HEX_SIZE * Math.cos(angle), 
        y: HEX_SIZE * Math.sin(angle) * ISO_SCALE_Y 
    });
}

// 2.5D Volumetric Geometry Helpers
const FACE_INDICES = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]
];

// Determine visible faces based on camera/perspective
// In isometric, usually faces 0, 1, 5 are "front" facing
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

    // NEW: Helper for Visual Resolver
    resolveFieldVisual(skill: Skill, visualType: string): string {
        if (skill.ccType === 'PULL' || skill.name.includes('黑洞')) return 'GRAVITY';
        if (skill.ccType === 'DOT') return 'POISON';
        if (visualType === 'FIREBALL') return 'LAVA';
        if (skill.name.includes('冰') || skill.name.includes('雪')) return 'ICE';
        return visualType;
    },

    // NEW: Volumetric Prism (Extruded Hex)
    // Used for thick fields, pillars, and elevated zones
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
        
        // 1. Side Faces (The "Volume")
        // We simulate light direction to differentiate faces
        ctx.globalAlpha = opacity * 0.6; // Sides are dimmer
        
        // Front-facing sides only to save perf
        for (const i of VISIBLE_FACES) {
            const idx1 = i;
            const idx2 = (i + 1) % 6;
            
            const c1 = HEX_CORNERS[idx1];
            const c2 = HEX_CORNERS[idx2];

            // Calculate simple lighting based on face angle
            // Face 0 = Right, Face 1 = Front-Right, Face 5 = Front-Left
            let shade = 1.0;
            if (i === 5) shade = 0.7; // Darker
            if (i === 0) shade = 0.5; // Darkest
            if (i === 1) shade = 0.9; // Brightest

            // Create gradient for vertical fade
            const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            // Hack to tint the gradient without parsing color string
            // We draw transparently then apply shadow or multiple passes if needed
            // For performance, we assume 'color' is the main hue
            
            ctx.beginPath();
            ctx.moveTo(x + c1.x, topY + c1.y);
            ctx.lineTo(x + c2.x, topY + c2.y);
            ctx.lineTo(x + c2.x, bottomY + c2.y);
            ctx.lineTo(x + c1.x, bottomY + c1.y);
            ctx.closePath();
            
            // Apply shading via alpha modulation
            const oldAlpha = ctx.globalAlpha;
            ctx.globalAlpha = oldAlpha * shade;
            ctx.fill();
            
            // Rim Line for definition
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = opacity * 0.8;
            ctx.beginPath();
            ctx.moveTo(x + c1.x, topY + c1.y);
            ctx.lineTo(x + c1.x, bottomY + c1.y);
            ctx.stroke();
            
            ctx.globalAlpha = oldAlpha;
        }

        // 2. Top Face (The "Cap")
        if (!isHollow) {
            ctx.globalAlpha = opacity;
            ctx.fillStyle = color;
            this.pathHex(ctx, x, topY, 1.0);
            ctx.fill();
            
            // Inner glow
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = opacity * 0.5;
            this.pathHex(ctx, x, topY, 0.8);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // 3. Top Rim
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = opacity;
        this.pathHex(ctx, x, topY, 1.0);
        ctx.stroke();

        ctx.restore();
    },

    // 🎯 TACTICAL GRID (Clean, Solid)
    drawTacticalGrid(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        color: string, 
        progress: number, 
        isCenter: boolean
    ) {
        ctx.save();
        const isChaos = isChaosStyle(color);
        const alpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.2;

        if (isChaos) {
            // Chaos: Jagged Rune Floor
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = 2;
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha;
            
            // Outer Hex
            this.pathHex(ctx, x, y, 0.9);
            ctx.stroke();
            
            // Inner Cross
            ctx.beginPath();
            ctx.moveTo(x - 15, y - 10); ctx.lineTo(x + 15, y + 10);
            ctx.moveTo(x + 15, y - 10); ctx.lineTo(x - 15, y + 10);
            ctx.stroke();
            
            // Glow center
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.2;
            ctx.fill();

        } else {
            // Imperial: Holographic Projection
            // Draw extruded base (hologram thickness)
            const height = 10 * progress;
            this.drawExtrudedHex(ctx, x, y, height, color, 0.4, true); // Hollow top
            
            // Top Scanner
            const topY = y - height;
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            this.pathHex(ctx, x, topY, 1.0);
            ctx.stroke();
            
            // Scanning fill
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.1;
            this.pathHex(ctx, x, topY, 0.9);
            ctx.fill();
        }

        ctx.restore();
    },

    // 🌍 TERRAIN TEXTURES
    drawTexture(
        ctx: CanvasRenderingContext2D, 
        cx: number, cy: number, 
        q: number, r: number, 
        type: string, 
        color: string,
        globalTime: number
    ) {
        // Simple static details, keeping it performant
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        
        // Random seed based on coord
        const n = Math.sin(q * 12.9898 + r * 78.233) * 43758.5453;
        const seed = n - Math.floor(n);

        if (type === 'MAGMA') {
            // Cracks
            if (seed > 0.5) {
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(cx - 10, cy);
                ctx.lineTo(cx, cy + 5);
                ctx.lineTo(cx + 10, cy - 2);
                ctx.stroke();
            }
        } else if (type === 'VOID') {
            // Tech nodes
            if (seed > 0.7) {
                ctx.fillStyle = '#38bdf8';
                ctx.globalAlpha = 0.4;
                ctx.fillRect(cx - 2, cy - 2, 4, 4);
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+10, cy-5); ctx.stroke();
            }
        }
        // ... (Simplified other types for speed)
        
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

        const r = HEX_SIZE * 0.8 * progress; // Animate expansion
        
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI*2);
        ctx.stroke();
        
        // Rotating notches
        ctx.rotate(t * 2);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI/4);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI, Math.PI + Math.PI/4);
        ctx.stroke();

        ctx.restore();
    }
};
