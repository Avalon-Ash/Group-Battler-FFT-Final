
import { GameEngine } from "../../game";
import { MapSystem } from "../map";
import { SCENE_DB } from "../../../data/scenes";
import { HexUtils } from "../../utils";
import { BLOCK_HEIGHT, MAX_TERRAIN_TIER } from "../../../constants";

export class MapGenerator {

    public static randomize(system: MapSystem, engine: GameEngine) {
        // Reverted: Standard Arena Bounds
        // Max 10x10 to ensure 60fps on mid-tier devices and clean composition
        engine.mapConfig.w = Math.floor(8 + Math.random() * 3); // 8, 9, 10
        engine.mapConfig.h = Math.floor(8 + Math.random() * 3); // 8, 9, 10
        engine.currentScene = SCENE_DB[Math.floor(Math.random() * SCENE_DB.length)];
        this.rebuild(system, engine);
    }

    public static rebuild(system: MapSystem, engine: GameEngine) {
        system.resetData();
        
        const W = engine.mapConfig.w;
        const H = engine.mapConfig.h;
        const tempHeights = new Map<string, number>();

        // Center Point for "Arena" logic
        const cx = (W - 1) / 2;
        const cy = (H - 1) / 2;
        const maxDist = Math.sqrt(cx * cx + cy * cy);

        // 1. Terrain Shape Generation (Compact Terraces)
        for (let q = 0; q < W; q++) {
            for (let r = 0; r < H; r++) {
                const hex = HexUtils.offsetToAxial(q, r, engine.mapConfig);
                const k = HexUtils.key(hex);
                
                system.registerTile(hex.q, hex.r);

                // Distance from center (0 to 1)
                const dist = Math.sqrt((q - cx) ** 2 + (r - cy) ** 2) / maxDist;
                
                // Base Noise (Higher frequency for smaller maps)
                const noise1 = Math.sin(q * 0.8) * Math.cos(r * 0.8);
                const noise2 = Math.sin(q * 1.5 + r * 1.2) * 0.5;
                
                // Arena bias: Higher at edges, lower at center
                let height = (dist * 2.5) + noise1 + noise2;
                
                // High Ground Plateau chance
                if (Math.random() > 0.85) height += 1.5;

                // Clamp and Scale
                height = Math.max(0, height);
                
                // Quantize to steps
                let tier = Math.floor(height);
                
                // Random variation on edges
                if (Math.random() > 0.75) tier += 1;

                tempHeights.set(k, tier);
            }
        }

        // 2. Smoothing
        const smoothedHeights = new Map<string, number>();
        tempHeights.forEach((h, key) => {
            const [q, r] = key.split(',').map(Number);
            const neighbors = HexUtils.neighbors({q, r});
            let sum = h;
            let count = 1;
            neighbors.forEach(n => {
                const nk = HexUtils.key(n);
                if (tempHeights.has(nk)) {
                    sum += tempHeights.get(nk)!;
                    count++;
                }
            });
            smoothedHeights.set(key, Math.round(sum / count));
        });

        // 3. Commit Heights & Safety
        smoothedHeights.forEach((tier, key) => {
            let finalTier = Math.max(0, Math.min(MAX_TERRAIN_TIER, tier));
            
            // "Framing Safety": Reduce height of top-most rows
            const [q, r] = key.split(',').map(Number);
            if (r < 2) finalTier = Math.min(finalTier, 1); 

            system.setHeight(key, finalTier * BLOCK_HEIGHT);
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
        
        system.getMapKeys().forEach((key) => {
            const hPx = system.getHeightByKey(key);
            const [q, r] = key.split(',').map(Number);
            
            if (engine.getAgentAt(q, r)) return;
            
            const myTier = hPx / BLOCK_HEIGHT;
            const neighbors = HexUtils.neighbors({q, r});
            let maxNeighborDiff = 0;
            
            neighbors.forEach(n => {
                if (!system.isValid(n.q, n.r)) return;
                const nH = system.getTerrainHeight(n.q, n.r);
                const diff = Math.abs(nH - hPx) / BLOCK_HEIGHT;
                if (diff > maxNeighborDiff) maxNeighborDiff = diff;
            });

            // Rule 1: Safety Walls on cliffs
            if (maxNeighborDiff >= 2) {
                if (Math.random() < 0.5) {
                    system.setObstacle(q, r, obstacleType);
                    return;
                }
            }

            // Rule 2: Random Clusters
            if (Math.random() < 0.1) {
                const type = engine.currentScene.textureType === 'FOREST' ? 'TREE' : obstacleType;
                system.setObstacle(q, r, type);
            }
        });
    }

    private static pruneDisconnected(system: MapSystem, engine: GameEngine) {
        const centerQ = Math.floor(engine.mapConfig.w / 2);
        const centerR = Math.floor(engine.mapConfig.h / 2);
        const centerHex = HexUtils.offsetToAxial(centerQ, centerR, engine.mapConfig);
        let seed = HexUtils.hash(centerHex.q, centerHex.r);
        
        if (!system.isValidHash(seed)) {
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
            const curH = system.getTerrainHeight(current.q, current.r);

            for (const n of neighbors) {
                const nHash = HexUtils.hash(n.q, n.r);
                if (system.isValidHash(nHash) && !reachable.has(nHash)) {
                    const nH = system.getTerrainHeight(n.q, n.r);
                    if (Math.abs(nH - curH) <= BLOCK_HEIGHT * 2) {
                        reachable.add(nHash);
                        queue.push(nHash);
                    }
                }
            }
        }

        const toRemove: number[] = [];
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
