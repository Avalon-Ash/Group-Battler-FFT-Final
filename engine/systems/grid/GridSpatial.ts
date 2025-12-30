
import { GameEngine, Agent } from "../../game";
import { HexUtils } from "../../utils";
import { Hex } from "../../../types";
import { BLOCK_HEIGHT, HEX_SIZE } from "../../../constants";
import { GridCache } from "./GridCache";

export class GridSpatial {
    
    /**
     * Get valid map tiles within a certain radius of a center point.
     * Used for game logic (e.g. finding targets) to ensure we don't pick void tiles.
     */
    public static getValidHexesInRange(centerQ: number, centerR: number, radius: number, engine: GameEngine): Hex[] {
        // Use HexUtils instead of direct HexMath
        const candidates = HexUtils.range({q: centerQ, r: centerR}, radius);
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
            
            // Simplified: Delegate projection math to HexUtils
            const rounded = HexUtils.fromPx(wx, testY, engine.mapConfig);
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

    /**
     * Detection for "X-Ray" Silhouette Rendering.
     * Identifies agents that are hidden behind taller terrain relative to the camera.
     */
    public static getOccludedAgents(engine: GameEngine): Agent[] {
        const occluded: Agent[] = [];
        const layout = engine.mapConfig.layout;
        
        for (const a of engine.agents) {
            if (a.hp <= 0 && a.fullyDead) continue;
            
            const uTerrainH = engine.map.getTerrainHeight(a.q, a.r);
            // Height of the unit's head (approx)
            const unitHeadH = uTerrainH + 60; 

            // Check neighbors that are "closer" to the camera (High Y in screen space).
            // In Hex grid, these are usually:
            // FLAT: (q, r+1), (q+1, r)
            // POINTY: (q, r+1), (q+1, r), (q-1, r+1) etc.
            
            const neighbors = HexUtils.neighbors({q: a.q, r: a.r});
            
            // We define "South" as neighbors that would be drawn AFTER the current tile.
            // In the render sort (q+r), larger values are drawn later (in front).
            const currentSort = a.q + a.r;

            for (const n of neighbors) {
                const nSort = n.q + n.r;
                
                // Only check tiles that are strictly "in front" (rendering wise)
                if (nSort > currentSort) {
                    const k = HexUtils.key(n);
                    
                    // Check if map tile exists
                    if (engine.mapKeys.has(k)) {
                        const nTerrainH = engine.map.getTerrainHeight(n.q, n.r);
                        
                        // Condition: The terrain in front is taller than the unit's current ground level
                        // Threshold: Must be at least BLOCK_HEIGHT taller to cause occlusion
                        if (nTerrainH > uTerrainH + 10) {
                            
                            // Specific check: Is it taller than the unit's HEAD?
                            // If taller than head -> Full occlusion
                            // If taller than feet but lower than head -> Partial (we can still enable silhouette for clarity)
                            
                            // Visual tweak: If terrain is significantly higher, trigger silhouette
                            if (nTerrainH > uTerrainH + 20) {
                                occluded.push(a);
                                break; // Found one occluder, that's enough
                            }
                        }
                    }
                }
            }
        }
        return occluded;
    }
}
