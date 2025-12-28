
import { Agent, GameEngine } from "../../game";
import { AnimState } from "../../../types";

export class CastingEngine {

    public updateCasting(a: Agent, dt: number, engine: GameEngine, onComplete: (a: Agent) => void) {
        // 1. HARD CC INTERRUPT CHECK
        const isHardCC = a.stunTimer > 0 || a.banished || a.fearTimer > 0 || a.hp <= 0;
        
        if (isHardCC) {
            this.handleInterruption(a, engine);
            return;
        }

        if (a.silenceTimer > 0) {
            const currentSkill = a.castingSkillIdx !== -1 ? a.skills[a.castingSkillIdx] : null;
            if (currentSkill && currentSkill.tag !== 'BASIC') {
                this.handleInterruption(a, engine);
                return;
            }
        }
        
        // 2. CAST PROGRESS
        a.castTimer -= dt;
        if (a.castingAnimationTimer > 0) a.castingAnimationTimer -= dt; 
        
        if (a.castTimer <= 0) {
            onComplete(a);
            this.resetCaster(a);
        }
    }

    private handleInterruption(a: Agent, engine: GameEngine) {
        const skillIdx = a.castingSkillIdx;
        if (skillIdx !== -1 && a.castTimer > 0 && a.skills[skillIdx]) {
            const s = a.skills[skillIdx]!;
            if (s.tag !== 'BASIC') {
                engine.log(a, 'CC', '中斷', s.name, '詠唱被打斷');
                let centerPos = { x: a.px, y: a.py };
                engine.events.push({ type: 'CAST_BREAK', pos: centerPos, value: 0, color: s.color, skill: s });
            }
        }
        this.resetCaster(a);
        a.setAnim(AnimState.IDLE); 
    }

    private resetCaster(a: Agent) {
        a.castingSkillIdx = -1;
        a.castTimer = 0;
        a.castingAnimationTimer = 0;
        a.setAnim(AnimState.COMBAT_IDLE);
    }
}
