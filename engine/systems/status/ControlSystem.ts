
import { Agent, GameEngine } from "../../game";
import { AnimState } from "../../../types";
import { HexUtils } from "../../utils";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

export class ControlSystem {
    // VFX throttling map
    private vfxTimers = new Map<string, number>();

    public update(agent: Agent, dt: number, engine: GameEngine) {
        // 1. Diminishing Returns (DR) Decay
        // DR resets if not applied again within window
        for (const type in agent.drTimers) {
            if (Object.prototype.hasOwnProperty.call(agent.drTimers, type)) {
                agent.drTimers[type] -= dt;
                if (agent.drTimers[type] <= 0) {
                    agent.drStacks[type] = 0;
                    delete agent.drTimers[type];
                }
            }
        }

        // 2. Status Timer Ticks (Mathematical decrement)
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
        // Priority: Dead > Banish > Stun > Fear > Root
        
        // A. Banishment (Stasis)
        if (agent.banishTimer > 0) {
            // Apply State
            agent.banished = true;
            agent.isMoving = false;
            agent.path = []; // Clear path
            
            // Visual override allowed for POLYMORPH/STASIS, otherwise default
            if (agent.visualStatus !== 'POLYMORPH' && agent.visualStatus !== 'STASIS') {
                // Ensure generic banish visual isn't overwriting special ones
            }
            return; // Hard stop
        } else {
            // Cleanup Banish exit
            if (agent.banished) {
                agent.banished = false;
                agent.visualStatus = 'NONE'; // Reset visual
                engine.log(agent, 'CC', '放逐結束', null, '重返戰場');
            }
        }

        // B. Stun (Hard CC)
        if (agent.stunTimer > 0) {
            agent.isMoving = false;
            agent.path = [];
            agent.setAnim(AnimState.STUN);
            return; // Hard stop
        } else {
            // Cleanup Frozen visual if stun ended
            if (agent.visualStatus === 'FROZEN') agent.visualStatus = 'NONE';
        }

        // C. Fear (Uncontrolled Movement)
        if (agent.fearTimer > 0) {
            // Fear overrides normal AI movement
            if (!agent.isMoving && agent.rootTimer <= 0) {
                // Pick random valid neighbor to run to
                const neighbors = HexUtils.neighbors(agent);
                const valid = neighbors.filter(n => 
                    engine.map.isValid(n.q, n.r) && 
                    !engine.map.isBlocked(n.q, n.r, engine, agent.id)
                );
                
                if (valid.length > 0) {
                    const next = valid[Math.floor(Math.random() * valid.length)];
                    // Panic run speed (1.5x)
                    engine.movement.moveAgentToHex(agent, next, 0, engine, 1.5);
                }
            }
            return; // Logic stop (AI shouldn't run)
        }

        // D. Root (Immobilize)
        if (agent.rootTimer > 0) {
            agent.isMoving = false;
            agent.path = [];
            // Root allows casting/attacking, so we don't return here, 
            // just prevent movement (handled in MovementSystem)
        }

        // 4. Default State Restoration
        // If no Hard CC, ensure animation is correct
        if (!agent.isMoving && agent.castingSkillIdx === -1 && agent.hitFlashTimer <= 0 && agent.hp > 0) {
            if (agent.target) agent.setAnim(AnimState.COMBAT_IDLE);
            else agent.setAnim(AnimState.IDLE);
        }

        // 5. Visual Effects Tick
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
                // Adjust height to body center (approx 45px up)
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
