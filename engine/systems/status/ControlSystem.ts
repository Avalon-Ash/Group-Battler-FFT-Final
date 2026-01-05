
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
            // FIX: Fear Logic Jitter & Twitching
            // 使用 aiUpdateTimer 進行決策限流，防止每幀重新尋路導致的原地抽搐
            if (agent.rootTimer <= 0) {
                if (!agent.isMoving && agent.aiUpdateTimer <= 0) {
                    // 擴大搜索半徑至 4 格，模擬驚慌亂跑
                    const range = 4;
                    const center = { q: agent.q, r: agent.r };
                    const candidates = HexUtils.range(center, range).filter(h => {
                        // 排除近身 (Range < 2)，強迫跑遠
                        if (HexUtils.dist(center, h) < 2) return false;
                        return engine.map.isValid(h.q, h.r) && !engine.map.isBlocked(h.q, h.r, engine, agent.id);
                    });

                    if (candidates.length > 0) {
                        const targetHex = candidates[Math.floor(Math.random() * candidates.length)];
                        // 強制走到該點，速度 1.5x
                        const result = engine.moveAgentToHex(agent, targetHex, 0, 1.5);
                        if (result === 'R') { // RUNNING (Success)
                            agent.aiUpdateTimer = 0.5; // 決策冷卻：給予時間執行移動
                        } else {
                            agent.aiUpdateTimer = 0.8; // 失敗冷卻：避免高頻重試
                        }
                    } else {
                        agent.aiUpdateTimer = 0.8; // 無路可逃，等待
                    }
                }
            } else {
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
                
                // Lift particles up to chest/head height so they aren't hidden by the body
                // Agent Z is bottom of feet relative to terrain.
                // 45 is roughly center mass.
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
        checkVFX('BURN', agent.dotTimer > 0 && agent.dotDmg > 0); // Explicitly check BURN
        checkVFX('REGEN', agent.hotTimer > 0);
        checkVFX('BANISH', agent.banished);
        checkVFX('STUN', agent.stunTimer > 0);
        checkVFX('SILENCE', agent.silenceTimer > 0);
        checkVFX('FEAR', agent.fearTimer > 0);
        checkVFX('ROOT', agent.rootTimer > 0);
    }
}
