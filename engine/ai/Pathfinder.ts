
import { Agent } from "../core/Agent";
import { Hex, MovementType, SpatialProvider } from "../../types";
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

    public findPath(startAgent: Agent, endQ: number, endR: number, range: number, ignoreUnits: boolean, spatial: SpatialProvider, targeting: TargetingSystem): Hex[] {
        const startH = HexUtils.hash(startAgent.q, startAgent.r);
        const goalHex = { q: endQ, r: endR };
        
        // 射程檢查：若已在動態射程內，則無需移動
        const effRange = targeting.getEffectiveRange(startAgent, endQ, endR, range, spatial);
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
            if (HexUtils.dist(currentHex, goalHex) <= targeting.getEffectiveRange(currentHex, endQ, endR, range, spatial)) {
                bestH = current.hash;
                break;
            }

            for (let i = 0; i < 6; i++) {
                const neighborH = current.hash + NEIGHBOR_HASH_OFFSETS[i];
                if (!spatial.isValidHash(neighborH)) continue;

                // 物理碰撞判定
                if (spatial.hasObstacleHash(neighborH)) {
                    const type = spatial.getObstacleTypeHash(neighborH);
                    const def = OBSTACLE_DB[type || 'WALL'];
                    if (startAgent.movementType === MovementType.FLYING ? def?.blocksFlying : def?.blocksMovement) continue;
                }
                
                if (!ignoreUnits) {
                    const occ = spatial.getAgentHash(neighborH);
                    if (occ && occ.hp > 0 && occ !== startAgent) continue;
                }

                // 數學地勢成本計算 (Asymmetric Verticality)
                const nHex = HexUtils.unhash(neighborH);
                let moveCost = 1.0;

                // 大逃殺警告區域懲罰 (AI 求生邏輯)
                const nKey = HexUtils.key(nHex);
                if (targeting.isWarningTile(nKey, spatial)) {
                    // 降低懲罰值但保持足夠高，確保 AI 能在合理步數內找到路徑
                    // 如果懲罰太高 (9000)，A* 會優先探索極遠的非警告路徑，導致超時
                    moveCost += 50; 
                }
                
                if (startAgent.movementType !== MovementType.FLYING) {
                    const h1 = spatial.getTerrainHeight(currentHex.q, currentHex.r);
                    const h2 = spatial.getTerrainHeight(nHex.q, nHex.r);
                    
                    const deltaH = h2 - h1; // Target - Current
                    const jumpLimit = Math.max(1, startAgent.jump) * BLOCK_HEIGHT;

                    // 1. 向上攀爬 (Climbing Up)：嚴格檢定
                    if (deltaH > jumpLimit) continue; 
                    
                    // 2. 向下跳躍 (Jumping Down)：允許任何高度 (物理引擎會處理傷害)
                    // 無需檢查 deltaH < -jumpLimit

                    // Cost Calculation
                    if (deltaH > 0) {
                        // 上坡成本：隨高度增加
                        moveCost += deltaH / BLOCK_HEIGHT * 0.5; 
                    } else {
                        // 下坡/跳崖成本：固定小額成本 (不隨深度增加，否則 AI 會不敢跳崖)
                        // 給予微小懲罰讓 AI 優先選擇平地，但非阻斷性
                        moveCost += 0.2;
                    }
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
