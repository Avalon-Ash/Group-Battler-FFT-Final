
import { GameEngine } from "../game";
import { HexUtils } from "../utils";
import { MovementType, GroundHazard, Team } from "../../types";
import { OBSTACLE_DB } from "../../data/obstacles";
import { MapGenerator } from "./map/MapGenerator";

export class MapSystem {
    public mapKeys: Set<string> = new Set();
    private validHashes: Set<number> = new Set();
    
    public obstacles: Map<string, string> = new Map();
    public obstaclesHash: Set<number> = new Set();
    
    public heightMap: Map<string, number> = new Map();

    constructor() {}

    public getTerrainHeight(q: number, r: number): number { return this.heightMap.get(HexUtils.key({q, r})) || 0; }
    public getHeightByKey(key: string): number { return this.heightMap.get(key) || 0; }
    public getMapKeys(): Set<string> { return this.mapKeys; }
    public isValid(q: number, r: number) { return this.validHashes.has(HexUtils.hash(q, r)); }
    public isValidHash(h: number) { return this.validHashes.has(h); }
    public hasObstacle(q: number, r: number) { return this.obstaclesHash.has(HexUtils.hash(q, r)); }
    public hasObstacleHash(h: number) { return this.obstaclesHash.has(h); }

    public resetData() {
        this.mapKeys.clear();
        this.validHashes.clear();
        this.obstacles.clear();
        this.obstaclesHash.clear();
        this.heightMap.clear();
    }

    public registerTile(q: number, r: number) {
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        this.mapKeys.add(k);
        this.validHashes.add(h);
    }

    public removeTile(q: number, r: number) {
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        this.validHashes.delete(h);
        this.mapKeys.delete(k);
        this.heightMap.delete(k); 
        this.obstacles.delete(k);
        this.obstaclesHash.delete(h);
    }

    public setHeight(key: string, height: number) { this.heightMap.set(key, height); }

    public setObstacle(q: number, r: number, type: string) {
        if (!this.isValid(q, r)) return;
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        this.obstacles.set(k, type);
        this.obstaclesHash.add(h);
    }

    public removeObstacle(q: number, r: number) {
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        this.obstacles.delete(k);
        this.obstaclesHash.delete(h);
    }

    public randomizeEnvironment(engine: GameEngine) { MapGenerator.randomize(this, engine); }
    public rebuildMap(engine: GameEngine) { MapGenerator.rebuild(this, engine); }

    public toggleObstacle(q: number, r: number, engine: GameEngine, type: string = 'WALL') {
        if (!this.isValid(q, r)) return;
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        if (this.obstaclesHash.has(h)) {
            this.obstacles.delete(k);
            this.obstaclesHash.delete(h);
        } else {
            if (!engine.getAgentAt(q, r)) {
                this.obstacles.set(k, type);
                this.obstaclesHash.add(h);
            }
        }
    }
    
    public isBlocked(q: number, r: number, engine: GameEngine, ignoreId: string | null = null, movementType: MovementType = MovementType.GROUND) { 
        const h = HexUtils.hash(q, r);
        if (this.obstaclesHash.has(h)) {
            const obsId = this.obstacles.get(HexUtils.key({q, r}));
            if (obsId) {
                const def = OBSTACLE_DB[obsId];
                if (def) {
                    if (movementType === MovementType.FLYING) {
                        if (def.blocksFlying) return true;
                    } else {
                        if (def.blocksMovement) return true;
                    }
                } else return true; 
            } else return true;
        }
        const occupant = engine.agentMap.get(h);
        if (occupant) {
            if (occupant.id === ignoreId) return false;
            if (occupant.hp <= 0 || occupant.banished) return false;
            return true;
        }
        return engine.agents.some(a => {
            if (a.id === ignoreId) return false;
            if (!a.isMoving || a.path.length === 0) return false;
            const dest = a.path[0];
            return dest.q === q && dest.r === r;
        });
    }
    
    // Hazards moved to HazardSystem
    public getHazardAt(q: number, r: number, engine: GameEngine): GroundHazard | undefined {
        return engine.hazards.getHazardAt(q, r);
    }
}
