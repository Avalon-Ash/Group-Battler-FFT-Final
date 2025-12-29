
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
            cols = 8 + Math.floor(Math.random() * 2); 
            rows = 10 + Math.floor(Math.random() * 2); 
        } else {
            cols = 7 + Math.floor(Math.random() * 2); 
            rows = 12 + Math.floor(Math.random() * 2); 
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
        
        // 用於計算前景深度的參考值
        const centerSum = centerQ + centerR;
        
        const noisePhaseA = Math.random() * 1000;
        const noisePhaseB = Math.random() * 1000;

        for (let q = 0; q < W; q++) {
            for (let r = 0; r < H; r++) {
                const k = HexUtils.key({q, r});
                system.registerTile(q, r);

                const dist = HexUtils.dist({q, r}, centerHex);
                
                // 核心數學：階梯狀高度函數 (Stepped Height Field)
                let rawVal = (Math.sin((q + noisePhaseA) * 0.4) + Math.cos((r + noisePhaseB) * 0.4)) * 2.0;
                rawVal += (dist * 0.5); // 基礎碗狀趨勢

                // 視覺修正：前景壓低 (防止遮擋戰場視線)
                // 根據 Diamond Grid 投影邏輯，(q+r) 越大表示越靠近螢幕下方 (前景)
                // 我們對前景區域施加高度懲罰，形成類似羅馬競技場的單向開口結構
                const visualDepth = (q + r) - centerSum;
                if (visualDepth > 0) {
                    // [UPDATED] 加強懲罰係數，確保前景不會生成高地 (從 0.8 提升至 1.5)
                    rawVal -= (visualDepth * 1.5); 
                    // 額外抑制遠端距離加成，避免邊角過高
                    if (dist > 2) rawVal -= (dist * 0.2);
                }

                // 離散化為 Tier 層級
                let tier = Math.round(rawVal);
                tier = Math.max(0, Math.min(MAX_TERRAIN_TIER, tier));
                
                // 確保中心區域平坦
                if (dist < 1.5) tier = 0;

                tiers.set(k, tier);
            }
        }

        // 高度場平滑
        const smoothedTiers = new Map<string, number>();
        tiers.forEach((tier, key) => {
            const [q, r] = key.split(',').map(Number);
            const neighbors = HexUtils.neighbors({q, r});
            let minN = tier;
            neighbors.forEach(n => {
                const nk = HexUtils.key(n);
                if (tiers.has(nk)) minN = Math.min(minN, tiers.get(nk)! + 1);
            });
            smoothedTiers.set(key, minN);
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
        const centerHex = { q: Math.floor(W/2), r: Math.floor(H/2) };
        const keys = Array.from(system.getMapKeys());

        keys.forEach((key) => {
            const [q, r] = key.split(',').map(Number);
            const dist = HexUtils.dist({q, r}, centerHex);

            if (dist < 2.5) return; 
            if (engine.getAgentAt(q, r)) return;

            const noise = Math.sin(q * 0.8) * Math.cos(r * 0.8);
            if (noise > 0.4 && Math.random() < 0.3) {
                system.setObstacle(q, r, obstacleType);
            }
        });
    }
}
