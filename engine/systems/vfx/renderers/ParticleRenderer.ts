
import { Particle } from "../state";
import { ISO_SCALE_Y } from "../../../../constants";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { PROCEDURAL_VISUALS, PillarVisualDef } from "../../../../data/vfx/procedural_visuals";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number, isChaos: boolean) {
        const now = Date.now() / 1000;

        // --- OPTIMIZATION: BATCHABLE SPRITES ---
        // For simple particles (Smoke, Sparks) that just need scaling/alpha, we avoid ctx.save/restore overhead.
        const isComplex = ['BEAM', 'PILLAR', 'HEX_BEAM', 'GIANT_HEX', 'GRID_FIELD', 'DOMAIN', 'DEATH_RAY', 'SHOCKWAVE', 'RING', 'BLAST', 'CRACKS', 'MAGIC_CIRCLE'].includes(p.type) || p.rotation !== 0 || p.blendMode;

        if (!isComplex) {
            // Fast Path: Direct Draw
            // Logic derived from drawTexture but flattened
            if (!p.image && !p.texture) {
                // Just in case texture isn't ready
                ctx.fillStyle = p.color;
                const s = p.size * (1 - progress);
                ctx.beginPath(); ctx.arc(drawX, drawY, s, 0, Math.PI*2); ctx.fill();
                return;
            }

            const img = p.image || p.texture!;
            let scale = 1.0;
            let alpha = 1.0 - progress;

            if (p.type === 'ROCK' && p.size > 30) {
                scale = 1.0; alpha = 1.0; 
            } else if (p.type === 'SMOKE' || p.type === 'SMOKE_PUFF' || p.type === 'ATMOSPHERE') {
                scale = 0.8 + progress * 1.2;
                alpha = (1.0 - progress) * 0.5; 
            } else {
                scale = 1.0 - Math.pow(progress, 2);
            }

            // Alpha check
            if (alpha <= 0.01) return;
            
            // Apply Alpha directly (it persists until changed, so we must reset it later if we don't save)
            // BUT: Since we are in a loop managed by GameRenderer, we should rely on global reset or local save/restore if we change state.
            // Safety: We MUST save/restore if we change globalAlpha/Composite.
            // Optimization: Only use save/restore if we *actually* change state.
            
            ctx.save(); // Still needed for alpha/composite
            ctx.globalAlpha = Math.min(1, alpha);
            
            // Standard Blend is screen for most particles in this engine
            // If we want to optimize further, we group particles by blend mode.
            if (['SMOKE', 'SMOKE_PUFF', 'ATMOSPHERE', 'SPARK', 'GLOW'].includes(p.type)) {
                ctx.globalCompositeOperation = 'screen';
            }

            const drawSize = p.size * scale;
            // Draw centered at drawX, drawY
            ctx.drawImage(img, drawX - drawSize, drawY - drawSize, drawSize * 2, drawSize * 2);
            
            ctx.restore();
            return;
        }

        // --- SLOW PATH: Complex Transforms ---
        ctx.save();
        ctx.translate(drawX, drawY);

        // --- 1. PERSPECTIVE CORRECTION (THE 2.5D RULE) ---
        const isGroundEffect = ['SHOCKWAVE', 'RING', 'BLAST', 'CRACKS', 'GRID_FIELD', 'MAGIC_CIRCLE'].includes(p.type);
        if (isGroundEffect) {
            ctx.scale(1, ISO_SCALE_Y); 
        }

        // Standard 2D Sprite Rotation (Billboard)
        if (!['GIANT_HEX', 'HEX_BEAM', 'DOMAIN', 'PILLAR'].includes(p.type)) {
            if (p.rotation !== 0) ctx.rotate(p.rotation);
        }

        // --- 2. BLEND MODES ---
        if (p.blendMode) {
            ctx.globalCompositeOperation = p.blendMode;
        } else {
            if (['RUBBLE', 'DEBRIS', 'ROCK', 'SHARD', 'CHIP', 'GIANT_HEX'].includes(p.type)) {
                 ctx.globalCompositeOperation = 'source-over'; 
            } else if (['SMOKE', 'SMOKE_PUFF', 'ATMOSPHERE'].includes(p.type)) {
                 ctx.globalCompositeOperation = 'screen';      
            } else {
                 ctx.globalCompositeOperation = 'screen';      
            }
        }

        // --- 3. RENDERING ---
        
        // A. PROCEDURAL COMPLEX SHAPES (Beams, Pillars, Domains)
        if (['BEAM', 'PILLAR', 'HEX_BEAM', 'GIANT_HEX', 'GRID_FIELD', 'DOMAIN', 'DEATH_RAY'].includes(p.type)) {
            this.drawProcedural(ctx, p, progress, isChaos, now);
        }
        // B. TEXTURE BASED (Everything else)
        else {
            if (!p.image && !p.texture) {
                p.image = VFXFactory.getTexture(p.type as any, p.color);
            }

            const img = p.image || p.texture;

            if (img) {
                this.drawTexture(ctx, img, p.size, progress, p.type);
            } else {
                const s = p.size * (1 - progress);
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI*2); ctx.fill();
            }
        }

        ctx.restore();
    },

    drawTexture(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, baseSize: number, progress: number, type: string) {
        let scale = 1.0;
        let alpha = 1.0 - progress;

        if (type === 'ROCK' && baseSize > 30) {
            scale = 1.0;
            alpha = 1.0; 
        }
        else if (type === 'SHOCKWAVE' || type === 'RING') {
            scale = 0.5 + progress * 2.0;
            alpha = 1.0 - Math.pow(progress, 3);
        } else if (type === 'SMOKE' || type === 'SMOKE_PUFF' || type === 'ATMOSPHERE') {
            scale = 0.8 + progress * 1.2;
            alpha = (1.0 - progress) * 0.5; 
        } else {
            scale = 1.0 - Math.pow(progress, 2);
        }

        const drawSize = baseSize * scale;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        
        if (['RUBBLE', 'DEBRIS', 'ROCK', 'SHARD'].includes(type)) {
            // Shadow for physical objects
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.5 * alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            // Use unified hex geometry for shadow
            HexGeometry.traceHex(ctx, 0, 0, drawSize * 0.5, true);
            ctx.fill();
            ctx.restore();
        }

        ctx.drawImage(img, -drawSize, -drawSize, drawSize * 2, drawSize * 2);
    },

    drawProcedural(ctx: CanvasRenderingContext2D, p: Particle, progress: number, isChaos: boolean, now: number) {
        
        if (p.type === 'BEAM' || p.type === 'DEATH_RAY') {
             if (p.targetX !== undefined && p.targetY !== undefined) {
                const dx = p.targetX;
                const dy = p.targetY; 
                
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.lineTo(dx, dy - (p.targetZ || 0));
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size * (1-progress) * 1.5; 
                ctx.lineCap = 'round';
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 15;
                ctx.globalCompositeOperation = 'screen';
                ctx.stroke();
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = p.size * (1-progress) * 0.4;
                ctx.shadowBlur = 0;
                ctx.stroke();
             }
        }
        else if (p.type === 'HEX_BEAM' || p.type === 'GIANT_HEX') {
            // FIX: Handle Scale locally to allow correct rotation math
            ctx.save();
            // Don't pre-scale Y here, HexGeometry.traceRotatedHex handles scaling via flag
            
            // Calculate Current Rotation
            const rot = p.rotation + (p.vRotation ? p.vRotation * now : 0);
            
            // FIX: Giant Hex (Heaven Fall / Black Hole)
            if (p.type === 'GIANT_HEX') {
                ctx.globalCompositeOperation = 'source-over';
                
                // Solid Core (Accretion Disk)
                ctx.fillStyle = p.color; 
                ctx.globalAlpha = 1.0;
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true);
                ctx.fill();

                // Bright Rim
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 4;
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true);
                ctx.stroke();

                // Inner Detail (Opposite spin)
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.6, -rot * 1.5, true);
                ctx.fill();
                
                // --- BLACK HOLE SPECIAL: SINGULARITY SPHERE ---
                if (p.color === '#000' || p.color === '#000000' || p.color === '#0f172a') {
                    // Sphere isn't iso scaled
                    ctx.save();
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = '#000';
                    ctx.shadowColor = '#8b5cf6'; // Purple glow
                    ctx.shadowBlur = 20;
                    ctx.beginPath(); ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2); ctx.fill();
                    
                    // White Ring (Event Horizon)
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.shadowBlur = 0;
                    ctx.beginPath(); ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2); ctx.stroke();
                    ctx.restore();
                }

            } else {
                // HEX_BEAM (Energy)
                ctx.globalCompositeOperation = 'screen';
                const grad = ctx.createRadialGradient(0,0,0,0,0,p.size);
                grad.addColorStop(0, p.color); 
                grad.addColorStop(0.8, p.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.globalAlpha = (1 - progress) * 0.8;
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true);
                ctx.fill();
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 1 - progress;
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.9, rot, true);
                ctx.stroke();
            }
            ctx.restore();
        }
        else if (p.type === 'PILLAR') {
            const rawDef = PROCEDURAL_VISUALS[p.style || ''] || {};
            const def = rawDef as PillarVisualDef;
            const h = def.height || 1200; 
            const width = p.size * (1 - progress * 0.5) * (def.widthScale || 1.0);
            
            ctx.save();
            if (def.blendMode) ctx.globalCompositeOperation = def.blendMode;
            
            const cylinderGrad = ctx.createLinearGradient(-width/2, 0, width/2, 0);
            cylinderGrad.addColorStop(0, p.color); 
            cylinderGrad.addColorStop(0.5, '#ffffff'); 
            cylinderGrad.addColorStop(1, p.color); 
            
            ctx.fillStyle = cylinderGrad;
            ctx.globalAlpha = (1 - progress) * 0.8;
            
            ctx.fillRect(-width/2, -h, width, h);
            
            if (def.hasBaseRing) {
                ctx.scale(1, ISO_SCALE_Y);
                const ringGrad = ctx.createRadialGradient(0,0, width*0.5, 0,0, width*1.2);
                ringGrad.addColorStop(0, 'transparent');
                ringGrad.addColorStop(0.5, p.color);
                ringGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = ringGrad;
                ctx.beginPath(); ctx.arc(0, 0, width*1.5, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        }
        else if (p.type === 'DOMAIN') {
            const r = p.size * (progress < 0.1 ? progress/0.1 : 1.0); 
            const height = 40;
            const isShield = p.style === 'DOMAIN_SHIELD';
            const h = isShield ? 120 : 40;
            const opacity = 0.4 * (1 - progress);
            
            VolumePainter.draw3DPrism(ctx, 0, 0, r, h, p.color, opacity, 'GRADIENT_FADE');
        }
        else if (p.type === 'GRID_FIELD') {
            const r = p.size * (progress < 0.1 ? progress/0.1 : 1.0); 
            
            const grad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.7, p.color); 
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.4 * (1 - progress);
            ctx.globalCompositeOperation = 'screen';
            // Use unified Hex trace
            HexGeometry.traceHex(ctx, 0, 0, r, true); 
            ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.2;
            HexGeometry.traceHex(ctx, 0, 0, r * 0.9, true);
            ctx.stroke();
        }
    }
};
