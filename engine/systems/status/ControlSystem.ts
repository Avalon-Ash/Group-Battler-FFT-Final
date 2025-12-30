
import { Agent, GameEngine } from "../../game";
import { AnimState } from "../../../types";
import { HexUtils } from "../../utils";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";

export class ControlSystem {
    // VFX throttling map
    private vfxTimers = new Map<string, number>();

    public update(agent: Agent, dt: number, engine: GameEngine) {
        // 0. AI Tick Update (System-wide clock for the agent)
        if (agent.aiUpdateTimer > 0) {
            agent.aiUpdateTimer -= dt;
        }

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
            // FIX: Fear Logic Jitter
            // 只有在完全停止時 (Idle) 才尋找新路徑，且強制執行完整移動
            if (agent.rootTimer <= 0) {
                // 如果正在移動，不要打斷，讓它跑完
                if (!agent.isMoving) {
                    // 擴大搜索半徑至 3-4 格，模擬長距離驚慌亂跑
                    const range = 4;
                    const center = { q: agent.q, r: agent.r };
                    const candidates = HexUtils.range(center, range).filter(h => {
                        // 排除近身 (Range < 2)，強迫跑遠
                        if (HexUtils.dist(center, h) < 2) return false;
                        return engine.map.isValid(h.q, h.r) && !engine.map.isBlocked(h.q, h.r, engine, agent.id);
                    });

                    if (candidates.length > 0) {
                        // 隨機選一個
                        const targetHex = candidates[Math.floor(Math.random() * candidates.length)];
                        // 強制走到該點，速度 1.5x
                        engine.moveAgentToHex(agent, targetHex, 0, 1.5); 
                    }
                }
            } else {
                // 如果被定身，停止移動
                agent.isMoving = false;
                agent.path = [];
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
