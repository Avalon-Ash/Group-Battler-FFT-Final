
import { Agent, GameEngine } from "../../game";
import { HexUtils } from "../../utils";

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

        // State Logic: Banishment
        if (agent.banishTimer > 0) {
            agent.banished = true;
            agent.isMoving = false;
            agent.path = [];
            return; 
        } else {
            if (agent.banished) {
                agent.banished = false;
                agent.visualStatus = 'NONE';
                engine.log(agent, 'CC', '放逐結束', null, '重返戰場');
            }
        }

        // State Logic: Stun
        if (agent.stunTimer > 0) {
            agent.isMoving = false;
            agent.path = [];
        } else if (agent.visualStatus === 'FROZEN') {
            agent.visualStatus = 'NONE';
        }

        // State Logic: Root and Fear combined
        if (agent.rootTimer > 0 || agent.stunTimer > 0) {
            agent.isMoving = false;
            agent.path = [];
        }

        if (agent.fearMoveTimer > 0) agent.fearMoveTimer = Math.max(0, agent.fearMoveTimer - dt);

        // State Logic: Fear (Fleeing Movement)
        if (agent.fearTimer > 0) {
            if (!agent.isMoving && agent.fearMoveTimer <= 0) {
                // Determine Flee Target: Source position or center if no source
                let sourcePos = { q: agent.q, r: agent.r };
                // Attempt to find the source of fear from combat logs or current target (approximate)
                const taunter = engine.agents.find(a => a.id === agent.tauntTargetId);
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
                        const targetHex = fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
                        engine.moveAgentToHex(agent, targetHex, 0, 1.2);
                    }
                    agent.fearMoveTimer = 0.8; 
                }
            }
        }
    }
}
