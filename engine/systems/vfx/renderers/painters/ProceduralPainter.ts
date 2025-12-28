
import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { PROCEDURAL_VISUALS, PillarVisualDef } from "../../../../../data/vfx/procedural_visuals";
import { VolumePainter } from "../../../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";

export const ProceduralPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number) {
        ctx.save();
        // NOTE: We assume context is already translated to (drawX, drawY) by the caller
        
        if (p.type === 'BEAM' || p.type === 'DEATH_RAY') {
             // Beams usually handle their own transform because they connect two points.
             // Skipped here as ProjectileRenderer or VFXSystem handles beams explicitly.
        }
        else if (p.type === 'HEX_BEAM' || p.type === 'GIANT_HEX') {
            const rot = p.rotation + (p.vRotation ? p.vRotation * now : 0);
            
            // KEY FIX: Use traceRotatedHex with applyIso=true to ensure
            // the spinning hexagon matches the floor perspective perfectly.
            
            if (p.type === 'GIANT_HEX') {
                ctx.globalCompositeOperation = 'source-over';
                
                // Solid Core
                ctx.fillStyle = p.color; 
                ctx.globalAlpha = 1.0;
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true);
                ctx.fill();

                // Bright Rim
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 4;
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true);
                ctx.stroke();

                // Inner Detail (Counter-rotating)
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.6, -rot * 1.5, true);
                ctx.fill();
                
                // Black Hole Center (Optional style)
                if (p.color === '#000' || p.color === '#000000' || p.color === '#0f172a') {
                    ctx.save();
                    // Keep center circular as it's a singularity
                    ctx.scale(1, ISO_SCALE_Y); // Match ISO for the hole too
                    ctx.fillStyle = '#000';
                    ctx.shadowColor = '#8b5cf6'; 
                    ctx.shadowBlur = 20;
                    ctx.beginPath(); ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2); ctx.fill();
                    
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.shadowBlur = 0;
                    ctx.beginPath(); ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2); ctx.stroke();
                    ctx.restore();
                }

            } else {
                // HEX_BEAM (Energy / Wireframe style)
                ctx.globalCompositeOperation = 'screen';
                
                // Gradient for the "beam" look
                // Note: Radial gradient in 2D doesn't look ISO unless we scale it.
                ctx.save();
                ctx.scale(1, ISO_SCALE_Y);
                const grad = ctx.createRadialGradient(0,0,0,0,0,p.size);
                grad.addColorStop(0, p.color); 
                grad.addColorStop(0.8, p.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.restore();

                ctx.globalAlpha = (1 - progress) * 0.8;
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true);
                ctx.fill();
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 1 - progress;
                HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.9, rot, true);
                ctx.stroke();
            }
        }
        else if (p.type === 'PILLAR') {
            const rawDef = PROCEDURAL_VISUALS[p.style || ''] || {};
            const def = rawDef as PillarVisualDef;
            const h = def.height || 1200; 
            const width = p.size * (1 - progress * 0.5) * (def.widthScale || 1.0);
            
            if (def.blendMode) ctx.globalCompositeOperation = def.blendMode;
            
            // Pillar Body (Vertical Rectangle)
            const cylinderGrad = ctx.createLinearGradient(-width/2, 0, width/2, 0);
            cylinderGrad.addColorStop(0, p.color); 
            cylinderGrad.addColorStop(0.5, '#ffffff'); 
            cylinderGrad.addColorStop(1, p.color); 
            
            ctx.fillStyle = cylinderGrad;
            ctx.globalAlpha = (1 - progress) * 0.8;
            
            // Draw from base (0) upwards (-h)
            ctx.fillRect(-width/2, -h, width, h);
            
            // Base Ring (On Floor)
            if (def.hasBaseRing) {
                ctx.save();
                // Ensure ring is ISO
                ctx.scale(1, ISO_SCALE_Y);
                const ringGrad = ctx.createRadialGradient(0,0, width*0.5, 0,0, width*1.2);
                ringGrad.addColorStop(0, 'transparent');
                ringGrad.addColorStop(0.5, p.color);
                ringGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = ringGrad;
                ctx.beginPath(); ctx.arc(0, 0, width*1.5, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            }
        }
        else if (p.type === 'DOMAIN') {
            // Domain is a 3D prism/cylinder area
            const r = p.size * (progress < 0.1 ? progress/0.1 : 1.0); 
            const isShield = p.style === 'DOMAIN_SHIELD';
            const h = isShield ? 120 : 40;
            const opacity = 0.4 * (1 - progress);
            
            VolumePainter.draw3DPrism(ctx, 0, 0, r, h, p.color, opacity, 'GRADIENT_FADE');
        }
        
        ctx.restore();
    }
};
