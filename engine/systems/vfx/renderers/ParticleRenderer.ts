
import { Particle } from "../state";
import { isChaosStyle, normalizeHex } from "../utils";

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.save();
        
        // Shared translation
        ctx.translate(p.x, p.y);

        if (p.type === 'BEAM') {
            if (p.targetX !== undefined && p.targetY !== undefined) {
                // Beams are world-space endpoints, undo translate for now or calculate relative
                // Easier to undo translate
                ctx.translate(-p.x, -p.y);
                
                ctx.globalCompositeOperation = 'lighter';
                const sx = p.x; const sy = p.y;
                const tx = p.targetX; const ty = p.targetY;
                
                if (isChaos) {
                    // Siphon / Lightning
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    // Jagged line
                    const segs = 10;
                    const dx = tx - sx; const dy = ty - sy;
                    for(let i=1; i<segs; i++) {
                        const ratio = i/segs;
                        const jit = (Math.random()-0.5) * 20;
                        ctx.lineTo(sx + dx * ratio + jit, sy + dy * ratio + jit);
                    }
                    ctx.lineTo(tx, ty);
                    ctx.stroke();
                    // Dark Core
                    ctx.lineWidth = 1; ctx.strokeStyle = '#000'; ctx.stroke();
                } else {
                    // Holy Beam
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = (1 - Math.abs(progress - 0.5)*2) * 8;
                    ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
                    // White Hot Center
                    ctx.lineWidth /= 2; ctx.strokeStyle = '#fff'; ctx.stroke();
                }
            }
        } else if (p.type === 'RING') {
            ctx.scale(1, 0.55); 
            const r = progress * 40;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1 - progress;
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath(); 
            if(isChaos) {
                // Jagged Ring
                for(let i=0; i<=16; i++) {
                    const a = (i/16)*Math.PI*2;
                    const rr = r * (1 + (Math.random()-0.5)*0.2);
                    if(i===0) ctx.moveTo(Math.cos(a)*rr, Math.sin(a)*rr);
                    else ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr);
                }
            } else {
                ctx.arc(0, 0, r, 0, Math.PI * 2); 
            }
            ctx.stroke();
            ctx.closePath();

        } else if (p.type === 'SPARK') {
            // High Tech Upgrade: Velocity Stretch (Motion Blur)
            const speedSq = p.vx * p.vx + p.vy * p.vy;
            if (speedSq > 100) {
                const angle = Math.atan2(p.vy, p.vx);
                ctx.rotate(angle);
                // Stretch based on speed
                const stretch = Math.min(4.0, 1.0 + Math.sqrt(speedSq) * 0.005);
                ctx.scale(stretch, 1.0 / Math.max(1.0, stretch * 0.5));
            }

            const r = p.size;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            grad.addColorStop(0, '#fff'); 
            grad.addColorStop(0.4, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 1 - Math.pow(progress, 3); 
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();

        } else if (p.type === 'DEBRIS' || p.type === 'SHARD') {
            // Physics rotation applied in VFXSystem, render here
            ctx.fillStyle = p.color;
            ctx.rotate(p.rotation);
            ctx.beginPath();
            const s = p.size;
            if (p.type === 'SHARD') {
                ctx.moveTo(-s, -s/2); ctx.lineTo(0, -s); ctx.lineTo(s, -s/2); ctx.lineTo(0, s);
            } else {
                ctx.rect(-s/2, -s/2, s, s);
            }
            ctx.fill();
            // Rim Light
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (p.type === 'PILLAR') {
            // Undo translate to use relative coord logic inside func (or refactor, but keeping consistent)
            ctx.translate(0, -20); 
            this.drawPillar(ctx, p, progress, isChaos);
        } else if (p.type === 'SHOCKWAVE') {
            ctx.translate(0, -20);
            this.drawShockwave(ctx, p, progress, isChaos);
        } else if (p.type === 'DOMAIN') {
            ctx.translate(0, -20);
            this.drawDomain(ctx, p, progress, isChaos);
        }

        ctx.restore();
    },

    drawPillar(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.globalCompositeOperation = 'lighter';
        
        const lifeRatio = p.life / p.maxLife;
        const alpha = Math.sin(lifeRatio * Math.PI) * 0.8; 
        const height = 1200; 
        const baseWidth = 60 * (1 + Math.sin(progress * 20) * 0.1);

        ctx.save();
        ctx.scale(1, 0.55); 
        
        // Ground Blast Ring
        const ringSize = baseWidth * 2;
        const ringGrad = ctx.createRadialGradient(0, 0, ringSize * 0.2, 0, 0, ringSize);
        ringGrad.addColorStop(0, isChaos ? '#000' : '#fff');
        ringGrad.addColorStop(0.4, p.color);
        ringGrad.addColorStop(1, 'transparent');
        
        ctx.fillStyle = ringGrad;
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(0, 0, ringSize, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // BEAM COLUMN
        if (isChaos) {
            // CHAOS PILLAR: Dark Core, Unstable
            const chaosGrad = ctx.createLinearGradient(0, 0, 0, -height);
            chaosGrad.addColorStop(0, p.color);
            chaosGrad.addColorStop(0.5, 'transparent');
            
            ctx.fillStyle = chaosGrad;
            ctx.globalAlpha = alpha * 0.8;
            
            ctx.beginPath();
            const segs = 10;
            const hw = baseWidth / 2;
            ctx.moveTo(-hw, 0);
            for(let i=1; i<=segs; i++) {
                const y = -height * (i/segs);
                const xOff = (Math.random()-0.5) * 20;
                ctx.lineTo(-hw + xOff, y);
            }
            for(let i=segs; i>=0; i--) {
                const y = -height * (i/segs);
                const xOff = (Math.random()-0.5) * 20;
                ctx.lineTo(hw + xOff, y);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#000';
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillRect(-baseWidth * 0.2, -height, baseWidth * 0.4, height);

        } else {
            // ORDER PILLAR: Bright Core
            const coreGrad = ctx.createLinearGradient(0, 0, 0, -height);
            coreGrad.addColorStop(0, '#ffffff');
            coreGrad.addColorStop(0.3, '#ffffff');
            coreGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = coreGrad;
            ctx.globalAlpha = alpha;
            ctx.fillRect(-baseWidth * 0.2, -height, baseWidth * 0.4, height);

            const glowGrad = ctx.createLinearGradient(0, 0, 0, -height);
            glowGrad.addColorStop(0, p.color);
            glowGrad.addColorStop(0.7, 'transparent');
            
            ctx.fillStyle = glowGrad;
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillRect(-baseWidth, -height, baseWidth * 2, height);
        }
    },

    drawShockwave(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.scale(1, 0.55); 
        ctx.globalCompositeOperation = 'lighter';
        
        const r = progress * 300; 
        const width = 30 * (1 - progress);
        
        ctx.strokeStyle = p.color;
        ctx.lineWidth = width;
        ctx.globalAlpha = (1 - progress);
        
        ctx.beginPath(); 
        if (isChaos) {
            for(let i=0; i<=32; i++) {
                const a = (i/32)*Math.PI*2;
                const d = r + (Math.random()-0.5) * 30;
                if(i===0) ctx.moveTo(Math.cos(a)*d, Math.sin(a)*d);
                else ctx.lineTo(Math.cos(a)*d, Math.sin(a)*d);
            }
        } else {
            ctx.arc(0, 0, r, 0, Math.PI * 2); 
        }
        ctx.closePath();
        ctx.stroke();
    },

    drawDomain(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
         ctx.scale(1, 0.55); 
         const time = performance.now() / 1000;
         const baseRadius = 250;
         const pulse = 1 + Math.sin(time * 5) * 0.02;
         const r = baseRadius * pulse;

         ctx.globalCompositeOperation = 'lighter'; 

         // Base Field
         const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
         grad.addColorStop(0, 'transparent'); 
         const safeColor = normalizeHex(p.color);
         grad.addColorStop(0.7, safeColor + '4D'); 
         grad.addColorStop(0.95, p.color); 
         grad.addColorStop(1, 'transparent');

         ctx.fillStyle = grad;
         ctx.globalAlpha = 0.5 * (1 - progress); 
         ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

         // Rune Rings
         ctx.globalAlpha = 0.8 * (1 - progress);
         ctx.strokeStyle = p.color;
         
         ctx.save();
         ctx.rotate(time * 0.5);
         ctx.lineWidth = 3;
         if (isChaos) {
             ctx.setLineDash([10, 25]); 
             ctx.beginPath();
             for(let i=0; i<=12; i++) {
                 const a = (i/12)*Math.PI*2;
                 const d = r * 0.95 + (i%2===0 ? 15 : -15);
                 if(i===0) ctx.moveTo(Math.cos(a)*d, Math.sin(a)*d);
                 else ctx.lineTo(Math.cos(a)*d, Math.sin(a)*d);
             }
             ctx.closePath();
             ctx.stroke();
         } else {
             ctx.setLineDash([50, 20]); 
             ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.stroke();
             ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); 
             ctx.setLineDash([20, 10]);
             ctx.stroke();
         }
         ctx.restore();

         // Vertical Energy Walls
         ctx.globalAlpha = 0.3 * (1 - progress);
         const spikeCount = isChaos ? 8 : 12;
         for(let i=0; i<spikeCount; i++) {
             const angle = (i / spikeCount) * Math.PI * 2 + (isChaos ? -time : time);
             const sx = Math.cos(angle) * r;
             const sy = Math.sin(angle) * r;
             
             ctx.beginPath();
             ctx.moveTo(sx, sy);
             const topX = sx + (isChaos ? (Math.random()-0.5)*40 : 0);
             ctx.lineTo(topX, sy - 100); 
             ctx.lineWidth = 4;
             
             const beamGrad = ctx.createLinearGradient(sx, sy, topX, sy - 100);
             beamGrad.addColorStop(0, p.color);
             beamGrad.addColorStop(1, 'transparent');
             ctx.strokeStyle = beamGrad;
             ctx.stroke();
         }
    }
};
