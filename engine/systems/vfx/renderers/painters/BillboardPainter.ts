
import { Particle } from "../../state";
import { VFXFactory } from "../../../../graphics/VFXFactory";

export const BillboardPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number) {
        let img = p.image || p.texture;
        
        if (!img && p.type !== 'SPRITE' && p.type !== 'GENERIC_DEBUG') {
            p.image = VFXFactory.getTexture(p.type as any, p.color);
            img = p.image;
        }
        
        let scale = 1.0;
        let alpha = 1.0; 
        const type = p.type;

        // SOLID MASS ENHANCEMENT
        if (type === 'SMOKE' || type === 'SMOKE_PUFF' || type === 'ATMOSPHERE') {
            const blastEase = 1 - Math.pow(1 - progress, 4);
            scale = 0.8 + blastEase * 0.6; 
            
            // Stay nearly opaque for 80% of life to maintain density
            if (progress < 0.8) {
                alpha = 0.95;
            } else {
                alpha = (1.0 - progress) * 5.0; 
            }
        } else if (type === 'SPARK' || type === 'GLOW') {
            scale = 1.0 - (progress * 0.5); 
            alpha = Math.min(1.0, (1.0 - progress) * 3.0); 
        } else if (['RUBBLE', 'ROCK', 'DEBRIS', 'SHARD', 'SPRITE'].includes(type)) {
            scale = 1.0;
            alpha = progress > 0.9 ? (1.0 - progress) * 10 : 1.0; // Solid until last 10%
        } else {
            scale = 1.0 - (progress * progress);
            alpha = 1.0 - progress;
        }

        if (alpha <= 0.01) return;

        ctx.save();
        ctx.translate(drawX, drawY);
        if (p.rotation) ctx.rotate(p.rotation);

        // Dense Blending Strategy
        if (p.blendMode) {
            ctx.globalCompositeOperation = p.blendMode;
        } else {
            // Non-energy particles now use source-over for 'thickness'
            const isEnergy = (type === 'SPARK' || type === 'GLOW' || type === 'ATMOSPHERE');
            ctx.globalCompositeOperation = isEnergy ? 'screen' : 'source-over';
        }

        ctx.globalAlpha = alpha;
        const drawSize = p.size * scale;

        // PHYSICAL SHADOW (Restored for solid presence)
        if (['RUBBLE', 'DEBRIS', 'ROCK', 'SHARD', 'SPRITE'].includes(type)) {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.6 * alpha;
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.beginPath(); ctx.arc(2, 4, drawSize * 0.8, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        if (img) {
            ctx.drawImage(img, -drawSize, -drawSize, drawSize * 2, drawSize * 2);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(0, 0, drawSize, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
};
