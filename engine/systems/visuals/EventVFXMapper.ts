
import { GameEvent } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { UNIT_BODY_OFFSET } from "../../../constants";

// Sub-Handlers
import { CombatVFXHandler } from "./handlers/CombatVFXHandler";
import { UnitVFXHandler } from "./handlers/UnitVFXHandler";
import { CinematicVFXHandler } from "./handlers/CinematicVFXHandler";

// Types
export interface Point3D { x: number; y: number; z: number; }

export class EventVFXMapper {

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem
    ) {
        // 1. Resolve Spatial Context with Full 3D Logic
        const origin = this.resolvePoint(event.pos.x, event.pos.y, event.sourceId, engine, grid);
        let target = this.resolvePoint(event.pos.x, event.pos.y, event.targetId, engine, grid);
        
        // Resolve Pure Ground Z for effects that must sit on the floor
        const groundHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const groundZ = grid.getTerrainHeight(groundHex.q, groundHex.r, engine);

        // Fallback for non-unit targets (ground click actions)
        if (!event.targetId) target.z = groundZ + 20;

        // 2. Route to Specialized Handlers
        switch (event.type) {
            
            case 'DAMAGE': 
            case 'PROJECTILE_HIT': 
            case 'IMPACT_AOE':
                CombatVFXHandler.handle(event, vfx, camera, target, groundZ);
                break;

            case 'DEATH':
            case 'SPAWN':
            case 'CAST_BREAK':
                UnitVFXHandler.handle(event, engine, vfx, camera, origin, groundZ);
                break;

            case 'VISUAL_SLASH':
            case 'VISUAL_BEAM':
                CinematicVFXHandler.handle(event, engine, vfx, grid, camera, origin, target);
                break;
        }
    }

    private resolvePoint(defaultX: number, defaultY: number, agentId: string | undefined, engine: GameEngine, grid: GridSystem): Point3D {
        let agent = agentId ? engine.agents.find(a => a.id === agentId) : null;

        // If ID matches, snap to that unit's physical center
        if (agent) {
            const terrainH = grid.getTerrainHeight(agent.q, agent.r, engine);
            return {
                x: agent.px,
                y: agent.py,
                // Critical: Target is Chest Height (Terrain + PhysZ + Offset)
                z: terrainH + agent.physics.z + UNIT_BODY_OFFSET
            };
        }

        // Otherwise, resolve terrain height at the event coordinates
        const hex = HexUtils.fromPx(defaultX, defaultY, engine.mapConfig);
        const terrainH = grid.getTerrainHeight(hex.q, hex.r, engine);
        
        return { x: defaultX, y: defaultY, z: terrainH };
    }
}
