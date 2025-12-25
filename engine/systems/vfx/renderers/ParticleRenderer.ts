
import { Particle } from "../state";
import { isChaosStyle } from "../utils";
import { AssetManager } from "../../../assets";

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.save();
        
        // Context is already translated to Visual Position (Ground Y - Z)
        ctx.translate(p.x, p.y);

        // --- PHYSICAL SHADOW PASS ---
        if (['DEBRIS', 'SHARD', 'SPRITE'].includes(p.type) && p.z > 5) {
            ctx.save();
            ctx.translate(0, p.z); // Move "down" to ground level
            ctx.scale(1, 0.5); // Isometric shadow squash
            const shadowAlpha = Math.max(0, 0.3 - (p.z / 400)); // Lighter shadow
            if (shadowAlpha > 0) {
                ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
                const shadowSize = p.size * 0.8;
                ctx.beginPath(); ctx.arc(0, 0, shadowSize, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        // --- RENDER LOGIC BY TYPE ---

        if (p.type === 'SPARK') {
            // ✨ KINETIC SPARKS (Light Streaks)
            // No gravity feel. Just pure energy moving fast.
            const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy + p.vz*p.vz);
            // Stretch based on speed, but clamp it
            const stretch = Math.min(4.0, 1.0 + speed / 150); 
            const angle = Math.atan2(p.vy, p.vx); // Align with motion

            ctx.rotate(angle);
            ctx.scale(stretch, 0.6); // Stretch length, squash width
            
            ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow
            ctx.globalAlpha = Math.pow(1 - progress, 2); // Fade out non-linearly

            // Streamlined Shape
            const grad = ctx.createLinearGradient(-p.size, 0, p.size, 0);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.2, p.color);
            grad.addColorStop(0.8, '#fff'); // Bright head
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI*2);
            ctx.fill();

        } else if (p.type === 'SMOKE') {
            // ☁️ VOLUMETRIC SMOKE (Cluster of puffs)
            const scale = 0.5 + progress * 1.5; // Expands
            const alpha = (1 - progress) * 0.4;
            
            ctx.scale(scale, scale);
            ctx.rotate(p.rotation + progress); // Slowly rotates
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            
            // Draw cluster
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI*2);
            ctx.arc(p.size*0.5, p.size*0.5, p.size*0.6, 0, Math.PI*2);
            ctx.arc(-p.size*0.4, -p.size*0.3, p.size*0.7, 0, Math.PI*2);
            ctx.fill();

        } else if (p.type === 'RING') {
            // 🌊 ENERGY RIPPLE (Sonic Boom)
            ctx.scale(1, 0.55); // Isometric
            const r = progress * p.size * 2; // Expands outward
            
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = p.color;
            
            // Main Ring
            ctx.lineWidth = (1 - progress) * 4;
            ctx.globalAlpha = 1 - progress;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
            
            // Echo Ring (Inner)
            if (progress > 0.2) {
                ctx.lineWidth = (1 - progress) * 2;
                ctx.globalAlpha = (1 - progress) * 0.5;
                ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.stroke();
            }

        } else if (p.type === 'BLAST') {
            // 💥 SPIKED EXPLOSION
            ctx.scale(1, 0.55); 
            const r = p.size * (progress); 
            
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = p.color;
            ctx.lineWidth = (1 - progress) * 6; 
            ctx.globalAlpha = (1 - progress);
            
            // Spiky Circle
            ctx.beginPath(); 
            const spikes = 12;
            for(let i=0; i<=spikes; i++) {
                const angle = (i/spikes) * Math.PI*2;
                // Add noise to radius
                const rad = r * (1.0 + (i%2===0 ? 0.2 : 0)); 
                const px = Math.cos(angle) * rad;
                const py = Math.sin(angle) * rad;
                if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
            }
            ctx.closePath();
            ctx.stroke();

        } else if (p.type === 'DEBRIS' || p.type === 'SHARD' || p.type === 'CHIP') {
            // 💎 MATERIAL 2.0: ENHANCED DEBRIS
            // Uses gradients to simulate lighting/metallic surface
            
            ctx.rotate(p.rotation);
            
            // Base Gradient (Simulate light from top-left)
            const grad = ctx.createLinearGradient(-p.size, -p.size, p.size, p.size);
            grad.addColorStop(0, '#ffffff'); // Specular highlight
            grad.addColorStop(0.3, p.color);
            grad.addColorStop(1, '#000000'); // Shadow side
            
            ctx.fillStyle = grad;
            
            // Rim Light (Edge definition)
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            
            if (p.type === 'CHIP') {
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            } else {
                // Irregular jagged shard
                ctx.beginPath();
                ctx.moveTo(-p.size, -p.size/2); 
                ctx.lineTo(p.size * 0.8, -p.size * 0.2); 
                ctx.lineTo(0, p.size); 
                ctx.lineTo(-p.size * 0.5, p.size * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

        } else if (p.type === 'GLOW') {
            // ✨ STATIC GLOW ORB (Pre-rendered)
            const img = AssetManager.getGlowSprite(p.color);
            const fade = Math.sin(progress * Math.PI); // Pulse: Fade In -> Fade Out
            const scale = (p.size / 64) * (0.8 + fade * 0.4); 
            
            ctx.globalAlpha = fade * 0.9;
            ctx.globalCompositeOperation = 'screen'; 
            ctx.scale(scale, scale);
            ctx.drawImage(img, -32, -32);

        } else if (p.type === 'SPRITE') {
            if (p.image) {
                // Sprite fades out and shrinks slightly
                const alpha = Math.max(0, 1 - Math.pow(progress, 3)); 
                ctx.globalAlpha = alpha;
                
                // Spin faster as it dies (angular momentum conservation fake)
                ctx.rotate(p.rotation + progress * 5);
                
                const perspective = 1.0 + (p.z * 0.002);
                const scale = (p.size / 64) * perspective * (1 - progress * 0.5); 
                ctx.scale(scale, scale);
                
                // Add a "Ghost" trail effect by drawing lower opacity copies
                ctx.drawImage(p.image, -p.image.width/2, -p.image.height/2);
            }

        } else if (p.type === 'BEAM') {
            if (p.targetX !== undefined && p.targetY !== undefined) {
                this.drawHelixBeam(ctx, p, progress);
            }
        } else if (p.type === 'PILLAR') {
            this.drawDivinePillar(ctx, p, progress);
        } else if (p.type === 'SHOCKWAVE') {
            ctx.translate(0, -20);
            this.drawShockwave(ctx, p, progress, isChaos);
        } else if (p.type === 'DOMAIN') {
            ctx.translate(0, -20);
            this.drawBloodRitual(ctx, p, progress);
        } else if (p.type === 'GRID_FIELD') {
            this.drawGridField(ctx, p, progress, isChaos);
        }

        ctx.restore();
    },

    // ⚡ HELIX BEAM (Optimized)
    drawHelixBeam(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
        ctx.translate(-p.x, -p.y); 
        ctx.globalCompositeOperation = 'lighter';
        
        const sx = p.x; const sy = p.y;
        const tx = p.targetX!; const ty = p.targetY!;
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);
        
        const beamWidth = 6 * (1 - Math.pow(progress, 3)); 
        if (beamWidth < 0.2) return;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);

        // Core
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(2, beamWidth * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dist, 0); ctx.stroke();

        // Glow
        ctx.strokeStyle = p.color;
        ctx.lineWidth = beamWidth * 2.5; 
        ctx.globalAlpha = 0.5 * (1 - progress);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dist, 0); ctx.stroke();

        // Helix
        const freq = 0.12; 
        const amp = 8 * (1 - progress); 
        const phase = Date.now() * 0.025; 
        
        ctx.lineWidth = 2; 
        ctx.globalAlpha = 0.9 * (1 - progress);
        ctx.strokeStyle = p.color; 
        
        ctx.beginPath();
        for(let i=0; i<=dist; i+=5) {
            const yOffset = Math.sin(i * freq - phase) * amp;
            if(i===0) ctx.moveTo(i, yOffset); else ctx.lineTo(i, yOffset);
        }
        ctx.stroke();
        
        ctx.beginPath();
        for(let i=0; i<=dist; i+=5) {
            const yOffset = Math.sin(i * freq - phase + Math.PI) * amp;
            if(i===0) ctx.moveTo(i, yOffset); else ctx.lineTo(i, yOffset);
        }
        ctx.stroke();

        // Flares
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1 - progress;
        ctx.beginPath(); ctx.arc(0, 0, beamWidth * 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(dist, 0, beamWidth * 2.5, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    },

    // 🌫️ VOLUMETRIC GRID FOG
    drawGridField(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        const size = 36; 
        const drawHex = () => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 6 + Math.PI / 4) + i * Math.PI / 3;
                const x = size * Math.cos(angle);
                const y = size * Math.sin(angle) * 0.58; 
                if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath();
        };

        const fade = Math.sin(progress * Math.PI); 
        ctx.save();
        
        if (isChaos) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.save();
            const jitter = (Math.random() - 0.5) * 2;
            ctx.translate(jitter, jitter);
            drawHex();
            ctx.clip();
            ctx.fillStyle = `rgba(20, 5, 5, ${fade * 0.8})`;
            ctx.fill();
            ctx.strokeStyle = p.color; 
            ctx.lineWidth = 2;
            ctx.globalAlpha = fade;
            ctx.beginPath();
            ctx.moveTo(-20, -10); ctx.lineTo(-10, 5); ctx.lineTo(5, -5); ctx.lineTo(20, 10);
            ctx.moveTo(0, 0); ctx.lineTo(-5, 15);
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.globalAlpha = fade * 0.4;
            drawHex();
            ctx.stroke();
            ctx.lineWidth = 2;
            ctx.globalAlpha = fade * 0.8;
            drawHex();
            ctx.stroke();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = fade * 0.2;
            ctx.fill();
        }
        ctx.restore();
    },

    // 🏛️ DIVINE PILLAR 3.0
    drawDivinePillar(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
        const lifeRatio = p.life / p.maxLife;
        let alpha = lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : (lifeRatio < 0.2 ? lifeRatio * 5 : 1.0);
        // Decrease max height slightly for "Soul" usage
        const maxHeight = p.size * 12; // Dynamic height based on size
        const width = p.size; 

        ctx.save();
        ctx.globalCompositeOperation = 'screen'; 

        // Base
        ctx.save();
        ctx.scale(1, 0.58);
        ctx.rotate(Date.now() * 0.002);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath(); ctx.arc(0, 0, width, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.globalAlpha = alpha * 0.8; ctx.stroke();
        ctx.restore();

        // Beam
        const coreWidth = width * 0.5;
        const beamGrad = ctx.createLinearGradient(-coreWidth, 0, coreWidth, 0);
        beamGrad.addColorStop(0, 'rgba(255,255,255,0)');
        beamGrad.addColorStop(0.2, p.color);
        beamGrad.addColorStop(0.5, '#ffffff'); 
        beamGrad.addColorStop(0.8, p.color);
        beamGrad.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = beamGrad;
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillRect(-coreWidth, -maxHeight, coreWidth * 2, maxHeight);

        // Data Streams
        const lines = 8;
        for(let i=0; i<lines; i++) {
            const offsetX = (Math.random() - 0.5) * width * 1.6;
            const speed = 2500 + Math.random() * 1500;
            const yPos = -((Date.now() * speed / 2000 + i * 137) % maxHeight);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = alpha * (0.6 + Math.random()*0.4);
            ctx.fillRect(offsetX - 2, yPos, 4, 100); 
        }
        ctx.restore();
    },

    // 🩸 BLOOD RITUAL
    drawBloodRitual(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
         const lifeRatio = p.life / p.maxLife;
         const alpha = Math.sin(lifeRatio * Math.PI); 
         const r = p.size;

         ctx.save();
         ctx.scale(1, 0.55); 

         // Void Hole
         ctx.globalCompositeOperation = 'source-over'; 
         const voidGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
         voidGrad.addColorStop(0, '#000'); 
         voidGrad.addColorStop(0.7, '#220000');
         voidGrad.addColorStop(1, 'transparent');
         ctx.fillStyle = voidGrad;
         ctx.globalAlpha = alpha * 0.9;
         ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

         // Cracks
         ctx.strokeStyle = p.color; 
         ctx.lineWidth = 3;
         ctx.globalAlpha = alpha;
         ctx.beginPath();
         for(let i=0; i<6; i++) {
             const angle = i * (Math.PI/3) + progress;
             ctx.moveTo(0,0);
             ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
         }
         ctx.stroke();
         ctx.restore();
         
         // Rising Heat
         ctx.globalCompositeOperation = 'lighter';
         const heatGrad = ctx.createLinearGradient(0, 0, 0, -300);
         heatGrad.addColorStop(0, p.color);
         heatGrad.addColorStop(1, 'transparent');
         ctx.fillStyle = heatGrad;
         ctx.globalAlpha = alpha * 0.2;
         ctx.beginPath();
         ctx.moveTo(-r/2, 0); ctx.lineTo(-r/4, -300); ctx.lineTo(r/4, -300); ctx.lineTo(r/2, 0);
         ctx.fill();
    },

    drawShockwave(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.scale(1, 0.55); 
        const r = progress * 300; 
        const width = 30 * (1 - progress);
        ctx.globalAlpha = (1 - progress);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = width;

        if (isChaos) {
            ctx.globalCompositeOperation = 'source-over'; 
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
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        }
    }
};
