
import { Agent } from "../../game";
import { MovementType } from "../../../types";
import { HexUtils, MapConfig } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";

export interface UnitVisualState {
    agent: Agent;
    
    // Position (Screen Space / Render Space)
    x: number;
    y: number; // Ground Y
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
        let logicalX = agent.px;
        let logicalY = agent.py;
        let terrainH = 0;

        if (agent.isMoving && agent.path.length > 0) {
            const startH = getTerrainHeight(agent.q, agent.r);
            const nextHex = agent.path[0];
            const endH = getTerrainHeight(nextHex.q, nextHex.r);
            terrainH = HexUtils.lerp(startH, endH, agent.moveProgress);
            // px/py are already lerped by MotionEngine, but terrainH needs to sync
        } else {
            // Stability check for idle/knockback sliding
            const logicalPos = HexUtils.toPx(agent.q, agent.r, mapConfig);
            const distSq = (agent.px - logicalPos.x)**2 + (agent.py - logicalPos.y)**2;
            
            if (distSq > 400) { 
                const visualHex = HexUtils.fromPx(agent.px, agent.py, mapConfig);
                terrainH = getTerrainHeight(visualHex.q, visualHex.r);
            } else {
                terrainH = getTerrainHeight(agent.q, agent.r);
            }
        }

        // 2. Physics & Height
        // agent.physics.x/y/z are local offsets
        // x/y are used for shake/spring
        // z is the jump/flight height
        const visualX = logicalX + agent.physics.x;
        const visualY = logicalY + agent.physics.y; // Ground Y
        const visualZ = terrainH + agent.physics.z;

        // 3. Selection
        const isSelected = (agent === highlightAgent);

        return {
            agent,
            x: visualX,
            y: visualY,
            z: visualZ,
            terrainHeight: terrainH,
            scale: 1.0, // Base scale, modified by Painter based on Role
            isSilhouette: false, // Calculated later by occlusion
            isSelected,
            isDead,
            isVisible: !agent.fullyDead
        };
    }
}
