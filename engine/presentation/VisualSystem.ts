
// ╔══════════════════════════════════════════════════════════════════╗
// ║  VisualSystem — 視覺事件路由器 (Visual Event Facade)             ║
// ║                                                                  ║
// ║  職責：                                                          ║
// ║    接收每幀的 GameEvent[]，依事件類型路由至正確的子系統           ║
// ║    本類不持有任何外觀資料，只做分發，不做決策                     ║
// ║  [ARCH] 遵守 RenderSpec §4.1 目標錨點採樣時點規則：             ║
// ║    CAST_START 僅當單體有詠唱非投射物且目標仍在集合時傳遞綁定選項 ║
// ║    （targetId, lockAt）；AOE／投射物／天降類／無有效目標維持靜態快照 ║
// ║    天降類＝序列有 HEAVEN_FALL 動作或 ultImpactDelay > 0           ║
// ║    （ownFallObject 的天降招落下物畫在資產裡，序列沒有該動作）      ║
// ║                                                                  ║
// ║  子系統分工 (SSOT 邊界)：                                        ║
// ║    EventHUDMapper  → DAMAGE / HEAL / CC / CAST 事件 → HUDSystem  ║
// ║    EventVFXMapper  → 粒子特效事件 → VFXSystem                    ║
// ║    SequenceSystem  → CAST_START 技能序列排程                      ║
// ╚══════════════════════════════════════════════════════════════════╝

import { GameEngine } from "../game";
import { GameEvent } from "../../types";
import { VFXSystem } from "./vfx";
import { HUDSystem } from "./hud";
import { GridSystem } from "../systems/grid";
import { CameraSystem } from "./CameraSystem";
import { SequenceSystem } from "./visuals/SequenceSystem";
import { EventHUDMapper } from "./visuals/EventHUDMapper";
import { EventVFXMapper } from "./visuals/EventVFXMapper";
import { VisualMath } from "../math/VisualMath";
import { SKILL_SEQUENCES } from "../../data/vfx/SkillSequences";
import { ultImpactDelay } from "../../data/vfx/ult_visuals";
import { HexUtils } from "../utils";

export class VisualSystem {
    private hudMapper: EventHUDMapper;
    private vfxMapper: EventVFXMapper;
    constructor() {
        this.hudMapper = new EventHUDMapper();
        this.vfxMapper = new EventVFXMapper();
    }
    public reset() { this.hudMapper.reset(); }
    public flush(
        events: GameEvent[], 
        engine: GameEngine, 
        vfx: VFXSystem, 
        hud: HUDSystem, 
        grid: GridSystem,
        camera: CameraSystem,
        sequences: SequenceSystem
    ) {
        if (events.length === 0) return;
        events.forEach(event => {
            this.hudMapper.process(event, engine, hud, grid, camera);
            if (event.type === 'CAST_START' && event.skill) {
                const sequence = event.skill.id ? SKILL_SEQUENCES[event.skill.id] : undefined;
                if (sequence) {
                    const target3D = VisualMath.resolveTargetPoint(event.targetId || "", engine);
                    
                    // SSOT FIX: If target is ground or if resolution failed (e.g. target died), ensure we fall back to the event position
                    if (target3D.z === -9999 || !event.targetId || event.targetId.startsWith('ground-')) {
                        target3D.x = event.pos.x;
                        target3D.y = event.pos.y;
                        
                        // Fix: Use event position to find hex and get terrain height
                        const hex = HexUtils.fromPx(event.pos.x, event.pos.y, engine.mapConfig);
                        target3D.z = engine.getTerrainHeight(hex.q, hex.r) + 5; // Add bias to prevent ground clipping
                    }
                    // 命中對齊傷害：傷害在 詠唱＋ultImpactDelay（天降類的落下時間，其他 0）結算，序列延後 (那一刻 − hitAt) 才開始；
                    // 詠唱被打斷時 CAST_BREAK 取消整串（VFXSequence.hitAt）
                    const impactAt = (event.skill.cast || 0) + ultImpactDelay(event.skill.id);
                    const startDelay = Math.max(0, impactAt - (sequence.hitAt ?? 0));

                    // F02: 僅為 CAST_START 下符合資格的單體非投射物技能啟用動態目標綁定
                    const isEligibleSingle =
                        event.skill.type === 'SINGLE' &&
                        (event.skill.cast || 0) > 0 &&
                        (!event.skill.projectileSpeed || event.skill.projectileSpeed <= 0) &&
                        sequence.actions.every(a => a.type !== 'HEAVEN_FALL') &&
                        ultImpactDelay(event.skill.id) === 0 &&
                        Boolean(event.targetId && engine.agents.some(a => a.id === event.targetId));

                    const options = isEligibleSingle ? {
                        targetId: event.targetId,
                        lockAt: engine.battleTime + (event.skill.cast || 0),
                    } : undefined;

                    sequences.run(sequence, target3D, engine, vfx, event.sourceId, startDelay, options);
                    return; 
                }
            }
            
            if (event.type === 'CAST_BREAK' && event.sourceId) {
                sequences.cancel(event.sourceId, vfx);
                // Also let Mapper handle the particles
            }

            this.vfxMapper.process(event, engine, vfx, grid, camera, sequences);
        });
    }
}
