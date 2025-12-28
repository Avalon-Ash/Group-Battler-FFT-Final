
import { Agent } from "../../game";
import { ShieldPainter } from "./painters/ShieldPainter";
import { OverheadPainter } from "./painters/OverheadPainter";
import { GroundEffectPainter } from "./painters/GroundEffectPainter";
import { StateModelPainter } from "./painters/StateModelPainter";

export class StatusOrchestrator {

    public draw(ctx: CanvasRenderingContext2D, agents: Agent[], globalTime: number) {
        for (const agent of agents) {
            if (agent.hp <= 0 && agent.fullyDead) continue;
            
            const px = agent.px;
            const py = agent.py; 
            const pz = agent.physics.z; 
            
            // Banish hides everything else, render it and skip the rest
            if (agent.banished) {
                StateModelPainter.drawBanishment(ctx, agent, px, py, pz, globalTime);
                continue;
            }

            // Standard Layers
            GroundEffectPainter.draw(ctx, agent, px, py, pz, globalTime);
            ShieldPainter.draw(ctx, agent, px, py, pz, globalTime);
            OverheadPainter.draw(ctx, agent, px, py, pz, globalTime);
        }
    }
}
