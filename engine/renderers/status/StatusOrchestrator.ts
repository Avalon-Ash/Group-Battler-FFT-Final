
import { Agent } from "../../game";
import { ShieldPainter } from "./painters/ShieldPainter";
import { OverheadPainter } from "./painters/OverheadPainter";
import { GroundEffectPainter } from "./painters/GroundEffectPainter";
import { StateModelPainter } from "./painters/StateModelPainter";

export class StatusOrchestrator {

    public draw(
        ctx: CanvasRenderingContext2D, 
        agents: Agent[], 
        globalTime: number,
        getTerrainHeight: (q: number, r: number) => number
    ) {
        for (const agent of agents) {
            if (agent.hp <= 0 && agent.fullyDead) continue;
            
            const px = agent.px;
            const py = agent.py; // Ground Base Y
            const pz = agent.physics.z; // Jump Height
            
            // Critical Fix: Calculate Terrain Height to anchor visuals to the Top Face
            const terrainH = getTerrainHeight(agent.q, agent.r);
            const visualFloorY = py - terrainH; // Top of the block
            
            // Banish hides everything else, render it and skip the rest
            if (agent.banished) {
                // Pass terrainH explicitly or let the painter infer? 
                // Painters expect (x, y) as the visual anchor.
                // We standardise on passing VisualFloorY as 'y'.
                StateModelPainter.drawBanishment(ctx, agent, px, visualFloorY, pz, globalTime);
                continue;
            }

            // Standard Layers
            // Ground effects stay on the floor (ignore Jump Z for root usually? Or should root follow jump?)
            // Usually Root locks feet, so if jumping, it might look weird. But units usually don't jump when rooted.
            GroundEffectPainter.draw(ctx, agent, px, visualFloorY, pz, globalTime);
            
            // Shield wraps body
            ShieldPainter.draw(ctx, agent, px, visualFloorY, pz, globalTime);
            
            // Overhead icons float above head
            OverheadPainter.draw(ctx, agent, px, visualFloorY, pz, globalTime);
        }
    }
}
