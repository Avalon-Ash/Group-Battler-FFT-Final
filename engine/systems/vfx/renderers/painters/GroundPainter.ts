
import { Particle } from "../../state";
import { ISO_SCALE_Y } from "../../../../../constants";
import { VFXFactory } from "../../../../graphics/VFXFactory";

export const GroundPainter = {
    draw(ctx: CanvasRenderingContext2D, p: Particle, progress: number, drawX: number, drawY: number) {
        if (!p.image && !p.texture) {
            p.image = VFXFactory.getTexture(p.type as any, p.color);
        }
        const img = p.image || p.texture;
        
        let scale = 1.0;
        let alpha = 1.0 - progress;

        if (p.type === 'SHOCKWAVE' || p.type === 'RING' || p.type === 'BLAST') {
            scale = 0.5 + progress * 2.5; 
            alpha = 1.0 - Math.pow(progress, 3);
        } else if (p.type === 'CRACKS' || p.type === 'GRID_FIELD') {
            scale = 1.0;
            alpha = 1.0 - Math.pow(progress, 4); 
        }

        if (alpha <= 0.01) return;

        ctx.save();
        ctx.translate(drawX, drawY);
        
        // --- PROJECTION MATRIX ---
        // 1. Scale Y to project regular textures onto isometric floor
        ctx.scale(1, ISO_SCALE_Y);
        
        // 2. Rotation applied in ground-plane (Visualized as spinning on floor)
        if (p.rotation) ctx.rotate(p.rotation);

        if (p.blendMode) ctx.globalCompositeOperation = p.blendMode;
        else if (p.type === 'CRACKS') ctx.globalCompositeOperation = 'source-over'; 
        else ctx.globalCompositeOperation = 'screen'; 

        ctx.globalAlpha = Math.min(1, alpha);

        if (img) {
            const size = p.size * scale;
            // Draw centered
            ctx.drawImage(img, -size, -size, size * 2, size * 2);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(0, 0, p.size * scale, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
};
