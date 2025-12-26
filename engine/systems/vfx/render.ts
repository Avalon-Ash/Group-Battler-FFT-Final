
import { GameEngine } from "../../game";
import { AssetManager } from "../../assets";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { SceneTheme } from "../../../types";
import { VFXSystem } from "../vfx";
import { MapConfig } from "../../utils";

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
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        // 1. Decals (Ground Level)
        vfx.state.decals.forEach(d => {
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
            // Only Physical types that should be occluded by units
            // Added ROCK to the list
            if (['SPRITE', 'SHARD', 'DEBRIS', 'CHIP', 'SMOKE', 'GRID_FIELD', 'ROCK', 'PILLAR', 'HEX_BEAM', 'GIANT_HEX'].includes(p.type)) {
                
                const offset = getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
                if (offset > 800) return;

                const progress = 1 - (p.life / p.maxLife);
                const isChaos = isChaosStyle(p.color);
                
                const op = renderList.next();
                op.type = RenderOpType.VFX;
                
                // V6.1 FIX: Use correct sorting by Ground Y, but draw at Visual Y
                // Visual Y = GroundY - Height(z)
                // We do NOT need to look up terrain height again if `p.z` contains it (which it does now from EventVFXMapper)
                
                op.y = p.y + offset; // Sort Key (Ground Level)
                op.z = 5;
                op.sortBias = p.sortBias || 0; // Pass the bias
                
                op.particle = p;
                op.vProgress = progress;
                op.vChaos = isChaos;
                op.tx = p.x;
                op.ty = p.y + offset - p.z; // Drawing Y: Lifted by Z (Height)
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
            
            const originalY = p.y;
            p.y = drawY; 
            
            ParticleRenderer.drawSingleParticle(ctx, p, progress, isChaos);
            
            p.y = originalY; 
        });
    }
}
