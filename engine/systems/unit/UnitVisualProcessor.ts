
import { Agent } from "../../game";
import { MovementType } from "../../../types";
import { HexUtils, MapConfig } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";
import { HexMath } from "../../math/HexMath";

export interface UnitVisualState {
    agent: Agent;
    
    // Position (Screen Space / Render Space)
    x: number;
    y: number; // Ground Y (Base of the tile unit is standing on)
    z: number; // Height (Terrain + Physics)
    
    // Derived
    terrainHeight: number;
    scale: number;
    isSilhouette: boolean;
    isSelected: boolean;
    
    // Flags
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
        
        // 1. Interpolate Ground Position (Lerp if moving)
        // Use HexMath for consistency
        let logicalX = 0;
        let logicalY = 0;
        let terrainH = 0;

        if (agent.isMoving && agent.path.length > 0) {
            const startPx = HexMath.hexToPixel(agent.q, agent.r, mapConfig.offsetX, mapConfig.offsetY);
            const nextHex = agent.path[0];
            const endPx = HexMath.hexToPixel(nextHex.q, nextHex.r, mapConfig.offsetX, mapConfig.offsetY);
            
            // Re-calculate lerp to ensure it matches motion engine visual exactly
            logicalX = startPx.x + (endPx.x - startPx.x) * agent.moveProgress;
            logicalY = startPx.y + (endPx.y - startPx.y) * agent.moveProgress;
            
            const startH = getTerrainHeight(agent.q, agent.r);
            const endH = getTerrainHeight(nextHex.q, nextHex.r);
            terrainH = startH + (endH - startH) * agent.moveProgress;
        } else {
            const pos = HexMath.hexToPixel(agent.q, agent.r, mapConfig.offsetX, mapConfig.offsetY);
            logicalX = pos.x;
            logicalY = pos.y;
            terrainH = getTerrainHeight(agent.q, agent.r);
        }

        // Apply visual physics offsets
        const visualX = logicalX + agent.physics.x;
        const visualY = logicalY + agent.physics.y; // This is the GROUND Y used for sorting
        const visualZ = terrainH + agent.physics.z; // Total Height

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
            isDead,
            isVisible: !agent.fullyDead
        };
    }
}
