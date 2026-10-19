
import { Particle } from "../state";
import { PartPainter } from "./painters/PartPainter";
import { particleBackend, VFX_RENDER } from "../../../../constants";
import { HexLayout } from "../../../../types";

// 分派依 constants/vfx.ts 的 PARTICLE_TRAITS（particleBackend）；不在這裡另列型別清單

/**
 * 粒子分派：零件（含天氣）→ PartPainter；光束 → PartPainter.drawBeam；其餘 → 除錯點。
 * battleTime 由渲染迴圈傳入（光束磚捲動的時間 SSOT）。
 */
export const ParticleRenderer = {
    
    drawSingleParticle(
        ctx: CanvasRenderingContext2D, 
        p: Particle, 
        drawX: number, 
        drawY: number, 
        progress: number,
        layout: HexLayout,
        battleTime: number // SSOT: Received from RenderLoop
    ) {
        const backend = particleBackend(p.type);
        // 0. V1 特效零件（預烘焙 sprite）
        if (backend === 'PART') {
            PartPainter.draw(ctx, p, drawX, drawY, progress, layout);
            return;
        }

        // 1. 光束零件（可平鋪的光管磚）；VFXSystem.playBeam 一律掛零件
        if (p.type === 'BEAM') {
            if (p.part) PartPainter.drawBeam(ctx, p, drawX, drawY, progress, battleTime);
            else ParticleRenderer.drawDebugDot(ctx, drawX, drawY);
            return;
        }

        // 2. 除錯型別或未知型別畫成洋紅除錯點，一眼看得出來
        ParticleRenderer.drawDebugDot(ctx, drawX, drawY);
    },

    /** 除錯點：沒有繪製器的粒子型別（不應出現） */
    drawDebugDot(ctx: CanvasRenderingContext2D, x: number, y: number) {
        ctx.save();
        ctx.fillStyle = VFX_RENDER.DEBUG_DOT_COLOR;
        ctx.beginPath(); ctx.arc(x, y, VFX_RENDER.DEBUG_DOT_RADIUS, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
};
