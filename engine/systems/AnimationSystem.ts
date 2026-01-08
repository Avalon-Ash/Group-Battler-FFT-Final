
import { Agent, GameEngine } from "../game";
import { AnimState } from "../../types";

export class AnimationSystem {
    public update(dt: number, engine: GameEngine) {
        for (const agent of engine.agents) {
            // 1. Update Visual Timers
            if (agent.hitFlashTimer > 0) {
                agent.hitFlashTimer -= dt;
            }

            // 2. Derive Animation State (Priority Based)
            // Priority: DEAD > STUN > HIT > ATTACK > MOVE > IDLE
            
            if (agent.hp <= 0) {
                agent.animState = AnimState.DEAD;
                continue;
            }

            if (agent.stunTimer > 0 || agent.banished || agent.fearTimer > 0) {
                agent.animState = AnimState.STUN;
                continue;
            }

            // Hit reaction has high priority but short duration
            if (agent.hitFlashTimer > 0.05) {
                agent.animState = AnimState.HIT;
                continue;
            }

            if (agent.castingSkillIdx !== -1) {
                agent.animState = AnimState.ATTACK;
                continue;
            }

            if (agent.isMoving && agent.path.length > 0) {
                agent.animState = AnimState.MOVE;
                continue;
            }

            // Default State
            agent.animState = agent.target ? AnimState.COMBAT_IDLE : AnimState.IDLE;
        }
    }
}
