import { GameEngine, Agent } from "../../game";
import { HexUtils } from "../../utils";
import { Hex, HexSpatialLookup } from "../../../types";
import { BLOCK_HEIGHT, HEX_SIZE, UNIT_OCCLUSION, GRID_SPATIAL } from "../../../constants";
import { VisualMath } from "../../math/VisualMath";

export class GridSpatial {
    public static getValidHexesInRange(centerQ: number, centerR: number, radius: number, engine: GameEngine): Hex[] {
        const candidates = HexUtils.range({q: centerQ, r: centerR}, radius);
        return candidates.filter(hex => engine.map.isValid(hex.q, hex.r));
    }

    public static getHexAtWorldPoint(wx: number, wy: number, engine: GameEngine, cache?: HexSpatialLookup): Hex | null {
        if (cache?.ensure) {
            cache.ensure(engine);
        }
        // 解算高度步進，匹配視覺投影
        const maxHeight = GRID_SPATIAL.PICK_MAX_HEIGHT; 
        const step = BLOCK_HEIGHT;
        let bestHex: Hex | null = null;
        let bestH: number = GRID_SPATIAL.PICK_INITIAL_HEIGHT;

        for (let h = 0; h <= maxHeight; h += step) {
            // 修正：解算 Y 軸時應考慮 Z 的物理貢獻
            // 視覺投影 vy = y - z -> y = vy + z
            const testY = wy + h; 
            const rounded = HexUtils.fromPx(wx, testY, engine.mapConfig);
            const key = HexUtils.key(rounded);

            let tilePx: number;
            let tilePy: number;
            let tileH: number;

            if (cache) {
                const tile = cache.tileMap.get(key);
                if (!tile) continue;
                tilePx = tile.px;
                tilePy = tile.py;
                tileH = tile.h;
            } else {
                if (!engine.mapKeys.has(key)) continue;
                const pos = HexUtils.toPx(rounded.q, rounded.r, engine.mapConfig);
                tilePx = pos.x;
                tilePy = pos.y;
                tileH = engine.map.getTerrainHeight(rounded.q, rounded.r);
            }

            const visualTopY = VisualMath.getIsoVisualY(tilePy, tileH);
            const dx = Math.abs(wx - tilePx);
            const dy = Math.abs(wy - visualTopY);
            
            if (dx < HEX_SIZE * GRID_SPATIAL.PICK_HALF_WIDTH_FACTOR && dy < HEX_SIZE * GRID_SPATIAL.PICK_HALF_HEIGHT_FACTOR) {
                if (tileH >= bestH) {
                    bestHex = rounded;
                    bestH = tileH;
                }
            }
        }
        return bestHex;
    }

    public static getOccludedAgents(engine: GameEngine): Agent[] {
        return engine.agents.filter(a => !(a.hp <= 0 && a.fullyDead) && GridSpatial.occludingTiles(engine, a, true).length > 0);
    }

    public static getObstacleOccludedAgents(engine: GameEngine): Agent[] {
        return engine.agents.filter(a => !(a.hp <= 0 && a.fullyDead) && GridSpatial.occludingObstacles(engine, a, true).length > 0);
    }

    /**
     * 剪影的遮擋來源：每個被遮擋的單位，連同擋住它的地塊格與障礙物格（key）。
     * 判定與 getOccludedAgents／getObstacleOccludedAgents 相同；RenderPipeline 用這些格把剪影裁成只畫在擋住它的東西上（SilhouetteMask）。
     */
    public static getOcclusionSources(engine: GameEngine): OcclusionSource[] {
        const out: OcclusionSource[] = [];
        for (const a of engine.agents) {
            if (a.hp <= 0 && a.fullyDead) continue;
            const tiles = GridSpatial.occludingTiles(engine, a, false);
            const obstacles = GridSpatial.occludingObstacles(engine, a, false);
            if (tiles.length > 0 || obstacles.length > 0) out.push({ agent: a, tiles, obstacles });
        }
        return out;
    }

    /** 單位前方（螢幕上畫在它之後）比它腳下高出 UNIT_OCCLUSION.MIN_STEP 的鄰格；first＝找到一格就停 */
    private static occludingTiles(engine: GameEngine, a: Agent, first: boolean): string[] {
        const keys: string[] = [];
        const uTerrainH = VisualMath.getUnitGroundHeight(a, (q, r) => engine.map.getTerrainHeight(q, r), engine.mapConfig);
        const uY = HexUtils.toPx(a.q, a.r, engine.mapConfig).y;
        for (const n of HexUtils.neighbors({q: a.q, r: a.r})) {
            const nKey = HexUtils.key(n);
            if (!engine.mapKeys.has(nKey)) continue;
            // [FIX] 跳過正在下墜的地塊，避免已崩塌的格子繼續觸發矽影
            if (engine.zones.collapsingTiles.has(nKey)) continue;
            // 以螢幕投影判斷「在前方」（繪製在單位之後）。曾用 q+r 代理，但等距投影下
            // 方向 (-1,+1) 的鄰格 q+r 相同卻在畫面正前方，該格的高柱擋住單位卻不補畫輪廓。
            if (HexUtils.toPx(n.q, n.r, engine.mapConfig).y <= uY) continue;
            if (engine.map.getTerrainHeight(n.q, n.r) > uTerrainH + UNIT_OCCLUSION.MIN_STEP) {
                keys.push(nKey);
                if (first) break;
            }
        }
        return keys;
    }

    /** 單位前方、水平距離與垂直距離都夠近的障礙物格；first＝找到一個就停 */
    private static occludingObstacles(engine: GameEngine, agent: Agent, first: boolean): string[] {
        const keys: string[] = [];
        for (const key of engine.map.obstacles.keys()) {
            const [q, r] = key.split(',').map(Number);
            const pos = HexUtils.toPx(q, r, engine.mapConfig);
            // 障礙物 screenY > 單位 screenY（障礙物在畫面前方）且距離中心足夠近
            if (pos.y > agent.py &&
                Math.abs(pos.x - agent.px) < GRID_SPATIAL.OBSTACLE_OCCLUSION_X_RANGE &&
                Math.abs(pos.y - agent.py) < GRID_SPATIAL.OBSTACLE_OCCLUSION_Y_RANGE) {
                keys.push(key);
                if (first) break;
            }
        }
        return keys;
    }
}

/** 一個被遮擋的單位與擋住它的格子（地塊格、障礙物格的 key） */
export interface OcclusionSource {
    agent: Agent;
    tiles: string[];
    obstacles: string[];
}