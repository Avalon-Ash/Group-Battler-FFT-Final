
import { Agent, GameEngine } from "../game";
import { AnimState } from "../../types";

export class StatusSystem {
    
    public update(agent: Agent, dt: number, engine: GameEngine) {
        // 1. Cooldowns
        agent.curCDs = agent.curCDs.map(c => Math.max(0, c - dt));

        // 2. Control Timers
        if (agent.stunTimer > 0) agent.stunTimer -= dt;
        if (agent.silenceTimer > 0) agent.silenceTimer -= dt;
        
        // 3. Banish Logic
        if (agent.banishTimer > 0) {
            agent.banishTimer -= dt;
            if (agent.banishTimer <= 0) {
                agent.banished = false;
                engine.log(agent, '放逐結束', null, '返回');
            }
        }

        // 4. Diminishing Returns (DR) Reset Logic
        // Iterating keys of Record<string, number>
        for (const type in agent.drTimers) {
            if (agent.drTimers.hasOwnProperty(type)) {
                agent.drTimers[type] -= dt;
                if (agent.drTimers[type] <= 0) {
                    // Reset DR stack for this CC type
                    agent.drStacks[type] = 0;
                    delete agent.drTimers[type];
                    // Optional: Visual cue for DR reset could go here
                }
            }
        }

        // 5. Spawn Animation Timer
        if (agent.spawnTimer > 0) {
            agent.spawnTimer -= dt;
        }
        
        // 6. Visual State Reset
        if (agent.visualStatus === 'FROZEN' && agent.stunTimer <= 0) agent.visualStatus = 'NONE';
        if (agent.visualStatus === 'POLYMORPH' && !agent.banished) agent.visualStatus = 'NONE';
        if (agent.visualStatus === 'STASIS' && !agent.banished) agent.visualStatus = 'NONE';

        // 7. DoT (Damage over Time)
        if (agent.dotTimer > 0) {
            agent.dotTimer -= dt;
            agent.hp -= agent.dotDmg * dt;
            // Visual feedback throttling (random chance per tick to avoid spamming events)
            if (Math.random() < 0.05) { 
                engine.events.push({ 
                    type: 'DAMAGE', 
                    pos: {x: agent.px, y: agent.py}, 
                    value: -Math.round(agent.dotDmg), 
                    color: '#10b981' 
                });
                agent.hitFlashTimer = 0.1;
            }
        }

        // 8. HoT (Heal over Time)
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

        // 9. Animation State Reset
        // If not stunned, not banished, not moving, and not casting -> Return to Idle
        if (agent.stunTimer <= 0 && agent.banishTimer <= 0 && !agent.isMoving && agent.castingSkillIdx === -1) {
            if (agent.target) agent.setAnim(AnimState.COMBAT_IDLE);
            else agent.setAnim(AnimState.IDLE);
        }
    }
}
