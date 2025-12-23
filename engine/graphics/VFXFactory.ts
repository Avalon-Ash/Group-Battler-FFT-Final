
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
         
         const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
         grad.addColorStop(0, '#fff');        
         grad.addColorStop(0.4, color);       
         grad.addColorStop(1, 'transparent'); 
         
         ctx.fillStyle = grad;
         
         if (isChaos) {
             // Chaos: Unstable plasma blob
             ctx.beginPath();
             const spikes = 12;
             for(let i=0; i<spikes; i++) {
                 const angle = (i / spikes) * Math.PI * 2;
                 // Randomize radius for "wobbly" look
                 const rad = r * (0.6 + Math.random() * 0.4);
                 const x = cx + Math.cos(angle) * rad;
                 const y = cy + Math.sin(angle) * rad;
                 if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
             }
             ctx.closePath();
             ctx.fill();
         } else {
             // Order: Perfect Sphere with Cross Flare
             ctx.beginPath(); 
             ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2); 
             ctx.fill();
             
             // Lens flare cross
             ctx.fillStyle = '#fff';
             ctx.globalAlpha = 0.8;
             ctx.beginPath();
             // Horizontal soft beam
             ctx.ellipse(cx, cy, r, r*0.15, 0, 0, Math.PI*2);
             // Vertical sharp beam
             ctx.ellipse(cx, cy, r*0.15, r, 0, 0, Math.PI*2);
             ctx.fill();
         }
         
         return canvas;
    },

    generateFogCloud(color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(FOG_SIZE, FOG_SIZE);
        const cx = FOG_SIZE / 2;
        const cy = FOG_SIZE / 2;
        
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, FOG_SIZE / 2);
        grad.addColorStop(0, color);
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.4;
        
        // Perlin-ish blobs
        for(let i=0; i<8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (FOG_SIZE * 0.25);
            const r = FOG_SIZE * (0.15 + Math.random() * 0.15);
            
            ctx.beginPath(); 
            ctx.arc(cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist, r, 0, Math.PI*2); 
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
        ctx.shadowBlur = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (isChaos) {
            // --- CHAOS RUNE (Jagged, asymmetrical, blood-like) ---
            ctx.beginPath();
            const points = 9;
            for(let i=0; i<=points; i++) {
                const angle = i * (Math.PI * 2 / points);
                // Heavy distortion
                const r = radius * (0.85 + Math.random() * 0.3); 
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Inner scribble / Eye
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 25, cy); 
            ctx.quadraticCurveTo(cx, cy - 15, cx + 25, cy);
            ctx.quadraticCurveTo(cx, cy + 15, cx - 25, cy);
            ctx.stroke();
            
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();

        } else {
            // --- ORDER RUNE (Geometric, Symmetrical, Mandalas) ---
            // Outer Ring
            ctx.beginPath(); 
            ctx.arc(cx, cy, radius, 0, Math.PI * 2); 
            ctx.stroke();
            
            ctx.lineWidth = 1.5;
            if (isUlt) {
                // Complex Hexagram (Star of David style)
                const drawPoly = (sides: number, r: number, offset: number) => {
                    ctx.beginPath();
                    for (let i = 0; i <= sides; i++) {
                        const angle = offset + (i * Math.PI * 2) / sides;
                        const x = cx + Math.cos(angle) * r;
                        const y = cy + Math.sin(angle) * r;
                        if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                };
                
                drawPoly(3, radius, -Math.PI/2); // Triangle Up
                drawPoly(3, radius, Math.PI/2);  // Triangle Down
                
                // Inner Circle
                ctx.beginPath(); ctx.arc(cx, cy, radius * 0.5, 0, Math.PI*2); ctx.stroke();

            } else {
                // Simple Square/Diamond
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(Math.PI/4);
                ctx.strokeRect(-radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4);
                ctx.restore();
                
                ctx.beginPath(); ctx.arc(cx, cy, radius * 0.3, 0, Math.PI*2); ctx.stroke();
            }
        }
        
        return canvas;
    },

    generateWarningRune(): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(128, 64);
        const cx = 64;
        const cy = 32;
        const color = '#ef4444'; 
        
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.scale(1, 0.5); 
        
        // Skull-like Hazard Symbol
        ctx.beginPath(); 
        ctx.arc(cx, cy * 2, 40, 0, Math.PI * 2); 
        ctx.stroke();
        
        ctx.beginPath();
        // X mark
        ctx.moveTo(cx - 15, cy * 2 - 25); ctx.lineTo(cx + 15, cy * 2 + 25);
        ctx.moveTo(cx + 15, cy * 2 - 25); ctx.lineTo(cx - 15, cy * 2 + 25);
        ctx.stroke();

        return canvas;
    },

    generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(PROJ_WIDTH, PROJ_HEIGHT);
        const cx = PROJ_WIDTH / 2;
        const cy = PROJ_HEIGHT / 2;
        const isChaos = isChaosStyle(color);

        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (visual) {
            case 'ARROW':
                // Chaos: Barbed bone arrow | Order: Energy light arrow
                ctx.strokeStyle = isChaos ? '#a8a29e' : '#e2e8f0'; 
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(75, cy); ctx.stroke();

                ctx.fillStyle = isChaos ? '#7f1d1d' : '#f0f9ff';
                ctx.beginPath();
                if (isChaos) {
                    // Jagged Head
                    ctx.moveTo(85, cy); 
                    ctx.lineTo(65, cy - 8); ctx.lineTo(70, cy); ctx.lineTo(65, cy + 8);
                } else {
                    // Clean Bodkin
                    ctx.moveTo(90, cy); ctx.lineTo(70, cy - 6); ctx.lineTo(70, cy + 6);
                }
                ctx.closePath();
                ctx.fill();
                
                // Trail feather / energy
                ctx.strokeStyle = color;
                ctx.beginPath();
                if (isChaos) {
                    ctx.moveTo(20, cy); ctx.lineTo(5, cy - 10);
                    ctx.moveTo(20, cy); ctx.lineTo(5, cy + 10);
                } else {
                    // Glowing flight
                    ctx.moveTo(15, cy - 5); ctx.lineTo(5, cy); ctx.lineTo(15, cy + 5);
                }
                ctx.stroke();
                break;

            case 'FIREBALL':
            case 'BOMB':
                // Core
                const coreGrad = ctx.createRadialGradient(cx+20, cy, 0, cx+20, cy, 15);
                coreGrad.addColorStop(0, '#fff');
                coreGrad.addColorStop(0.5, color);
                coreGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = coreGrad;
                
                ctx.beginPath(); ctx.arc(cx + 20, cy, 14, 0, Math.PI * 2); ctx.fill();
                
                // Tail / Comet
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                if (isChaos) {
                    // Wild Flame
                    ctx.moveTo(cx + 20, cy - 12);
                    ctx.lineTo(cx, cy - 20); ctx.lineTo(cx - 20, cy - 5);
                    ctx.lineTo(cx - 35, cy);
                    ctx.lineTo(cx - 20, cy + 8); ctx.lineTo(cx, cy + 22);
                    ctx.lineTo(cx + 20, cy + 12);
                } else {
                    // Smooth Streamline
                    ctx.ellipse(cx + 5, cy, 35, 12, 0, 0, Math.PI * 2);
                }
                ctx.fill();
                break;

            case 'BOLT':
            case 'BEAM':
            default:
                if (isChaos) {
                    // --- CHAOS BOLT (Dark Energy Skull/Claw) ---
                    ctx.fillStyle = '#1c1917'; // Dark core
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    
                    ctx.beginPath();
                    // Jagged shape
                    ctx.moveTo(cx + 35, cy);
                    ctx.lineTo(cx + 10, cy - 15);
                    ctx.lineTo(cx - 10, cy - 5);
                    ctx.lineTo(cx - 30, cy);
                    ctx.lineTo(cx - 10, cy + 5);
                    ctx.lineTo(cx + 10, cy + 15);
                    ctx.closePath();
                    ctx.fill(); ctx.stroke();
                    
                    // Lightning Arcs
                    ctx.beginPath();
                    ctx.moveTo(cx + 35, cy); ctx.lineTo(cx + 45, cy - 12);
                    ctx.moveTo(cx + 35, cy); ctx.lineTo(cx + 45, cy + 12);
                    ctx.stroke();

                } else {
                    // --- HOLY BOLT (Geometric Star/Diamond) ---
                    // Inner Light
                    const boltGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 25); 
                    boltGrad.addColorStop(0, '#fff');
                    boltGrad.addColorStop(0.5, color);
                    boltGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = boltGrad;
                    ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fill();

                    // Hard Core Shape
                    ctx.fillStyle = '#fff';
                    ctx.shadowColor = '#fff';
                    ctx.beginPath();
                    // Diamond
                    ctx.moveTo(cx + 35, cy); ctx.lineTo(cx, cy - 12);
                    ctx.lineTo(cx - 15, cy); ctx.lineTo(cx, cy + 12);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Orbital Rings
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 5;
                    ctx.beginPath(); 
                    ctx.ellipse(cx, cy, 15, 8, 0, 0, Math.PI*2); 
                    ctx.stroke();
                }
                break;
        }

        return canvas;
    },

    generateBlastZone(color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(BLAST_WIDTH, BLAST_HEIGHT); 
        const cx = BLAST_WIDTH / 2;
        const cy = BLAST_HEIGHT / 2;
        const isChaos = isChaosStyle(color);
        
        ctx.scale(1, 0.5); 
        
        const grad = ctx.createRadialGradient(cx, cy * 2, 0, cx, cy * 2, 50);
        grad.addColorStop(0, isChaos ? '#000' : '#fff'); 
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.8;
        
        if (isChaos) {
            // Splatter / Cracks
            ctx.beginPath();
            for(let i=0; i<16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                const r = 35 + Math.random() * 25;
                const x = cx + Math.cos(angle) * r;
                const y = cy * 2 + Math.sin(angle) * r;
                ctx.lineTo(x, y);
            }
            ctx.fill();
            
            // Inner cracks
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalCompositeOperation = 'source-over';
            for(let i=0; i<5; i++) {
                ctx.beginPath();
                ctx.moveTo(cx, cy*2);
                const a = Math.random() * Math.PI * 2;
                ctx.lineTo(cx + Math.cos(a)*40, cy*2 + Math.sin(a)*40);
                ctx.stroke();
            }

        } else {
            // Clean Shockwave Ring
            ctx.beginPath(); ctx.arc(cx, cy * 2, 45, 0, Math.PI * 2); ctx.fill();
            
            // Energy Rings
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(cx, cy * 2, 48, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#fff';
            ctx.beginPath(); ctx.arc(cx, cy * 2, 35, 0, Math.PI * 2); ctx.stroke();
        }

        return canvas;
    }
};
