
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
        const canSpawnDust = this.dustTimer > 0.05; // Limit rate (20fps)

        if (canSpawnDust) {
            for (const a of engine.agents) {
                if (a.hp <= 0) continue;
                
                const speedSq = a.physics.vx*a.physics.vx + a.physics.vy*a.physics.vy;
                const isGrounded = a.physics.z < 5;
                const isFlyingUnit = a.movementType === MovementType.FLYING;

                // Threshold: 300px/s
                if (speedSq > 90000 && isGrounded && !isFlyingUnit) {
                    const type = speedSq > 250000 ? 'SPARK' : 'DUST';
                    const effectId = type === 'SPARK' ? 'FX_STATUS_STUN_LOOP' : 'FX_STATUS_ROOT_LOOP';
                    const terrainH = engine.map.getTerrainHeight(a.q, a.r);
                    
                    vfx.playEffect(effectId, a.px + a.physics.x, a.py + a.physics.y, terrainH + 5);
                }
            }
            this.dustTimer = 0;
        }

        // 2. Status Effect Particles (Poison bubbles, Stun stars, etc.)
        for (const a of engine.agents) {
            if (a.hp <= 0 && a.fullyDead) continue;
            this.processStatusVFX(a, dt, engine, vfx);
        }
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
    }
}
