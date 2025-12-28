
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

/**
 * EventVFXMapper (Refactored Router)
 * 
 * Responsibility:
 * 1. Calculate Spatial Coordinates (Origin/Target/Ground)
 * 2. Route events to specialized handlers based on Type.
 * 3. NO direct rendering logic here.
 */
export class EventVFXMapper {

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem
    ) {
        // 1. Resolve Spatial Context
        const origin = this.resolvePoint(event.pos.x, event.pos.y, event.sourceId, engine, grid);
        let target = this.resolvePoint(event.pos.x, event.pos.y, event.targetId, engine, grid);
        
        // Calculate pure Ground Z for the target location
        const groundZ = grid.getTerrainHeight(
            HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig).q,
            HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig).r,
            engine
        );

        // Fallback for non-unit targets (ground click)
        if (!event.targetId) target.z = groundZ + 20;

        // 2. Route to Specialized Handlers
        switch (event.type) {
            
            // --- COMBAT EVENTS (Hits, Damage, Impacts) ---
            case 'DAMAGE': 
            case 'PROJECTILE_HIT': 
            case 'IMPACT_AOE':
                CombatVFXHandler.handle(event, vfx, camera, target, groundZ);
                break;

            // --- UNIT EVENTS (Lifecycle, Status) ---
            case 'DEATH':
            case 'SPAWN':
            case 'CAST_BREAK':
                UnitVFXHandler.handle(event, engine, vfx, camera, origin, groundZ);
                break;

            // --- CINEMATIC EVENTS (Scripts, Beams, Ults) ---
            case 'VISUAL_SLASH':
            case 'VISUAL_BEAM':
                CinematicVFXHandler.handle(event, engine, vfx, grid, camera, origin, target);
                break;
        }
    }

    private resolvePoint(defaultX: number, defaultY: number, agentId: string | undefined, engine: GameEngine, grid: GridSystem): Point3D {
        let agent = agentId ? engine.agents.find(a => a.id === agentId) : null;

        // If ID not found, check if there is an agent at that location spatially
        if (!agent && !agentId) {
            const hex = HexUtils.fromPx(defaultX, defaultY, engine.mapConfig);
            agent = engine.getAgentAt(hex.q, hex.r);
        }

        if (agent) {
            const terrainH = grid.getTerrainHeight(agent.q, agent.r, engine);
            return {
                x: agent.px,
                y: agent.py,
                // Critical: Target is Chest Height, not feet
                z: terrainH + agent.physics.z + UNIT_BODY_OFFSET
            };
        }

        const hex = HexUtils.fromPx(defaultX, defaultY, engine.mapConfig);
        const terrainH = grid.getTerrainHeight(hex.q, hex.r, engine);
        return { x: defaultX, y: defaultY, z: terrainH };
    }
}
