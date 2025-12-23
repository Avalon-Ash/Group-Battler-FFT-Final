
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

        // 2. Projectiles (Delegated)
        list.push(...ProjectileRenderer.collect(engine, getTerrainHeight, transitionT, transitionPhase));

        return list;
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
            
            const offset = getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
            if (offset > 800) return; 

            const progress = 1 - (p.life / p.maxLife);
            // DrawY logic included in Particle Renderer translation if needed, 
            // but we need to pass the offset-adjusted Y to the renderer.
            // However, the renderer functions assume they handle translation.
            // Let's modify the particle position temporarily or pass the adjusted Y.
            
            // To avoid mutating the particle state, we handle translation here 
            // BUT ParticleRenderer expects to handle specific sub-translations (like -20 for Pillars).
            // So we just update the Y passed to the renderer context? No, Renderer uses p.x/p.y.
            
            // Solution: We apply the global transition offset here in the context,
            // then ParticleRenderer draws at (0,0) relative to that, OR we update P copy.
            
            // Simpler: Pass the actual draw coordinate to a draw function is better, 
            // but current architecture stores state in P.
            
            // We will modify the Y in a temporary object or just translate the context here
            // BEFORE calling the renderer.
            
            const drawY = p.y + offset - p.z;
            const isChaos = isChaosStyle(p.color);
            
            // We temporarily override P.y for the draw call to ensure it draws at the transition offset
            // efficient way: just translate context to the draw position and tell renderer to draw at 0,0 relative?
            // ParticleRenderer uses `ctx.translate(p.x, p.y...)`. 
            // Let's create a proxy particle or just modify the draw call to accept x/y overrides.
            // For now, to minimize changes to the signature, let's mutate a temporary clone if needed, 
            // OR just let the ParticleRenderer handle the `p` object but we handle the context transform?
            
            // Re-reading ParticleRenderer: It does `ctx.translate(p.x, p.y)`. 
            // Let's update ParticleRenderer to accept an override Y if we want to be clean, 
            // OR just rely on the fact that we can cheat by modifying p temporarily (unsafe).
            
            // SAFEST: Let's manually translate the context by the offset, 
            // and tell ParticleRenderer to draw `p` but assuming `p.y` is 0-relative? No that breaks logic.
            
            // Let's update ParticleRenderer to take x/y arguments! 
            // Actually, I already refactored ParticleRenderer to use p.x/p.y inside.
            // I will cheat slightly: I will mutate p.y, draw, then restore it. 
            // It's single threaded JS, it's fine for this frame.
            
            const originalY = p.y;
            p.y = drawY; // Apply transition offset & Z
            
            // Note: p.z is already handled in drawY calculation above? 
            // The original code was: `const drawY = p.y + offset - p.z;`
            // Then `ctx.translate(p.x, drawY);`
            // The new ParticleRenderer does `ctx.translate(p.x, p.y);`
            // So setting `p.y = drawY` works perfectly.
            
            ParticleRenderer.drawSingleParticle(ctx, p, progress, isChaos);
            
            p.y = originalY; // Restore
        });
    }
}
