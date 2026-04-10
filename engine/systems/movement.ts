
import { Agent } from "../core/Agent";
import { HexUtils } from "../utils";
import { Hex, NodeState, SpatialProvider } from "../../types";
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
        return this.targeting.getEffectiveRange(a, targetQ, targetR, baseRange, spatial as any);
    }

    public updateTarget(a: Agent, spatial: SpatialProvider) {
        this.targeting.updateTarget(a, spatial as any);
    }

    public calculateOptimalTarget(source: Agent, skill: any, spatial: SpatialProvider) {
        return this.targeting.calculateOptimalTarget(source, skill, spatial as any);
    }

    public updateMovement(a: Agent, dt: number, spatial: SpatialProvider) {
        MotionEngine.updateMovement(a, dt, spatial as any);
    }

    public moveAgentToHex(a: Agent, targetHex: Hex, r: number, spatial: SpatialProvider, speedMult: number = 1.0): NodeState {
        const effRange = this.targeting.getEffectiveRange(a, targetHex.q, targetHex.r, r, spatial as any);
        const distToTarget = HexUtils.dist(a, targetHex);

        // 1. 如果已經在射程內，停止移動並返回成功
        if (distToTarget <= effRange) {
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
                a.moveSpeedMult = speedMult;
                return NodeState.RUNNING;
            }
            // 目標點變了，不中斷當前物理位移，但在下一個 Tick 重新計算路徑
        }

        // 3. 尋找新路徑
        let path = this.pathfinder.findPath(a, targetHex.q, targetHex.r, r, false, spatial as any, this.targeting);
        if (path.length === 0 && distToTarget > effRange) {
            // 如果被單位堵住，嘗試無視單位尋路（擠過去）
            path = this.pathfinder.findPath(a, targetHex.q, targetHex.r, r, true, spatial as any, this.targeting);
        }

        if (path.length > 0) {
            const next = path[0];
            // 檢查下一格是否被地形完全阻擋
            if (spatial.isBlocked(next.q, next.r, a.id, a.movementType)) {
                return NodeState.RUNNING;
            }

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

        return NodeState.FAILURE;
    }

    public moveAgent(a: Agent, t: Agent, r: number, spatial: SpatialProvider, speedMult: number = 1.0): NodeState {
        return this.moveAgentToHex(a, {q: t.q, r: t.r}, r, spatial, speedMult);
    }

    public resolveStacking(spatial: SpatialProvider) {
        this.stackingResolver.resolve(spatial as any);
    }
}
