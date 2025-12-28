
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
    sortY: number; // New: Explicit sort key
    
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
        let logicalX = 0;
        let logicalY = 0;
        let terrainH = 0;
        let sortY = 0;

        if (agent.isMoving && agent.path.length > 0) {
            const startPx = HexMath.hexToPixel(agent.q, agent.r, mapConfig.offsetX, mapConfig.offsetY);
            const nextHex = agent.path[0];
            const endPx = HexMath.hexToPixel(nextHex.q, nextHex.r, mapConfig.offsetX, mapConfig.offsetY);
            
            // Re-calculate lerp to ensure it matches motion engine visual exactly
            logicalX = startPx.x + (endPx.x - startPx.x) * agent.moveProgress;
            logicalY = startPx.y + (endPx.y - startPx.y) * agent.moveProgress;
            
            const startH = getTerrainHeight(agent.q, agent.r);
            const endH = getTerrainHeight(nextHex.q, nextHex.r);
            
            // STEP LOGIC: Snap height at midpoint to assume "stepping up/down" the block
            // This prevents the unit from clipping through the wall of a higher block or floating diagonally.
            terrainH = agent.moveProgress < 0.5 ? startH : endH;
            
            // SORT LOGIC: When moving, always sort in front of BOTH the start and end tiles.
            // In isometric, larger Y = Front.
            // We set the sort key to the 'most front' tile involved in the move.
            sortY = Math.max(startPx.y, endPx.y);

        } else {
            const pos = HexMath.hexToPixel(agent.q, agent.r, mapConfig.offsetX, mapConfig.offsetY);
            logicalX = pos.x;
            logicalY = pos.y;
            terrainH = getTerrainHeight(agent.q, agent.r);
            sortY = logicalY;
        }

        // Apply visual physics offsets
        const visualX = logicalX + agent.physics.x;
        // visualY corresponds to the Ground Base Y
        const visualY = logicalY + agent.physics.y; 
        const visualZ = terrainH + agent.physics.z; 

        // Apply physics to sort key too (e.g. knocked forward)
        sortY += agent.physics.y;

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
