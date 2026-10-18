
import { Particle } from "../state";
import { BillboardPainter } from "./painters/BillboardPainter";
import { PartPainter } from "./painters/PartPainter";
import { particleBackend, VFX_RENDER } from "../../../../constants";
import { HexLayout } from "../../../../types";

// 分派依 constants.ts 的 PARTICLE_TRAITS（particleBackend）；不在這裡另列型別清單

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
        const backend = particleBackend(p.type);
        // 0. V1 特效零件（預烘焙 sprite）
        if (backend === 'PART') {
            PartPainter.draw(ctx, p, drawX, drawY, progress, layout);
            return;
        }

        // 0b. 陣營光束零件（可平鋪的光管磚）；沒有零件的後備光束走下面的程序化路徑
        if (p.type === 'BEAM' && p.part) {
            PartPainter.drawBeam(ctx, p, drawX, drawY, progress, battleTime);
            return;
        }

        // 程序化（PROC）與地面向量（GROUND）繪製器已移除（docs/VFX_PIPELINE_MAP.md §4.10）：登記表只產生零件，
        // 光束一律掛零件；萬一有舊型別漏進來，畫成洋紅除錯點，一眼看得出來。
        if (backend === 'PROC' || backend === 'GROUND') {
            ParticleRenderer.drawDebugDot(ctx, drawX, drawY);
            return;
        }

        // 3. Billboard Sprites (Smoke, Sparks, Debris, Rocks)
        if (p.type !== 'GENERIC_DEBUG') {
            BillboardPainter.draw(ctx, p, drawX, drawY, progress);
        } else {
            ParticleRenderer.drawDebugDot(ctx, drawX, drawY);
        }
    },

    /** 除錯點：沒有繪製器的粒子型別（不應出現） */
    drawDebugDot(ctx: CanvasRenderingContext2D, x: number, y: number) {
        ctx.save();
        ctx.fillStyle = VFX_RENDER.DEBUG_DOT_COLOR;
        ctx.beginPath(); ctx.arc(x, y, VFX_RENDER.DEBUG_DOT_RADIUS, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
};
