
import { Agent, GameEngine } from "../game";
import { Hex, MovementType } from "../../types";
import { HexUtils, NEIGHBOR_HASH_OFFSETS } from "../utils";
import { BLOCK_HEIGHT } from "../../constants";
import { OBSTACLE_DB } from "../../data/obstacles";
import { TargetingSystem } from "./TargetingSystem";

const PATHFINDING_MAX_ITERATIONS = 2500; 
const QUEUE_CAPACITY = 4096; 

export class Pathfinder {
    // Memory Buffers (Reused to avoid GC)
    private _pfQueue: Int32Array; 
    private _pfCameFrom: Map<number, number> = new Map();
    private _pfBlockers: Set<number> = new Set();

    constructor() {
        this._pfQueue = new Int32Array(QUEUE_CAPACITY);
    }

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
        
        // Optimization: Pre-check if start satisfies range (using Height Bonus from TargetingSystem)
        const effRange = targeting.getEffectiveRange(startAgent, endQ, endR, range, engine);
        const startDist = HexUtils.dist({q: startAgent.q, r: startAgent.r}, {q: endQ, r: endR});
        if (startDist <= effRange) return [];

        this._pfCameFrom.clear();
        this._pfBlockers.clear();

        // 1. Populate Blockers
        // If ignoreUnits is TRUE (Ghost Mode), we only block Walls/Obstacles
        if (!ignoreUnits) {
            for (const a of engine.agents) {
                if (a.hp > 0 && !a.banished && a !== startAgent) {
                    const h = HexUtils.hash(a.q, a.r);
                    this._pfBlockers.add(h);
                    
                    if (a.isMoving && a.path.length > 0) {
                        const hp = HexUtils.hash(a.path[0].q, a.path[0].r);
                        this._pfBlockers.add(hp);
                    }
                }
            }
        }

        let head = 0; 
        let tail = 0; 
        this._pfQueue[head++] = startH; 
        this._pfCameFrom.set(startH, -1); 

        let iterations = 0;
        let foundHash = -1;
        const targetHex = { q: endQ, r: endR };
        
        while (tail < head) {
            iterations++;
            if (iterations > PATHFINDING_MAX_ITERATIONS) break;

            const currentH = this._pfQueue[tail++]; 
            const currentHex = HexUtils.unhash(currentH);
            
            // SUCCESS CONDITION: Inside Range? (Check height for this specific tile)
            const currentEffRange = targeting.getEffectiveRange(currentHex, targetHex.q, targetHex.r, range, engine);
            if (HexUtils.dist(currentHex, targetHex) <= currentEffRange) {
                foundHash = currentH;
                break;
            }

            for(let j = 0; j < 6; j++) {
                const offset = NEIGHBOR_HASH_OFFSETS[j];
                const nextH = currentH + offset;
                
                if (this._pfCameFrom.has(nextH)) continue;
                
                // Map Bounds Check
                if (!engine.map.isValidHash(nextH)) continue;
                
                // Static Obstacle Check
                if (engine.map.hasObstacleHash(nextH)) {
                    // Check obstacle type permissions
                    const obstacleTypeId = engine.map.obstacles.get(HexUtils.key(HexUtils.unhash(nextH)));
                    const obstacleDef = OBSTACLE_DB[obstacleTypeId || 'WALL'];
                    
                    if (startAgent.movementType === MovementType.FLYING) {
                        if (obstacleDef?.blocksFlying) continue;
                    } else {
                        if (obstacleDef?.blocksMovement) continue;
                    }
                }
                
                // Dynamic Unit Check (Only if not ignoring units)
                if (!ignoreUnits && this._pfBlockers.has(nextH)) {
                    continue;
                }

                // --- TACTICS OGRE HEIGHT CHECK ---
                // Flying units IGNORE terrain height traversal costs
                if (startAgent.movementType !== MovementType.FLYING) {
                    const currentTerrainH = engine.map.getTerrainHeight(currentHex.q, currentHex.r);
                    const nextHexCoord = HexUtils.unhash(nextH);
                    const nextTerrainH = engine.map.getTerrainHeight(nextHexCoord.q, nextHexCoord.r);
                    const deltaH = Math.abs(nextTerrainH - currentTerrainH);
                    
                    // Allow climb/drop if deltaH <= Jump Height (in pixels)
                    // Using max(1, jump) to ensure at least 1 block can be traversed by default
                    const maxClimb = Math.max(1, startAgent.jump) * BLOCK_HEIGHT;
                    
                    if (deltaH > maxClimb) {
                        continue; // Too steep!
                    }
                }

                this._pfCameFrom.set(nextH, currentH);
                
                if (head < QUEUE_CAPACITY) {
                    this._pfQueue[head++] = nextH;
                }
            }
        }

        if (foundHash !== -1) {
            const path: Hex[] = [];
            let curr = foundHash;
            
            let sanity = 0;
            while (curr !== startH && sanity++ < 100) {
                path.push(HexUtils.unhash(curr));
                const prev = this._pfCameFrom.get(curr);
                if (prev === undefined || prev === -1) break;
                curr = prev;
            }
            return path.reverse();
        }

        return [];
    }
}
