
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

// Pseudo-Random Noise generator for textures
function pseudoNoise(x: number, y: number, seed: number) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

export const VFXFactory = {

    generateGlowOrb(color: string, size: number = VFX_SIZE): HTMLCanvasElement {
         const { canvas, ctx } = createCanvas(size, size);
         const cx = size / 2;
         const cy = size / 2;
         const r = size / 2;
         const isChaos = isChaosStyle(color);
         
         // Improved Gradient for softer falloff (Fixes banding)
         const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
         grad.addColorStop(0, '#fff');        
         grad.addColorStop(0.15, color); // Tight core
         grad.addColorStop(0.4, color);  
         grad.addColorStop(1, 'rgba(0,0,0,0)'); 
         
         ctx.fillStyle = grad;
         
         if (isChaos) {
             // Chaos: Unstable plasma blob
             ctx.beginPath();
             const spikes = 12;
             for(let i=0; i<spikes; i++) {
                 const angle = (i / spikes) * Math.PI * 2;
                 const rad = r * (0.7 + Math.random() * 0.3);
                 const x = cx + Math.cos(angle) * rad;
                 const y = cy + Math.sin(angle) * rad;
                 if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
             }
             ctx.closePath();
             ctx.fill();
         } else {
             // Order: Perfect Sphere
             ctx.beginPath(); 
             ctx.arc(cx, cy, r, 0, Math.PI * 2); 
             ctx.fill();
             
             // Soft Cross Flare
             ctx.fillStyle = '#fff';
             ctx.globalAlpha = 0.5;
             ctx.beginPath();
             ctx.ellipse(cx, cy, r * 0.8, r * 0.1, 0, 0, Math.PI*2);
             ctx.fill();
             ctx.beginPath();
             ctx.ellipse(cx, cy, r * 0.1, r * 0.8, 0, 0, Math.PI*2);
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
        grad.addColorStop(0.6, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.3;
        
        for(let i=0; i<12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (FOG_SIZE * 0.3);
            const size = FOG_SIZE * (0.1 + Math.random() * 0.2);
            
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
        ctx.shadowBlur = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (isChaos) {
            ctx.beginPath();
            const points = 9;
            for(let i=0; i<=points; i++) {
                const angle = i * (Math.PI * 2 / points);
                const r = radius * (0.85 + Math.random() * 0.3); 
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 25, cy); 
            ctx.quadraticCurveTo(cx, cy - 15, cx + 25, cy);
            ctx.quadraticCurveTo(cx, cy + 15, cx - 25, cy);
            ctx.stroke();
            
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();

        } else {
            ctx.beginPath(); 
            ctx.arc(cx, cy, radius, 0, Math.PI * 2); 
            ctx.stroke();
            
            ctx.lineWidth = 1.5;
            if (isUlt) {
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
                
                drawPoly(3, radius, -Math.PI/2); 
                drawPoly(3, radius, Math.PI/2);  
                
                ctx.beginPath(); ctx.arc(cx, cy, radius * 0.5, 0, Math.PI*2); ctx.stroke();

            } else {
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
                ctx.strokeStyle = isChaos ? '#a8a29e' : '#e2e8f0'; 
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(75, cy); ctx.stroke();

                ctx.fillStyle = isChaos ? '#7f1d1d' : '#f0f9ff';
                ctx.beginPath();
                if (isChaos) {
                    ctx.moveTo(85, cy); 
                    ctx.lineTo(65, cy - 8); ctx.lineTo(70, cy); ctx.lineTo(65, cy + 8);
                } else {
                    ctx.moveTo(90, cy); ctx.lineTo(70, cy - 6); ctx.lineTo(70, cy + 6);
                }
                ctx.closePath();
                ctx.fill();
                
                ctx.strokeStyle = color;
                ctx.beginPath();
                if (isChaos) {
                    ctx.moveTo(20, cy); ctx.lineTo(5, cy - 10);
                    ctx.moveTo(20, cy); ctx.lineTo(5, cy + 10);
                } else {
                    ctx.moveTo(15, cy - 5); ctx.lineTo(5, cy); ctx.lineTo(15, cy + 5);
                }
                ctx.stroke();
                break;

            case 'FIREBALL':
            case 'BOMB':
                const coreGrad = ctx.createRadialGradient(cx+20, cy, 0, cx+20, cy, 15);
                coreGrad.addColorStop(0, '#fff');
                coreGrad.addColorStop(0.5, color);
                coreGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = coreGrad;
                
                ctx.beginPath(); ctx.arc(cx + 20, cy, 14, 0, Math.PI * 2); ctx.fill();
                
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                if (isChaos) {
                    ctx.moveTo(cx + 20, cy - 12);
                    ctx.lineTo(cx, cy - 20); ctx.lineTo(cx - 20, cy - 5);
                    ctx.lineTo(cx - 35, cy);
                    ctx.lineTo(cx - 20, cy + 8); ctx.lineTo(cx, cy + 22);
                    ctx.lineTo(cx + 20, cy + 12);
                } else {
                    ctx.ellipse(cx + 5, cy, 35, 12, 0, 0, Math.PI * 2);
                }
                ctx.fill();
                break;

            case 'SLASH':
                // New specialized slash shape for 2-tile attacks
                ctx.translate(cx, cy);
                // Draw a crescent moon shape
                ctx.beginPath();
                ctx.arc(0, 0, 30, -Math.PI/3, Math.PI/3, false);
                ctx.arc(-10, 0, 30, Math.PI/3, -Math.PI/3, true);
                ctx.closePath();
                ctx.fillStyle = '#fff';
                ctx.fill();
                
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.stroke();
                break;

            case 'BOLT':
            case 'BEAM':
            default:
                if (isChaos) {
                    ctx.fillStyle = '#1c1917'; 
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    
                    ctx.beginPath();
                    ctx.moveTo(cx + 35, cy);
                    ctx.lineTo(cx + 10, cy - 15);
                    ctx.lineTo(cx - 10, cy - 5);
                    ctx.lineTo(cx - 30, cy);
                    ctx.lineTo(cx - 10, cy + 5);
                    ctx.lineTo(cx + 10, cy + 15);
                    ctx.closePath();
                    ctx.fill(); ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.moveTo(cx + 35, cy); ctx.lineTo(cx + 45, cy - 12);
                    ctx.moveTo(cx + 35, cy); ctx.lineTo(cx + 45, cy + 12);
                    ctx.stroke();

                } else {
                    const boltGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 25); 
                    boltGrad.addColorStop(0, '#fff');
                    boltGrad.addColorStop(0.5, color);
                    boltGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = boltGrad;
                    ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fill();

                    ctx.fillStyle = '#fff';
                    ctx.shadowColor = '#fff';
                    ctx.beginPath();
                    ctx.moveTo(cx + 35, cy); ctx.lineTo(cx, cy - 12);
                    ctx.lineTo(cx - 15, cy); ctx.lineTo(cx, cy + 12);
                    ctx.closePath();
                    ctx.fill();
                    
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
        
        const rings = 5;
        for(let i = 0; i < rings; i++) {
            const r = (50 / rings) * (i + 1);
            const alpha = 1.0 - (i / rings);
            
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2 + Math.random() * 2;
            ctx.globalAlpha = alpha * 0.5;
            
            const segments = 24;
            for(let j=0; j<=segments; j++) {
                const a = (j/segments) * Math.PI * 2;
                const offset = pseudoNoise(j, i, 100) * 10;
                const radius = r + offset;
                const px = cx + Math.cos(a) * radius;
                const py = cy * 2 + Math.sin(a) * radius;
                if (j===0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        const grad = ctx.createRadialGradient(cx, cy * 2, 0, cx, cy * 2, 25);
        grad.addColorStop(0, isChaos ? '#000' : '#fff'); 
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(cx, cy * 2, 25, 0, Math.PI*2); ctx.fill();

        return canvas;
    },

    generateJaggedShockwave(): HTMLCanvasElement {
        const size = 128;
        const { canvas, ctx } = createCanvas(size, size);
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'miter';
        
        // Draw jagged expanding ring
        ctx.beginPath();
        const segments = 16;
        const r = 40;
        for(let i=0; i<=segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            const spike = (i % 2 === 0) ? 10 : -10;
            const x = cx + Math.cos(a) * (r + spike);
            const y = cy + Math.sin(a) * (r + spike);
            if (i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        return canvas;
    }
};
