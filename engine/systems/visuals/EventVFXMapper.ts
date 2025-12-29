
import { GameEvent } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { HexUtils } from "../../utils";
import { VisualMath } from "../../math/VisualMath";

// Sub-Handlers
import { CombatVFXHandler } from "./handlers/CombatVFXHandler";
import { UnitVFXHandler } from "./handlers/UnitVFXHandler";
import { CinematicVFXHandler } from "./handlers/CinematicVFXHandler";

export interface Point3D { x: number; y: number; z: number; }

export class EventVFXMapper {

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem
    ) {
        // 1. Resolve Spatial Context
        const origin = this.resolvePoint(event.pos.x, event.pos.y, event.sourceId, engine);
        let target = this.resolvePoint(event.pos.x, event.pos.y, event.targetId, engine);
        
        const groundHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const groundZ = grid.getTerrainHeight(groundHex.q, groundHex.r, engine);

        if (!event.targetId) target.z = groundZ + 20;

        // 2. Route to specialized atomic handlers
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
                CinematicVFXHandler.handle(event, engine, vfx, origin, target);
                break;
        }
    }

    private resolvePoint(defaultX: number, defaultY: number, agentId: string | undefined, engine: GameEngine): Point3D {
        if (agentId) {
            const agent = engine.agents.find(a => a.id === agentId);
            if (agent) return VisualMath.getUnitAnchor(agent, engine);
        }
        const hex = HexUtils.fromPx(defaultX, defaultY, engine.mapConfig);
        const terrainH = engine.map.getTerrainHeight(hex.q, hex.r);
        return { x: defaultX, y: defaultY, z: terrainH };
    }
}
