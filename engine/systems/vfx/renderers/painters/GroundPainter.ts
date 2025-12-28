
import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { VFXFactory } from "../../../../graphics/VFXFactory";
import { HexGeometry } from "../../../../graphics/utils/HexGeometry";

export const GroundPainter = {
    // drawX, drawY are passed from the renderer (already includes transition offset)
    draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number, drawX: number, drawY: number) {
        if (!p.image && !p.texture) {
            p.image = VFXFactory.getTexture(p.type as any, p.color);
        }
        const img = p.image || p.texture;
        
        let scale = 1.0;
        let alpha = 1.0 - progress;

        if (p.type === 'SHOCKWAVE' || p.type === 'RING' || p.type === 'BLAST') {
            // Explosive expansion
            scale = 0.5 + progress * 2.5; 
            alpha = 1.0 - Math.pow(progress, 3);
        } else if (p.type === 'CRACKS' || p.type === 'GRID_FIELD') {
            // Static linger
            scale = 1.0;
            alpha = 1.0 - Math.pow(progress, 4); // Fade out late
        }

        if (alpha <= 0.01) return;

        ctx.save();
        
        // 1. Position (Corrected: Use passed coordinates)
        ctx.translate(drawX, drawY); 
        
        // 2. ISO PROJECTION (Critical for "Flat" look on floor)
        ctx.scale(1, ISO_SCALE_Y);
        
        // 3. Rotation (Ground plane rotation)
        if (p.rotation) ctx.rotate(p.rotation);

        // 4. Blend Mode
        if (p.blendMode) ctx.globalCompositeOperation = p.blendMode;
        else if (p.type === 'CRACKS') ctx.globalCompositeOperation = 'source-over'; // Dark cracks
        else ctx.globalCompositeOperation = 'screen'; // Glowing rings

        ctx.globalAlpha = Math.min(1, alpha);

        if (img) {
            const size = p.size * scale;
            ctx.drawImage(img, -size, -size, size * 2, size * 2);
        } else {
            // Fallback geometry
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(0, 0, p.size * scale, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
};
