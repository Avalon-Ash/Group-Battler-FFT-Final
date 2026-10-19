
import { GameEngine, Agent } from "../../game";
import { VFXSystem } from "./VFXSystem";
import { MovementType } from "../../../types";
import { AGENT_MODEL_CENTER_Z, VFX_PARAM } from "../../../constants";
import { VisualMath } from "../../math/VisualMath";

/**
 * 視覺狀態觀察者 (Visual State Observer)
 * 負責監控 Agent 的狀態（速度、Debuff）並生成對應的持續性粒子。
 * 這屬於 Render Loop 的一部分，確保 Logic Loop 純淨無汙染。
 * 粒子高度一律取 VisualMath.getUnitGroundHeight（精靈實際所在格），不直接查 agent.q/r 的格高（RenderSpec「單位座標」）。
 */
export class AgentVFXSystem {
    private vfxTimers = new Map<string, number>();
    private dustTimer: number = 0;
    private cleanupTimer: number = 0;

    public update(dt: number, engine: GameEngine, vfx: VFXSystem) {
        // 0. Periodic cleanup of timers
        this.cleanupTimer += dt;
        if (this.cleanupTimer > 10) {
            this.cleanupTimer = 0;
            const activeIds = new Set(engine.agents.map(a => a.id));
            for (const key of this.vfxTimers.keys()) {
                const agentId = key.split('_')[0];
                if (!activeIds.has(agentId)) {
                    this.vfxTimers.delete(key);
                }
            }
        }

        // 1. Friction Dust / Sparks Logic
        this.dustTimer += dt;
        const canSpawnDust = this.dustTimer > 0.15; // Limit rate (approx 6fps) to prevent excessive stacking

        if (canSpawnDust) {
            for (const a of engine.agents) {
                if (a.hp <= 0) continue;
                
                const speedSq = a.physics.vx*a.physics.vx + a.physics.vy*a.physics.vy;
                const isGrounded = a.physics.z < 5;
                const isFlyingUnit = a.movementType === MovementType.FLYING;

                // Threshold: Only trigger on massive impulses (knockbacks / dashes)
                if (speedSq > VFX_PARAM.FX_KNOCKBACK_DUST_THRESHOLD_SQ && isGrounded && !isFlyingUnit) {
                    const terrainH = this.groundHeight(a, engine);
                    // 擊退／突進的地面塵（零件；曾借用 FX_STATUS_ROOT_LOOP）
                    vfx.playEffect('FX_KNOCKBACK_DUST', a.px + a.physics.x, a.py + a.physics.y, terrainH + 5);
                }
            }
            this.dustTimer = 0;
        }

        // 2. Idle ambience（狀態視覺已改由 StatusPartPainter 逐幀繪製零件，不再生粒子）
        for (const a of engine.agents) {
            if (a.hp <= 0 || a.fullyDead) continue;
            this.processIdleVFX(a, dt, engine, vfx);
        }
    }

    private processIdleVFX(agent: Agent, dt: number, engine: GameEngine, vfx: VFXSystem) {
        if (agent.hp <= 0) return;
        
        // ── [PERF] 距離剔除：超出攝影機焦點半徑的單位不生成 idle 粒子 ──
        const camX = engine.mapConfig.w * VFX_PARAM.IDLE_VFX_CULL_CENTER_PER_TILE;
        const camY = engine.mapConfig.h * VFX_PARAM.IDLE_VFX_CULL_CENTER_PER_TILE;
        const _dx = agent.px - camX;
        const _dy = agent.py - camY;
        if (_dx * _dx + _dy * _dy > VFX_PARAM.IDLE_VFX_CULL_DIST_SQ) return;

        const timerKey = `${agent.id}_IDLE`;
        let t = this.vfxTimers.get(timerKey) || 0;
        t -= dt;
        
        if (t <= 0) {
            t = 1.5 + Math.random() * 1.0; // Random interval for idle feel
            const terrainZ = this.groundHeight(agent, engine);
            const modelCenterZ = terrainZ + agent.physics.z + AGENT_MODEL_CENTER_Z * 0.5; // Idle 置於腰部
            const fxId = agent.team === 1 ? 'FX_IDLE_RED' : 'FX_IDLE_BLUE';
            
            vfx.playEffect(
                fxId, 
                agent.px + agent.physics.x, 
                agent.py + agent.physics.y, 
                modelCenterZ
            );
        }
        this.vfxTimers.set(timerKey, t);
    }

    private groundHeight(agent: Agent, engine: GameEngine): number {
        return VisualMath.getUnitGroundHeight(agent, (q, r) => engine.getTerrainHeight(q, r), engine.mapConfig);
    }

    public clearAgent(agentId: string) {
        for (const key of this.vfxTimers.keys()) {
            if (key.startsWith(agentId)) {
                this.vfxTimers.delete(key);
            }
        }
    }
}
