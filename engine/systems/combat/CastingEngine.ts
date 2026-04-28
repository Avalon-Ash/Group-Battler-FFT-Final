
import { Agent, GameEngine } from "../../game";
import { AIState } from "../../../types";

export class CastingEngine {

    public updateCasting(a: Agent, dt: number, engine: GameEngine, onComplete: (a: Agent) => void) {
        // 1. 硬控場檢查 (Interrupt Priority)
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
        
        // 2. 動態轉向 (Sticky Targeting)：確保攻擊動作始終朝向目標
        if (a.target) {
            const dx = a.target.px - a.px;
            if (Math.abs(dx) > 2) { // 避免高頻抖動
                a.facing = dx > 0 ? 1 : -1;
            }
        }

        // 3. 詠唱進度積分
        a.castTimer -= dt;
        if (a.castingAnimationTimer > 0) a.castingAnimationTimer -= dt; 
        
        if (a.castTimer <= 0) {
            onComplete(a);
            this.resetCaster(a, true);
        }
    }

    public handleInterruption(a: Agent, engine: GameEngine) {
        if (a.hp <= 0) {
            this.resetCaster(a);
            return;
        }

        const skillIdx = a.castingSkillIdx;
        const currentSkill = skillIdx !== -1 ? a.skills[skillIdx] : null;

        // [FIX] Only log/effect if not in recent interrupt cooldown to prevent spam
        if (a._interruptCooldown <= 0 && currentSkill) {
            a._interruptCooldown = 0.1; // 100ms lockout for interrupts
            
            if (currentSkill.tag !== 'BASIC') {
                const progressPct = 1 - (a.castTimer / currentSkill.cast);
                engine.log(a, 'CC', '中斷', currentSkill.name, `詠唱被打斷 (進度: ${Math.floor(progressPct * 100)}%)`);
                
                // [FIX] Infinite Casting: Apply a small penalty CD to the skill if interrupted 
                // prevents immediate re-cast loop when stuttering or under partial CC
                a.curCDs[skillIdx] = Math.max(a.curCDs[skillIdx] || 0, 0.5);
                
                engine.events.push({ 
                    type: 'CAST_BREAK', 
                    pos: { x: a.px, y: a.py }, 
                    value: progressPct,
                    color: currentSkill.color, 
                    skill: currentSkill,
                    sourceId: a.id 
                });
            }
        }

        // [CRITICAL] Always reset caster state even if cooldown-throttled
        this.resetCaster(a);
    }

    private resetCaster(a: Agent, fromCompletion: boolean = false) {
        a.castingSkillIdx = -1;
        a.castTimer = 0;
        a.castingAnimationTimer = 0;
        if (fromCompletion) {
            a._castCompleteCooldown = 0.15; // [FIX] Lockout to prevent instant re-cast loop
        }
        // [FIX] Ensure aiState doesn't remain in CASTING state
        if (
            a.aiState === AIState.CASTING_ULT ||
            a.aiState === AIState.CASTING_ACTIVE ||
            a.aiState === AIState.CASTING_BASIC
        ) {
            a.aiState = AIState.IDLE;
        }
    }
}
