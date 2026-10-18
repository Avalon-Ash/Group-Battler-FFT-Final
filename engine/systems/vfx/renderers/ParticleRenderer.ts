
import { Particle } from "../state";
import { BillboardPainter } from "./painters/BillboardPainter";
import { GroundPainter } from "./painters/GroundPainter";
import { ProceduralPainter } from "./painters/ProceduralPainter";
import { PartPainter, PART_PARTICLE_TYPES } from "./painters/PartPainter";
import { HexLayout } from "../../../../types";

// Static categorization for faster dispatch
const PROCEDURAL_SET = new Set(['PILLAR', 'HEX_BEAM', 'GIANT_HEX', 'DOMAIN', 'DEATH_RAY', 'BEAM', 'MAGIC_CIRCLE', 'BLACK_HOLE']);
const GROUND_PLANE_SET = new Set(['SHOCKWAVE', 'RING', 'BLAST', 'CRACKS', 'GRID_FIELD', 'HEX_GLOW']);

/**
 * Unified Particle Dispatcher v9.7 (Time SSOT)
 */
export const ParticleRenderer = {
    
    drawSingleParticle(
        ctx: CanvasRenderingContext2D, 
        p: Particle, 
        drawX: number, 
        drawY: number, 
        progress: number, 
        isChaos: boolean, 
        layout: HexLayout,
        battleTime: number // SSOT: Received from RenderLoop
    ) {
        // 0. V1 特效零件（預烘焙 sprite）
        if (PART_PARTICLE_TYPES.has(p.type)) {
            PartPainter.draw(ctx, p, drawX, drawY, progress, layout);
            return;
        }

        // 0b. 陣營光束零件（可平鋪的光管磚）；沒有零件的後備光束走下面的程序化路徑
        if (p.type === 'BEAM' && p.part) {
            PartPainter.drawBeam(ctx, p, drawX, drawY, progress, battleTime);
            return;
        }

        // 1. Vectorized Procedural Logic (Pillars, Domains, Beams)
        // Uses BattleTime for synchronous rotation/pulsing
        if (PROCEDURAL_SET.has(p.type)) {
            ctx.save();
            ctx.translate(drawX, drawY);
            ProceduralPainter.draw(ctx, p, progress, battleTime, layout);
            ctx.restore();
            return;
        }

        // 2. Ground Projection Logic (Ripples, Cracks, Fields)
        if (GROUND_PLANE_SET.has(p.type)) {
            GroundPainter.draw(ctx, p, progress, drawX, drawY, layout);
            return;
        }

        // 3. Billboard Sprites (Smoke, Sparks, Debris, Rocks)
        if (p.type !== 'GENERIC_DEBUG') {
            BillboardPainter.draw(ctx, p, drawX, drawY, progress);
        } else {
            // 4. Critical Safe Fallback
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }
};
