
import { Particle } from "../state";
import { isChaosStyle, normalizeHex } from "../utils";

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.save();
        
        // Shared translation
        ctx.translate(p.x, p.y);

        if (p.type === 'SPRITE') {
            if (p.image) {
                const alpha = Math.min(1, (1 - progress) * 5); 
                ctx.globalAlpha = alpha;
                if (p.z < 20) {
                    ctx.save();
                    ctx.translate(0, p.z);
                    ctx.scale(1, 0.5);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.beginPath(); ctx.arc(0, 0, p.size/3, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                }
                ctx.rotate(p.rotation);
                const scale = p.size / 64; 
                ctx.scale(scale, scale);
                ctx.drawImage(p.image, -p.image.width/2, -p.image.height/2);
            }

        } else if (p.type === 'CHIP') {
            ctx.rotate(p.rotation); 
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 1 - Math.pow(progress, 4);
            const s = p.size;
            ctx.beginPath();
            ctx.moveTo(-s, -s/2); ctx.lineTo(0, -s); ctx.lineTo(s, -s/2); ctx.lineTo(0, s);
            ctx.fill();

        } else if (p.type === 'SHARD') {
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            const s = p.size;
            ctx.moveTo(-s, -s/2); ctx.lineTo(0, -s); ctx.lineTo(s, -s/2); ctx.lineTo(0, s);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

        } else if (p.type === 'SMOKE') {
            const r = p.size * (0.5 + progress * 2); 
            // Softer Alpha
            ctx.globalAlpha = (1 - progress) * 0.3;
            ctx.fillStyle = p.color; 
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();

        } else if (p.type === 'BLAST') {
            ctx.scale(1, 0.55); 
            const r = p.size * (progress * 2); 
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = p.color;
            ctx.lineWidth = (1 - progress) * 5; 
            ctx.globalAlpha = (1 - progress) * 0.8;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

        } else if (p.type === 'BEAM') {
            if (p.targetX !== undefined && p.targetY !== undefined) {
                ctx.translate(-p.x, -p.y); 
                ctx.globalCompositeOperation = 'lighter';
                const sx = p.x; const sy = p.y;
                const tx = p.targetX; const ty = p.targetY;
                
                if (isChaos) {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    const segs = 10;
                    const dx = tx - sx; const dy = ty - sy;
                    for(let i=1; i<segs; i++) {
                        const ratio = i/segs;
                        const jit = (Math.random()-0.5) * 20;
                        ctx.lineTo(sx + dx * ratio + jit, sy + dy * ratio + jit);
                    }
                    ctx.lineTo(tx, ty);
                    ctx.stroke();
                    ctx.lineWidth = 1; ctx.strokeStyle = '#000'; ctx.stroke();
                } else {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = (1 - Math.abs(progress - 0.5)*2) * 8;
                    ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
                    ctx.lineWidth /= 2; ctx.strokeStyle = '#fff'; ctx.stroke();
                }
            }
        } else if (p.type === 'RING') {
            ctx.scale(1, 0.55); 
            const r = progress * 40;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1 - progress;
            // Removed 'lighter' to reduce exposure, standard alpha blend
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

        } else if (p.type === 'SPARK') {
            const r = p.size;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 1 - Math.pow(progress, 3); 
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();

        } else if (p.type === 'DEBRIS') {
            ctx.fillStyle = p.color;
            ctx.rotate(p.rotation);
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            
        } else if (p.type === 'PILLAR') {
            ctx.translate(0, -20); 
            this.drawDivinePillar(ctx, p, progress);
        } else if (p.type === 'SHOCKWAVE') {
            ctx.translate(0, -20);
            this.drawShockwave(ctx, p, progress, isChaos);
        } else if (p.type === 'DOMAIN') {
            ctx.translate(0, -20);
            this.drawBloodRitual(ctx, p, progress);
        }

        ctx.restore();
    },

    // 🏛️ BLUE: DIVINE PILLAR (ORDER)
    // Enhanced: Faster flow, central core beam, energetic fade
    drawDivinePillar(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
        const lifeRatio = p.life / p.maxLife;
        let alpha = 0;
        // Sharper fade in/out for impact
        if (lifeRatio > 0.8) alpha = (1 - lifeRatio) * 5; 
        else if (lifeRatio < 0.2) alpha = lifeRatio * 5; 
        else alpha = 1.0;

        const height = 1500; // Even taller
        const width = p.size;

        ctx.save();
        ctx.scale(1, 0.55); 

        // 1. Ground Energy Ring (Impact Zone)
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * alpha;
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath(); ctx.arc(0, 0, width, 0, Math.PI*2); ctx.stroke();
        
        // 2. Rising Energy Rings (Faster Speed)
        ctx.lineWidth = 2;
        const ringCount = 4;
        for(let i=0; i<ringCount; i++) {
            // Speed up the flow
            const ringH = ((progress * 8 + i) % ringCount) * 150;
            const ringAlpha = (1 - ringH/600) * alpha;
            ctx.globalAlpha = ringAlpha * 0.6;
            ctx.beginPath(); ctx.ellipse(0, -ringH * 2, width * (1 - ringH/1000), width * (1 - ringH/1000), 0, 0, Math.PI*2); ctx.stroke();
        }
        
        ctx.restore();

        // 3. The Pillar Core (Intense Beam)
        ctx.globalCompositeOperation = 'lighter';
        
        // A. Wide Soft Glow
        const softGrad = ctx.createLinearGradient(0, 0, 0, -height);
        softGrad.addColorStop(0, p.color);
        softGrad.addColorStop(0.5, 'transparent');
        ctx.fillStyle = softGrad;
        ctx.globalAlpha = alpha * 0.3; 
        ctx.fillRect(-width * 0.8, -height, width * 1.6, height);

        // B. Hard Inner Core (White Hot)
        const coreGrad = ctx.createLinearGradient(0, 0, 0, -height);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, p.color);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillRect(-width * 0.2, -height, width * 0.4, height);

        // C. Rising Particles (Sparkles inside)
        ctx.fillStyle = '#fff';
        const sparkCount = 10;
        for(let i=0; i<sparkCount; i++) {
            const sparkY = -((progress * 20 + i) % 10) * 100;
            const sparkX = (Math.sin(i * 132) * width * 0.3);
            const sAlpha = (1 - Math.abs(sparkY)/800) * alpha;
            ctx.globalAlpha = sAlpha;
            ctx.beginPath(); ctx.rect(sparkX, sparkY, 4, 20); ctx.fill();
        }
    },

    // 🩸 RED: BLOOD RITUAL (CHAOS)
    drawBloodRitual(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
         const lifeRatio = p.life / p.maxLife;
         const alpha = Math.sin(lifeRatio * Math.PI); 
         const r = p.size;

         ctx.save();
         ctx.scale(1, 0.55); 

         // 1. The Void (Ground Hole)
         ctx.globalCompositeOperation = 'source-over'; 
         const voidGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
         voidGrad.addColorStop(0, '#000'); // Black center
         voidGrad.addColorStop(0.7, '#220000');
         voidGrad.addColorStop(1, 'transparent');
         ctx.fillStyle = voidGrad;
         ctx.globalAlpha = alpha * 0.9;
         ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

         // 2. Cracks / Runes
         ctx.strokeStyle = p.color; // Red/Orange
         ctx.lineWidth = 3;
         ctx.globalAlpha = alpha;
         ctx.beginPath();
         // Jagged lines from center
         for(let i=0; i<6; i++) {
             const angle = i * (Math.PI/3) + progress;
             ctx.moveTo(0,0);
             ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
         }
         ctx.stroke();

         // 3. Rising Dark Miasma (Noise)
         ctx.globalCompositeOperation = 'lighter'; // Glowy smoke
         ctx.fillStyle = p.color;
         const bubbles = 5;
         for(let i=0; i<bubbles; i++) {
             const bAngle = i * (Math.PI * 2 / bubbles) + progress * 2;
             const dist = r * 0.6;
             const bx = Math.cos(bAngle) * dist;
             const by = Math.sin(bAngle) * dist;
             const bSize = r * 0.3 * Math.sin(progress * 10 + i);
             
             ctx.globalAlpha = alpha * 0.3;
             ctx.beginPath(); ctx.arc(bx, by, Math.abs(bSize), 0, Math.PI*2); ctx.fill();
         }

         ctx.restore();
         
         // 4. Vertical "Heat" Haze (Not a pillar)
         ctx.globalCompositeOperation = 'lighter';
         const heatGrad = ctx.createLinearGradient(0, 0, 0, -300);
         heatGrad.addColorStop(0, p.color);
         heatGrad.addColorStop(1, 'transparent');
         ctx.fillStyle = heatGrad;
         ctx.globalAlpha = alpha * 0.2;
         
         // Irregular shape
         ctx.beginPath();
         ctx.moveTo(-r/2, 0); 
         ctx.lineTo(-r/4, -300);
         ctx.lineTo(r/4, -300);
         ctx.lineTo(r/2, 0);
         ctx.fill();
    },

    drawShockwave(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.scale(1, 0.55); 
        // Chaos Shockwave = Jagged
        // Order Shockwave = Smooth Ring
        
        const r = progress * 300; 
        const width = 30 * (1 - progress);
        ctx.globalAlpha = (1 - progress);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = width;

        if (isChaos) {
            // Jagged
            ctx.globalCompositeOperation = 'source-over'; // Darker/Physical
            ctx.beginPath();
            const segs = 16;
            for(let i=0; i<=segs; i++) {
                const a = i * (Math.PI*2 / segs);
                const varR = r + (i%2===0 ? 20 : -20);
                const px = Math.cos(a)*varR;
                const py = Math.sin(a)*varR;
                if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else {
            // Smooth
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        }
    }
};
