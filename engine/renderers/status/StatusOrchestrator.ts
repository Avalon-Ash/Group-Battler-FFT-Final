
import { Agent } from "../../game";
import { ShieldPainter } from "./painters/ShieldPainter";
import { OverheadPainter } from "./painters/OverheadPainter";
import { GroundEffectPainter } from "./painters/GroundEffectPainter";
import { StateModelPainter } from "./painters/StateModelPainter";
import { VisualMath } from "../../math/VisualMath";
import { HexLayout } from "../../../types";

/**
 * ECS Status Orchestrator v11.6
 * 負責所有單位狀態特效的座標解算與渲染分發
 */
export class StatusOrchestrator {

    public draw(
        ctx: CanvasRenderingContext2D, 
        agents: Agent[], 
        globalTime: number,
        getTerrainHeight: (q: number, r: number) => number,
        layout: HexLayout = 'FLAT'
    ) {
        for (const agent of agents) {
            // 跳過已徹底消失的單位
            if (agent.hp <= 0 && agent.fullyDead) continue;
            
            // 基礎幾何解算 (SSOT)
            const px = agent.px + agent.physics.x;
            const py = agent.py + agent.physics.y;
            const pz = agent.physics.z;
            
            const terrainH = getTerrainHeight(agent.q, agent.r);
            const visualFloorY = py - terrainH; 
            
            // 核心數學：解算身體中心點（用於護盾與包裹類特效）
            const bodyCenterY = VisualMath.getVisualBodyCenterY(visualFloorY, pz);

            // 1. 放逐/凝滯 (最高級狀態覆蓋)
            if (agent.banished) {
                StateModelPainter.drawBanishment(ctx, agent, px, bodyCenterY, globalTime);
                continue; // 處於放逐狀態時通常不顯示其他 UI 特效
            }

            // 2. 地面鎖定效果 (Root/Burning)
            // 強制腳底偏置：-5px 確保在地板之上且在 Token 之下
            GroundEffectPainter.draw(ctx, agent, px, visualFloorY - pz, globalTime, layout);
            
            // 3. 護盾 (Volumetric Shell)
            // 護盾必須跟隨 bodyCenterY
            ShieldPainter.draw(ctx, agent, px, bodyCenterY, globalTime, layout);
            
            // 4. 頭頂狀態圖標 (Floating HUD)
            // 圖標高度 = 中心點 - 模型高度偏移
            OverheadPainter.draw(ctx, agent, px, bodyCenterY, globalTime);
        }
    }
}
