
import { Agent } from "../core/Agent";
import { HexUtils } from "../utils";
import { Hex, NodeState, SpatialProvider, Skill } from "../../types";
import { Pathfinder } from "../ai/Pathfinder";
import { TargetingSystem } from "../ai/TargetingSystem";
import { MotionEngine } from "./movement/MotionEngine";
import { StackingResolver } from "./movement/StackingResolver";

export class MovementSystem {
    public pathfinder: Pathfinder;
    public targeting: TargetingSystem;
    private stackingResolver: StackingResolver;

    constructor() {
        this.pathfinder = new Pathfinder();
        this.targeting = new TargetingSystem();
        this.stackingResolver = new StackingResolver();
    }

    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, spatial: SpatialProvider): number {
        return this.targeting.getEffectiveRange(a, targetQ, targetR, baseRange, spatial);
    }

    public updateTarget(a: Agent, spatial: SpatialProvider) {
        this.targeting.updateTarget(a, spatial, this.pathfinder);
    }

    public calculateOptimalTarget(source: Agent, skill: Skill, spatial: SpatialProvider) {
        return this.targeting.calculateOptimalTarget(source, skill, spatial);
    }

    public updateMovement(a: Agent, dt: number, spatial: SpatialProvider) {
        MotionEngine.updateMovement(a, dt, spatial);
    }

    public moveAgentToHex(a: Agent, targetHex: Hex, r: number, spatial: SpatialProvider, speedMult: number = 1.0, isEscaping: boolean = false): NodeState {
        const effRange = this.targeting.getEffectiveRange(a, targetHex.q, targetHex.r, r, spatial);
        const distToTarget = HexUtils.dist(a, targetHex);

        // 1. 如果已經在射程內，停止移動並返回成功 (使用與 AI 相同的容差)
        if (distToTarget <= effRange + 0.1) {
            if (a.isMoving) {
                a.isMoving = false;
                a.path = [];
            }
            return NodeState.SUCCESS;
        }

        // 2. 如果正在移動，檢查目的地是否需要更新
        if (a.isMoving && a.path.length > 0) {
            const currentGoal = a.path[a.path.length - 1];
            // 如果目標點沒變，繼續執行當前移動
            if (currentGoal.q === targetHex.q && currentGoal.r === targetHex.r) {
                // [FIX] 深度檢測：檢查快取的路徑是否因為網格消失或變成警告區域而斷裂
                let pathValid = true;
                for (const hex of a.path) {
                    if (!spatial.isValid(hex.q, hex.r) || (!isEscaping && spatial.isWarningTile(HexUtils.key(hex)))) {
                        pathValid = false;
                        break;
                    }
                }
                
                if (pathValid) {
                    a.moveSpeedMult = speedMult;
                    return NodeState.RUNNING;
                }
                // 如果路徑斷裂，放棄當前路徑，重新計算
            }
        }

        // 3. 尋找新路徑
        let path = this.pathfinder.findPath(a, targetHex.q, targetHex.r, r, false, spatial, this.targeting, isEscaping);
        if (path.length === 0 && distToTarget > effRange) {
            // 如果被單位堵住，嘗試無視單位尋路（擠過去）
            path = this.pathfinder.findPath(a, targetHex.q, targetHex.r, r, true, spatial, this.targeting, isEscaping);
        }

        if (path.length > 0) {
            const next = path[0];
            // 檢查下一格是否被地形完全阻擋
            if (spatial.isBlocked(next.q, next.r, a.id, a.movementType) || !spatial.isValid(next.q, next.r)) {
                let isBlockedByAlly = false;
                
                // 1. 檢查是否被友軍實體擋住
                const occupant = spatial.getAgentHash(HexUtils.hash(next.q, next.r));
                if (occupant && occupant.team === a.team) {
                    isBlockedByAlly = true;
                }
                
                // 2. 檢查是否被友軍的移動意圖 (Reservation) 擋住
                if (!isBlockedByAlly) {
                    const agents = spatial.getAgents();
                    for (const other of agents) {
                        if (other.id !== a.id && other.hp > 0 && other.isMoving && other.path.length > 0) {
                            const dest = other.path[0];
                            if (dest.q === next.q && dest.r === next.r && other.team === a.team) {
                                isBlockedByAlly = true;
                                break;
                            }
                        }
                    }
                }

                if (isBlockedByAlly) {
                    a.stuckTicks++;
                    if (a.stuckTicks > 15) { // 約 0.5 秒 (假設 30fps)
                        // [FIX] 卡住太久，放棄當前路徑，讓 AI 重新思考 (可能觸發背水一戰或重新尋路)
                        a.isMoving = false;
                        a.path = [];
                        a.stuckTicks = 0;
                        return NodeState.FAILURE;
                    }
                    // [FIX] 如果被友軍擋住（實體或意圖），保持 RUNNING 狀態等待，不要直接 FAILURE 導致發呆
                    return NodeState.RUNNING;
                }
                
                a.stuckTicks = 0;
                // [FIX] 如果被敵人或地形擋住，回傳 FAILURE 讓 AI 觸發其他邏輯 (例如背水一戰或攻擊)
                a.isMoving = false;
                a.path = [];
                return NodeState.FAILURE;
            }

            a.stuckTicks = 0;
            // 更新路徑，保留移動狀態
            a.path = path;
            a.trajectory = path;
            if (!a.isMoving) {
                a.isMoving = true;
                a.moveProgress = 0;
            }
            a.moveSpeedMult = speedMult;
            return NodeState.RUNNING;
        }

        // [FIX] 如果找不到路徑，必須清除舊路徑，防止 AI 繼續走向已經消失的網格
        a.isMoving = false;
        a.path = [];
        return NodeState.FAILURE;
    }

    public moveAgent(a: Agent, t: Agent, r: number, spatial: SpatialProvider, speedMult: number = 1.0): NodeState {
        return this.moveAgentToHex(a, {q: t.q, r: t.r}, r, spatial, speedMult);
    }

    public resolveStacking(spatial: SpatialProvider) {
        this.stackingResolver.resolve(spatial);
    }
}
