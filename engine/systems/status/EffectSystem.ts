
import { Agent, GameEngine } from "../../game";

export class EffectSystem {
    public update(agent: Agent, dt: number, engine: GameEngine) {
        // 1. DoT (Damage over Time)
        if (agent.dotTimer > 0) {
            agent.dotTimer -= dt;
            
            let dmg = agent.dotDmg * dt;
            
            // Shield Absorption
            if (agent.shield > 0) {
                const absorbed = Math.min(agent.shield, dmg);
                agent.shield -= absorbed;
                dmg -= absorbed;
            }
            
            if (dmg > 0) {
                agent.hp -= dmg;
            }

            // Visual Feedback (Throttled)
            if (Math.random() < 0.05) { 
                engine.events.push({ 
                    type: 'DAMAGE', 
                    pos: {x: agent.px, y: agent.py}, 
                    value: -Math.round(agent.dotDmg), 
                    color: '#10b981',
                    skill: { ccType: 'DOT' } as any 
                });
                agent.hitFlashTimer = 0.1;
            }
        }

        // 2. HoT (Heal over Time)
        if (agent.hotTimer > 0) {
            agent.hotTimer -= dt;
            agent.hp = Math.min(agent.maxHp, agent.hp + agent.hotVal * dt);
            
            if (Math.random() < 0.05) {
                engine.events.push({ 
                    type: 'HEAL', 
                    pos: {x: agent.px, y: agent.py}, 
                    value: Math.round(agent.hotVal), 
                    color: '#86efac' 
                });
            }
        }
    }
}
