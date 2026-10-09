
import { Agent, GameEngine } from "../../game";
import { DOT_COLORS, DAMAGE_TEXT_COLORS } from "../../../constants";
import { applyDirectDamage } from "../combat/DirectDamage";

export class EffectSystem {
    
    // Throttle visual numbers to avoid UI clutter
    private readonly FEEDBACK_INTERVAL = 0.5; 
    private feedbackTimers = new Map<string, number>();

    public reset() {
        this.feedbackTimers.clear();
    }

    public update(agent: Agent, dt: number, engine: GameEngine) {
        if (agent.hp <= 0 || agent.banished || agent.outOfBounds) return;

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
            const { absorbed, dealt: frameDamage } = applyDirectDamage(agent, damagePerSec * dt);

            // Periodic Visual Feedback
            if (dotTimer <= 0 && agent.dotDmg > 0) { 
                const rateAbsorb = absorbed / dt;
                
                if (rateAbsorb > 0) {
                    engine.events.push({ 
                        type: 'DAMAGE', 
                        pos: { x: agent.px + agent.physics.x, y: agent.py + agent.physics.y, z: agent.physics.z }, 
                        value: -Math.floor(rateAbsorb), 
                        color: DAMAGE_TEXT_COLORS.ABSORB, 
                        text: "ABSORB",
                        targetId: agent.id
                    });
                }
                
                if (frameDamage > 0 || absorbed === 0) {
                    const dotColor = DOT_COLORS[agent.dotType] || '#10b981';
                    engine.events.push({ 
                        type: 'DAMAGE', 
                        pos: { x: agent.px + agent.physics.x, y: agent.py + agent.physics.y, z: agent.physics.z }, 
                        value: -Math.floor(damagePerSec), 
                        color: dotColor, 
                        skill: { ccType: 'DOT', dotType: agent.dotType },
                        targetId: agent.id
                    });
                }
                engine.log(null, 'HAZARD', '持續傷害', agent.id, `受到 ${Math.floor(damagePerSec)} 傷害 (護盾抵擋 ${Math.floor(rateAbsorb)}) (${agent.dotType})`);
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
                    pos: { x: agent.px + agent.physics.x, y: agent.py + agent.physics.y, z: agent.physics.z }, 
                    value: Math.floor(healPerSec), 
                    color: DAMAGE_TEXT_COLORS.HEAL,
                    targetId: agent.id
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
