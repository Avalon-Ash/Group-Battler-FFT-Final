
import { createCanvas } from "./CanvasUtils";
import { isChaosStyle } from "../systems/vfx/utils";

// Dimensions
const VFX_SIZE = 64;
const PROJ_WIDTH = 96;
const PROJ_HEIGHT = 64;
const BLAST_WIDTH = 128;
const BLAST_HEIGHT = 64;
const FOG_SIZE = 256;

export const VFXFactory = {

    generateGlowOrb(color: string, size: number = VFX_SIZE): HTMLCanvasElement {
         const { canvas, ctx } = createCanvas(size, size);
         const cx = size / 2;
         const cy = size / 2;
         const r = size / 2;
         const isChaos = isChaosStyle(color);
         
         // Clear previous styles
         ctx.globalCompositeOperation = 'source-over';

         if (isChaos) {
             // CHAOS: Unstable Plasma Core
             // Darker center, jagged edges
             const grad = ctx.createRadialGradient(cx, cy, r*0.1, cx, cy, r);
             grad.addColorStop(0, '#ffffff');
             grad.addColorStop(0.3, color);
             grad.addColorStop(0.6, 'rgba(0,0,0,0.8)'); // Dark halo
             grad.addColorStop(1, 'transparent');
             
             ctx.fillStyle = grad;
             
             // Jagged star shape
             ctx.beginPath();
             const spikes = 12;
             for(let i=0; i<spikes*2; i++) {
                 const angle = (i / (spikes*2)) * Math.PI * 2;
                 const rad = (i % 2 === 0) ? r : r * 0.4;
                 const x = cx + Math.cos(angle) * rad;
                 const y = cy + Math.sin(angle) * rad;
                 if(i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
             }
             ctx.closePath();
             ctx.fill();

         } else {
             // ORDER: Perfect Lens Flare / Star
             // Soft gaussian feel with distinct cross spike
             const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
             grad.addColorStop(0, '#ffffff');        
             grad.addColorStop(0.15, color);          
             grad.addColorStop(0.5, color);          
             grad.addColorStop(1, 'rgba(0,0,0,0)');  
             
             ctx.fillStyle = grad;
             ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
             
             // Cross flare
             ctx.fillStyle = '#fff';
             ctx.globalAlpha = 0.8;
             ctx.beginPath();
             ctx.ellipse(cx, cy, r * 0.8, r * 0.1, 0, 0, Math.PI*2);
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
        grad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.15; // Very subtle
        
        // Organic irregular blobs
        for(let i=0; i<12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * (FOG_SIZE * 0.3);
            const r = FOG_SIZE * (0.15 + Math.random() * 0.2);
            
            ctx.beginPath(); 
            ctx.ellipse(
                cx + Math.cos(angle)*dist, 
                cy + Math.sin(angle)*dist, 
                r, r * 0.6, 
                Math.random() * Math.PI, 
                0, Math.PI*2
            ); 
            ctx.fill();
        }
        
        return canvas;
    },

    generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(PROJ_WIDTH, PROJ_HEIGHT);
        const cx = PROJ_WIDTH / 2;
        const cy = PROJ_HEIGHT / 2;

        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (visual) {
            case 'ARROW':
                // Energy Arrow
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(80, cy); ctx.stroke();
                
                // Head
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(90, cy); ctx.lineTo(70, cy - 8); ctx.lineTo(75, cy); ctx.lineTo(70, cy + 8);
                ctx.fill();
                // Fletching
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(20, cy); ctx.lineTo(10, cy - 6);
                ctx.moveTo(20, cy); ctx.lineTo(10, cy + 6);
                ctx.stroke();
                break;

            case 'FIREBALL':
            case 'BOMB':
                // Magma Core
                const coreGrad = ctx.createRadialGradient(cx+20, cy, 0, cx+20, cy, 20);
                coreGrad.addColorStop(0, '#fff');
                coreGrad.addColorStop(0.2, color);
                coreGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = coreGrad;
                ctx.beginPath(); ctx.arc(cx + 20, cy, 18, 0, Math.PI * 2); ctx.fill();
                break;

            case 'SLASH':
                // Crescent Wave
                ctx.translate(cx, cy);
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, 30, -Math.PI/2, Math.PI/2, false);
                ctx.bezierCurveTo(10, 20, 10, -20, 0, -30);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;

            case 'BOLT':
            case 'BEAM':
            default:
                // Magic Missile (Tapered slug)
                const grad = ctx.createLinearGradient(0, 0, PROJ_WIDTH, 0);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.5, color);
                grad.addColorStop(1, '#fff');
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(cx, cy, 30, 8, 0, 0, Math.PI*2);
                ctx.fill();
                
                // Core
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(cx + 15, cy, 10, 3, 0, 0, Math.PI*2);
                ctx.fill();
                break;
        }

        return canvas;
    },

    generateBlastZone(color: string): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(BLAST_WIDTH, BLAST_HEIGHT); 
        const cx = BLAST_WIDTH / 2;
        const cy = BLAST_HEIGHT / 2;
        const isChaos = isChaosStyle(color);
        
        ctx.scale(1, 0.5); // Perspective squash
        
        if (isChaos) {
            // Chaos: Cracks and Scorch
            ctx.fillStyle = '#1a0505'; // Dark scorch
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(cx, cy*2, 40, 0, Math.PI*2);
            ctx.fill();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(cx, cy*2); ctx.lineTo(cx+30, cy*2-20);
            ctx.moveTo(cx, cy*2); ctx.lineTo(cx-20, cy*2+30);
            ctx.moveTo(cx, cy*2); ctx.lineTo(cx+10, cy*2+40);
            ctx.stroke();

        } else {
            // Order: Clean Energy Residual
            const grad = ctx.createRadialGradient(cx, cy * 2, 10, cx, cy * 2, 50);
            grad.addColorStop(0, color); 
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.arc(cx, cy * 2, 50, 0, Math.PI*2); ctx.fill();
            
            // Ring
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.arc(cx, cy * 2, 40, 0, Math.PI*2); ctx.stroke();
        }

        return canvas;
    }
};
