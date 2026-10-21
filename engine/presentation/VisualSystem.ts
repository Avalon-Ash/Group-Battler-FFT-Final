
// ╔══════════════════════════════════════════════════════════════════╗
// ║  VisualSystem — 視覺事件路由器 (Visual Event Facade)             ║
// ║                                                                  ║
// ║  職責：                                                          ║
// ║    接收每幀的 GameEvent[]，依事件類型路由至正確的子系統           ║
// ║    本類不持有任何外觀資料，只做分發，不做決策                     ║
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
                    // 命中對齊傷害：序列延後 (詠唱 − hitAt) 才開始；詠唱被打斷時 CAST_BREAK 取消整串（VFXSequence.hitAt）
                    const startDelay = Math.max(0, (event.skill.cast || 0) - (sequence.hitAt ?? 0));
                    sequences.run(sequence, target3D, engine, vfx, event.sourceId, startDelay);
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
