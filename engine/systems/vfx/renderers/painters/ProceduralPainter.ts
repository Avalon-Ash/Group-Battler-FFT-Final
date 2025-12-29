
import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { PROCEDURAL_VISUALS, PillarVisualDef } from "../../../../../data/vfx/procedural_visuals";
import { VolumePainter } from "../../../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../../../types";

/**
 * Procedural Vector System v9.0
 * Rule: Logic Rotation -> Perspective Squash.
 */
export const ProceduralPainter = {
    
    draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number, now: number, layout: HexLayout = 'FLAT') {
        ctx.save();
        
        // 1. Vectorized Projections (Ground Locked)
        if (['HEX_BEAM', 'GIANT_HEX', 'MAGIC_CIRCLE'].includes(p.type)) {
            const rot = p.rotation + (p.vRotation ? p.vRotation * now : 0);
            
            if (p.type === 'GIANT_HEX') {
                this.drawGiantHex(ctx, p, rot, layout);
            } else if (p.type === 'MAGIC_CIRCLE') {
                this.drawMagicCircle(ctx, p, rot, layout);
            } else {
                this.drawStandardHexVfx(ctx, p, rot, progress, layout);
            }
        }
        // 2. Volumetric Projections (3D Entities)
        else if (p.type === 'PILLAR') {
            this.drawVolumetricPillar(ctx, p, progress);
        }
        else if (p.type === 'DOMAIN') {
            this.drawDomainField(ctx, p, progress, layout);
        }
        
        ctx.restore();
    },

    /**
     * GIANT_HEX Fix: Precise vector drawing with perspective rim.
     */
    drawGiantHex(ctx: CanvasRenderingContext2D, p: Particle, rot: number, layout: HexLayout) {
        ctx.globalCompositeOperation = p.blendMode || 'source-over';
        
        // A. Floor Aura (Shadow)
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 25;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 1.05, rot, true, layout);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();

        // B. Main Plate
        ctx.fillStyle = p.color; 
        ctx.globalAlpha = 0.9;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.fill();

        // C. Sharp Core Rim
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 1.0;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.stroke();

        // D. Harmonic Echo (Counter-Rotating)
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.65, -rot * 1.5, true, layout);
        ctx.fill();
    },

    drawMagicCircle(ctx: CanvasRenderingContext2D, p: Particle, rot: number, layout: HexLayout) {
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20;
        
        // Multi-stage Rune Geometry
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.stroke();
        
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.88, -rot * 0.6, true, layout);
        ctx.stroke();

        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size * 0.6, rot * 2.8, true, layout);
        ctx.stroke();
    },

    drawStandardHexVfx(ctx: CanvasRenderingContext2D, p: Particle, rot: number, progress: number, layout: HexLayout) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = (1 - progress) * 0.8;
        ctx.fillStyle = p.color;
        HexGeometry.traceRotatedHex(ctx, 0, 0, p.size, rot, true, layout);
        ctx.fill();
    },

    drawVolumetricPillar(ctx: CanvasRenderingContext2D, p: Particle, progress: number) {
        const rawDef = PROCEDURAL_VISUALS[p.style || ''] || {};
        const def = rawDef as PillarVisualDef;
        const h = p.height || def.height || 1000; 
        const width = p.size * (1 - progress * 0.2);
        
        ctx.globalCompositeOperation = def.blendMode || 'screen';
        
        // Linear Vertical Core
        const grad = ctx.createLinearGradient(-width/2, 0, width/2, 0);
        grad.addColorStop(0, p.color); 
        grad.addColorStop(0.5, '#ffffff'); 
        grad.addColorStop(1, p.color); 
        
        ctx.fillStyle = grad;
        ctx.globalAlpha = (1 - progress) * 0.7;
        ctx.fillRect(-width/2, -h, width, h);
        
        // Base Energy Seal (Flattened to floor)
        ctx.save();
        ctx.scale(1, ISO_SCALE_Y);
        const baseGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 1.6);
        baseGlow.addColorStop(0, '#fff');
        baseGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = baseGlow;
        ctx.globalAlpha = (1 - progress) * 0.8;
        ctx.beginPath(); ctx.arc(0, 0, width * 1.6, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    },

    drawDomainField(ctx: CanvasRenderingContext2D, p: Particle, progress: number, layout: HexLayout) {
        const r = p.size;
        const h = p.style === 'DOMAIN_SHIELD' ? 150 : 75;
        const opacity = 0.3 * (1 - progress);
        VolumePainter.draw3DPrism(ctx, 0, 0, r, h, p.color, opacity, 'GRADIENT_FADE', layout);
    }
};
