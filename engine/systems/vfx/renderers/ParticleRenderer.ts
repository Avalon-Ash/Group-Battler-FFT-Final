
import { Particle } from "../state";
import { isChaosStyle, normalizeHex } from "../utils";
import { AssetManager } from "../../../assets";

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

        } else if (p.type === 'GLOW') {
            // New Handler for Ambient Effects (Snow, Ash, Embers)
            const img = AssetManager.getGlowSprite(p.color);
            const fade = Math.sin(progress * Math.PI); // Pulse
            const scale = (p.size / 64) * (0.8 + fade * 0.4); 
            
            ctx.globalAlpha = fade * 0.8;
            ctx.globalCompositeOperation = 'screen'; 
            ctx.scale(scale, scale);
            ctx.drawImage(img, -32, -32);

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
            
            // OPTIMIZATION: Removed expensive shadowBlur for thousands of shards
            // ctx.shadowColor = p.color;
            // ctx.shadowBlur = p.vRotation > 5 ? 10 : 0;

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

    // 🌫️ VOLUMETRIC GRID FOG (Procedural)
    drawGridField(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        // Hex Geometry (Matches TerrainRenderer)
        const size = 36; 
        const drawHex = () => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 6 + Math.PI / 4) + i * Math.PI / 3;
                const x = size * Math.cos(angle);
                const y = size * Math.sin(angle) * 0.58; // ISO squashing
                if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath();
        };

        const fade = Math.sin(progress * Math.PI); // Smooth fade in/out
        
        ctx.save();
        
        if (isChaos) {
            // RED: CRACKED EARTH + RISING MIASMA
            // ... (Red chaos logic unchanged as it uses shadowBlur but it's acceptable for fewer particles) ...
            // 1. Ground Cracks (Base)
            ctx.globalCompositeOperation = 'source-over';
            ctx.save();
            const jitter = (Math.random() - 0.5) * 2;
            ctx.translate(jitter, jitter);
            
            drawHex();
            ctx.clip();
            
            ctx.fillStyle = `rgba(20, 5, 5, ${fade * 0.8})`;
            ctx.fill();
            
            ctx.strokeStyle = p.color; // Hot red
            ctx.lineWidth = 2;
            ctx.globalAlpha = fade;
            
            ctx.beginPath();
            ctx.moveTo(-20, -10); ctx.lineTo(-10, 5); ctx.lineTo(5, -5); ctx.lineTo(20, 10);
            ctx.moveTo(0, 0); ctx.lineTo(-5, 15);
            ctx.stroke();
            ctx.restore();

            // 2. Rising Miasma (Volumetric Fog)
            ctx.globalCompositeOperation = 'lighter';
            
            const puffs = 3;
            for(let i=0; i<puffs; i++) {
                const t = (Date.now() / 1000 + i * 100) % 1;
                const yPos = 10 - t * 60; 
                const scale = 1 + t * 0.5;
                const puffAlpha = fade * (1 - t);
                
                ctx.globalAlpha = puffAlpha * 0.4;
                ctx.fillStyle = p.color;
                
                ctx.beginPath();
                ctx.ellipse((Math.sin(t*10 + i)*5), yPos, 15 * scale, 8 * scale, 0, 0, Math.PI*2);
                ctx.fill();
            }

        } else {
            // BLUE: HOLY CONSECRATION + LIGHT DUST
            
            // 1. Clean Hex Outline (OPTIMIZED: Replaced shadowBlur with double stroke)
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#fff';
            
            // Glow Pass
            ctx.lineWidth = 4;
            ctx.globalAlpha = fade * 0.4;
            drawHex();
            ctx.stroke();
            
            // Core Pass
            ctx.lineWidth = 2;
            ctx.globalAlpha = fade * 0.8;
            drawHex();
            ctx.stroke();
            
            ctx.fillStyle = p.color;
            ctx.globalAlpha = fade * 0.2;
            ctx.fill();

            // 2. Vertical Light Beams (Stationary)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            
            const beams = 4;
            for(let i=0; i<beams; i++) {
                const angle = (Date.now() / 2000 + i * (Math.PI*2/beams)) % (Math.PI*2);
                const r = 15;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r * 0.58;
                
                const beamHeight = 40 + Math.sin(Date.now()/500 + i)*10;
                
                const grad = ctx.createLinearGradient(0, py, 0, py - beamHeight);
                grad.addColorStop(0, `rgba(255,255,255,${fade * 0.5})`);
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                
                ctx.fillStyle = grad;
                ctx.fillRect(px - 1, py - beamHeight, 2, beamHeight);
            }
        }
        
        ctx.restore();
    },

    // 🏛️ BLUE: DIVINE PILLAR (High-End Technical Art)
    drawDivinePillar(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
        const lifeRatio = p.life / p.maxLife;
        
        let alpha = 0;
        if (lifeRatio > 0.9) alpha = (1 - lifeRatio) * 10; // 0.1s fade in
        else alpha = Math.pow(lifeRatio, 0.5); // Slow decay
        
        const maxHeight = 1200;
        const currentHeight = maxHeight * (progress < 0.1 ? progress * 10 : 1.0);
        const width = p.size;

        ctx.save();
        
        // Layer 1: Ground Seal (The Impact Point)
        ctx.save();
        ctx.scale(1, 0.55);
        ctx.globalCompositeOperation = 'screen';
        
        // OPTIMIZATION: Replaced shadowBlur with multi-pass stroke
        ctx.strokeStyle = '#fff';
        
        // Glow pass
        ctx.lineWidth = 6;
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath(); ctx.arc(0, 0, width * 0.8, 0, Math.PI*2); ctx.stroke();
        
        // Core pass
        ctx.lineWidth = 3;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        
        const wave = (progress * 2) % 1;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * (1 - wave);
        ctx.beginPath(); ctx.arc(0, 0, width * (0.8 + wave * 0.5), 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // Layer 2: The Beam (Vertical Gradient)
        ctx.globalCompositeOperation = 'screen';
        
        const coreW = width * 0.3;
        const coreGrad = ctx.createLinearGradient(0, 0, 0, -currentHeight);
        coreGrad.addColorStop(0, 'rgba(255,255,255,0)');
        coreGrad.addColorStop(0.1, 'rgba(255,255,255,0.9)');
        coreGrad.addColorStop(0.8, 'rgba(255,255,255,0.0)');
        
        ctx.fillStyle = coreGrad;
        ctx.globalAlpha = alpha;
        ctx.fillRect(-coreW/2, -currentHeight, coreW, currentHeight);

        const glowW = width;
        const glowGrad = ctx.createLinearGradient(-glowW, 0, glowW, 0); // Horizontal fade
        glowGrad.addColorStop(0, 'rgba(0,0,0,0)');
        glowGrad.addColorStop(0.2, p.color);
        glowGrad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
        glowGrad.addColorStop(0.8, p.color);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.save();
        const vMask = ctx.createLinearGradient(0, 0, 0, -currentHeight);
        vMask.addColorStop(0, 'rgba(0,0,0,0)');
        vMask.addColorStop(0.1, 'rgba(0,0,0,1)'); 
        
        ctx.fillStyle = glowGrad;
        ctx.globalAlpha = alpha * 0.6;
        const jitter = Math.random() * 10;
        ctx.fillRect(-(glowW + jitter)/2, -currentHeight, glowW + jitter, currentHeight);
        ctx.restore();

        // Layer 3: Interference Lines (Rising Energy)
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = '#fff';
        const lines = 8;
        for(let i=0; i<lines; i++) {
            const yPos = -((Date.now()/500 + i/lines) % 1) * currentHeight;
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
         
         ctx.beginPath();
         ctx.moveTo(-r/2, 0); 
         ctx.lineTo(-r/4, -300);
         ctx.lineTo(r/4, -300);
         ctx.lineTo(r/2, 0);
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
