
import { Particle } from "../../state";
import { VFXFactory } from "../../../../graphics/VFXFactory";

export const BillboardPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number) {
        // Logic for simple sprites that face the screen
        
        let img = p.image;
        
        // Fallback texture generation if image is missing but type expects one from factory
        if (!img && !p.texture) {
            // Note: SPRITE type assumes p.image is already set by spawner (e.g. UnitShatter)
            if (p.type !== 'SPRITE') {
                p.image = VFXFactory.getTexture(p.type as any, p.color);
                img = p.image;
            }
        }
        
        let scale = 1.0;
        let alpha = 1.0 - progress;

        // Specialized Animation Curves
        if (p.type === 'SMOKE' || p.type === 'SMOKE_PUFF' || p.type === 'ATMOSPHERE') {
            scale = 0.5 + progress * 1.5; // Expand
            alpha = (1.0 - progress) * 0.6; 
        } else if (p.type === 'SPARK' || p.type === 'GLOW') {
            scale = 1.0 - progress; // Shrink
        } else if (p.type === 'ROCK' && p.size > 30) {
            scale = 1.0; alpha = 1.0; 
        } else if (p.type === 'SPRITE') {
            // "Ragdoll" Tokens: Stay full size, fade out at very end
            scale = 1.0;
            alpha = progress > 0.8 ? (1 - progress) / 0.2 : 1.0;
        } else {
            scale = 1.0 - Math.pow(progress, 2);
        }

        if (alpha <= 0.01) return;

        ctx.save();
        ctx.translate(drawX, drawY);

        // 1. Rotation (Screenspace spin for debris/sparks/sprites)
        if (p.rotation) ctx.rotate(p.rotation);

        // 2. Blend Mode
        if (p.blendMode) ctx.globalCompositeOperation = p.blendMode;
        else if (['SMOKE', 'SMOKE_PUFF', 'ATMOSPHERE', 'SPARK', 'GLOW'].includes(p.type)) {
            ctx.globalCompositeOperation = 'screen';
        } else {
            ctx.globalCompositeOperation = 'source-over'; // Solid for debris/sprites
        }

        ctx.globalAlpha = Math.min(1, alpha);

        const drawSize = p.size * scale;

        // Shadow for physical debris (Fake 3D depth)
        if (['RUBBLE', 'DEBRIS', 'ROCK', 'SHARD', 'SPRITE'].includes(p.type)) {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            ctx.globalAlpha = 0.5 * alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            // Draw a small shadow offset
            ctx.beginPath(); ctx.arc(2, 2, drawSize * 0.8, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        if (img) {
            // Draw centered
            ctx.drawImage(img, -drawSize, -drawSize, drawSize * 2, drawSize * 2);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(0, 0, drawSize, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
};
