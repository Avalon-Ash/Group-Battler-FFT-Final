
import { Agent, GameEngine } from "../../game";

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
            this.resetCaster(a);
        }
    }

    public handleInterruption(a: Agent, engine: GameEngine) {
        if (a.hp <= 0) {
            this.resetCaster(a);
            return;
        }

        const skillIdx = a.castingSkillIdx;
        if (skillIdx !== -1 && a.castTimer > 0 && a.skills[skillIdx]) {
            const s = a.skills[skillIdx]!;
            if (s.tag !== 'BASIC') {
                // 計算進度比：進度越高，中斷爆炸越強
                const progressPct = 1 - (a.castTimer / s.cast);
                
                engine.log(a, 'CC', '中斷', s.name, `詠唱被打斷 (進度: ${Math.floor(progressPct * 100)}%)`);
                
                // 傳遞精確的 3D 位置與進度參數，並補上 sourceId
                engine.events.push({ 
                    type: 'CAST_BREAK', 
                    pos: { x: a.px, y: a.py }, 
                    value: progressPct, // 這裡重用 value 傳遞進度
                    color: s.color, 
                    skill: s,
                    sourceId: a.id 
                });
            }
        }
        this.resetCaster(a);
    }

    private resetCaster(a: Agent) {
        a.castingSkillIdx = -1;
        a.castTimer = 0;
        a.castingAnimationTimer = 0;
    }
}
