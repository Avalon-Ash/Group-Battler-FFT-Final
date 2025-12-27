
import { Agent, GameEngine } from "../game";
import { AnimState } from "../../types";
import { COMBAT_PARAM, UNIT_BODY_OFFSET } from "../../constants";
import { STATUS_VISUALS } from "../../data/vfx/status_visuals";

export class StatusSystem {
    
    // Track VFX intervals to avoid spamming particles every frame
    private vfxTimers = new Map<string, number>();

    public update(agent: Agent, dt: number, engine: GameEngine) {
        // 1. Cooldowns
        agent.curCDs = agent.curCDs.map(c => Math.max(0, c - dt));

        // 2. DR Logic
        for (const type in agent.drTimers) {
            if (agent.drTimers.hasOwnProperty(type)) {
                agent.drTimers[type] -= dt;
                if (agent.drTimers[type] <= 0) {
                    agent.drStacks[type] = 0;
                    delete agent.drTimers[type];
                }
            }
        }

        if (agent.spawnTimer > 0) agent.spawnTimer -= dt;

        // 3. Status VFX Tick
        this.processStatusVFX(agent, dt, engine);

        // 4. Banish Logic
        if (agent.banishTimer > 0) {
            agent.banishTimer -= dt;
            if (agent.banishTimer <= 0) {
                agent.banished = false;
                engine.log(agent, 'CC', '放逐結束', null, '重返戰場');
            } else {
                if (agent.visualStatus === 'POLYMORPH') {
                    // Sheep keep ticking
                } else {
                    return; // Hard Pause
                }
            }
        }

        // 5. Timers
        if (agent.stunTimer > 0) agent.stunTimer -= dt;
        if (agent.silenceTimer > 0) agent.silenceTimer -= dt;
        
        // 6. Visual State Reset
        if (agent.visualStatus === 'FROZEN' && agent.stunTimer <= 0) agent.visualStatus = 'NONE';
        if (agent.visualStatus === 'POLYMORPH' && !agent.banished) agent.visualStatus = 'NONE';
        if (agent.visualStatus === 'STASIS' && !agent.banished) agent.visualStatus = 'NONE';

        // 7. DoT
        if (agent.dotTimer > 0) {
            agent.dotTimer -= dt;
            agent.hp -= agent.dotDmg * dt;
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

        // 8. HoT
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

        // 9. Anim Reset
        if (agent.stunTimer <= 0 && agent.banishTimer <= 0 && !agent.isMoving && agent.castingSkillIdx === -1 && agent.hitFlashTimer <= 0) {
            if (agent.target) agent.setAnim(AnimState.COMBAT_IDLE);
            else agent.setAnim(AnimState.IDLE);
        }
    }

    private processStatusVFX(agent: Agent, dt: number, engine: GameEngine) {
        if (!engine.renderer) return;

        const checkVFX = (key: string, condition: boolean) => {
            if (!condition) return;
            const def = STATUS_VISUALS[key];
            if (!def || !def.particleEffect) return;

            const timerKey = `${agent.id}_${key}`;
            let t = this.vfxTimers.get(timerKey) || 0;
            t -= dt;
            
            if (t <= 0) {
                t = def.particleInterval || 0.5;
                const h = engine.map.getTerrainHeight(agent.q, agent.r);
                engine.renderer.vfx.playEffect(
                    def.particleEffect, 
                    agent.px, agent.py, 
                    h + agent.physics.z + UNIT_BODY_OFFSET
                );
            }
            this.vfxTimers.set(timerKey, t);
        };

        checkVFX('POISON', agent.dotTimer > 0 && agent.dotDmg > 0);
        checkVFX('REGEN', agent.hotTimer > 0);
        checkVFX('BANISH', agent.banished);
    }
}
