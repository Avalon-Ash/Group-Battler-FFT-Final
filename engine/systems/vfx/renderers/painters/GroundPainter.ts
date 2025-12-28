
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

        // Scale Logic
        if (p.type === 'SHOCKWAVE' || p.type === 'RING' || p.type === 'BLAST') {
            scale = 0.5 + progress * 2.5; 
            alpha = 1.0 - Math.pow(progress, 3);
        } else if (p.type === 'CRACKS' || p.type === 'GRID_FIELD' || p.type === 'MAGIC_CIRCLE' || p.type === 'HEX_GLOW') {
            scale = 1.0;
            alpha = 1.0 - Math.pow(progress, 4); 
        }

        if (alpha <= 0.01) return;

        ctx.save();
        ctx.translate(drawX, drawY);
        
        // --- PROJECTION MATRIX ---
        // 1. Scale Y to project regular textures onto isometric floor
        // This makes circles look like ellipses matching the grid
        ctx.scale(1, ISO_SCALE_Y);
        
        // 2. Rotation applied in ground-plane (Visualized as spinning on floor)
        // Since we scaled Y *before* rotating, we need to be careful.
        // Actually, for ground effects, we want them to spin "flat".
        // Rotating in screen space AFTER scale stretches the rotation.
        // Correct order for "spinning disc on floor":
        //   Scale(1, ISO) -> Rotate(angle) -> Draw(Circle) is WRONG.
        //   Rotate(angle) -> Scale(1, ISO) -> Draw(Circle) is also tricky because order matters.
        //   Best approach for flat textures:
        //   We rotate the texture drawing itself?
        //   If we do ctx.rotate() here, it rotates the whole coordinate system.
        //   If we are scaled, rotation distorts.
        
        // CORRECTION: Reset scale, rotate, then re-apply scale? No.
        // Simple solution: Rotate screen Z? No.
        // If we want a spinning flat disc:
        // Texture is square. We want to draw it as a diamond/ellipse.
        
        // For simple sprites (Shockwave, Ring), rotation is usually 0.
        // For GRID_FIELD, it might be relevant.
        if (p.rotation) {
             ctx.rotate(p.rotation);
        }

        if (p.blendMode) ctx.globalCompositeOperation = p.blendMode;
        else if (p.type === 'CRACKS') ctx.globalCompositeOperation = 'source-over'; 
        else ctx.globalCompositeOperation = 'screen'; 

        ctx.globalAlpha = Math.min(1, alpha);

        if (img) {
            const size = p.size * scale;
            // Draw centered
            ctx.drawImage(img, -size, -size, size * 2, size * 2);
        } else {
            // Fallback shape
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(0, 0, p.size * scale, 0, Math.PI*2); ctx.fill();
        }

        ctx.restore();
    }
};
