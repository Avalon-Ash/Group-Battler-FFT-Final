
import { GameEvent, Point, Team } from "../../../types";
import { GameEngine } from "../../game";
import { VFXSystem } from "../vfx";
import { GridSystem } from "../../systems/grid";
import { CameraSystem } from "../CameraSystem";
import { SequenceSystem } from "./SequenceSystem";
import { HexUtils } from "../../utils";
import { VisualMath, Point3D } from "../../math/VisualMath";
import { VISUAL_ANCHORS, VFX_BUDGET } from "../../../constants";

import { HAZARD_VISUALS } from "../../../data/vfx/hazard_visuals";

// Sub-Handlers
import { CombatVFXHandler } from "./handlers/CombatVFXHandler";
import { UnitVFXHandler } from "./handlers/UnitVFXHandler";
import { CinematicVFXHandler } from "./handlers/CinematicVFXHandler";

export class EventVFXMapper {
    /** 同一幀內每個危害場已播的生成爆發數（HazardSystem 每格各送一次 HAZARD_SPAWN；換幀就清） */
    private hazardBurstTime = -1;
    private hazardBursts = new Map<string, number>();

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

            case 'PROJECTILE_SPAWN': {
                // 零件不吃 colorOverride：出手閃光分陣營兩個鍵（data/vfx/registry/shared_parts.ts）
                const muzzleRed = engine.agents.find(a => a.id === event.sourceId)?.team === Team.RED;
                vfx.playEffect(muzzleRed ? 'FX_MUZZLE_FLASH_RED' : 'FX_MUZZLE_FLASH_BLUE', castOrigin.x, castOrigin.y, castOrigin.z, event.color, groundZ, undefined, hexKey);
                break;
            }

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
                if (event.text && this.allowHazardBurst(event.targetId, engine.battleTime)) {
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

    /**
     * 大範圍危害場（如半徑 10 的毒沼）一次送上百格 HAZARD_SPAWN，每格各播一次爆發會吃光粒子預算、擠掉同時命中的奧義特效。
     * 每個危害場每幀只播前 VFX_BUDGET.HAZARD_SPAWN_BURSTS_PER_FIELD 格（由中心往外）；場地本身的持續畫面不受影響
     */
    private allowHazardBurst(hazardId: string | undefined, battleTime: number): boolean {
        if (battleTime !== this.hazardBurstTime) {
            this.hazardBurstTime = battleTime;
            this.hazardBursts.clear();
        }
        const key = hazardId ?? '';
        const n = this.hazardBursts.get(key) ?? 0;
        this.hazardBursts.set(key, n + 1);
        return n < VFX_BUDGET.HAZARD_SPAWN_BURSTS_PER_FIELD;
    }

    private resolveCastOrigin(bodyOrigin: Point3D, sourceId: string | undefined, engine: GameEngine): Point3D {
        if (!sourceId) return bodyOrigin;
        const agent = engine.agents.find(a => a.id === sourceId);
        if (!agent || agent.hp <= 0 || agent.banished) return bodyOrigin;
        return VisualMath.getCoreAnchor(agent, engine);
    }

    /** 事件座標解析。pos.z 若存在是世界高度，沒有則查該格高度；活著的單位一律走 getUnitAnchor。 */
    public resolvePoint(eventPos: Point, agentId: string | undefined, engine: GameEngine): Point3D {
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
                // pos.z 一律是世界高度（腳下絕對高度，含空中高度；EventPos.unitEventPos），不可再加地形高度；
                // 沒有 z 才查該格高度。再加身體中心偏移（RenderSpec §3 事件座標）。
                if (agent.hp <= 0 || agent.banished) {
                    const hex = HexUtils.fromPx(eventPos.x, eventPos.y, engine.mapConfig);
                    const terrainH = engine.getTerrainHeight(hex.q, hex.r);
                    return {
                        x: eventPos.x,
                        y: eventPos.y,
                        z: (eventPos.z ?? terrainH) + VISUAL_ANCHORS.CENTER_OFFSET
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
