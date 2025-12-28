
import { Particle } from "../../state";
import { VFXFactory } from "../../../../graphics/VFXFactory";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";

export const BillboardPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number) {
        // Logic for simple sprites that face the screen
        
        if (!p.image && !p.texture) {
            p.image = VFXFactory.getTexture(p.type as any, p.color);
        }
        const img = p.image || p.texture;

        let scale = 1.0;
        let alpha = 1.0 - progress;

        // Specialized Animation Curves
        if (p.type === 'SMOKE' || p.type === 'SMOKE_PUFF' || p.type === 'ATMOSPHERE') {
            scale = 0.5 + progress * 1.5; // Expand
            alpha = (1.0 - progress) * 0.6; 
        } else if (p.type === 'SPARK' || p.type === 'GLOW') {
            scale = 1.0 - progress; // Shrink
        } else if (p.type === 'ROCK' && p.size > 30) {
            scale = 1.0; alpha = 1.0; // Rocks stay solid until vanish
        } else {
            scale = 1.0 - Math.pow(progress, 2);
        }

        if (alpha <= 0.01) return;

        ctx.save();
        ctx.translate(drawX, drawY);

        // 1. Rotation (Screenspace spin for debris/sparks)
        if (p.rotation) ctx.rotate(p.rotation);

        // 2. Blend Mode
        if (p.blendMode) ctx.globalCompositeOperation = p.blendMode;
        else if (['SMOKE', 'SMOKE_PUFF', 'ATMOSPHERE', 'SPARK', 'GLOW'].includes(p.type)) {
            ctx.globalCompositeOperation = 'screen';
        } else if (['RUBBLE', 'DEBRIS', 'ROCK', 'SHARD', 'CHIP'].includes(p.type)) {
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.globalAlpha = Math.min(1, alpha);

        const drawSize = p.size * scale;

        // Shadow for physical debris (Fake 3D depth)
        if (['RUBBLE', 'DEBRIS', 'ROCK', 'SHARD'].includes(p.type)) {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.5 * alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            // Draw a small shadow offset
            ctx.beginPath(); ctx.arc(2, 2, drawSize * 0.8, 0, Math.PI*2); ctx.fill();
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
