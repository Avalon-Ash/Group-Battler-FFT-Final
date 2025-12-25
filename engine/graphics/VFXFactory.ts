
import { createCanvas } from "./CanvasUtils";

// Dimensions
const VFX_SIZE = 64;
const MAGIC_CIRCLE_SIZE = 128;
const PROJ_WIDTH = 96;
const PROJ_HEIGHT = 64;
const BLAST_WIDTH = 128;
const BLAST_HEIGHT = 64;
const FOG_SIZE = 256;

// Helper: Chaos color detection
function isChaosStyle(color: string): boolean {
    const c = color.toLowerCase();
    return c.includes('#dc') || c.includes('#ef') || c.includes('#b9') || c.includes('#45') || 
           c.includes('#7f') || c.includes('#4c') || c.includes('#a3') || c.includes('#58') ||
           c.includes('#1c');
}

export const VFXFactory = {

    generateGlowOrb(color: string, size: number = VFX_SIZE): HTMLCanvasElement {
         const { canvas, ctx } = createCanvas(size, size);
         const cx = size / 2;
         const cy = size / 2;
         const r = size / 2;
         const isChaos = isChaosStyle(color);
         
         // Modern "Hot Core" Glow
         const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
         grad.addColorStop(0, '#ffffff');        // White hot center
         grad.addColorStop(0.2, color);          // Intense inner color
         grad.addColorStop(0.5, color);          // Falloff start
         grad.addColorStop(1, 'rgba(0,0,0,0)');  // Fade out
         
         ctx.fillStyle = grad;
         
         if (isChaos) {
             // Chaos: Unstable plasma blob with spikes
             ctx.beginPath();
             const spikes = 16;
             for(let i=0; i<spikes; i++) {
                 const angle = (i / spikes) * Math.PI * 2;
                 // Randomize radius for jagged look
                 const rad = r * (0.6 + Math.random() * 0.4);
                 const x = cx + Math.cos(angle) * rad;
                 const y = cy + Math.sin(angle) * rad;
                 if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
             }
             ctx.closePath();
             ctx.fill();
         } else {
             // Order: Smooth Sphere with Halo
             ctx.beginPath(); 
             ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); 
             ctx.fill();
             
             // Lens Flare Ring
             ctx.strokeStyle = 'rgba(255,255,255,0.3)';
             ctx.lineWidth = 1;
             ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI*2); ctx.stroke();
         }
         
         return canvas;
    },

    generateFogCloud(color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(FOG_SIZE, FOG_SIZE);
        const cx = FOG_SIZE / 2;
        const cy = FOG_SIZE / 2;
        
        // Multi-layered noise cloud
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, FOG_SIZE / 2);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.2; // Softer base
        
        // Draw multiple overlapping blobs to simulate volume
        for(let i=0; i<16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (FOG_SIZE * 0.35);
            const size = FOG_SIZE * (0.1 + Math.random() * 0.15);
            
            ctx.beginPath(); 
            ctx.arc(cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist, size, 0, Math.PI*2); 
            ctx.fill();
        }
        
        return canvas;
    },

    generateMagicCircle(color: string, isUlt: boolean): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(MAGIC_CIRCLE_SIZE, MAGIC_CIRCLE_SIZE);
        const cx = MAGIC_CIRCLE_SIZE / 2;
        const cy = MAGIC_CIRCLE_SIZE / 2;
        const radius = 50;
        const isChaos = isChaosStyle(color);
        
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (isChaos) {
            // Chaos Rune: Spiky, Broken
            ctx.beginPath();
            const points = 7; // Odd number for asymmetry
            for(let i=0; i<=points; i++) {
                const angle = i * (Math.PI * 2 / points);
                const r = radius * (0.8 + Math.random() * 0.2); 
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Inner Scratch
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 20, cy - 20); ctx.lineTo(cx + 20, cy + 20);
            ctx.moveTo(cx + 20, cy - 20); ctx.lineTo(cx - 20, cy + 20);
            ctx.stroke();

        } else {
            // Order Rune: Geometric, Perfect
            ctx.beginPath(); 
            ctx.arc(cx, cy, radius, 0, Math.PI * 2); 
            ctx.stroke();
            
            ctx.lineWidth = 1.5;
            if (isUlt) {
                // Complex Mandala
                const drawPoly = (sides: number, r: number, offset: number) => {
                    ctx.beginPath();
                    for (let i = 0; i <= sides; i++) {
                        const angle = offset + (i * Math.PI * 2) / sides;
                        const x = cx + Math.cos(angle) * r;
                        const y = cy + Math.sin(angle) * r;
                        if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                };
                
                drawPoly(3, radius, -Math.PI/2); // Triangle Up
                drawPoly(3, radius, Math.PI/2);  // Triangle Down (Star of David style)
                
                ctx.beginPath(); ctx.arc(cx, cy, radius * 0.4, 0, Math.PI*2); ctx.stroke();

            } else {
                // Simple Rune
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(Math.PI/4);
                ctx.strokeRect(-radius * 0.6, -radius * 0.6, radius * 1.2, radius * 1.2);
                ctx.restore();
                
                ctx.beginPath(); ctx.arc(cx, cy, radius * 0.8, 0, Math.PI*2); ctx.stroke();
            }
        }
        
        return canvas;
    },

    generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(PROJ_WIDTH, PROJ_HEIGHT);
        const cx = PROJ_WIDTH / 2;
        const cy = PROJ_HEIGHT / 2;

        // Modern "Neon" Style - Less blur, more bloom
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (visual) {
            case 'ARROW':
                // High-Tech Arrow (Kinetic Rod)
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(70, cy); ctx.stroke();
                
                // Glowing Head
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(80, cy); 
                ctx.lineTo(60, cy - 6); 
                ctx.lineTo(65, cy); 
                ctx.lineTo(60, cy + 6);
                ctx.fill();
                break;

            case 'FIREBALL':
            case 'BOMB':
                // Plasma Orb
                const coreGrad = ctx.createRadialGradient(cx+20, cy, 0, cx+20, cy, 18);
                coreGrad.addColorStop(0, '#fff');
                coreGrad.addColorStop(0.3, color);
                coreGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = coreGrad;
                
                ctx.beginPath(); ctx.arc(cx + 20, cy, 16, 0, Math.PI * 2); ctx.fill();
                
                // Trailing arcs
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(cx + 20, cy, 12, Math.PI * 0.2, Math.PI * 1.8);
                ctx.stroke();
                break;

            case 'SLASH':
                // Energy Wave
                ctx.translate(cx, cy);
                ctx.beginPath();
                ctx.arc(0, 0, 30, -Math.PI/3, Math.PI/3, false);
                ctx.arc(-10, 0, 25, Math.PI/3, -Math.PI/3, true);
                ctx.closePath();
                ctx.fillStyle = '#fff';
                ctx.fill();
                
                ctx.strokeStyle = color;
                ctx.lineWidth = 4;
                ctx.stroke();
                break;

            case 'BOLT':
            case 'BEAM':
            default:
                // Sci-Fi Energy Slug
                const boltPath = new Path2D();
                boltPath.moveTo(cx + 40, cy);      // Tip
                boltPath.lineTo(cx + 10, cy - 8);  // Top
                boltPath.lineTo(cx - 20, cy);      // Tail Center
                boltPath.lineTo(cx + 10, cy + 8);  // Bottom
                boltPath.closePath();

                ctx.fillStyle = '#fff';
                ctx.fill(boltPath);
                
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.stroke(boltPath);
                
                // Side vents
                ctx.beginPath();
                ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 10, cy - 15);
                ctx.moveTo(cx, cy + 10); ctx.lineTo(cx - 10, cy + 15);
                ctx.stroke();
                break;
        }

        return canvas;
    },

    generateBlastZone(color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(BLAST_WIDTH, BLAST_HEIGHT); 
        const cx = BLAST_WIDTH / 2;
        const cy = BLAST_HEIGHT / 2;
        const isChaos = isChaosStyle(color);
        
        // Isometric Flatten
        ctx.scale(1, 0.5); 
        
        // 1. Scorch Marks (Not cracks)
        // Draw irregular blobs
        ctx.fillStyle = isChaos ? '#000' : '#475569';
        ctx.globalAlpha = 0.5;
        
        for(let i=0; i<3; i++) {
            ctx.beginPath();
            const r = 30 + Math.random() * 20;
            const offset = (Math.random() - 0.5) * 20;
            ctx.ellipse(cx + offset, cy*2 + offset, r, r * 0.6, Math.random(), 0, Math.PI*2);
            ctx.fill();
        }

        // 2. Energy Residual (Outer Ring)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(cx, cy * 2, 45, 0, Math.PI*2); ctx.stroke();

        // 3. Central Hotspot
        const grad = ctx.createRadialGradient(cx, cy * 2, 0, cx, cy * 2, 30);
        grad.addColorStop(0, color); 
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(cx, cy * 2, 30, 0, Math.PI*2); ctx.fill();

        return canvas;
    }
};
