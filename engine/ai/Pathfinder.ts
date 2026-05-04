
import { Agent } from "../core/Agent";
import { Hex, MovementType, SpatialProvider, SpatialHazard } from "../../types";
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
                        // [FIX] Allow passing through warning tiles with high penalty instead of blocking
                        moveCost += 20;
                    } else {
                        // 逃生時允許走過警告區域，但給予懲罰以盡快離開
                        moveCost += 5;
                    }
                }
                
                const enemyHazards = spatial.getSpatialHazardsAt(nHex.q, nHex.r).filter(h => h.team !== startAgent.team);
                if (enemyHazards.length > 0) {
                    if (!isEscaping) {
                        // 嘗試完全避開危險塗層
                        moveCost += 15;
                    } else {
                        // 逃生優先，但稍微避開危險塗層
                        moveCost += 3;
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

    public findPathToSafety(start: { q: number; r: number }, agent: Agent, spatial: SpatialProvider, targeting: TargetingSystem): Hex[] | null {
        const startH = HexUtils.hash(start.q, start.r);
        
        // [FIX] If starting position is already safe, return it as a 1-step path
        const startKey = HexUtils.key(start);
        const hazardAtStart = spatial.getSpatialHazardsAt(start.q, start.r).find(h => h.team !== agent.team);
        if (!targeting.isWarningTile(startKey, spatial) && !hazardAtStart) {
            return [{ q: start.q, r: start.r }];
        }
        
        this._gScore.clear();
        this._cameFrom.clear();
        this._pq = [];

        this._gScore.set(startH, 0);
        this.pqPush(startH, 0);

        let iterations = 0;
        let bestH = -1;
        let bestDepth = -1;
        const currentShrink = spatial.getCurrentShrinkLevel();
        const MAX_ITER = 1000; 

        while (this._pq.length > 0 && iterations < MAX_ITER) {
            iterations++;
            const current = this.pqPop()!;
            const currentHex = HexUtils.unhash(current.hash);
            const currentKey = HexUtils.key(currentHex);

            const hazardAtNode = spatial.getSpatialHazardsAt(currentHex.q, currentHex.r).find(h => h.team !== agent.team);
            const isSafe = !spatial.isWarningTile(currentKey) && !hazardAtNode;
            
            if (isSafe && spatial.isValidHash(current.hash)) {
                // Confirm landing for flying
                let canLand = true;
                if (agent.movementType === MovementType.FLYING) {
                    const obsType = spatial.getObstacleTypeHash(current.hash);
                    if (obsType && OBSTACLE_DB[obsType]?.blocksFlying) canLand = false;
                }

                if (canLand) {
                    const depth = spatial.getTileDepth(currentHex.q, currentHex.r);
                    // Goal: Reach at least 2 layers deep into safety if possible
                    const targetSafetyDepth = currentShrink + 2; 

                    if (depth > bestDepth) {
                        bestDepth = depth;
                        bestH = current.hash;
                    }

                    // If we reached the target safety depth, we are satisfied
                    if (depth >= targetSafetyDepth) break;

                    // If we found ANY safety and we've searched enough, we can stop
                    if (bestH !== -1 && iterations > 200) break;
                }
            }

            for (let i = 0; i < 6; i++) {
                const neighborH = current.hash + NEIGHBOR_HASH_OFFSETS[i];
                if (!spatial.isValidHash(neighborH)) continue;

                // 物理碰撞判定 (忽略單位，因為逃生優先)
                if (spatial.hasObstacleHash(neighborH)) {
                    const type = spatial.getObstacleTypeHash(neighborH);
                    const def = OBSTACLE_DB[type || 'WALL'];
                    if (agent.movementType === MovementType.FLYING ? def?.blocksFlying : def?.blocksMovement) continue;
                }

                const nHex = HexUtils.unhash(neighborH);
                const nKey = HexUtils.key(nHex);

                let moveCost = 1.0;

                // [ARCH] 允許路徑穿越警告格（高成本），但目標格的安全判定仍在外層 isSafe 守門
                // 解決單位被危險格完全包圍時搜索空間歸零的問題
                if (spatial.isWarningTile(nKey)) {
                    moveCost += 30; // 極高懲罰，迫使路徑優先選非警告格，但不硬封鎖
                }

                // [ZONE-EXCLUSION] Hard-block tiles at or below current shrink level
                const nDepth = spatial.getTileDepth(nHex.q, nHex.r);
                if (nDepth !== -1 && nDepth <= spatial.getCurrentShrinkLevel()) continue;

                // 單位碰撞判定 (逃生時盡量避開單位，避免死鎖)
                const occ = spatial.getAgentHash(neighborH);
                if (occ && occ.hp > 0 && occ !== agent) {
                    // 給予極高成本，讓 AI 優先選擇空地逃生
                    moveCost += 50; 
                }

                if (agent.movementType !== MovementType.FLYING) {
                    const h1 = spatial.getTerrainHeight(currentHex.q, currentHex.r);
                    const h2 = spatial.getTerrainHeight(nHex.q, nHex.r);
                    
                    const deltaH = h2 - h1;
                    const jumpLimit = Math.max(1, agent.jump) * BLOCK_HEIGHT;

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
                    
                    // [PROACTIVE ESCAPE] Use global knowledge of safe center and depth
                    // This prevents brute-force BFS that might stray into long paths
                    const distToCenter = HexUtils.dist(nHex, { q: 0, r: 0 });
                    
                    let heuristic = distToCenter * 0.5; // Favor items near center
                    if (nDepth !== -1) {
                        heuristic -= nDepth * 2.0; // Strongly favor moving inward (higher depth)
                    }

                    // Special bias for flying units to keep them moving if they catch a loop
                    if (agent.movementType === MovementType.FLYING) {
                        heuristic -= HexUtils.dist(nHex, start) * 0.1;
                    }
                    
                    this.pqPush(neighborH, tentativeG + heuristic);
                }
            }
        }

        return bestH !== -1 ? this.reconstructPath(bestH, startH) : null;
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

    /**
     * [ARCH] canEscape：O(1) 前置判斷，避免 findPathToSafety 在無路況下做無用的完整搜索
     * 快速判斷單位當前位置是否有任何一格可通行的安全鄰格。
     * 不做完整 A*，只掃描 6 個鄰格，O(1) 複雜度。
     * 用於 BTCondition HasEscapeRoute 的前置判斷。
     */
    public canEscape(agent: Agent, spatial: SpatialProvider): boolean {
        for (let i = 0; i < 6; i++) {
            const neighborH = HexUtils.hash(agent.q, agent.r) + NEIGHBOR_HASH_OFFSETS[i];
            if (!spatial.isValidHash(neighborH)) continue;

            // 障礙物檢查
            if (spatial.hasObstacleHash(neighborH)) {
                const type = spatial.getObstacleTypeHash(neighborH);
                const def = OBSTACLE_DB[type || 'WALL'];
                if (agent.movementType === MovementType.FLYING ? def?.blocksFlying : def?.blocksMovement) continue;
            }

            // 單位佔用檢查（逃生不能走有人的格）
            const occ = spatial.getAgentHash(neighborH);
            if (occ && occ.hp > 0 && occ !== agent) continue;

            const nHex = HexUtils.unhash(neighborH);
            const nKey = HexUtils.key(nHex);

            // 安全格定義：非警告格 + 無敵方 Hazard
            const hazard = spatial.getSpatialHazardsAt(nHex.q, nHex.r).find(h => h.team !== agent.team);
            if (!spatial.isWarningTile(nKey) && !hazard) return true;
        }
        return false;
    }
}
