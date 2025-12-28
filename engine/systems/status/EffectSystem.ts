
import { Agent, GameEngine } from "../../game";

export class EffectSystem {
    
    // Throttle visual numbers to avoid UI clutter
    private readonly FEEDBACK_INTERVAL = 0.5; 
    private feedbackTimers = new Map<string, number>();

    public update(agent: Agent, dt: number, engine: GameEngine) {
        if (agent.hp <= 0 || agent.banished) return;

        const feedbackKey = agent.id;
        let timer = this.feedbackTimers.get(feedbackKey) || 0;
        timer -= dt;

        // 1. Damage over Time (DoT)
        // Mathematically apply damage per second
        if (agent.dotTimer > 0) {
            agent.dotTimer = Math.max(0, agent.dotTimer - dt);
            
            const damagePerSec = agent.dotDmg;
            let frameDamage = damagePerSec * dt;
            
            // Shield Mitigation logic (Standardized)
            if (agent.shield > 0) {
                const absorbed = Math.min(agent.shield, frameDamage);
                agent.shield -= absorbed;
                frameDamage -= absorbed;
            }
            
            if (frameDamage > 0) {
                agent.hp -= frameDamage;
            }

            // Periodic Visual Feedback
            if (timer <= 0 && agent.dotDmg > 0) { 
                engine.events.push({ 
                    type: 'DAMAGE', 
                    pos: {x: agent.px, y: agent.py}, 
                    value: -Math.floor(damagePerSec), 
                    color: '#10b981', // Poison Green default
                    skill: { ccType: 'DOT' } as any 
                });
                agent.hitFlashTimer = 0.1;
                // Don't reset timer yet, wait for HoT check
            }
        }

        // 2. Heal over Time (HoT)
        if (agent.hotTimer > 0) {
            agent.hotTimer = Math.max(0, agent.hotTimer - dt);
            
            const healPerSec = agent.hotVal;
            const frameHeal = healPerSec * dt;
            
            agent.hp = Math.min(agent.maxHp, agent.hp + frameHeal);
            
            // Periodic Visual Feedback
            if (timer <= 0 && agent.hotVal > 0) {
                engine.events.push({ 
                    type: 'HEAL', 
                    pos: {x: agent.px, y: agent.py}, 
                    value: Math.floor(healPerSec), 
                    color: '#86efac' 
                });
                // Reset timer now
                this.feedbackTimers.set(feedbackKey, this.FEEDBACK_INTERVAL);
            }
        } else {
            // Update timer if we didn't reset it
            if (timer <= 0) this.feedbackTimers.set(feedbackKey, this.FEEDBACK_INTERVAL);
            else this.feedbackTimers.set(feedbackKey, timer);
        }
    }
}
