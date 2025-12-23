
import { GameEngine } from "../../game";
import { AssetManager } from "../../assets";
import { RenderableItem } from "../grid";
import { SceneTheme } from "../../../types";
import { VFXSystem } from "../vfx";
import { MapConfig } from "../../utils";

// Modules
import { getTransitionOffset, isChaosStyle } from "./utils";
import { ProjectileRenderer } from "./renderers/ProjectileRenderer";
import { ParticleRenderer } from "./renderers/ParticleRenderer";

export class VFXRenderer {

    // --- Rendering Collections ---
    // Items here are sorted by Y with units and terrain (World Space)
    public collectRenderables(
        engine: GameEngine,
        vfx: VFXSystem,
        getTerrainHeight: (q: number, r: number) => number,
        mapConfig: MapConfig,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ): RenderableItem[] {
        const list: RenderableItem[] = [];

        // 1. Decals (Ground Level)
        vfx.state.decals.forEach(d => {
            const offsetY = getTransitionOffset(d.x, d.y, mapConfig, transitionT, transitionPhase);
            const drawY = d.y + offsetY;
            if (drawY > d.y + 800) return;

            list.push({
                y: drawY, z: 0,
                draw: (ctx) => {
                    const img = AssetManager.getBlastZone(d.color);
                    ctx.save();
                    ctx.translate(d.x, drawY);
                    ctx.scale(d.scale, d.scale);
                    ctx.globalAlpha = Math.min(1, d.life);
                    ctx.drawImage(img, -64, -32, 128, 64);
                    ctx.restore();
                }
            });
        });

        // 2. Physical Particles (Sorted with World)
        // Move SPRITE, SHARD, DEBRIS, CHIP here so they interact with depth correctly
        vfx.state.particles.forEach(p => {
            if (p.delay && p.delay > 0) return;
            // Only Physical types that should be occluded by units
            if (['SPRITE', 'SHARD', 'DEBRIS', 'CHIP', 'SMOKE'].includes(p.type)) {
                
                const offset = getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
                if (offset > 800) return;

                const progress = 1 - (p.life / p.maxLife);
                const isChaos = isChaosStyle(p.color);
                
                // Sorting Y is the Ground Y (p.y). 
                // We add a small z-bias (5) so they appear slightly "in front" of the tile center if sitting on it
                // We subtract p.z from visual drawing, but for sorting, we use the ground projection mostly
                list.push({
                    y: p.y + offset, 
                    z: 5, 
                    draw: (ctx) => {
                        const originalY = p.y;
                        p.y = originalY + offset - p.z; // Apply Z height and transition for drawing
                        ParticleRenderer.drawSingleParticle(ctx, p, progress, isChaos);
                        p.y = originalY; // Restore
                    }
                });
            }
        });

        // 3. Projectiles (Delegated)
        list.push(...ProjectileRenderer.collect(engine, getTerrainHeight, transitionT, transitionPhase));

        return list;
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
            
            // Skip physical types handled in collectRenderables
            if (['SPRITE', 'SHARD', 'DEBRIS', 'CHIP', 'SMOKE'].includes(p.type)) return;

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
