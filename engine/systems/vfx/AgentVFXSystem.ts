
import { GameEngine, Agent } from "../../game";
import { VFXSystem } from "../vfx";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { MovementType } from "../../../types";

/**
 * 視覺狀態觀察者 (Visual State Observer)
 * 負責監控 Agent 的狀態（速度、Debuff）並生成對應的持續性粒子。
 * 這屬於 Render Loop 的一部分，確保 Logic Loop 純淨無汙染。
 */
export class AgentVFXSystem {
    private vfxTimers = new Map<string, number>();
    private dustTimer: number = 0;

    public update(dt: number, engine: GameEngine, vfx: VFXSystem) {
        // 1. Friction Dust / Sparks Logic
        this.dustTimer += dt;
        const canSpawnDust = this.dustTimer > 0.15; // Limit rate (approx 6fps) to prevent excessive stacking

        if (canSpawnDust) {
            for (const a of engine.agents) {
                if (a.hp <= 0) continue;
                
                const speedSq = a.physics.vx*a.physics.vx + a.physics.vy*a.physics.vy;
                const isGrounded = a.physics.z < 5;
                const isFlyingUnit = a.movementType === MovementType.FLYING;

                // Threshold: Only trigger on massive impulses (knockbacks > 500px/s)
                if (speedSq > 250000 && isGrounded && !isFlyingUnit) {
                    const terrainH = engine.map.getTerrainHeight(a.q, a.r);
                    // Use DUST everywhere instead of STUN_LOOP to prevent the "Weird Orb of Light" stacking bug
                    vfx.playEffect('FX_STATUS_ROOT_LOOP', a.px + a.physics.x, a.py + a.physics.y, terrainH + 5);
                }
            }
            this.dustTimer = 0;
        }

        // 2. Status Effect Particles (Poison bubbles, Stun stars, etc.)
        for (const a of engine.agents) {
            if (a.hp <= 0 || a.fullyDead) continue;
            this.processStatusVFX(a, dt, engine, vfx);
            this.processIdleVFX(a, dt, engine, vfx);
        }
    }

    private processIdleVFX(agent: Agent, dt: number, engine: GameEngine, vfx: VFXSystem) {
        if (agent.hp <= 0) return;
        
        const timerKey = `${agent.id}_IDLE`;
        let t = this.vfxTimers.get(timerKey) || 0;
        t -= dt;
        
        if (t <= 0) {
            t = 1.5 + Math.random() * 1.0; // Random interval for idle feel
            const h = engine.map.getTerrainHeight(agent.q, agent.r);
            const pz = agent.physics.z + 20; // Lower body height
            const fxId = agent.team === 1 ? 'FX_IDLE_RED' : 'FX_IDLE_BLUE';
            
            vfx.playEffect(
                fxId, 
                agent.px + agent.physics.x, 
                agent.py + agent.physics.y, 
                h + pz
            );
        }
        this.vfxTimers.set(timerKey, t);
    }

    private processStatusVFX(agent: Agent, dt: number, engine: GameEngine, vfx: VFXSystem) {
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
                const pz = agent.physics.z + 45; // Chest height
                
                vfx.playEffect(
                    def.particleEffect, 
                    agent.px + agent.physics.x, 
                    agent.py + agent.physics.y, 
                    h + pz
                );
            }
            this.vfxTimers.set(timerKey, t);
        };

        checkVFX('POISON', agent.dotTimer > 0 && agent.dotDmg > 0);
        checkVFX('BURN', agent.dotTimer > 0 && agent.dotDmg > 0);
        checkVFX('REGEN', agent.hotTimer > 0);
        checkVFX('BANISH', agent.banished);
        checkVFX('STUN', agent.stunTimer > 0);
        checkVFX('SILENCE', agent.silenceTimer > 0);
        checkVFX('FEAR', agent.fearTimer > 0);
        checkVFX('ROOT', agent.rootTimer > 0);
        checkVFX('VULNERABLE', agent.hp / agent.maxHp < 0.25);
    }
}
