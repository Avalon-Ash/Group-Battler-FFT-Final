
import { Agent, GameEngine } from "../game";
import { AnimState } from "../../types";
import { COMBAT_PARAM } from "../../constants";

export class StatusSystem {
    
    public update(agent: Agent, dt: number, engine: GameEngine) {
        // 1. Cooldowns
        agent.curCDs = agent.curCDs.map(c => Math.max(0, c - dt));

        // 2. Diminishing Returns (DR)
        for (const type in agent.drTimers) {
            if (agent.drTimers.hasOwnProperty(type)) {
                agent.drTimers[type] -= dt;
                if (agent.drTimers[type] <= 0) {
                    agent.drStacks[type] = 0;
                    delete agent.drTimers[type];
                }
            }
        }

        // 3. Spawn Animation
        if (agent.spawnTimer > 0) {
            agent.spawnTimer -= dt;
        }

        // 4. Banish Logic (Gatekeeper)
        if (agent.banishTimer > 0) {
            agent.banishTimer -= dt;
            if (agent.banishTimer <= 0) {
                agent.banished = false;
                engine.log(agent, 'CC', '放逐結束', null, '重返戰場');
            } else {
                if (agent.visualStatus === 'POLYMORPH') {
                    // Sheep keep ticking
                } else {
                    return; // Pause processing
                }
            }
        }

        // 5. Hard & Soft CC Timers
        if (agent.stunTimer > 0) agent.stunTimer -= dt;
        if (agent.silenceTimer > 0) agent.silenceTimer -= dt;
        
        // --- NEW CC TIMERS ---
        if (agent.rootTimer > 0) agent.rootTimer -= dt;
        if (agent.fearTimer > 0) agent.fearTimer -= dt;
        if (agent.confusionTimer > 0) agent.confusionTimer -= dt;
        
        if (agent.tauntTimer > 0) {
            agent.tauntTimer -= dt;
            if (agent.tauntTimer <= 0) {
                agent.tauntTargetId = null;
            }
        }
        
        if (agent.slowTimer > 0) {
            agent.slowTimer -= dt;
            // Apply Slow Effect directly here to ensure it sticks
            // NOTE: Charge effects might override this in MovementSystem, handled by multiplication priority
            // But base speed modifier logic resides here.
            // However, agent.moveSpeedMult is reset in MovementSystem after move.
            // We need a persistent way. 
            // Better strategy: MovementSystem checks slowTimer before moving.
        }
        
        if (agent.fearTimer <= 0) agent.fearSourceId = null;

        // 6. Visual State Reset
        if (agent.visualStatus === 'FROZEN' && agent.stunTimer <= 0) agent.visualStatus = 'NONE';
        if (agent.visualStatus === 'POLYMORPH' && !agent.banished) agent.visualStatus = 'NONE';
        if (agent.visualStatus === 'STASIS' && !agent.banished) agent.visualStatus = 'NONE';

        // 7. DoT (Damage over Time)
        if (agent.dotTimer > 0) {
            agent.dotTimer -= dt;
            agent.hp -= agent.dotDmg * dt;
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
        // AND Not currently in Hit Recovery
        if (agent.stunTimer <= 0 && agent.banishTimer <= 0 && !agent.isMoving && agent.castingSkillIdx === -1 && agent.hitFlashTimer <= 0) {
            if (agent.target) agent.setAnim(AnimState.COMBAT_IDLE);
            else agent.setAnim(AnimState.IDLE);
        }
    }
}