
import { GameEngine } from "../../game";
import { AssetManager } from "../../assets";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { SceneTheme } from "../../../types";
import { VFXSystem } from "../vfx";
import { MapConfig } from "../../utils";
import { Camera } from "../../systems/CameraSystem";

// Modules
import { getTransitionOffset, isChaosStyle } from "./utils";
import { ProjectileRenderer } from "./renderers/ProjectileRenderer";
import { ParticleRenderer } from "./renderers/ParticleRenderer";

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
        // CULLING SETUP
        let cullMinX = -Infinity, cullMaxX = Infinity, cullMinY = -Infinity, cullMaxY = Infinity;
        
        if (viewport) {
            const { width, height, camera } = viewport;
            const pad = 200;
            const viewW = width / camera.zoom;
            const viewH = height / camera.zoom;
            cullMinX = camera.x - (viewW / 2) - pad;
            cullMaxX = camera.x + (viewW / 2) + pad;
            cullMinY = camera.y - (viewH / 2) - pad;
            cullMaxY = camera.y + (viewH / 2) + pad;
        }

        // 1. Decals (Ground Level)
        vfx.state.decals.forEach(d => {
            if (d.x < cullMinX || d.x > cullMaxX || d.y < cullMinY || d.y > cullMaxY) return;

            const offset = getTransitionOffset(d.x, d.y, mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 800) return;

            const drawY = d.y + offset;

            const op = renderList.next();
            op.type = RenderOpType.DECAL;
            op.y = drawY; op.z = 0;
            op.tx = d.x; op.ty = drawY; 
            op.dColor = d.color;
            op.dScale = d.scale;
            op.dLife = d.life;
        });

        // 2. Physical Particles (Sorted)
        vfx.state.particles.forEach(p => {
            if (p.delay && p.delay > 0) return;
            
            if (p.x < cullMinX || p.x > cullMaxX || p.y < cullMinY || p.y > cullMaxY) return;

            if (['SPRITE', 'SHARD', 'DEBRIS', 'CHIP', 'SMOKE', 'GRID_FIELD', 'ROCK', 'PILLAR', 'HEX_BEAM', 'GIANT_HEX', 'SHOCKWAVE', 'BLAST', 'RING', 'CRACKS', 'MAGIC_CIRCLE'].includes(p.type)) {
                
                const offset = getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
                if (Math.abs(offset) > 800) return;

                const progress = 1 - (p.life / p.maxLife);
                const isChaos = isChaosStyle(p.color);
                
                const op = renderList.next();
                op.type = RenderOpType.VFX;
                
                // Sort Key (Ground Level with Offset)
                op.y = p.y + offset; 
                op.z = 5;
                op.sortBias = p.sortBias || 0; 
                
                op.particle = p;
                op.vProgress = progress;
                op.vChaos = isChaos;
                op.tx = p.x;
                
                // ALIGNMENT FIX:
                // p.z contains Total Height (Terrain + Offset).
                // p.y contains Ground Y.
                // We want to draw at Visual Y = GroundY - TotalZ.
                
                op.ty = p.y + offset - p.z; 
                op.th = p.z; 
            }
        });

        // 3. Projectiles
        ProjectileRenderer.submit(renderList, engine, getTerrainHeight, transitionT, transitionPhase);
    }

    public drawTopLayerParticles(
        ctx: CanvasRenderingContext2D, 
        vfx: VFXSystem,
        scene: SceneTheme,
        mapConfig: MapConfig,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        vfx.state.particles.forEach(p => {
            if (p.delay && p.delay > 0) return;
            
            if (['SPRITE', 'SHARD', 'DEBRIS', 'CHIP', 'SMOKE', 'GRID_FIELD', 'ROCK', 'PILLAR', 'HEX_BEAM', 'GIANT_HEX', 'SHOCKWAVE', 'BLAST', 'RING', 'CRACKS', 'MAGIC_CIRCLE'].includes(p.type)) return;

            const offset = getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 800) return; 

            const progress = 1 - (p.life / p.maxLife);
            
            // ALIGNMENT FIX: 
            // Consistent Visual Y calculation
            const drawY = p.y + offset - p.z;
            
            const isChaos = isChaosStyle(p.color);
            
            ParticleRenderer.drawSingleParticle(ctx, p, p.x, drawY, progress, isChaos);
        });
    }
}
