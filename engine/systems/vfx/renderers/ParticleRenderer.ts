
import { Particle } from "../state";
import { ISO_SCALE_Y } from "../../../../constants";
import { VFXFactory } from "../../../graphics/VFXFactory";
import { PROCEDURAL_VISUALS, PillarVisualDef } from "../../../../data/vfx/procedural_visuals";

// Helper for hex tracing (used by procedural beams)
const START_ANGLE = Math.PI / 6 + Math.PI / 4; 
const HEX_CORNERS_X: number[] = [];
const HEX_CORNERS_Y: number[] = [];
for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    HEX_CORNERS_X.push(Math.cos(angle));
    HEX_CORNERS_Y.push(Math.sin(angle));
}
function traceHexagonFast(ctx: CanvasRenderingContext2D, r: number) {
    ctx.beginPath();
    ctx.moveTo(HEX_CORNERS_X[0] * r, HEX_CORNERS_Y[0] * r);
    for (let i = 1; i < 6; i++) ctx.lineTo(HEX_CORNERS_X[i] * r, HEX_CORNERS_Y[i] * r);
    ctx.closePath();
}

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number, isChaos: boolean) {
        ctx.save();
        ctx.translate(drawX, drawY);

        const now = Date.now() / 1000;

        // --- 1. PERSPECTIVE CORRECTION (THE 2.5D RULE) ---
        const isGroundEffect = ['SHOCKWAVE', 'RING', 'BLAST', 'CRACKS', 'GRID_FIELD', 'DOMAIN', 'MAGIC_CIRCLE'].includes(p.type);
        if (isGroundEffect) {
            ctx.scale(1, ISO_SCALE_Y); 
        }

        ctx.rotate(p.rotation);

        // --- 2. BLEND MODES ---
        if (p.blendMode) {
            ctx.globalCompositeOperation = p.blendMode;
        } else {
            if (['RUBBLE', 'DEBRIS', 'ROCK', 'SHARD', 'CHIP'].includes(p.type)) {
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
            // Safety Net: If image missing, try fetch one last time
            if (!p.image && !p.texture) {
                p.image = VFXFactory.getTexture(p.type as any, p.color);
            }

            const img = p.image || p.texture;

            if (img) {
                this.drawTexture(ctx, img, p.size, progress, p.type);
            } else {
                // LAST RESORT: Simple Circle (No Squares allowed!)
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

        if (type === 'SHOCKWAVE' || type === 'RING') {
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
        
        // Shadow for solid objects
        if (['RUBBLE', 'DEBRIS', 'ROCK', 'SHARD'].includes(type)) {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.5 * alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            // Draw a hex shadow instead of circle
            traceHexagonFast(ctx, drawSize * 0.5);
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
            ctx.scale(1, ISO_SCALE_Y);
            // Spin effect
            if (p.vRotation) ctx.rotate(p.vRotation * now);
            
            ctx.globalCompositeOperation = 'screen';
            
            const grad = ctx.createRadialGradient(0,0,0,0,0,p.size);
            grad.addColorStop(0, p.color); 
            grad.addColorStop(0.8, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = (1 - progress) * 0.8;
            traceHexagonFast(ctx, p.size); ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1 - progress;
            traceHexagonFast(ctx, p.size * 0.9); ctx.stroke();
        }
        else if (p.type === 'PILLAR') {
            // ... (Pillar logic remains valid)
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
        else if (p.type === 'DOMAIN' || p.type === 'GRID_FIELD') {
            ctx.save();
            ctx.scale(1, ISO_SCALE_Y);
            const r = p.size * (progress < 0.1 ? progress/0.1 : 1.0); 
            
            const grad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.7, p.color); 
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.4 * (1 - progress);
            ctx.globalCompositeOperation = 'screen';
            // Use Hex shape for domains too!
            traceHexagonFast(ctx, r); ctx.fill();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.2;
            traceHexagonFast(ctx, r * 0.9); ctx.stroke();
            
            ctx.restore();
        }
    }
};
