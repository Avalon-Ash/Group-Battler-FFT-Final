
import { Particle } from "../state";
import { isChaosStyle } from "../utils";
import { AssetManager } from "../../../assets";
import { ISO_SCALE_Y } from "../../../../constants";
import { SurfaceAssets } from "../../../graphics/SurfaceAssets";

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean) {
        ctx.save();
        
        // 1. POSITIONING: Strict adherence to grid for field effects
        const isGridLocked = ['GRID_FIELD', 'DOMAIN', 'SHOCKWAVE', 'PILLAR'].includes(p.type);
        
        if (isGridLocked) {
            // Snap to pixel perfect center
            ctx.translate(Math.round(p.x), Math.round(p.y));
        } else {
            ctx.translate(p.x, p.y);
        }

        // --- RENDER LOGIC BY TYPE ---

        if (p.type === 'BEAM' || p.type === 'DEATH_RAY') {
            // ⚡ VOLUMETRIC ENERGY BEAM
            // We need to inverse the translation to draw from start (0,0) to target
            if (p.targetX !== undefined) {
                // p.x, p.y is START. targetX, targetY is END.
                // Context is already at p.x, p.y.
                
                // Calculate vector in local space
                const dx = p.targetX - p.x;
                const dy = p.targetY! - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const angle = Math.atan2(dy, dx);
                
                ctx.rotate(angle);
                
                // Animate Beam Width (Fade in/out)
                // 0 -> 1 -> 0
                const widthMod = Math.sin(progress * Math.PI);
                const width = p.size * widthMod;
                
                if (width > 0.5) {
                    ctx.lineCap = 'round';
                    
                    // 1. Outer Glow (Wide, Transparent, Additive)
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = width * 4;
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();
                    
                    // 2. Inner Core (White/Bright)
                    ctx.lineWidth = width;
                    ctx.globalAlpha = 0.8;
                    ctx.strokeStyle = '#fff';
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 10;
                    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dist, 0); ctx.stroke();
                    
                    // 3. Chaos Arcs (Optional)
                    if (isChaos || p.type === 'DEATH_RAY') {
                        ctx.shadowBlur = 0;
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = p.color;
                        ctx.beginPath();
                        const segments = dist / 20;
                        ctx.moveTo(0,0);
                        for(let i=1; i<segments; i++) {
                            const x = i * 20;
                            const jitter = (Math.random() - 0.5) * 10 * widthMod;
                            ctx.lineTo(x, jitter);
                        }
                        ctx.lineTo(dist, 0);
                        ctx.stroke();
                    }
                }
            }

        } else if (p.type === 'BLAST') {
            // 💥 STARBURST SHOCKWAVE
            const scale = p.size * (1 - Math.pow(progress - 1, 4)); // Fast expansion
            
            ctx.scale(scale, scale * ISO_SCALE_Y); // Perspective scale
            ctx.globalCompositeOperation = 'lighter';
            
            // Spike Burst
            ctx.fillStyle = p.color;
            ctx.globalAlpha = progress; // Fade out
            
            ctx.beginPath();
            const spikes = 12;
            for(let i=0; i<spikes*2; i++) {
                const angle = (i / (spikes*2)) * Math.PI * 2;
                // Outer radius = 1.0, Inner = 0.3
                const r = (i % 2 === 0) ? 1.0 : 0.3;
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
            
            // Central White Hot Core
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = progress * 0.8;
            ctx.beginPath(); ctx.arc(0, 0, 0.4, 0, Math.PI*2); ctx.fill();

        } else if (p.type === 'SMOKE') {
            // ☁️ VOLUMETRIC SMOKE CLOUD
            // Expands and rotates over life
            const growth = 1.0 + (1.0 - progress) * 1.5; 
            const alpha = Math.min(1, progress * 1.5); // Fade out at end
            
            ctx.scale(growth, growth);
            ctx.rotate(p.rotation + (1.0-progress)); // Slow rotation
            
            ctx.globalAlpha = alpha * 0.6;
            
            if (isChaos) {
                // Dark, thick smoke
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = p.color; 
            } else {
                // Light, misty smoke
                ctx.globalCompositeOperation = 'screen';
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                grad.addColorStop(0, '#fff');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad; // Tinted by global color if needed
            }
            
            // Draw Blobby Shape
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI*2);
            // Add a sub-puff
            ctx.arc(p.size*0.5, p.size*0.2, p.size*0.6, 0, Math.PI*2);
            ctx.arc(-p.size*0.4, -p.size*0.3, p.size*0.5, 0, Math.PI*2);
            ctx.fill();

        } else if (p.type === 'SPARK') {
            // ✨ KINETIC SPARKS (Streaks)
            const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
            const stretch = Math.min(4.0, 1.0 + speed / 150); 
            const angle = Math.atan2(p.vy, p.vx); 

            ctx.rotate(angle);
            ctx.scale(stretch, 0.5); 
            
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.globalAlpha = progress; 

            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI*2); ctx.fill();
            
            // Glow Trail
            ctx.fillStyle = p.color;
            ctx.globalAlpha = progress * 0.6;
            ctx.beginPath(); ctx.ellipse(-p.size, 0, p.size * 2, p.size, 0, 0, Math.PI*2); ctx.fill();

        } else if (p.type === 'GRID_FIELD') {
            // 🧱 VOLUMETRIC GRID BLOCK
            const height = 15; // Extrude up
            const alpha = Math.sin(progress * Math.PI); 
            SurfaceAssets.drawExtrudedHex(ctx, 0, 0, height, p.color, alpha * 0.6, false);

        } else if (p.type === 'DOMAIN') {
            // 🏰 VOLUMETRIC FORTRESS
            const maxH = 120;
            const h = maxH * Math.sin(progress * Math.PI); 
            const alpha = Math.min(1, Math.sin(progress * Math.PI) * 1.5);
            SurfaceAssets.drawExtrudedHex(ctx, 0, 0, h, p.color, alpha * 0.2, true); 
            ctx.globalCompositeOperation = 'screen';
            SurfaceAssets.drawUnitRune(ctx, 0, 0, p.color, Date.now() * 0.001, 1.0);

        } else if (p.type === 'PILLAR') {
            // 🏛️ BEAM OF LIGHT
            const h = 800; 
            const width = p.size; 
            const alpha = progress < 0.2 ? progress * 5 : (progress > 0.8 ? (1-progress)*5 : 1.0);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createLinearGradient(0, 0, 0, -h);
            grad.addColorStop(0, p.color);
            grad.addColorStop(0.2, '#ffffff');
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillRect(-width/2, -h, width, h);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillRect(-width/4, -h, width/2, h);
            ctx.scale(1, ISO_SCALE_Y);
            ctx.beginPath(); ctx.arc(0, 0, width, 0, Math.PI*2);
            ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.stroke();

        } else if (p.type === 'SHOCKWAVE') {
            // 🌊 EXPANDING RING
            const r = (1 - progress) * p.size; // Grow as life decreases (progress 1->0)
            // Wait, usually progress is 1->0. Let's fix loop in VFXSystem to be clearer or just assume:
            // p.life goes Max -> 0.
            // render progress = p.life / p.maxLife (1 -> 0).
            // So to expand: size * (1 - progress)
            
            ctx.globalAlpha = progress; // Fade out
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 4 * progress;
            
            if (isChaos) ctx.globalCompositeOperation = 'source-over';
            else ctx.globalCompositeOperation = 'screen';
            
            SurfaceAssets.pathHex(ctx, 0, 0, r / 32); 
            ctx.stroke();

        } else if (p.type === 'GLOW') {
            const img = AssetManager.getGlowSprite(p.color);
            // Pulse size
            const scale = (p.size / 64) * (0.8 + Math.sin(progress * Math.PI) * 0.2); 
            ctx.globalAlpha = progress;
            ctx.globalCompositeOperation = 'screen';
            ctx.scale(scale, scale);
            ctx.drawImage(img, -32, -32);

        } else if (['DEBRIS', 'SHARD', 'CHIP'].includes(p.type)) {
            // 💎 PHYSICAL DEBRIS
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        }

        ctx.restore();
    }
};
