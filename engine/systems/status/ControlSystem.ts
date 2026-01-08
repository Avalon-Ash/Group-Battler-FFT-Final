
import { Agent, GameEngine } from "../../game";
import { HexUtils } from "../../utils";

export class ControlSystem {
    
    public update(agent: Agent, dt: number, engine: GameEngine) {
        if (agent.aiUpdateTimer > 0) {
            agent.aiUpdateTimer -= dt;
        }

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
            // Visuals handled by AgentVFXSystem
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

        // State Logic: Fear (Random Movement)
        if (agent.fearTimer > 0) {
            if (agent.rootTimer <= 0) {
                if (!agent.isMoving && agent.aiUpdateTimer <= 0) {
                    const range = 4;
                    const center = { q: agent.q, r: agent.r };
                    const candidates = HexUtils.range(center, range).filter(h => {
                        if (HexUtils.dist(center, h) < 2) return false;
                        return engine.map.isValid(h.q, h.r) && !engine.map.isBlocked(h.q, h.r, engine, agent.id);
                    });

                    if (candidates.length > 0) {
                        const targetHex = candidates[Math.floor(Math.random() * candidates.length)];
                        const result = engine.moveAgentToHex(agent, targetHex, 0, 1.5);
                        agent.aiUpdateTimer = (result === 'R') ? 0.5 : 0.8;
                    } else {
                        agent.aiUpdateTimer = 0.8; 
                    }
                }
            } else {
                agent.isMoving = false;
                agent.path = [];
            }
        }

        // State Logic: Root
        if (agent.rootTimer > 0) {
            agent.isMoving = false;
            agent.path = [];
        }
    }
}
