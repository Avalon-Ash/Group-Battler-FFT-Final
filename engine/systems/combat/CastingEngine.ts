
// ╔══════════════════════════════════════════════════════════╗
// ║  CastingEngine — 單位詠唱與中斷狀態管理                 ║
// ║  職責：判斷何時中斷、派發 CAST_BREAK；欄位由狀態機寫    ║
// ║  上游：CombatSystem.update / breakCast                    ║
// ║  下游：engine.events (CAST_BREAK) → VisualSystem        ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent, GameEngine } from "../../game";
import { isActionBlocked } from "../../core/Effects";
import { advanceWindup, applyInterruptPenalty, endWindup } from "./SkillStateMachine";
import { CAST_LOCKOUT, CAST_RULES } from "../../../constants";
import { unitEventPos } from "../../events/EventPos";
import { EventPool } from "../../events/GameEventPool";
import { sameSide } from '../../core/Allegiance';

export type BreakCastContext = Pick<GameEngine, 'log' | 'events' | 'getTerrainHeight' | 'mapConfig'>;

export class CastingEngine {

    public updateCasting(a: Agent, dt: number, engine: GameEngine, onComplete: (a: Agent) => void) {
        // 1. 硬控場檢查 (Interrupt Priority)
        const isHardCC = isActionBlocked(a, 'CAST') || a.hp <= 0;
        
        if (isHardCC) {
            this.handleInterruption(a, engine);
            return;
        }

        if (isActionBlocked(a, 'SKILL')) {
            const currentSkill = a.castingSkillIdx !== -1 ? a.skills[a.castingSkillIdx] : null;
            if (currentSkill && currentSkill.tag !== 'BASIC') {
                this.handleInterruption(a, engine);
                return;
            }
        }
        
        // 2. 動態轉向 (Sticky Targeting)：確保攻擊動作始終朝向目標
        if (a.target) {
            const dx = a.target.px - a.px;
            if (Math.abs(dx) > 2) { // 避免高頻抖動
                a.facing = dx > 0 ? 1 : -1;
            }
        }

        // 3. 詠唱進度積分
        if (advanceWindup(a, dt)) {
            onComplete(a);
            this.resetCaster(a, true);
        }
    }

    public handleInterruption(a: Agent, engine: BreakCastContext) {
        if (a.hp <= 0) {
            const skillIdx = a.castingSkillIdx;
            const currentSkill = skillIdx !== -1 ? a.skills[skillIdx] : null;
            if (currentSkill && currentSkill.tag !== 'BASIC' && currentSkill.cast > 0) {
                const progressPct = 1 - (a.castTimer / currentSkill.cast);
                const ev = EventPool.get('CAST_BREAK', unitEventPos(a, engine), {
                    sourceId: a.id,
                    team: a.team,
                    skill: currentSkill,
                    color: currentSkill.color,
                    value: progressPct,
                    hexes: currentSkill.type === 'AOE' && a.currentTelegraph ? a.currentTelegraph : undefined,
                });
                engine.events.push(ev);
            }
            this.resetCaster(a);
            return;
        }

        const skillIdx = a.castingSkillIdx;
        const currentSkill = skillIdx !== -1 ? a.skills[skillIdx] : null;

        // [FIX] Only log/effect if not in recent interrupt cooldown to prevent spam
        if (a._interruptCooldown <= 0 && currentSkill) {
            applyInterruptPenalty(a, skillIdx, currentSkill);
            
            if (currentSkill.tag !== 'BASIC') {
                const progressPct = 1 - (a.castTimer / currentSkill.cast);
                engine.log(a, 'CC', '中斷', currentSkill.name, `詠唱被打斷 (進度: ${Math.floor(progressPct * 100)}%)`);
                
                
                engine.events.push({ 
                    type: 'CAST_BREAK', 
                    pos: unitEventPos(a, engine), 
                    value: progressPct,
                    color: currentSkill.color, 
                    skill: currentSkill,
                    sourceId: a.id,
                    team: a.team,
                    hexes: currentSkill.type === 'AOE' && a.currentTelegraph ? a.currentTelegraph : undefined
                });
            }
        }

        // [CRITICAL] Always reset caster state even if cooldown-throttled
        this.resetCaster(a);
    }

    private resetCaster(a: Agent, fromCompletion: boolean = false) {
        endWindup(a, fromCompletion);
        a.currentTelegraph = null;
        if (a.target && sameSide(a.target, a)) {
            a.forceAiUpdate = true;
        }
        // aiState 不再存 CASTING_*（castingSkillIdx 歸 -1 即結束施法狀態，P7b），不必還原
    }
}
