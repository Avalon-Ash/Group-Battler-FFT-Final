
import { Particle } from "../state";
import { BillboardPainter } from "./painters/BillboardPainter";
import { GroundPainter } from "./painters/GroundPainter";
import { ProceduralPainter } from "./painters/ProceduralPainter";

export const ParticleRenderer = {
    
    drawSingleParticle(ctx: CanvasRenderingContext2D, p: Particle, drawX: number, drawY: number, progress: number, isChaos: boolean) {
        const now = Date.now() / 1000;

        // --- DISPATCHER ---
        
        // 1. Procedural Complex Shapes (Pillars, Beams, Domains)
        if (['PILLAR', 'HEX_BEAM', 'GIANT_HEX', 'DOMAIN', 'DEATH_RAY', 'BEAM'].includes(p.type)) {
            ctx.save();
            ctx.translate(drawX, drawY);
            ProceduralPainter.draw(ctx, p, progress, now);
            ctx.restore();
            return;
        }

        // 2. Ground/Floor Effects (Must Scale Y for Perspective)
        // These stick to the grid surface.
        if (['SHOCKWAVE', 'RING', 'BLAST', 'CRACKS', 'GRID_FIELD', 'MAGIC_CIRCLE', 'HEX_GLOW'].includes(p.type)) {
            GroundPainter.draw(ctx, p, progress, drawX, drawY);
            return;
        }

        // 3. Billboard Sprites (Face Camera)
        // Smoke, Sparks, Debris, Rocks - They have 3D position but draw as 2D sprites facing viewer.
        // They handle their own rotation relative to screen.
        BillboardPainter.draw(ctx, p, drawX, drawY, progress);
    }
};
