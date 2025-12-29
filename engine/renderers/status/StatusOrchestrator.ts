
import { Agent } from "../../game";
import { ShieldPainter } from "./painters/ShieldPainter";
import { OverheadPainter } from "./painters/OverheadPainter";
import { GroundEffectPainter } from "./painters/GroundEffectPainter";
import { StateModelPainter } from "./painters/StateModelPainter";
import { VisualMath } from "../../math/VisualMath";

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
            const py = agent.py;
            const pz = agent.physics.z;
            
            const terrainH = getTerrainHeight(agent.q, agent.r);
            const visualFloorY = py - terrainH; 
            
            // 優先處理放逐/凝滯
            if (agent.banished) {
                StateModelPainter.drawBanishment(ctx, agent, px, visualFloorY, pz, globalTime);
                continue;
            }

            // 1. 地面鎖定效果 (Root/Burning)
            GroundEffectPainter.draw(ctx, agent, px, visualFloorY, pz, globalTime);
            
            // 2. 護盾 (貼合身體 Center)
            ShieldPainter.draw(ctx, agent, px, visualFloorY, pz, globalTime);
            
            // 3. 頭頂圖標 (浮動 Anchor)
            OverheadPainter.draw(ctx, agent, px, visualFloorY, pz, globalTime);
        }
    }
}
