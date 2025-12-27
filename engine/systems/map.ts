
import { GameEngine } from "../game";
import { SCENE_DB } from "../../data/scenes";
import { HexUtils } from "../utils";
import { BLOCK_HEIGHT, MAX_TERRAIN_TIER } from "../../constants";
import { MovementType, GroundHazard, Team } from "../../types";
import { OBSTACLE_DB } from "../../data/obstacles";

export class MapSystem {
    public mapKeys: Set<string> = new Set();
    private validHashes: Set<number> = new Set();
    
    public obstacles: Map<string, string> = new Map();
    public obstaclesHash: Set<number> = new Set();
    
    private _heightMap: Map<string, number> = new Map();

    // Changed to Public for CombatSystem access
    public hazards: Map<string, GroundHazard> = new Map();

    constructor() {}

    public getTerrainHeight(q: number, r: number): number {
        return this._heightMap.get(HexUtils.key({q, r})) || 0;
    }

    public randomizeEnvironment(engine: GameEngine) {
        engine.mapConfig.w = Math.floor(10 + Math.random() * 4); 
        engine.mapConfig.h = Math.floor(8 + Math.random() * 4);
        engine.currentScene = SCENE_DB[Math.floor(Math.random() * SCENE_DB.length)];
        this.rebuildMap(engine);
    }

    public rebuildMap(engine: GameEngine) {
        this.hazards.clear(); 
        
        this.mapKeys.clear();
        this.validHashes.clear();
        this.obstacles.clear();
        this.obstaclesHash.clear();
        this._heightMap.clear();
        
        const W = engine.mapConfig.w;
        const H = engine.mapConfig.h;
        const tempHeights = new Map<string, number>();

        for (let q = 0; q < W; q++) {
            for (let r = 0; r < H; r++) {
                const hex = HexUtils.offsetToAxial(q, r, engine.mapConfig);
                const k = HexUtils.key(hex);
                
                this.mapKeys.add(k);
                this.validHashes.add(HexUtils.hash(hex.q, hex.r));

                const depthProgress = r / H; 
                const viewFactor = 1.0 - depthProgress; 
                const noise = Math.random();
                let rawHeight = 0;
                
                if (depthProgress > 0.7) {
                    rawHeight = noise * 0.8; 
                } else {
                    rawHeight = noise * (1.5 + viewFactor * 3.5);
                }

                tempHeights.set(k, rawHeight);
            }
        }

        const smoothedHeights = new Map<string, number>();
        tempHeights.forEach((h, key) => {
            const [q, r] = key.split(',').map(Number);
            const neighbors = HexUtils.neighbors({q, r});
            let sum = h;
            let count = 1;
            sum += h; count++;
            neighbors.forEach(n => {
                const nk = HexUtils.key(n);
                if (tempHeights.has(nk)) {
                    sum += tempHeights.get(nk)!;
                    count++;
                }
            });
            smoothedHeights.set(key, sum / count);
        });

        smoothedHeights.forEach((raw, key) => {
            let tier = Math.floor(raw);
            tier = Math.max(0, Math.min(MAX_TERRAIN_TIER, tier));
            this._heightMap.set(key, tier * BLOCK_HEIGHT);
        });

        this.pruneDisconnected(engine);
        this.generateDecorations(engine);

        engine.mapVersion++;
        if (engine.renderer) {
            engine.renderer.grid.reset();
        }
    }

    public addHazard(
        q: number, r: number, 
        type: 'POISON' | 'FIRE' | 'ICE' | 'GRAVITY' | 'GENERIC', 
        duration: number, 
        sourceId: string, 
        team: Team, 
        color: string,
        power: number,
        interval: number
    ) {
        if (!this.isValid(q, r)) return;
        const key = HexUtils.key({q, r});
        
        // Overwrite existing hazard (Last applied wins, simplified logic)
        // Future: Handle stacking or merging
        const hazard: GroundHazard = {
            id: Math.random().toString(36).substr(2, 6),
            q, r,
            type,
            duration,
            sourceId,
            team,
            color,
            power,
            interval,
            timer: 0 // Start fresh
        };
        
        this.hazards.set(key, hazard);
    }

    public getHazardAt(q: number, r: number): GroundHazard | undefined {
        return this.hazards.get(HexUtils.key({q, r}));
    }

    public tickHazards(dt: number, engine: GameEngine) {
        const toRemove: string[] = [];

        for (const [key, h] of this.hazards.entries()) {
            h.duration -= dt;
            h.timer -= dt;
            
            if (h.duration <= 0) {
                toRemove.push(key);
            }
        }
        
        toRemove.forEach(k => this.hazards.delete(k));
    }

    // ... (Keep existing generation code below unchanged) ...
    private generateDecorations(engine: GameEngine) {
        const obstacleType = engine.currentScene.obstacleStyle || 'WALL';
        this._heightMap.forEach((hPx, key) => {
            const [q, r] = key.split(',').map(Number);
            if (engine.getAgentAt(q, r)) return;
            const myTier = hPx / BLOCK_HEIGHT;
            const hex = {q, r};
            const neighbors = HexUtils.neighbors(hex);
            let isCliffBottom = false;
            let isFlatHigh = true;
            let validNeighbors = 0;
            neighbors.forEach(n => {
                if (!this.isValid(n.q, n.r)) return;
                validNeighbors++;
                const nH = this.getTerrainHeight(n.q, n.r);
                const nTier = nH / BLOCK_HEIGHT;
                if (nTier > myTier + 1) isCliffBottom = true;
                if (Math.abs(nTier - myTier) > 0.5) isFlatHigh = false;
            });
            if (isCliffBottom) {
                if (Math.random() < 0.7) {
                    this.setObstacle(q, r, obstacleType);
                    return;
                }
            }
            if (validNeighbors < 6) {
                if (Math.random() < 0.3) {
                    this.setObstacle(q, r, obstacleType);
                    return;
                }
            }
            if (myTier >= 2 && isFlatHigh) {
                if (Math.random() < 0.25) {
                    const type = engine.currentScene.textureType === 'FOREST' ? 'TREE' : obstacleType;
                    this.setObstacle(q, r, type);
                }
            }
        });
    }

    private pruneDisconnected(engine: GameEngine) {
        if (this.validHashes.size === 0) return;
        const centerQ = Math.floor(engine.mapConfig.w / 2);
        const centerR = Math.floor(engine.mapConfig.h / 2);
        const centerHex = HexUtils.offsetToAxial(centerQ, centerR, engine.mapConfig);
        let seed = HexUtils.hash(centerHex.q, centerHex.r);
        if (!this.validHashes.has(seed)) {
            seed = this.validHashes.values().next().value;
        }
        const reachable = new Set<number>();
        const queue: number[] = [seed];
        reachable.add(seed);
        let head = 0;
        while(head < queue.length) {
            const currentHash = queue[head++];
            const current = HexUtils.unhash(currentHash);
            const neighbors = HexUtils.neighbors(current);
            for (const n of neighbors) {
                const nHash = HexUtils.hash(n.q, n.r);
                if (this.validHashes.has(nHash) && !reachable.has(nHash)) {
                    reachable.add(nHash);
                    queue.push(nHash);
                }
            }
        }
        const toRemove: number[] = [];
        this.validHashes.forEach(h => {
            if (!reachable.has(h)) toRemove.push(h);
        });
        toRemove.forEach(h => {
            this.validHashes.delete(h);
            const hex = HexUtils.unhash(h);
            const k = HexUtils.key(hex);
            this.mapKeys.delete(k);
            this._heightMap.delete(k); 
        });
    }

    public setObstacle(q: number, r: number, type: string) {
        if (!this.isValid(q, r)) return;
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        this.obstacles.set(k, type);
        this.obstaclesHash.add(h);
    }

    public removeObstacle(q: number, r: number) {
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        this.obstacles.delete(k);
        this.obstaclesHash.delete(h);
    }

    public toggleObstacle(q: number, r: number, engine: GameEngine, type: string = 'WALL') {
        if (!this.isValid(q, r)) return;
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        if (this.obstaclesHash.has(h)) {
            this.obstacles.delete(k);
            this.obstaclesHash.delete(h);
        } else {
            if (!engine.getAgentAt(q, r)) {
                this.obstacles.set(k, type);
                this.obstaclesHash.add(h);
            }
        }
    }

    public isValid(q: number, r: number) { 
        return this.validHashes.has(HexUtils.hash(q, r));
    }

    public isValidHash(h: number) {
        return this.validHashes.has(h);
    }

    public hasObstacle(q: number, r: number) {
        return this.obstaclesHash.has(HexUtils.hash(q, r));
    }

    public hasObstacleHash(h: number) {
        return this.obstaclesHash.has(h);
    }
    
    public isBlocked(q: number, r: number, engine: GameEngine, ignoreId: string | null = null, movementType: MovementType = MovementType.GROUND) { 
        const h = HexUtils.hash(q, r);
        if (this.obstaclesHash.has(h)) {
            const obsId = this.obstacles.get(HexUtils.key({q, r}));
            if (obsId) {
                const def = OBSTACLE_DB[obsId];
                if (def) {
                    if (movementType === MovementType.FLYING) {
                        if (def.blocksFlying) return true;
                    } else {
                        if (def.blocksMovement) return true;
                    }
                } else {
                    return true; 
                }
            } else {
                return true;
            }
        }
        const occupant = engine.agentMap.get(h);
        if (occupant) {
            if (occupant.id === ignoreId) return false;
            if (occupant.hp <= 0 || occupant.banished) return false;
            return true;
        }
        return engine.agents.some(a => {
            if (a.id === ignoreId) return false;
            if (!a.isMoving || a.path.length === 0) return false;
            const dest = a.path[0];
            return dest.q === q && dest.r === r;
        });
    }
}
