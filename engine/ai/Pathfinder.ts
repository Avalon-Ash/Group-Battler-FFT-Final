
import { Agent, GameEngine } from "../game";
import { Hex, MovementType } from "../../types";
import { HexUtils, NEIGHBOR_HASH_OFFSETS } from "../utils";
import { BLOCK_HEIGHT } from "../../constants";
import { OBSTACLE_DB } from "../../data/obstacles";
import { TargetingSystem } from "./TargetingSystem";

export class Pathfinder {
    private _pfQueue = new Int32Array(4096); 
    private _pfCameFrom = new Map<number, number>();
    private _pfBlockers = new Set<number>();

    public findPath(
        startAgent: Agent, 
        endQ: number, 
        endR: number, 
        range: number,
        ignoreUnits: boolean, 
        engine: GameEngine,
        targeting: TargetingSystem
    ): Hex[] {
        const startH = HexUtils.hash(startAgent.q, startAgent.r);
        const effRange = targeting.getEffectiveRange(startAgent, endQ, endR, range, engine);
        const startDist = HexUtils.dist({q: startAgent.q, r: startAgent.r}, {q: endQ, r: endR});
        
        if (startDist <= effRange) return [];

        this._pfCameFrom.clear();
        this._pfBlockers.clear();

        if (!ignoreUnits) {
            for (const a of engine.agents) {
                if (a.hp > 0 && !a.banished && a !== startAgent) {
                    this._pfBlockers.add(HexUtils.hash(a.q, a.r));
                    if (a.isMoving && a.path.length > 0) {
                        this._pfBlockers.add(HexUtils.hash(a.path[0].q, a.path[0].r));
                    }
                }
            }
        }

        let head = 0, tail = 0;
        this._pfQueue[head++] = startH;
        this._pfCameFrom.set(startH, -1);

        let iterations = 0;
        let foundHash = -1;
        const targetHex = { q: endQ, r: endR };

        while (tail < head) {
            iterations++;
            if (iterations > 2000) break;

            const currentH = this._pfQueue[tail++];
            const currentHex = HexUtils.unhash(currentH);
            
            if (HexUtils.dist(currentHex, targetHex) <= targeting.getEffectiveRange(currentHex, targetHex.q, targetHex.r, range, engine)) {
                foundHash = currentH;
                break;
            }

            for (let j = 0; j < 6; j++) {
                const nextH = currentH + NEIGHBOR_HASH_OFFSETS[j];
                if (this._pfCameFrom.has(nextH) || !engine.map.isValidHash(nextH)) continue;

                if (engine.map.hasObstacleHash(nextH)) {
                    const type = engine.map.obstacles.get(HexUtils.key(HexUtils.unhash(nextH)));
                    const def = OBSTACLE_DB[type || 'WALL'];
                    if (startAgent.movementType === MovementType.FLYING ? def?.blocksFlying : def?.blocksMovement) continue;
                }

                if (!ignoreUnits && this._pfBlockers.has(nextH)) continue;

                // LOGIC FIX: Higher jump tolerance for randomized 2.5D terrain
                if (startAgent.movementType !== MovementType.FLYING) {
                    const cH = engine.map.getTerrainHeight(currentHex.q, currentHex.r);
                    const nHex = HexUtils.unhash(nextH);
                    const nH = engine.map.getTerrainHeight(nHex.q, nHex.r);
                    // Standardized jump height to 2 tiers (48px) to prevent "Trap" states
                    if (Math.abs(nH - cH) > Math.max(2, startAgent.jump) * BLOCK_HEIGHT) continue;
                }

                this._pfCameFrom.set(nextH, currentH);
                if (head < 4096) this._pfQueue[head++] = nextH;
            }
        }

        if (foundHash !== -1) {
            const path: Hex[] = [];
            let curr = foundHash;
            while (curr !== startH && path.length < 100) {
                path.push(HexUtils.unhash(curr));
                curr = this._pfCameFrom.get(curr) || -1;
                if (curr === -1) break;
            }
            return path.reverse();
        }
        return [];
    }
}
