
import { Agent, GameEngine } from "../../game";

export class EffectSystem {
    
    // Throttle visual numbers to avoid UI clutter
    private readonly FEEDBACK_INTERVAL = 0.5; 
    private feedbackTimers = new Map<string, number>();

    public update(agent: Agent, dt: number, engine: GameEngine) {
        if (agent.hp <= 0 || agent.banished) return;

        const dotKey = agent.id + '_dot';
        const hotKey = agent.id + '_hot';
        let dotTimer = this.feedbackTimers.get(dotKey) || 0;
        let hotTimer = this.feedbackTimers.get(hotKey) || 0;
        dotTimer -= dt;
        hotTimer -= dt;

        // 1. Damage over Time (DoT)
        // Mathematically apply damage per second
        if (agent.dotTimer > 0) {
            agent.dotTimer = Math.max(0, agent.dotTimer - dt);
            
            const damagePerSec = agent.dotDmg;
            let frameDamage = damagePerSec * dt;
            
            // Shield Mitigation logic (Standardized)
            let absorbed = 0;
            if (agent.shield > 0) {
                absorbed = Math.min(agent.shield, frameDamage);
                agent.shield -= absorbed;
                frameDamage -= absorbed;
            }
            
            if (frameDamage > 0) {
                agent.hp -= frameDamage;
            }

            // Periodic Visual Feedback
            if (dotTimer <= 0 && agent.dotDmg > 0) { 
                const rateAbsorb = absorbed / dt;
                
                if (rateAbsorb > 0) {
                    engine.events.push({ type: 'DAMAGE', pos: {x: agent.px, y: agent.py}, value: -Math.floor(rateAbsorb), color: '#bae6fd', text: "ABSORB" });
                }
                
                if (frameDamage > 0 || absorbed === 0) {
                    engine.events.push({ 
                        type: 'DAMAGE', 
                        pos: {x: agent.px, y: agent.py}, 
                        value: -Math.floor(damagePerSec), 
                        color: '#10b981', // Poison Green default
                        skill: { ccType: 'DOT' } as any 
                    });
                }
                engine.log(null, 'HAZARD', '持續傷害', agent.id, `受到 ${Math.floor(damagePerSec)} 傷害 (護盾抵擋 ${Math.floor(rateAbsorb)}) (中毒)`);
                agent.hitFlashTimer = 0.1;
                dotTimer = this.FEEDBACK_INTERVAL; // 無論有無 HoT 都先 reset
                this.feedbackTimers.set(dotKey, dotTimer);
            }
        }

        // 2. Heal over Time (HoT)
        if (agent.hotTimer > 0) {
            agent.hotTimer = Math.max(0, agent.hotTimer - dt);
            
            const healPerSec = agent.hotVal;
            const frameHeal = healPerSec * dt;
            
            agent.hp = Math.min(agent.maxHp, agent.hp + frameHeal);
            
            // Periodic Visual Feedback
            if (hotTimer <= 0 && agent.hotVal > 0) {
                engine.events.push({ 
                    type: 'HEAL', 
                    pos: {x: agent.px, y: agent.py}, 
                    value: Math.floor(healPerSec), 
                    color: '#86efac' 
                });
                engine.log(null, 'HEAL', '持續治療', agent.id, `回復 ${Math.floor(healPerSec)} HP (再生)`);
                // Reset timer now
                hotTimer = this.FEEDBACK_INTERVAL;
                this.feedbackTimers.set(hotKey, hotTimer);
            }
        }
        
        // Update timer if we didn't reset it in either block
        if (dotTimer > 0 && dotTimer !== this.FEEDBACK_INTERVAL) {
            this.feedbackTimers.set(dotKey, dotTimer);
        } else if (dotTimer <= 0) {
            this.feedbackTimers.set(dotKey, this.FEEDBACK_INTERVAL);
        }

        if (hotTimer > 0 && hotTimer !== this.FEEDBACK_INTERVAL) {
            this.feedbackTimers.set(hotKey, hotTimer);
        } else if (hotTimer <= 0) {
            this.feedbackTimers.set(hotKey, this.FEEDBACK_INTERVAL);
        }
    }
}
