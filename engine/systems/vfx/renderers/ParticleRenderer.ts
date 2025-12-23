
import { Particle } from "../state";
import { isChaosStyle, normalizeHex } from "../utils";

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.save();
        
        // Context is already translated to Visual Position (Ground Y - Z)
        ctx.translate(p.x, p.y);

        // --- PHYSICAL SHADOW PASS (Fixes "Floating" feeling) ---
        // We are currently at [x, GroundY - Z].
        // To draw shadow at GroundY, we must translate down by Z.
        if (['DEBRIS', 'SHARD', 'SPRITE'].includes(p.type) && p.z > 5) {
            ctx.save();
            ctx.translate(0, p.z); // Move "down" to ground level
            ctx.scale(1, 0.5); // Isometric shadow squash
            
            // Dynamic shadow opacity based on height
            const shadowAlpha = Math.max(0, 0.4 - (p.z / 400));
            if (shadowAlpha > 0) {
                ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
                const shadowSize = p.size * 0.8;
                ctx.beginPath();
                ctx.arc(0, 0, shadowSize, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        if (p.type === 'SPRITE') {
            if (p.image) {
                const alpha = Math.min(1, (1 - progress) * 5); 
                ctx.globalAlpha = alpha;
                
                // Perspective Scale: Things closer to camera (higher Z) look slightly bigger
                const perspective = 1.0 + (p.z * 0.002);
                
                ctx.rotate(p.rotation);
                const scale = (p.size / 64) * perspective; 
                ctx.scale(scale, scale);
                ctx.drawImage(p.image, -p.image.width/2, -p.image.height/2);
            }

        } else if (p.type === 'CHIP') {
            ctx.rotate(p.rotation); 
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 1 - Math.pow(progress, 4);
            
            // Motion Stretch
            const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
            const stretch = Math.min(2.0, 1 + speed / 1000);
            ctx.scale(stretch, 1/stretch);

            const s = p.size;
            ctx.beginPath();
            ctx.moveTo(-s, -s/2); ctx.lineTo(0, -s); ctx.lineTo(s, -s/2); ctx.lineTo(0, s);
            ctx.fill();

        } else if (p.type === 'SHARD') {
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            
            // Spin blur effect
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.vRotation > 5 ? 10 : 0;

            const s = p.size;
            ctx.beginPath();
            ctx.moveTo(-s, -s/2); ctx.lineTo(0, -s); ctx.lineTo(s, -s/2); ctx.lineTo(0, s);
            ctx.fill();
            
            // Highlight edge
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
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
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

        } else if (p.type === 'SPARK') {
            const r = p.size;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 1 - Math.pow(progress, 3); 
            ctx.globalCompositeOperation = 'lighter'; 
            
            // Motion Stretch for Sparks
            const vel = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
            if (vel > 50) {
                const angle = Math.atan2(p.vy, p.vx);
                ctx.rotate(angle);
                ctx.scale(1 + vel/500, 0.5);
            }
            
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();

        } else if (p.type === 'DEBRIS') {
            ctx.fillStyle = p.color;
            ctx.rotate(p.rotation);
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            
        } else if (p.type === 'PILLAR') {
            // Anchor correction for pillar to grow UP from ground
            // p.y is ground, p.z is 0 usually for pillar anchors
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

    // 🏛️ BLUE: DIVINE PILLAR (High-End Technical Art)
    // Optimized: Replaced solid rects with multi-layered blending for an ethereal look.
    drawDivinePillar(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
        const lifeRatio = p.life / p.maxLife;
        
        // Easing: Fast In, Slow Out
        let alpha = 0;
        if (lifeRatio > 0.9) alpha = (1 - lifeRatio) * 10; // 0.1s fade in
        else alpha = Math.pow(lifeRatio, 0.5); // Slow decay
        
        const maxHeight = 1200;
        // Growth animation: Shoots up instantly, then holds
        const currentHeight = maxHeight * (progress < 0.1 ? progress * 10 : 1.0);
        const width = p.size;

        ctx.save();
        
        // Layer 1: Ground Seal (The Impact Point)
        ctx.save();
        ctx.scale(1, 0.55);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha;
        
        // Inner hot ring
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(0, 0, width * 0.8, 0, Math.PI*2); ctx.stroke();
        
        // Outer shockwave ring
        const wave = (progress * 2) % 1;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * (1 - wave);
        ctx.beginPath(); ctx.arc(0, 0, width * (0.8 + wave * 0.5), 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // Layer 2: The Beam (Vertical Gradient)
        ctx.globalCompositeOperation = 'screen'; // Key for the "Light" look
        
        // A. The Core (White Hot)
        const coreW = width * 0.3;
        const coreGrad = ctx.createLinearGradient(0, 0, 0, -currentHeight);
        coreGrad.addColorStop(0, 'rgba(255,255,255,0)');
        coreGrad.addColorStop(0.1, 'rgba(255,255,255,0.9)');
        coreGrad.addColorStop(0.8, 'rgba(255,255,255,0.0)');
        
        ctx.fillStyle = coreGrad;
        ctx.globalAlpha = alpha;
        ctx.fillRect(-coreW/2, -currentHeight, coreW, currentHeight);

        // B. The Glow (Colored Edge)
        const glowW = width;
        const glowGrad = ctx.createLinearGradient(-glowW, 0, glowW, 0); // Horizontal fade
        glowGrad.addColorStop(0, 'rgba(0,0,0,0)');
        glowGrad.addColorStop(0.2, p.color);
        glowGrad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        glowGrad.addColorStop(0.8, p.color);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.save();
        // Mask the vertical fade
        const vMask = ctx.createLinearGradient(0, 0, 0, -currentHeight);
        vMask.addColorStop(0, 'rgba(0,0,0,0)');
        vMask.addColorStop(0.1, 'rgba(0,0,0,1)'); // Black = visible in mask logic? No, canvas gradient opacity
        // Actually for direct fill, we combine alpha.
        // We draw the horizontal gradient rect, but modulate alpha vertically? 
        // Simpler: Just draw rect with horizontal grad, but set global alpha.
        
        ctx.fillStyle = glowGrad;
        ctx.globalAlpha = alpha * 0.6;
        // Add jitter to width for "energy instability"
        const jitter = Math.random() * 10;
        ctx.fillRect(-(glowW + jitter)/2, -currentHeight, glowW + jitter, currentHeight);
        ctx.restore();

        // Layer 3: Interference Lines (Rising Energy)
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = '#fff';
        const lines = 8;
        for(let i=0; i<lines; i++) {
            // Lines move UP
            const yPos = -((Date.now()/500 + i/lines) % 1) * currentHeight;
            // Parabolic fade (visible in middle, faded at ends)
            const hRatio = Math.abs(yPos) / currentHeight;
            const lineAlpha = 1 - Math.pow(2 * hRatio - 1, 2); 
            
            if (lineAlpha > 0.1) {
                ctx.globalAlpha = alpha * lineAlpha * 0.8;
                const lineW = width * (0.5 + Math.random()*0.5);
                ctx.fillRect(-lineW/2, yPos, lineW, 2 + Math.random() * 4);
            }
        }

        ctx.restore();
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
