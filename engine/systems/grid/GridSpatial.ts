
import { GameEngine, Agent } from "../../game";
import { HexUtils } from "../../utils";
import { HexMath } from "../../math/HexMath";
import { Hex } from "../../../types";
import { BLOCK_HEIGHT, HEX_SIZE } from "../../../constants";
import { GridCache } from "./GridCache";

export class GridSpatial {
    
    /**
     * Get valid map tiles within a certain radius of a center point.
     * Used for game logic (e.g. finding targets) to ensure we don't pick void tiles.
     */
    public static getValidHexesInRange(centerQ: number, centerR: number, radius: number, engine: GameEngine): Hex[] {
        const candidates = HexMath.range({q: centerQ, r: centerR}, radius);
        const valid: Hex[] = [];
        
        for (const hex of candidates) {
            if (engine.map.isValid(hex.q, hex.r)) {
                valid.push(hex);
            }
        }
        return valid;
    }

    public static getHexAtWorldPoint(wx: number, wy: number, engine: GameEngine, cache: GridCache): Hex | null {
        cache.ensure(engine);
        const maxHeight = 200; 
        const step = BLOCK_HEIGHT;
        let bestHex: Hex | null = null;
        let bestH = -999;

        // Raycast down from max possible height
        for (let h = 0; h <= maxHeight; h += step) {
            // "Unproject" the Y coordinate by adding height (since visual Y = ground Y - height)
            const testY = wy + h; 
            
            const frac = HexMath.pixelToHex(wx, testY, engine.mapConfig.offsetX, engine.mapConfig.offsetY);
            const rounded = HexMath.cubeToAxial(HexMath.cubeRound(HexMath.axialToCube(frac)));
            const key = HexUtils.key(rounded);
            
            const tile = cache.tileMap.get(key);
            
            if (tile) {
                // Check if the click hits the top face or the slope
                // Visual Y of the tile top is (py - tile.h)
                const visualTopY = tile.py - tile.h;
                
                // Distance check in screen space roughly
                const dx = Math.abs(wx - tile.px);
                const dy = Math.abs(wy - visualTopY);
                
                // Tighter hit box for better precision
                if (dx < HEX_SIZE * 0.9 && dy < HEX_SIZE * 0.6) {
                    // We found a candidate. The tile with the highest visual Z (closest to camera) should win.
                    if (tile.h >= bestH) {
                        bestHex = rounded;
                        bestH = tile.h;
                    }
                }
            }
        }
        return bestHex;
    }

    public static getOccludedAgents(engine: GameEngine): Agent[] {
        const occluded: Agent[] = [];
        
        for (const a of engine.agents) {
            if (a.hp <= 0 && a.fullyDead) continue;
            
            const uPx = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            // Visual Y of agent feet = uPx.y - terrainH
            const uTerrainH = engine.map.getTerrainHeight(a.q, a.r);
            
            const neighbors = HexUtils.neighbors({q: a.q, r: a.r});
            
            for (const n of neighbors) {
                const k = HexUtils.key(n);
                if (engine.mapKeys.has(k)) {
                    const nPx = HexUtils.toPx(n.q, n.r, engine.mapConfig);
                    const nTerrainH = engine.map.getTerrainHeight(n.q, n.r);
                    
                    // Occlusion Check:
                    // If neighbor is "South" (Higher Y) and TALLER than agent's standing level
                    if (nPx.y > uPx.y) { 
                         if (nTerrainH > uTerrainH) {
                             occluded.push(a);
                             break;
                         }
                    }
                }
            }
        }
        return occluded;
    }
}
