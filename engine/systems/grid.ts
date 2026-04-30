
// ╔══════════════════════════════════════════════════════════╗
// ║  [FACADE] GridSystem — 網格系統對外統一入口              ║
// ║  本檔負責：網格查詢統一 API、地形高度讀取               ║
// ║                                                          ║
// ║  子系統實作位置：                                        ║
// ║  → 詳見 grid/ 目錄下各子系統                            ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine, Agent } from "../game";
import { Hex, Skill, Projectile } from "../../types";
import { RenderList } from "../renderers/RenderList";
import { GridCache } from "./grid/GridCache";
import { GridSpatial } from "./grid/GridSpatial";
import { GridRenderStrategy } from "../renderers/grid/GridRenderStrategy";

export class GridSystem {
    private cache: GridCache;
    private renderer: GridRenderStrategy;

    constructor() {
        this.cache = new GridCache();
        this.renderer = new GridRenderStrategy();
    }

    public reset() {
        this.cache.reset();
    }

    public getTerrainHeight(q: number, r: number, engine?: GameEngine): number {
        if(engine) return engine.getTerrainHeight(q, r);
        return 0; 
    }

    public getHexAtWorldPoint(wx: number, wy: number, engine: GameEngine): Hex | null {
        return GridSpatial.getHexAtWorldPoint(wx, wy, engine, this.cache);
    }

    public getOccludedAgents(engine: GameEngine): Agent[] {
        return GridSpatial.getOccludedAgents(engine);
    }

    public getObstacleOccludedAgents(engine: GameEngine): Agent[] {
        return GridSpatial.getObstacleOccludedAgents(engine);
    }

    public submitRenderables(
        renderList: RenderList,
        engine: GameEngine, 
        hoveredHex: Hex | null, 
        hoveredSkill: Skill | null, 
        highlightAgent: Agent | null, 
        projectiles: Projectile[],
        transitionT: number,      
        transitionPhase: 'IN' | 'OUT' | 'IDLE',
        globalTime: number
    ) {
        this.renderer.submit(
            this.cache,
            renderList,
            engine,
            hoveredHex,
            hoveredSkill,
            highlightAgent,
            projectiles,
            transitionT,
            transitionPhase,
            globalTime
        );
    }
}
