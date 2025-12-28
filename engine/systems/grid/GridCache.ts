
import { GameEngine } from "../../game";
import { HexUtils } from "../../utils";
import { BLOCK_HEIGHT } from "../../../constants";

export interface CachedTile {
    q: number;
    r: number;
    px: number;
    py: number;
    h: number;
    key: string;
}

export class GridCache {
    public tileMap: Map<string, CachedTile> = new Map();
    public tileList: CachedTile[] = []; 
    private lastMapVersion: number = -1;

    public reset() {
        this.tileMap.clear();
        this.tileList = [];
        this.lastMapVersion = -1;
    }

    public ensure(engine: GameEngine) {
        if (this.lastMapVersion !== engine.mapVersion || this.tileList.length === 0) {
            this.rebuild(engine);
        }
    }

    private rebuild(engine: GameEngine) {
        this.tileList = [];
        this.tileMap.clear();
        this.lastMapVersion = engine.mapVersion;
        
        engine.mapKeys.forEach(k => {
            const [q, r] = k.split(',').map(Number);
            // Use standard HexUtils which delegates to HexMath for precision
            const pos = HexUtils.toPx(q, r, engine.mapConfig);
            const h = engine.map.getTerrainHeight(q, r);
            
            const tile: CachedTile = { q, r, px: pos.x, py: pos.y, h, key: k };
            
            this.tileList.push(tile);
            this.tileMap.set(k, tile);
        });
    }
}
