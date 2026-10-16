import { Agent } from "../../game";
import { MapConfig } from "../../utils";
import { VisualMath } from "../../math/VisualMath";

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
        
        // 核心：腳下地面高度的唯一定義在 VisualMath.getUnitGroundHeight（編輯模式拖曳預覽例外：直接取游標所在格）
        const isDragPreview = agent.dragOverQ !== null || agent.dragOverR !== null;
        const terrainH = isDragPreview
            ? getTerrainHeight(agent.dragOverQ ?? agent.q, agent.dragOverR ?? agent.r)
            : VisualMath.getUnitGroundHeight(agent, getTerrainHeight);
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