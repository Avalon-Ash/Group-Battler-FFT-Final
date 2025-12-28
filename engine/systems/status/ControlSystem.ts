
import { Agent, GameEngine } from "../../game";
import { AnimState } from "../../../types";
import { HexUtils } from "../../utils";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

export class ControlSystem {
    // Track VFX intervals to avoid spamming particles every frame
    private vfxTimers = new Map<string, number>();

    public update(agent: Agent, dt: number, engine: GameEngine) {
        // 1. Diminishing Returns (DR) Decay
        for (const type in agent.drTimers) {
            if (agent.drTimers.hasOwnProperty(type)) {
                agent.drTimers[type] -= dt;
                if (agent.drTimers[type] <= 0) {
                    agent.drStacks[type] = 0;
                    delete agent.drTimers[type];
                }
            }
        }

        // 2. Banish Logic
        if (agent.banishTimer > 0) {
            agent.banishTimer -= dt;
            if (agent.banishTimer <= 0) {
                agent.banished = false;
                engine.log(agent, 'CC', '放逐結束', null, '重返戰場');
            } else {
                // Hard CC: Skip other logic if banished (unless Polymorph which allows wandering visuals sometimes)
                if (agent.visualStatus !== 'POLYMORPH') return; 
            }
        }

        // 3. CC Timers
        if (agent.stunTimer > 0) agent.stunTimer -= dt;
        if (agent.silenceTimer > 0) agent.silenceTimer -= dt;
        if (agent.rootTimer > 0) agent.rootTimer -= dt;
        if (agent.blindTimer > 0) agent.blindTimer -= dt;
        if (agent.tauntTimer > 0) {
            agent.tauntTimer -= dt;
            if (agent.tauntTimer <= 0) agent.tauntTargetId = null;
        }

        // 4. Fear Logic (Random Movement)
        if (agent.fearTimer > 0) {
            agent.fearTimer -= dt;
            if (!agent.isMoving && agent.hp > 0 && agent.stunTimer <= 0 && agent.rootTimer <= 0) {
                const neighbors = HexUtils.neighbors(agent);
                const valid = neighbors.filter(n => engine.map.isValid(n.q, n.r) && !engine.map.isBlocked(n.q, n.r, engine, agent.id));
                if (valid.length > 0) {
                    const next = valid[Math.floor(Math.random() * valid.length)];
                    // Panic run speed
                    engine.movement.moveAgentToHex(agent, next, 0, engine, 1.5);
                }
            }
        }

        // 5. Visual State Reset
        if (agent.visualStatus === 'FROZEN' && agent.stunTimer <= 0) agent.visualStatus = 'NONE';
        if (agent.visualStatus === 'POLYMORPH' && !agent.banished) agent.visualStatus = 'NONE';
        if (agent.visualStatus === 'STASIS' && !agent.banished) agent.visualStatus = 'NONE';

        // 6. Animation State Reset (Idle)
        if (agent.stunTimer <= 0 && agent.banishTimer <= 0 && !agent.isMoving && agent.castingSkillIdx === -1 && agent.hitFlashTimer <= 0) {
            if (agent.target) agent.setAnim(AnimState.COMBAT_IDLE);
            else agent.setAnim(AnimState.IDLE);
        }

        // 7. Status VFX Tick
        this.processStatusVFX(agent, dt, engine);
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
                // Adjust height to body center
                engine.renderer.vfx.playEffect(
                    def.particleEffect, 
                    agent.px, agent.py, 
                    h + agent.physics.z + 45
                );
            }
            this.vfxTimers.set(timerKey, t);
        };

        checkVFX('POISON', agent.dotTimer > 0 && agent.dotDmg > 0);
        checkVFX('REGEN', agent.hotTimer > 0);
        checkVFX('BANISH', agent.banished);
        checkVFX('FEAR', agent.fearTimer > 0);
    }
}
