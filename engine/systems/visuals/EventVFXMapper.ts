
import { GameEvent, Point } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../grid";
import { CameraSystem } from "../CameraSystem";
import { SequenceSystem } from "./SequenceSystem";
import { HexUtils } from "../../utils";
import { VisualMath, Point3D } from "../../math/VisualMath";
import { VISUAL_ANCHORS } from "../../../constants";

import { HAZARD_VISUALS } from "../../../data/vfx/hazard_visuals";

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
        // 施法／發射起點＝棋座核心（死亡、出生等「發生在單位身上」的效果仍用 origin 身體中心）
        const castOrigin = this.resolveCastOrigin(origin, event.sourceId, engine);
        let target = this.resolvePoint(event.pos, event.targetId, engine);
        
        const groundHex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
        const hexKey = HexUtils.key(groundHex);
        const groundZ = engine.getTerrainHeight(groundHex.q, groundHex.r);

        // SSOT Fix: Use standard center offset for generic targets (approximate chest height)
        if (!event.targetId) target.z = groundZ + VISUAL_ANCHORS.CENTER_OFFSET;

        // 2. Route to specialized atomic handlers
        switch (event.type) {
            case 'DAMAGE': 
                CombatVFXHandler.handle(event, vfx, camera, target, groundZ, hexKey);
                break;
            case 'HEAL':
            case 'PROJECTILE_HIT': 
            case 'IMPACT_AOE':
            case 'HIT_FX':
                CombatVFXHandler.handle(event, vfx, camera, target, groundZ, hexKey);
                break;

            case 'PROJECTILE_SPAWN':
                vfx.playEffect('FX_MUZZLE_FLASH', castOrigin.x, castOrigin.y, castOrigin.z, event.color, groundZ, undefined, hexKey);
                break;

            case 'DEATH':
            case 'SPAWN':
            case 'CAST_BREAK':
                UnitVFXHandler.handle(event, engine, vfx, camera, origin, groundZ, hexKey);
                break;

            case 'VISUAL_SLASH':
            case 'VISUAL_BEAM':
                CinematicVFXHandler.handle(event, engine, vfx, castOrigin, target, sequences);
                break;
                
            case 'HAZARD_SPAWN':
                if (event.text) {
                    const hazardType = event.text.replace('FX_HAZARD_FIELD_', '');
                    const burstVfx = HAZARD_VISUALS[hazardType]?.spawnVfx || event.text;
                    vfx.playEffect(burstVfx, event.pos.x, event.pos.y, groundZ, undefined, undefined, undefined, hexKey);
                }
                break;

            case 'GROUND_IMPACT':
                if (event.text === 'LOCKED') {
                    vfx.playEffect('FX_LAST_STAND_LOCKED', event.pos.x, event.pos.y, 0, event.color || '#c084fc', groundZ);
                }
                break;
        }
    }

    private resolveCastOrigin(bodyOrigin: Point3D, sourceId: string | undefined, engine: GameEngine): Point3D {
        if (!sourceId) return bodyOrigin;
        const agent = engine.agents.find(a => a.id === sourceId);
        if (!agent || agent.hp <= 0 || agent.banished) return bodyOrigin;
        return VisualMath.getCoreAnchor(agent, engine);
    }

    private resolvePoint(eventPos: Point, agentId: string | undefined, engine: GameEngine): Point3D {
        if (agentId) {
            // Hazard IDs (HZD-xxx) 不在 agents 裡，直接跳過 agent 查詢
            if (agentId.startsWith('HZD-') || agentId.startsWith('ground-')) {
                const hex = HexUtils.fromPx(eventPos.x, eventPos.y, engine.mapConfig);
                const terrainH = engine.getTerrainHeight(hex.q, hex.r);
                return {
                    x: eventPos.x,
                    y: eventPos.y,
                    z: eventPos.z !== undefined ? eventPos.z : terrainH
                };
            }

            const agent = engine.agents.find(a => a.id === agentId);
            if (agent) {
                // 死亡 agent 的物理狀態已不可靠，直接用事件紀錄的 pos 作為最後位置。
                // 單位事件的 pos.z 是相對腳下地面的 physics.z（SkillExecutor／EffectSystem 等），不是世界高度：
                // 必須加回地形高度，否則致命一擊的受擊特效會畫在高台底下（RenderSpec「事件座標」）。
                if (agent.hp <= 0 || agent.banished) {
                    const hex = HexUtils.fromPx(eventPos.x, eventPos.y, engine.mapConfig);
                    const terrainH = engine.getTerrainHeight(hex.q, hex.r);
                    return {
                        x: eventPos.x,
                        y: eventPos.y,
                        z: terrainH + (eventPos.z ?? 0) + VISUAL_ANCHORS.CENTER_OFFSET
                    };
                }
                return VisualMath.getUnitAnchor(agent, engine);
            }
        }
        const hex = HexUtils.fromPx(eventPos.x, eventPos.y, engine.mapConfig);
        const terrainH = engine.getTerrainHeight(hex.q, hex.r);
        return { x: eventPos.x, y: eventPos.y, z: eventPos.z !== undefined ? eventPos.z : terrainH };
    }
}
