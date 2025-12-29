import { GameEngine } from "../../game";
import { MapSystem } from "../map";
import { SCENE_DB } from "../../../data/scenes";
import { HexUtils } from "../../utils";
import { BLOCK_HEIGHT, MAX_TERRAIN_TIER } from "../../../constants";
export class MapGenerator {
    public static randomize(system: MapSystem, engine: GameEngine) {
        const layout = engine.mapConfig.layout;
        let cols, rows;
        if (layout === 'FLAT') {
            cols = 7 + Math.floor(Math.random() * 3); 
            rows = Math.ceil(cols * 1.3) + Math.floor(Math.random() * 3); 
        } else {
            cols = 6 + Math.floor(Math.random() * 3); 
            rows = Math.ceil(cols * 1.8) + Math.floor(Math.random() * 3); 
        }
        engine.mapConfig.w = cols; 
        engine.mapConfig.h = rows; 
        engine.currentScene = SCENE_DB[Math.floor(Math.random() * SCENE_DB.length)];
        this.rebuild(system, engine);
    }
    public static rebuild(system: MapSystem, engine: GameEngine) {
        system.resetData();
        const W = engine.mapConfig.w;
        const H = engine.mapConfig.h;
        const tiers = new Map<string, number>();
        const centerQ = Math.floor((W - 1) / 2);
        const centerR = Math.floor((H - 1) / 2);
        const centerHex = { q: centerQ, r: centerR };
        const noisePhaseA = Math.random() * 100;
        const noisePhaseB = Math.random() * 100;
        const bowlShapeIntensity = 0.8 + Math.random() * 0.5; 
        const maxVisualY = (W - 1) + (H - 1);
        for (let q = 0; q < W; q++) {
            for (let r = 0; r < H; r++) {
                const k = HexUtils.key({q, r});
                system.registerTile(q, r);
                const visualRowIndex = q + r; 
                const screenY = Math.min(1.0, Math.max(0.0, visualRowIndex / maxVisualY));
                const dist = HexUtils.dist({q, r}, centerHex);
                let rawHeight = dist * bowlShapeIntensity;
                let visibilityMask = 1.0;
                if (screenY > 0.7) { 
                    const t = (screenY - 0.7) / 0.3;
                    visibilityMask = Math.max(0, 1.0 - (t * 2.5));
                }
                let tier = rawHeight * visibilityMask;
                const noise = (Math.sin((q + noisePhaseA) * 0.6) + Math.cos((r + noisePhaseB) * 0.5)) * 1.5;
                tier += noise * visibilityMask; 
                let finalTier = Math.floor(tier);
                finalTier = Math.max(0, Math.min(MAX_TERRAIN_TIER, finalTier));
                if (dist < 2.0) finalTier = Math.max(0, finalTier - 1); 
                if (screenY > 0.85) finalTier = 0;
                tiers.set(k, finalTier);
            }
        }
        const smoothedTiers = new Map<string, number>();
        tiers.forEach((tier, key) => {
            const [q, r] = key.split(',').map(Number);
            const neighbors = HexUtils.neighbors({q, r});
            let sum = tier;
            let count = 1;
            neighbors.forEach(n => {
                const nk = HexUtils.key(n);
                if (tiers.has(nk)) {
                    sum += tiers.get(nk)!;
                    count++;
                }
            });
            const avg = Math.round(sum / count);
            smoothedTiers.set(key, avg);
        });
        smoothedTiers.forEach((tier, key) => {
            system.setHeight(key, tier * BLOCK_HEIGHT);
        });
        this.generateDecorations(system, engine, W, H);
        engine.mapVersion++;
        if (engine.renderer) engine.renderer.grid.reset();
    }
    private static generateDecorations(system: MapSystem, engine: GameEngine, W: number, H: number) {
        const obstacleType = engine.currentScene.obstacleStyle || 'WALL';
        const centerQ = Math.floor((W - 1) / 2);
        const centerR = Math.floor((H - 1) / 2);
        const centerHex = { q: centerQ, r: centerR };
        const clusterPhaseX = Math.random() * 50;
        const clusterPhaseY = Math.random() * 50;
        const maxVisualY = (W - 1) + (H - 1);
        const keys = Array.from(system.getMapKeys());
        for (let i = keys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [keys[i], keys[j]] = [keys[j], keys[i]];
        }
        keys.forEach((key) => {
            const [q, r] = key.split(',').map(Number);
            const hPx = system.getHeightByKey(key);
            const tier = hPx / BLOCK_HEIGHT;
            if (engine.getAgentAt(q, r)) return;
            const dist = HexUtils.dist({q, r}, centerHex);
            if (dist < 2.5) return; 
            const visualRowIndex = q + r;
            const screenY = visualRowIndex / maxVisualY;
            if (screenY > 0.7) return;
            const noise = Math.sin((q + clusterPhaseX) * 0.8) * Math.cos((r + clusterPhaseY) * 0.8); 
            let baseChance = 0.05; 
            if (noise > 0.3) baseChance = 0.35;
            if (tier >= 3) baseChance += 0.1;
            let obstacleNeighbors = 0;
            const neighbors = HexUtils.neighbors({q, r});
            for(const n of neighbors) {
                if (system.hasObstacle(n.q, n.r)) obstacleNeighbors++;
            }
            if (obstacleNeighbors >= 1) baseChance *= 0.3; 
            if (obstacleNeighbors >= 2) baseChance = 0; 
            if (Math.random() < baseChance) {
                system.setObstacle(q, r, obstacleType);
            }
        });
    }
}