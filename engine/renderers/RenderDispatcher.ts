// ╔══════════════════════════════════════════════════════════╗
// ║  RenderDispatcher — 依排序後的 RenderOp 逐一繪製            ║
// ║  職責：TERRAIN 畫完地塊、細節與基礎疊層後，接著畫蓋到這格   ║
// ║        的貼地鋪設特效（GroundDrapeLayer），所以站在這格的   ║
// ║        單位（排在該格 TERRAIN 之後）棋座壓在法陣上。       ║
// ║  上游：RenderList.sort、RenderPipeline.drawWorld            ║
// ║  [ARCH] 規則見 engine/renderers/RenderSpec.ts §1、§3、§9。  ║
// ║         繪製點對齊裝置像素（setDeviceGrid／snap，§3），     ║
// ║         排序鍵 op.y 不動。                                  ║
// ║         OBSTACLE 錨點讀精靈本身（SpriteManager），不寫死。  ║
// ╚══════════════════════════════════════════════════════════╝

import { RenderOp, RenderOpType } from "./RenderList";
import type { GroundDrapeLayer } from "./GroundDrape";
import { TerrainRenderer } from "./grid/TerrainRenderer";
import { GridOverlays } from "./grid/GridOverlays";
import { HazardPainter } from "./grid/painters/HazardPainter";
import { SpriteManager } from "../sprites";
import { ParticleRenderer } from "../presentation/vfx/renderers/ParticleRenderer";
import { ProjectilePartPainter } from "../presentation/vfx/renderers/painters/ProjectilePartPainter";
import { HexLayout } from "../../types";
import { UnitRenderSystem } from "../presentation/unit";

export class RenderDispatcher {
    /**
     * 裝置像素格（每幀 setDeviceGrid 設一次）：op 的繪製點對齊「實際螢幕像素」而不是世界座標整數。
     * 以前在世界座標四捨五入，相機縮放 1.6 時每格各自偏移最多 0.8 個實際像素，格線與輪廓參差、移動時抖動（2026-10-19）。
     */
    private static gridScale = 1;
    private static gridOX = 0;
    private static gridOY = 0;

    /** 相機變換套用之後呼叫一次（RenderPipeline.drawWorld）；變換含旋轉／斜切時不對齊 */
    public static setDeviceGrid(ctx: CanvasRenderingContext2D): void {
        const t = ctx.getTransform();
        const ok = t.b === 0 && t.c === 0 && t.a > 0 && Math.abs(t.a - t.d) < 1e-6;
        RenderDispatcher.gridScale = ok ? t.a : 0;
        RenderDispatcher.gridOX = t.e;
        RenderDispatcher.gridOY = t.f;
    }

    /** 世界座標 → 對齊到最近裝置像素後的世界座標 */
    public static snap(v: number, axis: 0 | 1): number {
        const s = RenderDispatcher.gridScale;
        if (s === 0) return v;
        const o = axis === 0 ? RenderDispatcher.gridOX : RenderDispatcher.gridOY;
        return (Math.round(v * s + o) - o) / s;
    }

    public static dispatch(
        ctx: CanvasRenderingContext2D, 
        op: RenderOp, 
        layout: HexLayout, 
        globalTime: number,
        unitRenderer: UnitRenderSystem,
        drape?: GroundDrapeLayer
    ) {
        const snapX = RenderDispatcher.snap(op.tx, 0);
        const snapY = RenderDispatcher.snap(op.ty, 1);

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
                if (op.oHazard) HazardPainter.draw(ctx, snapX, snapY, op.oHazard, op.tq, op.tr, op.time, layout);
                break;

            case RenderOpType.OBSTACLE:
            {
                // 錨點＝格子中心地面點（ObstacleSpriteStore manifest；程序化退回 ENV_SPRITE）
                const ob = SpriteManager.getObstacleSprite(op.ttype, layout, op.tq, op.tr, globalTime);
                if (ob.sw !== undefined) ctx.drawImage(ob.image, ob.sx!, ob.sy!, ob.sw, ob.sh!, snapX - ob.anchorX, snapY - ob.anchorY, ob.width, ob.height);
                else ctx.drawImage(ob.image, snapX - ob.anchorX, snapY - ob.anchorY, ob.width, ob.height);
                const ov = ob.overlay;
                if (ov && ov.alpha > 0) {
                    const prevA = ctx.globalAlpha, prevOp = ctx.globalCompositeOperation;
                    ctx.globalAlpha = prevA * ov.alpha;
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.drawImage(ov.image, snapX + ov.x, snapY + ov.y, ov.width, ov.height);
                    ctx.globalAlpha = prevA;
                    ctx.globalCompositeOperation = prevOp;
                }
            }
                break;

            case RenderOpType.UNIT:
            case RenderOpType.CORPSE:
                // [ARCH] 統一分發至 UnitRenderSystem 進行狀態組裝（Alive Body 或 Death Ragdoll）
                if (op.agent) unitRenderer.drawAssembly(ctx, op.agent, snapX, snapY, op.time, op.uSelected, op.uSilhouette, layout, op.th, op.unitFrame);
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
