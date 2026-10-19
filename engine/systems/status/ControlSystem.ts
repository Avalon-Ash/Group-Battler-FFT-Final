
import { Agent, GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { random } from "../../math/rng";
import { stopMovement } from "../movement/MotionCommands";

/** 狀態域 API：`banished` 只由本檔寫入，其餘模組透過這兩個函式。 */
export function syncBanished(agent: Agent): void {
    agent.banished = agent.effects.BANISH.remaining > 0;
}

/** 墜落出局等情境：強制清掉放逐旗標（計時器不動）。 */
export function clearBanishedFlag(agent: Agent): void {
    agent.banished = false;
}

export class ControlSystem {
    
    public update(agent: Agent, dt: number, engine: GameEngine) {
        // Diminishing Returns (DR) decay
        for (const type in agent.drTimers) {
            if (Object.prototype.hasOwnProperty.call(agent.drTimers, type)) {
                agent.drTimers[type] -= dt;
                if (agent.drTimers[type] <= 0) {
                    agent.drStacks[type] = 0;
                    delete agent.drTimers[type];
                }
            }
        }

        // Timer Decrements
        if (agent.effects.BANISH.remaining > 0) agent.effects.BANISH.remaining = Math.max(0, agent.effects.BANISH.remaining - dt);
        if (agent.effects.STASIS.remaining > 0) {
            agent.effects.STASIS.remaining = Math.max(0, agent.effects.STASIS.remaining - dt);
            if (agent.effects.STASIS.remaining <= 0) {
                if (agent.ccVisual === 'STASIS') agent.ccVisual = 'NONE';
            }
        }
        if (agent.effects.STUN.remaining > 0) agent.effects.STUN.remaining = Math.max(0, agent.effects.STUN.remaining - dt);
        if (agent.effects.SILENCE.remaining > 0) agent.effects.SILENCE.remaining = Math.max(0, agent.effects.SILENCE.remaining - dt);
        if (agent.effects.ROOT.remaining > 0) agent.effects.ROOT.remaining = Math.max(0, agent.effects.ROOT.remaining - dt);
        if (agent.effects.FEAR.remaining > 0) agent.effects.FEAR.remaining = Math.max(0, agent.effects.FEAR.remaining - dt);
        if (agent.effects.BLIND.remaining > 0) agent.effects.BLIND.remaining = Math.max(0, agent.effects.BLIND.remaining - dt);
        if (agent.effects.VULNERABLE.remaining > 0) agent.effects.VULNERABLE.remaining = Math.max(0, agent.effects.VULNERABLE.remaining - dt);
        // POLYMORPH timer 清除
        if (agent.effects.POLYMORPH.remaining > 0) {
            agent.effects.POLYMORPH.remaining -= dt;
            if (agent.effects.POLYMORPH.remaining <= 0) {
                agent.effects.POLYMORPH.remaining = 0;
                if (agent.ccVisual === 'POLYMORPH') agent.ccVisual = 'NONE';
            } else {
                agent.ccVisual = 'POLYMORPH';
            }
        }

        // INVINCIBLE timer 清除
        if (agent.effects.INVINCIBLE.remaining > 0) {
            agent.effects.INVINCIBLE.remaining -= dt;
            if (agent.effects.INVINCIBLE.remaining <= 0) {
                agent.effects.INVINCIBLE.remaining = 0;
                if (agent.ccVisual === 'INVINCIBLE') agent.ccVisual = 'NONE';
            } else {
                agent.ccVisual = 'INVINCIBLE';
            }
        }
        if (agent.effects.TAUNT.remaining > 0) {
            agent.effects.TAUNT.remaining = Math.max(0, agent.effects.TAUNT.remaining - dt);
            if (agent.effects.TAUNT.remaining <= 0) agent.effects.TAUNT.sourceId = null;
        }

        // State Logic: Banishment
        if (agent.effects.BANISH.remaining > 0) {
            syncBanished(agent);
            if (agent.isMoving || agent.path.length > 0) stopMovement(agent);
            return; 
        } else {
            if (agent.banished) {
                syncBanished(agent);
                // 只有在 STASIS 未持續時才清除 ccVisual
                if (agent.ccVisual !== 'STASIS' || agent.effects.STASIS.remaining <= 0) {
                    agent.ccVisual = 'NONE';
                }
                engine.log(agent, 'CC', '放逐結束', null, '重返戰場');
            }
        }

        // State Logic: Stun
        if (agent.effects.STUN.remaining > 0) {
            if (agent.isMoving || agent.path.length > 0) stopMovement(agent);
        } else if (agent.ccVisual === 'FROZEN') {
            agent.ccVisual = 'NONE';
        }

        // State Logic: Root and Fear combined
        if (agent.effects.ROOT.remaining > 0 || agent.effects.STUN.remaining > 0) {
            if (agent.isMoving || agent.path.length > 0) stopMovement(agent);
        }

        if (agent.fearMoveTimer > 0) agent.fearMoveTimer = Math.max(0, agent.fearMoveTimer - dt);
        
        // State Logic: Fear (Fleeing Movement)
        if (agent.effects.FEAR.remaining > 0) {
            if (!agent.isMoving && agent.fearMoveTimer <= 0) {
                // Determine Flee Target: Source position or center if no source
                let sourcePos = { q: agent.q, r: agent.r };
                // Attempt to find the source of fear from combat logs or current target (approximate)
                const taunter = engine.agents.find(a => a.id === agent.effects.TAUNT.sourceId);
                if (taunter) {
                    sourcePos = { q: taunter.q, r: taunter.r };
                } else if (agent.lastHitSourceId) {
                    const attacker = engine.agents.find(a => a.id === agent.lastHitSourceId);
                    if (attacker) sourcePos = { q: attacker.q, r: attacker.r };
                }

                const range = 5;
                const center = { q: agent.q, r: agent.r };
                
                // Calculate Flee Vector: Away from source
                const candidates = HexUtils.range(center, range).filter(h => {
                    if (HexUtils.dist(center, h) < 3) return false;
                    if (!engine.map.isValid(h.q, h.r) || engine.map.isBlocked(h.q, h.r, engine, agent.id)) return false;
                    
                    // Flee check: Destination should be further from source than current pos
                    const currentDist = HexUtils.dist(center, sourcePos);
                    const newDist = HexUtils.dist(h, sourcePos);
                    return newDist > currentDist;
                });

                if (candidates.length > 0) {
                    // Pick the furthest candidate
                    candidates.sort((a_hex, b_hex) => HexUtils.dist(b_hex, sourcePos) - HexUtils.dist(a_hex, sourcePos));
                    const targetHex = candidates[0];
                    const result = engine.moveAgentToHex(agent, targetHex, 0, 1.4);
                    agent.fearMoveTimer = (result === 'R') ? 0.5 : 0.8;
                } else {
                    // Fallback to random move if fleeing blocked
                    const fallbackCandidates = HexUtils.range(center, range).filter(h => 
                        HexUtils.dist(center, h) >= 2 && engine.map.isValid(h.q, h.r) && !engine.map.isBlocked(h.q, h.r, engine, agent.id)
                    );
                    if (fallbackCandidates.length > 0) {
                        const targetHex = fallbackCandidates[Math.floor(random() * fallbackCandidates.length)];
                        engine.moveAgentToHex(agent, targetHex, 0, 1.2);
                    }
                    agent.fearMoveTimer = 0.8; 
                }
            }
        }
    }
}
