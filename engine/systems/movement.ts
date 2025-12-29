import { Agent, GameEngine } from "../game";
import { HexUtils } from "../utils";
import { AnimState, Hex, NodeState } from "../../types";
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
    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, engine: GameEngine): number {
        return this.targeting.getEffectiveRange(a, targetQ, targetR, baseRange, engine);
    }
    public updateTarget(a: Agent, engine: GameEngine) {
        this.targeting.updateTarget(a, engine);
    }
    public calculateOptimalTarget(source: Agent, skill: any, engine: GameEngine) {
        return this.targeting.calculateOptimalTarget(source, skill, engine);
    }
    public updateMovement(a: Agent, dt: number, engine: GameEngine) {
        MotionEngine.updateMovement(a, dt, engine);
    }
    public moveAgentToHex(a: Agent, targetHex: Hex, r: number, engine: GameEngine, speedMult: number = 1.0): NodeState {
        if (a.isMoving) {
            a.moveSpeedMult = speedMult;
            a.setAnim(AnimState.MOVE);
            return NodeState.RUNNING;
        }
        const effRange = this.targeting.getEffectiveRange(a, targetHex.q, targetHex.r, r, engine);
        if (HexUtils.dist(a, targetHex) <= effRange) {
            a.setAnim(AnimState.COMBAT_IDLE);
            return NodeState.SUCCESS;
        }
        let path = this.pathfinder.findPath(a, targetHex.q, targetHex.r, r, false, engine, this.targeting);
        if (path.length === 0) {
            path = this.pathfinder.findPath(a, targetHex.q, targetHex.r, r, true, engine, this.targeting);
        }
        if (path.length > 0) {
            const next = path[0];
            if (engine.isBlocked(next.q, next.r, a.id, a.movementType)) {
                a.setAnim(AnimState.COMBAT_IDLE);
                return NodeState.RUNNING;
            }
            engine.log(a, 'MOVE', '移動', `前往 (${next.q},${next.r})`, '開始移動');
            a.path = [next];
            a.trajectory = path;
            a.isMoving = true;
            a.moveProgress = 0;
            a.moveSpeedMult = speedMult;
            a.setAnim(AnimState.MOVE);
            const dir = a.facing;
            a.physics.vx += dir * 2;
            return NodeState.RUNNING;
        }
        return NodeState.FAILURE;
    }
    public moveAgent(a: Agent, t: Agent, r: number, engine: GameEngine, speedMult: number = 1.0): NodeState {
        return this.moveAgentToHex(a, {q: t.q, r: t.r}, r, engine, speedMult);
    }
    public resolveStacking(engine: GameEngine) {
        this.stackingResolver.resolve(engine);
    }
}