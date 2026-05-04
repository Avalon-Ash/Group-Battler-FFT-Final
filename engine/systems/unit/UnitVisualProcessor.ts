import { Agent } from "../../game";
import { MapConfig } from "../../utils";

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
        
        // 核心：使用邏輯網格位置作為高度真理
        const tq = agent.dragOverQ ?? agent.q;
        const tr = agent.dragOverR ?? agent.r;
        const terrainH = getTerrainHeight(tq, tr);
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
            sortY: agent.py, 
            isDead,
            isVisible: !agent.fullyDead
        };
    }
}