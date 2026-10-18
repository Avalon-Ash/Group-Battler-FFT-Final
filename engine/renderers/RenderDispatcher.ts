// ╔══════════════════════════════════════════════════════════╗
// ║  RenderDispatcher — 依排序後的 RenderOp 逐一繪製            ║
// ║  職責：TERRAIN 畫完地塊、細節與基礎疊層後，接著畫蓋到這格   ║
// ║        的貼地鋪設特效（GroundDrapeLayer），所以站在這格的   ║
// ║        單位（排在該格 TERRAIN 之後）棋座壓在法陣上。       ║
// ║  上游：RenderList.sort、RenderPipeline.drawWorld            ║
// ║  [ARCH] 規則見 engine/renderers/RenderSpec.ts §1、§9。      ║
// ╚══════════════════════════════════════════════════════════╝

import { RenderOp, RenderOpType } from "./RenderList";
import type { GroundDrapeLayer } from "./GroundDrape";
import { TerrainRenderer } from "./grid/TerrainRenderer";
import { GridOverlays } from "./grid/GridOverlays";
import { HazardPainter } from "./grid/painters/HazardPainter";
import { SpriteManager } from "../sprites";
import { ParticleRenderer } from "../systems/vfx/renderers/ParticleRenderer";
import { ProjectilePartPainter } from "../systems/vfx/renderers/painters/ProjectilePartPainter";
import { ENV_SPRITE } from "../../constants";
import { HexLayout } from "../../types";
import { UnitRenderSystem } from "../systems/unit";

export class RenderDispatcher {
    public static dispatch(
        ctx: CanvasRenderingContext2D, 
        op: RenderOp, 
        layout: HexLayout, 
        globalTime: number,
        unitRenderer: UnitRenderSystem,
        drape?: GroundDrapeLayer
    ) {
        const snapX = Math.round(op.tx);
        const snapY = Math.round(op.ty);

        switch (op.type) {
            case RenderOpType.TERRAIN:
                // [FIX] 為掉落的地塊計算淡出透明度
                let finalAlpha = op.alpha;
                if (op.z < 0) {
                    // 掉落深度越深，透明度越低 (從 0 到 -1000 掉落)
                    finalAlpha = Math.max(0, 1.0 - (Math.abs(op.z) / 800));
                }
                TerrainRenderer.drawBlock(ctx, snapX, snapY, op.tsize, op.th, op.ttheme, op.ttype, globalTime, layout, finalAlpha, op.tq, op.tr, op.tEdge, op.tBase);
                TerrainRenderer.drawTerrainDetail(ctx, snapX, snapY, op.th, op.ttype, op.tdetail, op.tq, op.tr, globalTime, layout, op.ttheme, finalAlpha);
                // Draw base overlays (status, zones, lights, presence)
                GridOverlays.drawOverlays(ctx, snapX, snapY, op.th, op.tsize, op.oStatus, op.oDanger, op.oLightCol, op.oLightInt, false, '', false, false, false, op.oHasUnit, op.tq, op.tr, op.time, layout);
                // 貼地鋪設特效：裁切到這格頂面（RenderSpec §9）
                if (drape) drape.drawOnTile(ctx, op, snapX, snapY, layout, globalTime);
                break;

            case RenderOpType.OVERLAY:
                // Draw indicators (range, hover, warning, last stand)
                GridOverlays.drawOverlays(ctx, snapX, snapY, op.th, op.tsize, undefined, undefined, null, 0, op.oRange, op.oRangeCol, op.oHover, op.oWarning, op.oLastStand, false, op.tq, op.tr, op.time, layout);
                break;

            case RenderOpType.HAZARD: 
                // [FIX] Pass layout to HazardPainter
                if (op.oHazard) HazardPainter.draw(ctx, snapX, snapY, op.oHazard, op.time, layout);
                break;

            case RenderOpType.OBSTACLE:
                ctx.drawImage(SpriteManager.getObstacleSprite(op.ttype, layout), snapX - ENV_SPRITE.ANCHOR_X, snapY - ENV_SPRITE.ANCHOR_Y);
                break;

            case RenderOpType.UNIT:
            case RenderOpType.CORPSE:
                // [ARCH] 統一分發至 UnitRenderSystem 進行狀態組裝（Alive Body 或 Death Ragdoll）
                if (op.agent) unitRenderer.drawAssembly(ctx, op.agent, snapX, snapY, op.time, op.uSelected, op.uSilhouette, layout, op.th, op.simDt, op.unitFrame);
                break;

            case RenderOpType.AURA:
                if (op.agent) unitRenderer.drawAura(ctx, op.agent, snapX, snapY, op.time, layout, op.unitFrame);
                break;

            case RenderOpType.VFX:
                if (op.particle) {
                    ctx.save();
                    ctx.translate(snapX, snapY);
                    // Pass globalTime (BattleTime) to renderer to sync rotations
                    ParticleRenderer.drawSingleParticle(ctx, op.particle, 0, 0, op.vProgress, layout, globalTime);
                    ctx.restore();
                }
                break;

            case RenderOpType.PROJECTILE:
                ProjectilePartPainter.draw(ctx, op);
                break;
        }
    }
}
