
import { Agent, GameEngine } from "../game";
import { Hex, MovementType } from "../../types";
import { HexUtils, NEIGHBOR_HASH_OFFSETS } from "../utils";
import { BLOCK_HEIGHT } from "../../constants";
import { OBSTACLE_DB } from "../../data/obstacles";
import { TargetingSystem } from "./TargetingSystem";

interface PQNode {
    hash: number;
    priority: number;
}

export class Pathfinder {
    private _gScore = new Map<number, number>();
    private _cameFrom = new Map<number, number>();
    private _pq: PQNode[] = [];

    public findPath(startAgent: Agent, endQ: number, endR: number, range: number, ignoreUnits: boolean, engine: GameEngine, targeting: TargetingSystem): Hex[] {
        const startH = HexUtils.hash(startAgent.q, startAgent.r);
        const goalHex = { q: endQ, r: endR };
        
        // 射程檢查：若已在動態射程內，則無需移動
        const effRange = targeting.getEffectiveRange(startAgent, endQ, endR, range, engine);
        if (HexUtils.dist(startAgent, goalHex) <= effRange) return [];

        this._gScore.clear();
        this._cameFrom.clear();
        this._pq = [];

        this._gScore.set(startH, 0);
        this.pqPush(startH, 0);

        let iterations = 0;
        let bestH = -1;
        const MAX_ITER = 600; 

        while (this._pq.length > 0 && iterations < MAX_ITER) {
            iterations++;
            const current = this.pqPop()!;
            const currentHex = HexUtils.unhash(current.hash);

            // 成功判定：進入有效射程
            if (HexUtils.dist(currentHex, goalHex) <= targeting.getEffectiveRange(currentHex, endQ, endR, range, engine)) {
                bestH = current.hash;
                break;
            }

            for (let i = 0; i < 6; i++) {
                const neighborH = current.hash + NEIGHBOR_HASH_OFFSETS[i];
                if (!engine.map.isValidHash(neighborH)) continue;

                // 物理碰撞判定
                if (engine.map.hasObstacleHash(neighborH)) {
                    const type = engine.map.obstacles.get(HexUtils.key(HexUtils.unhash(neighborH)));
                    const def = OBSTACLE_DB[type || 'WALL'];
                    if (startAgent.movementType === MovementType.FLYING ? def?.blocksFlying : def?.blocksMovement) continue;
                }
                
                if (!ignoreUnits) {
                    const occ = engine.agentMap.get(neighborH);
                    if (occ && occ.hp > 0 && occ !== startAgent) continue;
                }

                // 數學地勢成本計算
                const nHex = HexUtils.unhash(neighborH);
                let moveCost = 1.0;
                if (startAgent.movementType !== MovementType.FLYING) {
                    const h1 = engine.map.getTerrainHeight(currentHex.q, currentHex.r);
                    const h2 = engine.map.getTerrainHeight(nHex.q, nHex.r);
                    const diff = Math.abs(h1 - h2);
                    if (diff > Math.max(1, startAgent.jump) * BLOCK_HEIGHT) continue; 
                    moveCost += diff / BLOCK_HEIGHT * 0.4; 
                }

                const tentativeG = (this._gScore.get(current.hash) || 0) + moveCost;

                if (!this._gScore.has(neighborH) || tentativeG < this._gScore.get(neighborH)!) {
                    this._cameFrom.set(neighborH, current.hash);
                    this._gScore.set(neighborH, tentativeG);
                    
                    // 核心數學：六邊形 Cube 曼哈頓距離啟發函數
                    const hCost = HexUtils.dist(nHex, goalHex);
                    this.pqPush(neighborH, tentativeG + hCost);
                }
            }
        }

        return bestH !== -1 ? this.reconstructPath(bestH, startH) : [];
    }

    private pqPush(hash: number, priority: number) {
        this._pq.push({ hash, priority });
        // 生產環境應使用 Binary Heap，此處使用排序模擬
        this._pq.sort((a, b) => a.priority - b.priority); 
    }

    private pqPop() { return this._pq.shift(); }

    private reconstructPath(current: number, startH: number): Hex[] {
        const path: Hex[] = [];
        let curr = current;
        while (curr !== startH && path.length < 100) {
            path.push(HexUtils.unhash(curr));
            curr = this._cameFrom.get(curr) || -1;
        }
        return path.reverse();
    }
}
