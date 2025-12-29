
import { Agent } from "../../game";
import { MovementType } from "../../../types";
import { HexUtils, MapConfig } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";

export interface UnitVisualState {
    agent: Agent;
    x: number;
    y: number;
    z: number;
    terrainHeight: number;
    scale: number;
    isSilhouette: boolean;
    isSelected: boolean;
    sortY: number;
    isDead: boolean;
    isVisible: boolean;
}

export class UnitVisualProcessor {
    public static process(
        agent: Agent, 
        getTerrainHeight: (q: number, r: number) => number,
        mapConfig: MapConfig,
        highlightAgent: Agent | null
    ): UnitVisualState {
        const isDead = agent.hp <= 0;
        const visualX = agent.px + agent.physics.x;
        const visualY = agent.py + agent.physics.y;
        
        let terrainH = getTerrainHeight(agent.q, agent.r);
        
        // 預測插值：若正在跨越邊界，取目標格高度以防閃爍
        if (agent.isMoving && agent.path.length > 0 && agent.moveProgress > 0.5) {
            terrainH = getTerrainHeight(agent.path[0].q, agent.path[0].r);
        }

        const isSelected = (agent === highlightAgent);
        
        return {
            agent,
            x: visualX,
            y: visualY,
            z: agent.physics.z,
            terrainHeight: terrainH,
            scale: 1.0, 
            isSilhouette: false,
            isSelected,
            sortY: agent.py, // 使用穩定邏輯座標排序
            isDead,
            isVisible: !agent.fullyDead
        };
    }
}
