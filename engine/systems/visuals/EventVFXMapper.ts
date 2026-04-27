
import { GameEvent, Point } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { SequenceSystem } from "./SequenceSystem";
import { HexUtils } from "../../utils";
import { VisualMath, Point3D } from "../../math/VisualMath";
import { VISUAL_ANCHORS } from "../../../constants";

// Sub-Handlers
import { CombatVFXHandler } from "./handlers/CombatVFXHandler";
import { UnitVFXHandler } from "./handlers/UnitVFXHandler";
import { CinematicVFXHandler } from "./handlers/CinematicVFXHandler";

export class EventVFXMapper {

    public process(
        event: GameEvent, 
        engine: GameEngine, 
        vfx: VFXSystem, 
        grid: GridSystem, 
        camera: CameraSystem,
        sequences: SequenceSystem
    ) {
        // 1. Resolve Spatial Context
        const origin = this.resolvePoint(event.pos, event.sourceId, engine);
        let target = this.resolvePoint(event.pos, event.targetId, engine);
        
        if (Math.abs(origin.x) < 0.1 && Math.abs(origin.y) < 0.1) {
            console.warn(`[VFX] Origin is 0,0. EventType: ${event.type}. SourceId: ${event.sourceId}, Pos: ${event.pos.x},${event.pos.y}`);
        }
        if (Math.abs(target.x) < 0.1 && Math.abs(target.y) < 0.1) {
            console.warn(`[VFX] Target is 0,0. EventType: ${event.type}. TargetId: ${event.targetId}, Pos: ${event.pos.x},${event.pos.y}`);
        }

        const groundHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const groundZ = engine.getTerrainHeight(groundHex.q, groundHex.r);

        // SSOT Fix: Use standard center offset for generic targets (approximate chest height)
        if (!event.targetId) target.z = groundZ + VISUAL_ANCHORS.CENTER_OFFSET;

        // 2. Route to specialized atomic handlers
        switch (event.type) {
            case 'DAMAGE': 
            case 'HEAL':
            case 'PROJECTILE_HIT': 
            case 'IMPACT_AOE':
                CombatVFXHandler.handle(event, vfx, camera, target, groundZ);
                break;

            case 'PROJECTILE_SPAWN':
                vfx.playEffect('FX_MUZZLE_FLASH', origin.x, origin.y, origin.z, event.color, groundZ);
                break;

            case 'DEATH':
            case 'SPAWN':
            case 'CAST_BREAK':
                UnitVFXHandler.handle(event, engine, vfx, camera, origin, groundZ);
                break;

            case 'VISUAL_SLASH':
            case 'VISUAL_BEAM':
                CinematicVFXHandler.handle(event, engine, vfx, origin, target, sequences);
                break;
                
            case 'HAZARD_SPAWN':
                if (event.text) { // We stored VFX ID in 'text' field
                    vfx.playEffect(event.text, event.pos.x, event.pos.y, groundZ);
                }
                break;
        }
    }

    private resolvePoint(eventPos: Point, agentId: string | undefined, engine: GameEngine): Point3D {
        if (agentId) {
            const agent = engine.agents.find(a => a.id === agentId);
            if (agent) return VisualMath.getUnitAnchor(agent, engine);
        }
        const hex = HexUtils.fromPx(eventPos.x, eventPos.y, engine.mapConfig);
        const terrainH = engine.getTerrainHeight(hex.q, hex.r);
        return { x: eventPos.x, y: eventPos.y, z: eventPos.z !== undefined ? eventPos.z : terrainH };
    }
}
