
// ╔══════════════════════════════════════════════════════════╗
// ║  AnimationSystem — 單位動畫狀態機                        ║
// ║  職責：根據 Agent 狀態設定 AnimState（IDLE/MOVE/DEAD）   ║
// ║  上游：GameEngine.tick（hp/移動狀態讀取）                 ║
// ║  下游：UnitBodyPainter 消費 AnimState 決定繪製幀          ║
// ║  [ARCH] SSOT：AnimState 的設定只在此系統，不得在外部直改 ║
// ╚══════════════════════════════════════════════════════════╝

import { Agent, GameEngine } from "../game";
import { AnimState, ActionState } from "../../types";



export class AnimationSystem {
    public update(dt: number, engine: GameEngine) {
        for (const agent of engine.agents) {
            // 1. Update Visual Timers
            if (agent.view.hitFlashTimer > 0) {
                agent.view.hitFlashTimer -= dt;
            }

            // 1.1 Decay Visual Offset (Damping)
            if (agent.view.visualOffset.x !== 0 || agent.view.visualOffset.y !== 0) {
                agent.view.visualOffset.x *= (1 - 15 * dt);
                agent.view.visualOffset.y *= (1 - 15 * dt);
                if (Math.abs(agent.view.visualOffset.x) < 0.1) agent.view.visualOffset.x = 0;
                if (Math.abs(agent.view.visualOffset.y) < 0.1) agent.view.visualOffset.y = 0;
            }

            // 2. Derive Animation State (Priority Based)
            // Priority: DEAD > STUN > HIT > ACTION_STATE > IDLE
            
            if (agent.hp <= 0) {
                agent.animState = AnimState.DEAD;
                agent.view.visualStatus = 'NONE';
                
                // [ARCH] deathTimer / fullyDead 的唯一寫入者是 AgentManager.updateDeathState（累加制）。
                // 這裡只衍生動畫狀態；先前在此遞減 deathTimer 會與累加互相抵銷，造成計時永遠停在 0。
                continue;
            }

            const isDisabled = agent.effects.STUN.remaining > 0 || agent.banished || agent.effects.FEAR.remaining > 0 || agent.effects.STASIS.remaining > 0;

            // [ARCH] visualStatus 的唯一寫入者（STATE_OWNERSHIP_DESIGN P1）：CC 外觀（ccVisual，狀態域擁有）優先，
            // 其次是逃生中的 DANGER。其他系統只寫自己的欄位，不得直接寫 visualStatus。
            agent.view.visualStatus = agent.ccVisual !== 'NONE'
                ? agent.ccVisual
                : (!isDisabled && agent.actionState === ActionState.EVADING ? 'DANGER' : 'NONE');

            if (isDisabled) {
                agent.animState = AnimState.STUN;
                continue;
            }

            // Hit reaction has high priority but short duration
            if (agent.view.hitFlashTimer > 0.05) {
                agent.animState = AnimState.HIT;
                continue;
            }

            // Derive from ActionState
            switch (agent.actionState) {
                case ActionState.EVADING:
                    agent.animState = AnimState.MOVE;
                    break;
                case ActionState.WALKING:
                    agent.animState = AnimState.MOVE;
                    break;
                case ActionState.ATTACKING:
                case ActionState.CASTING:
                    agent.animState = AnimState.ATTACK;
                    break;
                case ActionState.IDLE:
                default:
                    agent.animState = agent.target ? AnimState.COMBAT_IDLE : AnimState.IDLE;
                    break;
            }

            // Override for casting specific skill types if needed
            if (agent.castingSkillIdx !== -1) {
                const castSkill = agent.skills[agent.castingSkillIdx];
                agent.animState = castSkill?.tag === 'ULT'
                    ? AnimState.CAST_ULT
                    : AnimState.ATTACK;
            }

            // Override for movement (only if not attacking or casting)
            if (agent.isMoving && agent.path.length > 0 && 
                agent.actionState !== ActionState.ATTACKING && 
                agent.actionState !== ActionState.CASTING) {
                agent.animState = AnimState.MOVE;
            }
        }
    }
}
