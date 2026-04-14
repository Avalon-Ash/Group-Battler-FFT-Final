
import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";
import { VFXFactory } from "../../../../graphics/VFXFactory";
import { HexLayout } from "../../../../../types";
import { VisualMath } from "../../../../math/VisualMath";

export const GroundPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number, drawX: number, drawY: number, layout: HexLayout) {
        
        // 1. 向量幾何處理
        if (['SHOCKWAVE', 'RING', 'BLAST', 'HEX_GLOW', 'GRID_FIELD', 'MAGIC_CIRCLE'].includes(p.type)) {
            this.drawVectorGeometry(ctx, p, progress, drawX, drawY, layout);
            return;
        }

        const img = p.image || p.texture;
        if (!img) return;

        let alpha = 1.0 - progress;
        if (p.type === 'CRACKS') alpha = 1.0 - Math.pow(progress, 4);

        if (alpha <= 0.01) return;

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.scale(1, ISO_SCALE_Y); 
        
        if (p.rotation) ctx.rotate(p.rotation);
        
        ctx.globalCompositeOperation = p.blendMode || 'screen';
        ctx.globalAlpha = Math.min(1, alpha);

        const size = p.size;
        ctx.drawImage(img, -size, -size, size * 2, size * 2);
        
        ctx.restore();
    },

    drawVectorGeometry(ctx: CanvasRenderingContext2D, p: Particle, progress: number, drawX: number, drawY: number, layout: HexLayout) {
        ctx.save();
        ctx.translate(drawX, drawY);
        
        ctx.globalCompositeOperation = p.blendMode || 'screen';

        if (p.type === 'SHOCKWAVE' || p.type === 'RING' || p.type === 'BLAST') {
            const alpha = 1.0 - Math.pow(progress, 2);
            if (alpha <= 0.01) { ctx.restore(); return; }

            ctx.globalAlpha = alpha;
            ctx.strokeStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            
            const currentRadius = p.size * (0.3 + progress * 0.7);
            const lineWidth = Math.max(1, (1 - progress) * (p.type === 'SHOCKWAVE' ? 12 : 4));
            
            ctx.lineWidth = lineWidth;
            HexGeometry.traceHex(ctx, 0, 0, currentRadius, true, layout);
            ctx.stroke();
            
            // 內圈回饋
            if (p.type === 'SHOCKWAVE') {
                ctx.lineWidth = lineWidth * 0.3;
                ctx.globalAlpha = alpha * 0.5;
                HexGeometry.traceHex(ctx, 0, 0, currentRadius * 0.8, true, layout);
                ctx.stroke();
            }
        }
        else if (p.type === 'GRID_FIELD') {
            const alpha = 1.0 - Math.pow(progress, 4);
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = p.color;
            ctx.fillStyle = p.color;
            
            const r = p.size;
            ctx.lineWidth = 2;
            HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
            ctx.stroke();
            
            ctx.globalAlpha = alpha * 0.15;
            ctx.fill();
        }
        else if (p.type === 'HEX_GLOW') {
            const alpha = 1.0 - Math.pow(progress, 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha * 0.3;
            HexGeometry.traceHex(ctx, 0, 0, p.size, true, layout);
            ctx.fill();
        }

        ctx.restore();
    }
};
