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
        let sortY = visualY;
        if (agent.isMoving && agent.path.length > 0) {
            const nextHex = agent.path[0];
            if (agent.moveProgress >= 0.5) {
                terrainH = getTerrainHeight(nextHex.q, nextHex.r);
            }
            const startPx = HexUtils.toPx(agent.q, agent.r, mapConfig);
            const endPx = HexUtils.toPx(nextHex.q, nextHex.r, mapConfig);
            const railX = HexUtils.lerp(startPx.x, endPx.x, agent.moveProgress);
            const railY = HexUtils.lerp(startPx.y, endPx.y, agent.moveProgress);
            const deviationSq = (visualX - railX)**2 + (visualY - railY)**2;
            if (deviationSq < 100) {
                sortY = Math.max(startPx.y, endPx.y) + agent.physics.y;
            } else {
                sortY = visualY;
            }
        }
        const visualZ = terrainH + agent.physics.z; 
        const isSelected = (agent === highlightAgent);
        return {
            agent,
            x: visualX,
            y: visualY,
            z: visualZ,
            terrainHeight: terrainH,
            scale: 1.0, 
            isSilhouette: false,
            isSelected,
            sortY,
            isDead,
            isVisible: !agent.fullyDead
        };
    }
}