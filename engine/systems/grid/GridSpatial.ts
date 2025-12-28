
import { GameEngine, Agent } from "../../game";
import { HexUtils } from "../../utils";
import { HexMath } from "../../math/HexMath";
import { Hex } from "../../../types";
import { BLOCK_HEIGHT, HEX_SIZE } from "../../../constants";
import { GridCache } from "./GridCache";

export class GridSpatial {
    
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
                    // We found a candidate. Since we iterate from h=0 (Visual Top) downwards?
                    // Actually, we are testing logic planes.
                    // The tile with the highest visual Z (closest to camera) should win.
                    // Visual Z corresponds to (py + px) in ISO, or simply tile.h for stacking.
                    
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
            const uVisualY = uPx.y - uTerrainH;

            const neighbors = HexUtils.neighbors({q: a.q, r: a.r});
            
            for (const n of neighbors) {
                const k = HexUtils.key(n);
                if (engine.mapKeys.has(k)) {
                    const nPx = HexUtils.toPx(n.q, n.r, engine.mapConfig);
                    const nTerrainH = engine.map.getTerrainHeight(n.q, n.r);
                    const nVisualY = nPx.y - nTerrainH;

                    // Occlusion Check:
                    // If neighbor is visually "below" (higher Y) on screen? No, objects in front have higher Y in ISO.
                    // Wait, standard 2D canvas: Y increases downwards.
                    // So "Front" is Higher Y.
                    // If neighbor Y > Agent Y, neighbor is in front.
                    
                    if (nPx.y > uPx.y) { // Neighbor is "South" of agent
                         // Check Height: If neighbor is TALLER than agent's feet level?
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
