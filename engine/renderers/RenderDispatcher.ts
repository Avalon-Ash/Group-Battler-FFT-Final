import { RenderOp, RenderOpType } from "./RenderList";
import { TerrainRenderer } from "./grid/TerrainRenderer";
import { GridOverlays } from "./grid/GridOverlays";
import { HazardPainter } from "./grid/painters/HazardPainter";
import { SpriteManager } from "../sprites";
import { ParticleRenderer } from "../systems/vfx/renderers/ParticleRenderer";
import { ProjectileDrawer } from "./ProjectileDrawer";
import { AssetManager } from "../assets";
import { ENV_ANCHOR_X, ENV_ANCHOR_Y } from "../graphics/EnvironmentFactory";
import { HexLayout } from "../../types";
import { UnitRenderSystem } from "../systems/unit";

export class RenderDispatcher {
    public static dispatch(
        ctx: CanvasRenderingContext2D, 
        op: RenderOp, 
        layout: HexLayout, 
        globalTime: number,
        unitRenderer: UnitRenderSystem
    ) {
        const snapX = Math.round(op.tx);
        const snapY = Math.round(op.ty);

        switch (op.type) {
            case RenderOpType.TERRAIN:
                TerrainRenderer.drawBlock(ctx, snapX, snapY, op.tsize, op.th, op.ttheme, op.ttype, globalTime, layout);
                TerrainRenderer.drawTerrainDetail(ctx, snapX, snapY, op.th, op.ttype, op.tdetail, op.tq, op.tr, globalTime, layout, op.ttheme);
                // SSOT: Height-based projection inside
                GridOverlays.drawOverlays(ctx, snapX, snapY, op.th, op.tsize, op.oStatus, op.oDanger, op.oLightCol, op.oLightInt, op.oRange, op.oRangeCol, op.oHover, op.oHasUnit, op.tq, op.tr, op.time, layout);
                break;

            case RenderOpType.HAZARD: 
                if (op.oHazard) HazardPainter.draw(ctx, snapX, snapY, op.oHazard, op.time);
                break;

            case RenderOpType.OBSTACLE:
                ctx.drawImage(SpriteManager.getObstacleSprite(op.ttype, layout), snapX - ENV_ANCHOR_X, snapY - ENV_ANCHOR_Y);
                break;

            case RenderOpType.UNIT:
                if (op.agent) unitRenderer.drawAssembly(ctx, op.agent, snapX, snapY, op.time, op.uSelected, op.uSilhouette, layout);
                break;

            case RenderOpType.DECAL:
                ctx.save();
                ctx.translate(snapX, snapY);
                ctx.scale(op.dScale, op.dScale);
                ctx.globalAlpha = Math.min(1, op.dLife);
                ctx.drawImage(AssetManager.getBlastZone(op.dColor), -64, -32, 128, 64);
                ctx.restore();
                break;

            case RenderOpType.VFX:
                if (op.particle) {
                    ctx.save();
                    ctx.translate(snapX, snapY);
                    ParticleRenderer.drawSingleParticle(ctx, op.particle, 0, 0, op.vProgress, op.vChaos, layout);
                    ctx.restore();
                }
                break;

            case RenderOpType.PROJECTILE:
                ProjectileDrawer.draw(ctx, op, globalTime);
                break;
        }
    }
}