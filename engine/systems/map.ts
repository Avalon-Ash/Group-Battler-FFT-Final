
import { GameEngine, Agent } from "../game";
import { HexUtils } from "../utils";
import { MovementType, GroundHazard } from "../../types";
import { MapGenerator } from "./map/MapGenerator";
import { MapSpatial } from "./map/MapSpatial";
export class MapSystem {
    public agentMap: Map<number, Agent> = new Map();
    public mapKeys: Set<string> = new Set();
    private validHashes: Set<number> = new Set();
    public obstacles: Map<string, string> = new Map();
    public obstaclesHash: Set<number> = new Set();
    public heightMap: Map<string, number> = new Map();
    constructor() {}
    public registerAgent(agent: Agent) {
        const hash = HexUtils.hash(agent.q, agent.r);
        this.agentMap.set(hash, agent);
    }
    public unregisterAgent(agent: Agent) {
        const hash = HexUtils.hash(agent.q, agent.r);
        if (this.agentMap.get(hash) === agent) {
            this.agentMap.delete(hash);
        }
    }
    public removeAgentAt(q: number, r: number) {
        const hash = HexUtils.hash(q, r);
        this.agentMap.delete(hash);
    }
    public getAgentAt(q: number, r: number): Agent | undefined {
        const agent = this.agentMap.get(HexUtils.hash(q, r));
        return (agent && agent.hp > 0) ? agent : undefined;
    }
    public updateAgentPosition(agent: Agent, newQ: number, newR: number, engine: GameEngine) {
        const oldH = engine.getTerrainHeight(agent.q, agent.r);
        const newH = engine.getTerrainHeight(newQ, newR);
        const deltaH = oldH - newH;
        agent.physics.z += deltaH;
        this.agentMap.delete(HexUtils.hash(agent.q, agent.r));
        agent.q = newQ;
        agent.r = newR;
        this.agentMap.set(HexUtils.hash(agent.q, agent.r), agent);
    }
    public clearAgents() {
        this.agentMap.clear();
    }
    public getTerrainHeight(q: number, r: number): number { return this.heightMap.get(HexUtils.key({q, r})) || 0; }
    public getHeightByKey(key: string): number { return this.heightMap.get(key) || 0; }
    public getMapKeys(): Set<string> { return this.mapKeys; }
    public isValid(q: number, r: number) { return this.validHashes.has(HexUtils.hash(q, r)); }
    public isValidHash(h: number) { return this.validHashes.has(h); }
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
    public toggleObstacle(q: number, r: number, engine: GameEngine, type: string = 'WALL') {
        if (!this.isValid(q, r)) return;
        const k = HexUtils.key({q, r});
        const h = HexUtils.hash(q, r);
        if (this.obstaclesHash.has(h)) {
            this.obstacles.delete(k);
            this.obstaclesHash.delete(h);
        } else {
            if (!this.getAgentAt(q, r)) {
                this.obstacles.set(k, type);
                this.obstaclesHash.add(h);
            }
        }
    }
    public randomizeEnvironment(engine: GameEngine) { MapGenerator.randomize(this, engine); }
    public rebuildMap(engine: GameEngine) { MapGenerator.rebuild(this, engine); }
    public isBlocked(q: number, r: number, engine: GameEngine, ignoreId: string | null = null, movementType: MovementType = MovementType.GROUND): boolean {
        return MapSpatial.isBlocked(this, q, r, engine, ignoreId, movementType);
    }
    public hasObstacle(q: number, r: number): boolean {
        return MapSpatial.hasObstacle(this, q, r);
    }
    public hasObstacleHash(h: number): boolean {
        return this.obstaclesHash.has(h);
    }
    public getHazardAt(q: number, r: number, engine: GameEngine): GroundHazard | undefined {
        return engine.hazards.get(HexUtils.key({ q, r }));
    }
}
