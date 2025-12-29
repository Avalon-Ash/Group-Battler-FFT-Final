
import { Agent, GameEngine } from "../../game";
import { AnimState } from "../../../types";
import { HexUtils } from "../../utils";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

export class ControlSystem {
    // VFX throttling map
    private vfxTimers = new Map<string, number>();

    public update(agent: Agent, dt: number, engine: GameEngine) {
        // 1. Diminishing Returns (DR) Decay
        for (const type in agent.drTimers) {
            if (Object.prototype.hasOwnProperty.call(agent.drTimers, type)) {
                agent.drTimers[type] -= dt;
                if (agent.drTimers[type] <= 0) {
                    agent.drStacks[type] = 0;
                    delete agent.drTimers[type];
                }
            }
        }

        // 2. Status Timer Ticks
        if (agent.banishTimer > 0) agent.banishTimer = Math.max(0, agent.banishTimer - dt);
        if (agent.stunTimer > 0) agent.stunTimer = Math.max(0, agent.stunTimer - dt);
        if (agent.silenceTimer > 0) agent.silenceTimer = Math.max(0, agent.silenceTimer - dt);
        if (agent.rootTimer > 0) agent.rootTimer = Math.max(0, agent.rootTimer - dt);
        if (agent.fearTimer > 0) agent.fearTimer = Math.max(0, agent.fearTimer - dt);
        if (agent.blindTimer > 0) agent.blindTimer = Math.max(0, agent.blindTimer - dt);
        if (agent.tauntTimer > 0) {
            agent.tauntTimer = Math.max(0, agent.tauntTimer - dt);
            if (agent.tauntTimer <= 0) agent.tauntTargetId = null;
        }

        // 3. State Resolution & Priority Logic
        if (agent.banishTimer > 0) {
            agent.banished = true;
            agent.isMoving = false;
            agent.path = [];
            this.processStatusVFX(agent, dt, engine); // Early VFX process for banished
            return; 
        } else {
            if (agent.banished) {
                agent.banished = false;
                agent.visualStatus = 'NONE';
                engine.log(agent, 'CC', '放逐結束', null, '重返戰場');
            }
        }

        if (agent.stunTimer > 0) {
            agent.isMoving = false;
            agent.path = [];
            agent.setAnim(AnimState.STUN);
        } else if (agent.visualStatus === 'FROZEN') {
            agent.visualStatus = 'NONE';
        }

        if (agent.fearTimer > 0) {
            if (!agent.isMoving && agent.rootTimer <= 0) {
                const neighbors = HexUtils.neighbors(agent);
                const valid = neighbors.filter(n => 
                    engine.map.isValid(n.q, n.r) && 
                    !engine.map.isBlocked(n.q, n.r, engine, agent.id)
                );
                if (valid.length > 0) {
                    const next = valid[Math.floor(Math.random() * valid.length)];
                    engine.movement.moveAgentToHex(agent, next, 0, engine, 1.5);
                }
            }
        }

        if (agent.rootTimer > 0) {
            agent.isMoving = false;
            agent.path = [];
        }

        if (!agent.isMoving && agent.castingSkillIdx === -1 && agent.hitFlashTimer <= 0 && agent.hp > 0) {
            if (agent.target) agent.setAnim(AnimState.COMBAT_IDLE);
            else agent.setAnim(AnimState.IDLE);
        }

        // 5. Visual Effects Tick (Loop for all states)
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
                // Standard Body Center height offset
                const pz = agent.physics.z + 45;
                engine.renderer.vfx.playEffect(
                    def.particleEffect, 
                    agent.px, agent.py, 
                    h + pz
                );
            }
            this.vfxTimers.set(timerKey, t);
        };

        checkVFX('POISON', agent.dotTimer > 0 && agent.dotDmg > 0);
        checkVFX('REGEN', agent.hotTimer > 0);
        checkVFX('BANISH', agent.banished);
        checkVFX('STUN', agent.stunTimer > 0);
        checkVFX('SILENCE', agent.silenceTimer > 0);
        checkVFX('FEAR', agent.fearTimer > 0);
        checkVFX('ROOT', agent.rootTimer > 0);
    }
}
