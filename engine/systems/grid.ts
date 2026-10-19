
// ╔══════════════════════════════════════════════════════════╗
// ║  [FACADE] GridSystem — 網格系統對外統一入口              ║
// ║  本檔負責：網格查詢統一 API、地形高度讀取               ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine, Agent } from "../game";
import { Hex, HexSpatialLookup } from "../../types";
import { GridSpatial } from "./grid/GridSpatial";

export class GridSystem {
    public spatialCache?: HexSpatialLookup;

    public reset() {
    }

    public getTerrainHeight(q: number, r: number, engine?: GameEngine): number {
        if(engine) return engine.getTerrainHeight(q, r);
        return 0; 
    }

    public getHexAtWorldPoint(wx: number, wy: number, engine: GameEngine): Hex | null {
        return GridSpatial.getHexAtWorldPoint(wx, wy, engine, this.spatialCache);
    }

    public getOccludedAgents(engine: GameEngine): Agent[] {
        return GridSpatial.getOccludedAgents(engine);
    }

    public getObstacleOccludedAgents(engine: GameEngine): Agent[] {
        return GridSpatial.getObstacleOccludedAgents(engine);
    }
}
