
import { GameEngine } from "../../game";
import { MapSystem } from "../map";
import { SCENE_DB } from "../../../data/scenes";
import { HexUtils } from "../../utils";
import { BLOCK_HEIGHT, MAX_TERRAIN_TIER } from "../../../constants";

export class MapGenerator {

    public static randomize(system: MapSystem, engine: GameEngine) {
        engine.mapConfig.w = Math.floor(10 + Math.random() * 4); 
        engine.mapConfig.h = Math.floor(8 + Math.random() * 4);
        engine.currentScene = SCENE_DB[Math.floor(Math.random() * SCENE_DB.length)];
        this.rebuild(system, engine);
    }

    public static rebuild(system: MapSystem, engine: GameEngine) {
        system.resetData();
        
        const W = engine.mapConfig.w;
        const H = engine.mapConfig.h;
        const tempHeights = new Map<string, number>();

        // 1. Noise Generation
        for (let q = 0; q < W; q++) {
            for (let r = 0; r < H; r++) {
                const hex = HexUtils.offsetToAxial(q, r, engine.mapConfig);
                const k = HexUtils.key(hex);
                
                system.registerTile(hex.q, hex.r);

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

        // 2. Smoothing
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

        // 3. Commit Heights
        smoothedHeights.forEach((raw, key) => {
            let tier = Math.floor(raw);
            tier = Math.max(0, Math.min(MAX_TERRAIN_TIER, tier));
            system.setHeight(key, tier * BLOCK_HEIGHT);
        });

        this.pruneDisconnected(system, engine);
        this.generateDecorations(system, engine);

        engine.mapVersion++;
        if (engine.renderer) {
            engine.renderer.grid.reset();
        }
    }

    private static generateDecorations(system: MapSystem, engine: GameEngine) {
        const obstacleType = engine.currentScene.obstacleStyle || 'WALL';
        
        // We iterate the map keys from the system
        system.getMapKeys().forEach((key) => {
            const hPx = system.getHeightByKey(key);
            const [q, r] = key.split(',').map(Number);
            
            if (engine.getAgentAt(q, r)) return;
            
            const myTier = hPx / BLOCK_HEIGHT;
            const neighbors = HexUtils.neighbors({q, r});
            let isCliffBottom = false;
            let isFlatHigh = true;
            let validNeighbors = 0;
            
            neighbors.forEach(n => {
                if (!system.isValid(n.q, n.r)) return;
                validNeighbors++;
                const nH = system.getTerrainHeight(n.q, n.r);
                const nTier = nH / BLOCK_HEIGHT;
                if (nTier > myTier + 1) isCliffBottom = true;
                if (Math.abs(nTier - myTier) > 0.5) isFlatHigh = false;
            });

            if (isCliffBottom) {
                if (Math.random() < 0.7) {
                    system.setObstacle(q, r, obstacleType);
                    return;
                }
            }
            if (validNeighbors < 6) {
                if (Math.random() < 0.3) {
                    system.setObstacle(q, r, obstacleType);
                    return;
                }
            }
            if (myTier >= 2 && isFlatHigh) {
                if (Math.random() < 0.25) {
                    const type = engine.currentScene.textureType === 'FOREST' ? 'TREE' : obstacleType;
                    system.setObstacle(q, r, type);
                }
            }
        });
    }

    private static pruneDisconnected(system: MapSystem, engine: GameEngine) {
        // Need access to validHashes from system. 
        // Refactored MapSystem exposes getValidHashes() or we iterate mapKeys.
        
        // Seed finding
        const centerQ = Math.floor(engine.mapConfig.w / 2);
        const centerR = Math.floor(engine.mapConfig.h / 2);
        const centerHex = HexUtils.offsetToAxial(centerQ, centerR, engine.mapConfig);
        let seed = HexUtils.hash(centerHex.q, centerHex.r);
        
        if (!system.isValidHash(seed)) {
            // Find first valid hash
            const firstKey = system.getMapKeys().values().next().value;
            if (!firstKey) return;
            const [q, r] = firstKey.split(',').map(Number);
            seed = HexUtils.hash(q, r);
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
                if (system.isValidHash(nHash) && !reachable.has(nHash)) {
                    reachable.add(nHash);
                    queue.push(nHash);
                }
            }
        }

        const toRemove: number[] = [];
        // Iterate all valid hashes in system
        // We can't iterate private set, so we rely on mapKeys
        system.getMapKeys().forEach(k => {
            const [q, r] = k.split(',').map(Number);
            const h = HexUtils.hash(q, r);
            if (!reachable.has(h)) toRemove.push(h);
        });

        toRemove.forEach(h => {
            const hex = HexUtils.unhash(h);
            system.removeTile(hex.q, hex.r);
        });
    }
}
