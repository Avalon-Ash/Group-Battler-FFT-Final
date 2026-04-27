
import { GameEngine } from "../../game";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { VFXSystem } from "../vfx";
import { MapConfig } from "../../utils";
import { Camera } from "../../systems/CameraSystem";
import { VisualMath } from "../../math/VisualMath";
import { isChaosStyle } from "./utils";
import { ProjectileRenderer } from "./renderers/ProjectileRenderer";

import { VFX_RENDER } from "../../../constants";

const GROUND_PROJECTION_TYPES = new Set([
    'GIANT_HEX', 'MAGIC_CIRCLE', 'RING', 'SHOCKWAVE', 
    'BLAST', 'HEX_GLOW', 'GRID_FIELD', 'CRACKS', 'BLACK_HOLE',
    'PILLAR', 'DOMAIN'
]);

export class VFXRenderer {
    public submitRenderables(
        renderList: RenderList,
        engine: GameEngine,
        vfx: VFXSystem,
        getTerrainHeight: (q: number, r: number) => number,
        mapConfig: MapConfig,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE',
        viewport?: { width: number, height: number, camera: Camera } 
    ) {
        let cullMinX = -Infinity, cullMaxX = Infinity, cullMinY = -Infinity, cullMaxY = Infinity;
        
        const PAD_X = 1200;
        const PAD_Y_TOP = 2500; 
        const PAD_Y_BOT = 1200;

        if (viewport) {
            const { width, height, camera } = viewport;
            const viewW = width / camera.zoom;
            const viewH = height / camera.zoom;
            cullMinX = camera.x - (viewW / 2) - PAD_X;
            cullMaxX = camera.x + (viewW / 2) + PAD_X;
            cullMinY = camera.y - (viewH / 2) - PAD_Y_TOP;
            cullMaxY = camera.y + (viewH / 2) + PAD_Y_BOT;
        }

        vfx.state.particles.forEach(p => {
            if (p.delay && p.delay > 0) return;
            if (p.x < cullMinX || p.x > cullMaxX || p.y < cullMinY || p.y > cullMaxY) return;

            // Use SSOT Math
            const offset = VisualMath.getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 1500) return;

            const op = renderList.next();
            op.type = RenderOpType.VFX;
            
            const isGroundLocked = GROUND_PROJECTION_TYPES.has(p.type);
            const isUlt = (p as any).pIsUlt || p.type === 'GIANT_HEX' || p.type === 'MAGIC_CIRCLE';
            
            // [FIX] Use a more aggressive sorting bias for ground locked VFX to prevent clipping
            // and ensure they are sorted correctly relative to terrain.
            if (isGroundLocked) {
                // Sort key is based on the front edge of the effect, which is closer to the camera.
                // In isometric projection, the vertical visual radius is roughly 0.5 * size.
                // We add a safety margin (+120) to ensure the effect stays on top.
                const frontEdgeY = p.y + (p.size ? p.size * 0.5 : 0) + 120;
                op.y = frontEdgeY + offset;
            } else {
                op.y = p.y + offset;
            }
            op.z = isGroundLocked
                ? Math.max(p.z + VFX_RENDER.GROUND_Z_BIAS, VFX_RENDER.GROUND_Z_BIAS)
                : p.z; 
            op.pIsUlt = isUlt; 
            op.isGround = isGroundLocked;
            
            op.particle = p;
            op.vProgress = 1 - (p.life / p.maxLife);
            op.vChaos = isChaosStyle(p.color);
            op.tx = p.x;
            
            // [FIX] Apply visual bias (Z-Layer) directly to screen Y to avoid Z-fighting
            const visualBias = isGroundLocked ? VFX_RENDER.GROUND_VISUAL_BIAS : 0;
            op.ty = p.y + offset - p.z - visualBias; 
            op.th = p.z; 
        });

        this.submitDecalLayer(renderList, vfx, mapConfig, transitionT, transitionPhase, cullMinX, cullMaxX, cullMinY, cullMaxY);
        ProjectileRenderer.submit(renderList, engine, transitionT, transitionPhase);
    }

    private submitDecalLayer(renderList: RenderList, vfx: VFXSystem, mapConfig: MapConfig, t: number, phase: any, minX: number, maxX: number, minY: number, maxY: number) {
        vfx.state.decals.forEach(d => {
            if (d.x < minX || d.x > maxX || d.y < minY || d.y > maxY) return;
            const offset = VisualMath.getTransitionOffset(d.x, d.y, mapConfig, t, phase);
            const op = renderList.next();
            op.type = RenderOpType.DECAL;
            op.y = d.y + offset + 1; 
            op.z = 2; 
            op.tx = d.x; op.ty = d.y + offset; 
            op.dColor = d.color;
            op.dScale = d.scale;
            op.dLife = d.life;
        });
    }
}
