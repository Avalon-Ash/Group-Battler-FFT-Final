
import { Agent, GameEngine } from "../game";
import { AnimState } from "../../types";

export class StatusSystem {
    
    public update(agent: Agent, dt: number, engine: GameEngine) {
        // 1. Cooldowns (Always tick, mental recovery happens even in banish)
        agent.curCDs = agent.curCDs.map(c => Math.max(0, c - dt));

        // 2. Diminishing Returns (DR) Reset Logic (Meta-game mechanic, keeps ticking)
        for (const type in agent.drTimers) {
            if (agent.drTimers.hasOwnProperty(type)) {
                agent.drTimers[type] -= dt;
                if (agent.drTimers[type] <= 0) {
                    agent.drStacks[type] = 0;
                    delete agent.drTimers[type];
                }
            }
        }

        // 3. Spawn Animation Timer (Always tick)
        if (agent.spawnTimer > 0) {
            agent.spawnTimer -= dt;
        }

        // 4. Banish Logic (The Gatekeeper)
        // If Banished, we PAUSE all other physical/magical statuses
        if (agent.banishTimer > 0) {
            agent.banishTimer -= dt;
            if (agent.banishTimer <= 0) {
                agent.banished = false;
                engine.log(agent, 'CC', '放逐結束', '重返戰場');
            } else {
                // *** TIME STOP EFFECT ***
                // Standard Banish stops time for buffs/debuffs.
                // Exception: STASIS/INVULN usually implies we wiped the debuffs on entry,
                // so pausing them at 0 is fine.
                // Exception: POLYMORPH is a curse, it usually ticks down.
                
                if (agent.visualStatus === 'POLYMORPH') {
                    // Sheep keep ticking (it's just a disable)
                } else {
                    // Standard Banish / Stasis: PAUSE.
                    // Return early to skip the rest of the update
                    return;
                }
            }
        }

        // 5. Control Timers (Only if present in reality)
        if (agent.stunTimer > 0) agent.stunTimer -= dt;
        if (agent.silenceTimer > 0) agent.silenceTimer -= dt;
        
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
        // Condition: Not Stunned, Not Banished, Not Moving, Not Casting
        // AND Not currently in Hit Recovery (hitFlashTimer)
        if (agent.stunTimer <= 0 && agent.banishTimer <= 0 && !agent.isMoving && agent.castingSkillIdx === -1 && agent.hitFlashTimer <= 0) {
            if (agent.target) agent.setAnim(AnimState.COMBAT_IDLE);
            else agent.setAnim(AnimState.IDLE);
        }
    }
}
