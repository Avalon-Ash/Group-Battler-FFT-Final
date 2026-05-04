
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
            if (agent.hitFlashTimer > 0) {
                agent.hitFlashTimer -= dt;
            }

            // 1.1 Decay Visual Offset (Damping)
            if (agent.visualOffset.x !== 0 || agent.visualOffset.y !== 0) {
                agent.visualOffset.x *= (1 - 15 * dt);
                agent.visualOffset.y *= (1 - 15 * dt);
                if (Math.abs(agent.visualOffset.x) < 0.1) agent.visualOffset.x = 0;
                if (Math.abs(agent.visualOffset.y) < 0.1) agent.visualOffset.y = 0;
            }

            // 2. Derive Animation State (Priority Based)
            // Priority: DEAD > STUN > HIT > ACTION_STATE > IDLE
            
            if (agent.hp <= 0) {
                agent.animState = AnimState.DEAD;
                agent.visualStatus = 'NONE';
                
                if (agent.deathTimer > 0) {
                    agent.deathTimer -= dt;
                } else if (!agent.fullyDead && agent.deadLogged) {
                    agent.fullyDead = true;
                }
                continue;
            }

            if (agent.stunTimer > 0 || agent.banished || agent.fearTimer > 0) {
                agent.animState = AnimState.STUN;
                agent.visualStatus = agent.banished ? 'STASIS' : 'NONE';
                continue;
            }

            // Hit reaction has high priority but short duration
            if (agent.hitFlashTimer > 0.05) {
                agent.animState = AnimState.HIT;
                continue;
            }

            // Derive from ActionState
            switch (agent.actionState) {
                case ActionState.EVADING:
                    agent.animState = AnimState.MOVE;
                    agent.visualStatus = 'DANGER';
                    break;
                case ActionState.WALKING:
                    agent.animState = AnimState.MOVE;
                    agent.visualStatus = 'NONE';
                    break;
                case ActionState.ATTACKING:
                case ActionState.CASTING:
                    agent.animState = AnimState.ATTACK;
                    agent.visualStatus = 'NONE';
                    break;
                case ActionState.IDLE:
                default:
                    agent.animState = agent.target ? AnimState.COMBAT_IDLE : AnimState.IDLE;
                    agent.visualStatus = 'NONE';
                    break;
            }

            // Override for casting specific skill types if needed
            if (agent.castingSkillIdx !== -1) {
                agent.animState = AnimState.ATTACK;
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
