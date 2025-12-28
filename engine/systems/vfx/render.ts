
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
        viewport?: { width: number, height: number, camera: Camera } // Optional for culling
    ) {
        // CULLING SETUP
        let cullMinX = -Infinity, cullMaxX = Infinity, cullMinY = -Infinity, cullMaxY = Infinity;
        
        if (viewport) {
            const { width, height, camera } = viewport;
            // Visible Window in World Coordinates
            // Pad by 200px to account for particle size
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

            const offsetY = getTransitionOffset(d.x, d.y, mapConfig, transitionT, transitionPhase);
            const drawY = d.y + offsetY;
            if (drawY > d.y + 800) return;

            const op = renderList.next();
            op.type = RenderOpType.DECAL;
            op.y = drawY; op.z = 0;
            op.tx = d.x; op.ty = drawY; // Reuse tx/ty for pos
            op.dColor = d.color;
            op.dScale = d.scale;
            op.dLife = d.life;
        });

        // 2. Physical Particles (Sorted with World)
        vfx.state.particles.forEach(p => {
            if (p.delay && p.delay > 0) return;
            
            // FRUSTUM CULLING
            if (p.x < cullMinX || p.x > cullMaxX || p.y < cullMinY || p.y > cullMaxY) return;

            // Only Physical types that should be occluded by units
            if (['SPRITE', 'SHARD', 'DEBRIS', 'CHIP', 'SMOKE', 'GRID_FIELD', 'ROCK', 'PILLAR', 'HEX_BEAM', 'GIANT_HEX'].includes(p.type)) {
                
                const offset = getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
                if (offset > 800) return;

                const progress = 1 - (p.life / p.maxLife);
                const isChaos = isChaosStyle(p.color);
                
                const op = renderList.next();
                op.type = RenderOpType.VFX;
                
                // V6.1 FIX: Use correct sorting by Ground Y, but draw at Visual Y
                // Visual Y = GroundY - Height(z)
                op.y = p.y + offset; // Sort Key (Ground Level)
                op.z = 5;
                op.sortBias = p.sortBias || 0; 
                
                // Z-FIGHTING FIX: Lift giant flat effects slightly
                let visualLift = 0;
                if (p.type === 'GIANT_HEX' || p.type === 'GRID_FIELD' || p.type === 'DOMAIN') {
                    visualLift = 5; 
                }

                op.particle = p;
                op.vProgress = progress;
                op.vChaos = isChaos;
                op.tx = p.x;
                op.ty = p.y + offset - p.z - visualLift; // Drawing Y
                op.th = p.z; // Height used for shadow calc
            }
        });

        // 3. Projectiles (Delegated)
        ProjectileRenderer.submit(renderList, engine, getTerrainHeight, transitionT, transitionPhase);
    }

    // Items here are drawn ON TOP of everything (Overlay VFX like flashes, text, magic circles)
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
            
            // Filter out physicals already drawn
            if (['SPRITE', 'SHARD', 'DEBRIS', 'CHIP', 'SMOKE', 'GRID_FIELD', 'ROCK', 'PILLAR', 'HEX_BEAM', 'GIANT_HEX'].includes(p.type)) return;

            const offset = getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
            if (offset > 800) return; 

            const progress = 1 - (p.life / p.maxLife);
            const drawY = p.y + offset - p.z;
            const isChaos = isChaosStyle(p.color);
            
            ParticleRenderer.drawSingleParticle(ctx, p, p.x, drawY, progress, isChaos);
        });
    }
}
