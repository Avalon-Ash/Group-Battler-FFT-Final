import { GameEngine, Agent } from "../../game";
import { HexUtils } from "../../utils";
import { Hex } from "../../../types";
import { BLOCK_HEIGHT, HEX_SIZE } from "../../../constants";
import { GridCache } from "./GridCache";
import { VisualMath } from "../../math/VisualMath";

export class GridSpatial {
    public static getValidHexesInRange(centerQ: number, centerR: number, radius: number, engine: GameEngine): Hex[] {
        const candidates = HexUtils.range({q: centerQ, r: centerR}, radius);
        return candidates.filter(hex => engine.map.isValid(hex.q, hex.r));
    }

    public static getHexAtWorldPoint(wx: number, wy: number, engine: GameEngine, cache: GridCache): Hex | null {
        cache.ensure(engine);
        // 解算高度步進，匹配視覺投影
        const maxHeight = 300; 
        const step = BLOCK_HEIGHT;
        let bestHex: Hex | null = null;
        let bestH = -999;

        for (let h = 0; h <= maxHeight; h += step) {
            // 修正：解算 Y 軸時應考慮 Z 的物理貢獻
            // 視覺投影 vy = y - z -> y = vy + z
            const testY = wy + h; 
            const rounded = HexUtils.fromPx(wx, testY, engine.mapConfig);
            const tile = cache.tileMap.get(HexUtils.key(rounded));
            
            if (tile) {
                const visualTopY = VisualMath.getIsoVisualY(tile.py, tile.h);
                const dx = Math.abs(wx - tile.px);
                const dy = Math.abs(wy - visualTopY);
                
                if (dx < HEX_SIZE * 0.9 && dy < HEX_SIZE * 0.6) {
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
            const uTerrainH = engine.map.getTerrainHeight(a.q, a.r);
            const neighbors = HexUtils.neighbors({q: a.q, r: a.r});
            const currentSort = a.q + a.r;
            for (const n of neighbors) {
                // Topological occlusion check
                if ((n.q + n.r) > currentSort) {
                    if (engine.mapKeys.has(HexUtils.key(n))) {
                        if (engine.map.getTerrainHeight(n.q, n.r) > uTerrainH + 20) {
                            occluded.push(a);
                            break;
                        }
                    }
                }
            }
        }
        return occluded;
    }

    public static getObstacleOccludedAgents(engine: GameEngine): Agent[] {
        const result: Agent[] = [];
        for (const agent of engine.agents) {
            if (agent.hp <= 0) continue;
            // 取得所有障礙物
            for (const key of engine.map.obstacles.keys()) {
                const [q, r] = key.split(',').map(Number);
                const pos = HexUtils.toPx(q, r, engine.mapConfig);
                
                // 障礙物 screenY > 單位 screenY（障礙物在畫面前方）
                // 且距離中心足夠近（遮擋判斷）
                if (pos.y > agent.py && 
                    Math.abs(pos.x - agent.px) < 60 &&
                    Math.abs(pos.y - agent.py) < 120) {
                    result.push(agent);
                    break;
                }
            }
        }
        return result;
    }
}