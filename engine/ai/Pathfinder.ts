
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

    public findPath(startAgent: Agent, endQ: number, endR: number, range: number, ignoreUnits: boolean, spatial: SpatialProvider, targeting: TargetingSystem, isEscaping: boolean = false): Hex[] {
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
        const MAX_ITER = 1000; // Increased from 600 to handle complex escapes

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
                    if (!isEscaping) {
                        // 嚴格禁止在正常尋路時走入警告區域
                        continue;
                    } else {
                        // 逃生時允許走過警告區域，但給予懲罰以盡快離開
                        moveCost += 5;
                    }
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

    public findPathToSafety(startAgent: Agent, spatial: SpatialProvider, targeting: TargetingSystem): Hex[] {
        const startH = HexUtils.hash(startAgent.q, startAgent.r);
        
        this._gScore.clear();
        this._cameFrom.clear();
        this._pq = [];

        this._gScore.set(startH, 0);
        this.pqPush(startH, 0);

        let iterations = 0;
        let bestH = -1;
        const MAX_ITER = 1000; 

        while (this._pq.length > 0 && iterations < MAX_ITER) {
            iterations++;
            const current = this.pqPop()!;
            const currentHex = HexUtils.unhash(current.hash);
            const currentKey = HexUtils.key(currentHex);

            if (current.hash === startH) {
                // 跳過起點本身，不能作為「安全目的地」
            } else {
                const hazardAtNode = spatial.getHazard(currentKey);
                const isSafe = !targeting.isWarningTile(currentKey, spatial) && 
                            (!hazardAtNode || hazardAtNode.team === startAgent.team);
                
                // 成功判定：找到非警告區域的合法地塊，且沒有敵方 hazard
                if (isSafe && spatial.isValidHash(current.hash)) {
                    // 飛行單位：確認目標格沒有地面障礙物阻擋降落（blocksFlying 判定）
                    if (startAgent.movementType === MovementType.FLYING) {
                        const obsType = spatial.getObstacleTypeHash(current.hash);
                        if (obsType) {
                            const def = OBSTACLE_DB[obsType];
                            if (def?.blocksFlying) continue; // 這格對飛行仍是障礙，跳過
                        }
                    }
                    bestH = current.hash;
                    break;
                }
            }

            for (let i = 0; i < 6; i++) {
                const neighborH = current.hash + NEIGHBOR_HASH_OFFSETS[i];
                if (!spatial.isValidHash(neighborH)) continue;

                // 物理碰撞判定 (忽略單位，因為逃生優先)
                if (spatial.hasObstacleHash(neighborH)) {
                    const type = spatial.getObstacleTypeHash(neighborH);
                    const def = OBSTACLE_DB[type || 'WALL'];
                    if (startAgent.movementType === MovementType.FLYING ? def?.blocksFlying : def?.blocksMovement) continue;
                }

                let moveCost = 1.0;

                // 單位碰撞判定 (逃生時盡量避開單位，避免死鎖)
                const occ = spatial.getAgentHash(neighborH);
                if (occ && occ.hp > 0 && occ !== startAgent) {
                    // 給予極高成本，讓 AI 優先選擇空地逃生 (例如上/下方的空地)
                    moveCost += 50; 
                }

                const nHex = HexUtils.unhash(neighborH);

                if (startAgent.movementType !== MovementType.FLYING) {
                    const h1 = spatial.getTerrainHeight(currentHex.q, currentHex.r);
                    const h2 = spatial.getTerrainHeight(nHex.q, nHex.r);
                    
                    const deltaH = h2 - h1;
                    const jumpLimit = Math.max(1, startAgent.jump) * BLOCK_HEIGHT;

                    if (deltaH > jumpLimit) continue; 

                    if (deltaH > 0) {
                        moveCost += deltaH / BLOCK_HEIGHT * 0.5; 
                    } else {
                        moveCost += 0.2;
                    }
                }

                const tentativeG = (this._gScore.get(current.hash) || 0) + moveCost;

                if (!this._gScore.has(neighborH) || tentativeG < this._gScore.get(neighborH)!) {
                    this._cameFrom.set(neighborH, current.hash);
                    this._gScore.set(neighborH, tentativeG);
                    
                    // 飛行單位缺乏地形導引，補上安全格方向啟發
                    let heuristic = 0;
                    if (startAgent.movementType === MovementType.FLYING) {
                        // 用距離起點的反向作為啟發（越遠離危險起點越好）
                        heuristic = -HexUtils.dist(nHex, startAgent) * 0.3;
                    }
                    this.pqPush(neighborH, tentativeG + heuristic);
                }
            }
        }

        return bestH !== -1 ? this.reconstructPath(bestH, startH) : [];
    }

    private pqPush(hash: number, priority: number) {
        const node = { hash, priority };
        this._pq.push(node);
        this.bubbleUp(this._pq.length - 1);
    }

    private pqPop() {
        if (this._pq.length === 0) return undefined;
        if (this._pq.length === 1) return this._pq.pop();
        const top = this._pq[0];
        this._pq[0] = this._pq.pop()!;
        this.bubbleDown(0);
        return top;
    }

    private bubbleUp(index: number) {
        const element = this._pq[index];
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this._pq[parentIndex];
            if (element.priority >= parent.priority) break;
            this._pq[index] = parent;
            index = parentIndex;
        }
        this._pq[index] = element;
    }

    private bubbleDown(index: number) {
        const length = this._pq.length;
        const element = this._pq[index];
        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let leftChild, rightChild;
            let swap = -1;

            if (leftChildIndex < length) {
                leftChild = this._pq[leftChildIndex];
                if (leftChild.priority < element.priority) {
                    swap = leftChildIndex;
                }
            }

            if (rightChildIndex < length) {
                rightChild = this._pq[rightChildIndex];
                if (
                    (swap === -1 && rightChild.priority < element.priority) ||
                    (swap !== -1 && (rightChild.priority < (leftChild as PQNode).priority))
                ) {
                    swap = rightChildIndex;
                }
            }

            if (swap === -1) break;
            this._pq[index] = this._pq[swap];
            index = swap;
        }
        this._pq[index] = element;
    }

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
