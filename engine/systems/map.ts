
import { GameEngine } from "../game";
import { SCENE_DB } from "../../data/scenes";
import { HexUtils } from "../utils";
import { BLOCK_HEIGHT, MAX_TERRAIN_TIER } from "../../constants";

export class MapSystem {
    public mapKeys: Set<string> = new Set();
    private validHashes: Set<number> = new Set();
    
    // Changed from Set to Map to store Obstacle Type ID (e.g. 'WALL', 'TREE')
    public obstacles: Map<string, string> = new Map();
    public obstaclesHash: Set<number> = new Set();
    
    // Terrain Source of Truth (Generated once per rebuild)
    private _heightMap: Map<string, number> = new Map();

    constructor() {}

    public getTerrainHeight(q: number, r: number): number {
        // Direct lookup from generated map (returns 0 if void/out of bounds)
        return this._heightMap.get(HexUtils.key({q, r})) || 0;
    }

    public randomizeEnvironment(engine: GameEngine) {
        engine.mapConfig.w = Math.floor(10 + Math.random() * 4); // Slightly wider maps for amphitheater
        engine.mapConfig.h = Math.floor(8 + Math.random() * 4);
        engine.currentScene = SCENE_DB[Math.floor(Math.random() * SCENE_DB.length)];
        this.rebuildMap(engine);
    }

    public rebuildMap(engine: GameEngine) {
        this.mapKeys.clear();
        this.validHashes.clear();
        this.obstacles.clear();
        this.obstaclesHash.clear();
        this._heightMap.clear();
        
        const W = engine.mapConfig.w;
        const H = engine.mapConfig.h;
        const tempHeights = new Map<string, number>();

        // =====================================================================
        // PHASE 1: Raw Generation (Amphitheater Gradient)
        // =====================================================================
        for (let q = 0; q < W; q++) {
            for (let r = 0; r < H; r++) {
                const hex = HexUtils.offsetToAxial(q, r, engine.mapConfig);
                const k = HexUtils.key(hex);
                
                this.mapKeys.add(k);
                this.validHashes.add(HexUtils.hash(hex.q, hex.r));

                // View Factor: 
                // r is the 'row'. In this offset grid, higher r = lower on screen (Front).
                // We want High Ground at the Back (Low r), Low Ground at Front (High r).
                const depthProgress = r / H; // 0.0 (Back) -> 1.0 (Front)
                const viewFactor = 1.0 - depthProgress; 

                // Noise Base (0.0 to 1.0)
                const noise = Math.random();
                
                // Height Logic: 
                // Back: Allow full height (e.g. up to Tier 4 or 5)
                // Front: Cap strictly to Tier 0 or 1 to prevent occlusion
                // Formula: BaseNoise * (MinBias + ViewFactor * Scale)
                
                let rawHeight = 0;
                
                if (depthProgress > 0.7) {
                    // Front 30%: Very flat, mostly Tier 0, rare Tier 1
                    rawHeight = noise * 0.8; 
                } else {
                    // Back/Mid: Tier 0 to Tier 4
                    // Bias towards 1.0 base, plus ViewFactor bonus
                    rawHeight = noise * (1.5 + viewFactor * 3.5);
                }

                tempHeights.set(k, rawHeight);
            }
        }

        // =====================================================================
        // PHASE 2: Smoothing (Blur Pass)
        // =====================================================================
        // This removes "Islands" and creates rolling slopes
        const smoothedHeights = new Map<string, number>();
        
        tempHeights.forEach((h, key) => {
            const [q, r] = key.split(',').map(Number);
            const neighbors = HexUtils.neighbors({q, r});
            
            let sum = h;
            let count = 1;
            
            // Weight self higher to retain some randomness
            sum += h; 
            count++;

            neighbors.forEach(n => {
                const nk = HexUtils.key(n);
                if (tempHeights.has(nk)) {
                    sum += tempHeights.get(nk)!;
                    count++;
                }
            });
            
            smoothedHeights.set(key, sum / count);
        });

        // =====================================================================
        // PHASE 3: Quantize & Store
        // =====================================================================
        smoothedHeights.forEach((raw, key) => {
            let tier = Math.floor(raw);
            // Clamp
            tier = Math.max(0, Math.min(MAX_TERRAIN_TIER, tier));
            this._heightMap.set(key, tier * BLOCK_HEIGHT);
        });

        // 2. Prune Disconnected Islands (Rule: No Disconnected Tiles)
        this.pruneDisconnected(engine);

        // =====================================================================
        // PHASE 4: Auto-Decoration
        // =====================================================================
        this.generateDecorations(engine);

        engine.mapVersion++;
    }

    private generateDecorations(engine: GameEngine) {
        const obstacleType = engine.currentScene.obstacleStyle || 'WALL';
        
        this._heightMap.forEach((hPx, key) => {
            const [q, r] = key.split(',').map(Number);
            
            // Skip if unit exists (though usually map is empty on rebuild)
            if (engine.getAgentAt(q, r)) return;

            const myTier = hPx / BLOCK_HEIGHT;
            const hex = {q, r};
            
            // Analyze Neighbors
            const neighbors = HexUtils.neighbors(hex);
            let isCliffBottom = false;
            let isFlatHigh = true;
            let validNeighbors = 0;

            neighbors.forEach(n => {
                if (!this.isValid(n.q, n.r)) return;
                validNeighbors++;

                const nH = this.getTerrainHeight(n.q, n.r);
                const nTier = nH / BLOCK_HEIGHT;
                
                // If a neighbor is > 1 tier higher, I am at the bottom of a cliff/wall
                // Placing an obstacle here looks like a retaining wall or rocks falling
                if (nTier > myTier + 1) isCliffBottom = true;
                
                // If any neighbor has different height, I am not flat
                if (Math.abs(nTier - myTier) > 0.5) isFlatHigh = false;
            });

            // Rule 1: Cliff Decor (High Priority)
            // Visually connects the height difference
            if (isCliffBottom) {
                if (Math.random() < 0.7) {
                    this.setObstacle(q, r, obstacleType);
                    return;
                }
            }

            // Rule 2: Edge Noise
            // If on the rim of the map, high chance of obstacles to frame the arena
            if (validNeighbors < 6) {
                if (Math.random() < 0.3) {
                    this.setObstacle(q, r, obstacleType);
                    return;
                }
            }

            // Rule 3: High Ground Forests
            // If I am high (> Tier 2) and flat, grow trees to create strategic cover
            // Forests block movement but fit the theme
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

        // Find a center-ish tile as the seed
        const centerQ = Math.floor(engine.mapConfig.w / 2);
        const centerR = Math.floor(engine.mapConfig.h / 2);
        const centerHex = HexUtils.offsetToAxial(centerQ, centerR, engine.mapConfig);
        
        // Find closest valid tile to ideal center
        let seed = HexUtils.hash(centerHex.q, centerHex.r);
        if (!this.validHashes.has(seed)) {
            // Fallback: pick first valid
            seed = this.validHashes.values().next().value;
        }

        // BFS to find all reachable tiles
        const reachable = new Set<number>();
        const queue: number[] = [seed];
        reachable.add(seed);

        // Standard BFS
        let head = 0;
        while(head < queue.length) {
            const currentHash = queue[head++];
            const current = HexUtils.unhash(currentHash);
            // Height Aware? For checking island connectivity, we treat blocks as connected if they exist
            // Vertical movement is a pathfinding problem, not a map validity problem.
            const neighbors = HexUtils.neighbors(current);
            
            for (const n of neighbors) {
                const nHash = HexUtils.hash(n.q, n.r);
                if (this.validHashes.has(nHash) && !reachable.has(nHash)) {
                    reachable.add(nHash);
                    queue.push(nHash);
                }
            }
        }

        // Remove anything NOT in reachable set
        const toRemove: number[] = [];
        this.validHashes.forEach(h => {
            if (!reachable.has(h)) toRemove.push(h);
        });

        toRemove.forEach(h => {
            this.validHashes.delete(h);
            const hex = HexUtils.unhash(h);
            const k = HexUtils.key(hex);
            this.mapKeys.delete(k);
            this._heightMap.delete(k); // Clean up height map
        });
    }

    // New: Explicit Set for Painting
    public setObstacle(q: number, r: number, type: string) {
        if (!this.isValid(q, r)) return;
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        
        this.obstacles.set(k, type);
        this.obstaclesHash.add(h);
    }

    // New: Explicit Remove for Painting
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
    
    public isBlocked(q: number, r: number, engine: GameEngine, ignoreId: string | null = null) { 
        const h = HexUtils.hash(q, r);
        if (this.obstaclesHash.has(h)) return true;
        
        const occupant = engine.agentMap.get(h);
        if (occupant) {
            if (occupant.id === ignoreId) return false;
            if (occupant.hp <= 0 || occupant.banished) return false;
            return true;
        }
        
        // Check moving agents destination
        return engine.agents.some(a => {
            if (a.id === ignoreId) return false;
            if (!a.isMoving || a.path.length === 0) return false;
            const dest = a.path[0];
            return dest.q === q && dest.r === r;
        });
    }
}
