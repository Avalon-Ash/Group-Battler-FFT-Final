
import { GameEngine } from "../../game";
import { MapSystem } from "../map";
import { SCENE_DB } from "../../../data/scenes";
import { HexUtils } from "../../utils";
import { HEX_SIZE, BLOCK_HEIGHT, MAX_TERRAIN_TIER, MAP_GENERATION } from "../../../constants";
import { random } from "../../math/rng";

export class MapGenerator {
    public static randomize(system: MapSystem, engine: GameEngine) {
        const layout = engine.mapConfig.layout;
        let cols, rows;
        
        if (layout === 'FLAT') {
            cols = MAP_GENERATION.FLAT_MIN_COLS + Math.floor(random() * 2); 
            rows = 10 + Math.floor(random() * 2); 
        } else {
            cols = MAP_GENERATION.POINTY_MIN_COLS + Math.floor(random() * 2); 
            rows = MAP_GENERATION.POINTY_MIN_ROWS + Math.floor(random() * 2); 
        }
        
        engine.mapConfig.w = cols; 
        engine.mapConfig.h = rows; 
        engine.currentScene = SCENE_DB[Math.floor(random() * SCENE_DB.length)];
        this.rebuild(system, engine);
    }

    public static rebuild(system: MapSystem, engine: GameEngine) {
        system.resetData();
        
        // Define a map radius instead of strict width/height rows
        // Note: W/H are kept for some legacy offsets if needed, but generation is radial
        const radius = Math.floor(Math.max(engine.mapConfig.w, engine.mapConfig.h) / 2) + 1;
        
        // Log map rebuild for debugging
        engine.log(null, 'SYSTEM', '地圖重建', null, `半徑: ${radius}, 佈局: ${engine.mapConfig.layout}`);

        const tiers = new Map<string, number>();
        
        const centerQ = 0;
        const centerR = 0;
        const centerHex = { q: centerQ, r: centerR };
        const centerPos = HexUtils.toPx(centerQ, centerR, engine.mapConfig);

        const noisePhaseA = random() * 1000;
        const noisePhaseB = random() * 1000;

        // Radial Generation (Giant Hexagon Island)
        for (let q = -radius; q <= radius; q++) {
            for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
                
                const k = HexUtils.key({q, r});
                system.registerTile(q, r);

                const dist = HexUtils.dist({q, r}, centerHex);
                
                // 核心數學：階梯狀高度函數 (Stepped Height Field)
                let rawVal = (Math.sin((q + noisePhaseA) * MAP_GENERATION.HEIGHT_NOISE_FREQUENCY) + Math.cos((r + noisePhaseB) * MAP_GENERATION.HEIGHT_NOISE_FREQUENCY)) * MAP_GENERATION.HEIGHT_NOISE_AMPLITUDE;
                
                // Steeper bowl edges
                rawVal += (dist * MAP_GENERATION.RADIAL_HEIGHT_GAIN); 

                // 視覺修正：前景壓低 (防止遮擋戰場視線)
                // 以畫面實體 Y 軸像素差距來決定是否為前景 (Y 越大越靠畫面下方)
                const pos = HexUtils.toPx(q, r, engine.mapConfig);
                const visualDepth = (pos.y - centerPos.y) / (HEX_SIZE * MAP_GENERATION.VISUAL_DEPTH_SCALE);
                
                if (visualDepth > 0) {
                    rawVal -= (visualDepth * MAP_GENERATION.FOREGROUND_HEIGHT_REDUCTION); 
                    if (dist > 3) rawVal -= (dist * MAP_GENERATION.OUTER_FOREGROUND_REDUCTION);
                }

                // 離散化為 Tier 層級
                let tier = Math.round(rawVal);
                tier = Math.max(0, Math.min(MAX_TERRAIN_TIER, tier));
                
                // 確保中心區域平坦
                if (dist < MAP_GENERATION.FLAT_CENTER_RADIUS) tier = 0;

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

        this.generateDecorations(system, engine, radius);
        engine.mapVersion++;
    }

    private static generateDecorations(system: MapSystem, engine: GameEngine, radius: number) {
        const obstacleType = engine.currentScene.obstacleStyle || 'WALL';
        const centerHex = { q: 0, r: 0 };
        const keys = Array.from(system.getMapKeys());
        
        // Tuned Density per Biome
        let density: number = MAP_GENERATION.DEFAULT_DECORATION_DENSITY;
        let noiseThreshold: number = MAP_GENERATION.DEFAULT_DECORATION_NOISE_THRESHOLD;
        
        if (engine.currentScene.textureType === 'FOREST') {
            density = MAP_GENERATION.FOREST_DECORATION_DENSITY; // Denser Forest
            noiseThreshold = MAP_GENERATION.FOREST_DECORATION_NOISE_THRESHOLD; // Clumpier
        } else if (engine.currentScene.textureType === 'DESERT') {
            density = MAP_GENERATION.DESERT_DECORATION_DENSITY; // Scattered Rocks
            noiseThreshold = MAP_GENERATION.DESERT_DECORATION_NOISE_THRESHOLD;
        }

        keys.forEach((key) => {
            const [q, r] = key.split(',').map(Number);
            const dist = HexUtils.dist({q, r}, centerHex);

            // Leave center clear for fighting
            if (dist < MAP_GENERATION.CLEAR_CENTER_RADIUS) return; 
            
            if (engine.getAgentAt(q, r)) return;

            const noise = Math.sin(q * MAP_GENERATION.DECORATION_NOISE_FREQUENCY) * Math.cos(r * MAP_GENERATION.DECORATION_NOISE_FREQUENCY);
            if (noise > noiseThreshold && random() < density) {
                system.setObstacle(q, r, obstacleType);
            }
        });
    }
}
