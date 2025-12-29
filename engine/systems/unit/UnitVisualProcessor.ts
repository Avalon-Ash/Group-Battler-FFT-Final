
import { Agent } from "../../game";
import { MovementType } from "../../../types";
import { HexUtils, MapConfig } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";

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
    sortY: number; // Explicit sort key
    
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
        
        // --- 1. COORDINATE SOURCE OF TRUTH (SSOT) ---
        // We MUST use agent.px / agent.py directly.
        // These are the FINAL world coordinates updated by MotionEngine (Logic) AND PhysicsEngine (Forces/Drift).
        // Any recalculation via logical Lerp here would violate SSOT and ignore physics (e.g. knockbacks).
        
        const visualX = agent.px + agent.physics.x; // Physics local offset usually 0 unless wobbling
        const visualY = agent.py + agent.physics.y;
        
        // --- 2. TERRAIN HEIGHT RESOLUTION ---
        let terrainH = getTerrainHeight(agent.q, agent.r);
        
        // Default Sort Key: The actual visual ground contact point (Y)
        // This ensures that if physics pushes us South (higher Y), we render IN FRONT of Northern objects.
        let sortY = visualY;

        if (agent.isMoving && agent.path.length > 0) {
            const nextHex = agent.path[0];
            
            // SMOOTH STEP LOGIC:
            // Snap visual terrain height at midpoint of movement to simulate "stepping" up/down tiers.
            if (agent.moveProgress >= 0.5) {
                terrainH = getTerrainHeight(nextHex.q, nextHex.r);
            }
            
            // SORTING STABILITY:
            // When moving between tiles, we want to avoid Z-fighting or popping behind the destination wall.
            // However, we must respect Physics displacement. 
            // If strictly following path, use Max Y of tiles.
            // If physically displaced (e.g. knocked back significantly), rely on actual Visual Y.
            
            const startPx = HexUtils.toPx(agent.q, agent.r, mapConfig);
            const endPx = HexUtils.toPx(nextHex.q, nextHex.r, mapConfig);
            
            // Calculate deviation from the "Rail" (Logical Path)
            // If deviation is high (Knockback), we trust visualY (Physics).
            // If deviation is low (Walking), we use the Max Y trick to prevent clipping into the destination slope.
            const railX = HexUtils.lerp(startPx.x, endPx.x, agent.moveProgress);
            const railY = HexUtils.lerp(startPx.y, endPx.y, agent.moveProgress);
            const deviationSq = (visualX - railX)**2 + (visualY - railY)**2;

            if (deviationSq < 100) {
                // We are on rails -> Apply Anti-Clip Sorting (Sort by lowest/frontmost tile Y)
                sortY = Math.max(startPx.y, endPx.y) + agent.physics.y;
            } else {
                // We are knocked off rails -> Trust Physics Y completely
                sortY = visualY;
            }
        }

        // --- 3. FINAL COMPOSITION ---
        // Visual Z includes Terrain Height + Physics Jump Height
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
