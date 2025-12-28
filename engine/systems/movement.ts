
import { Agent, GameEngine } from "../game";
import { HexUtils } from "../utils";
import { AnimState, Hex, NodeState } from "../../types";

// Modules
import { Pathfinder } from "../ai/Pathfinder";
import { TargetingSystem } from "../ai/TargetingSystem";
import { MotionEngine } from "./movement/MotionEngine";
import { StackingResolver } from "./movement/StackingResolver";

export class MovementSystem {
    // Logic Modules
    public pathfinder: Pathfinder;
    public targeting: TargetingSystem;
    private stackingResolver: StackingResolver;

    constructor() {
        this.pathfinder = new Pathfinder();
        this.targeting = new TargetingSystem();
        this.stackingResolver = new StackingResolver();
    }

    // =========================================================================================
    // 🏹 PROXIES (For backward compatibility & cleaner access)
    // =========================================================================================

    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, engine: GameEngine): number {
        return this.targeting.getEffectiveRange(a, targetQ, targetR, baseRange, engine);
    }

    public updateTarget(a: Agent, engine: GameEngine) {
        this.targeting.updateTarget(a, engine);
    }

    public calculateOptimalTarget(source: Agent, skill: any, engine: GameEngine) {
        return this.targeting.calculateOptimalTarget(source, skill, engine);
    }

    // =========================================================================================
    // 🏃 MOVEMENT ORCHESTRATION
    // =========================================================================================

    public updateMovement(a: Agent, dt: number, engine: GameEngine) {
        // Delegate low-level math to MotionEngine
        MotionEngine.updateMovement(a, dt, engine);
    }

    public moveAgentToHex(a: Agent, targetHex: Hex, r: number, engine: GameEngine, speedMult: number = 1.0): NodeState {
        if (a.isMoving) {
            a.moveSpeedMult = speedMult; // Update dynamic speed
            a.setAnim(AnimState.MOVE);
            return NodeState.RUNNING;
        }
        
        // Check range (With Height Bonus)
        const effRange = this.targeting.getEffectiveRange(a, targetHex.q, targetHex.r, r, engine);
        if (HexUtils.dist(a, targetHex) <= effRange) {
            a.setAnim(AnimState.COMBAT_IDLE);
            return NodeState.SUCCESS;
        }
        
        // 1. Try Standard Pathfinding (Respecting Allies)
        let path = this.pathfinder.findPath(a, targetHex.q, targetHex.r, r, false, engine, this.targeting);
        
        // 2. Fallback: Ghost Pathfinding (Ignoring Allies)
        // If normal path failed, try to find a path ignoring units to see if "direction" exists
        if (path.length === 0) {
            path = this.pathfinder.findPath(a, targetHex.q, targetHex.r, r, true, engine, this.targeting); 
        }

        if (path.length > 0) {
            const next = path[0];
            
            // CRITICAL CHECK: Even if we found a ghost path, is the IMMEDIATE NEXT STEP blocked?
            // This prevents units from phasing through each other.
            if (engine.isBlocked(next.q, next.r, a.id, a.movementType)) {
                // Wait queue logic
                a.setAnim(AnimState.COMBAT_IDLE);
                // Only log block once to avoid spam (throttling)
                if (Math.random() < 0.05) {
                    engine.log(a, 'MOVE', '移動', `(${next.q},${next.r})`, '路徑被阻擋，等待中');
                }
                return NodeState.RUNNING; 
            }

            engine.log(a, 'MOVE', '移動', `前往 (${next.q},${next.r})`, '開始移動');
            a.path = [next];
            a.trajectory = path; // Visual only
            a.isMoving = true;
            a.moveProgress = 0;
            a.moveSpeedMult = speedMult;
            a.setAnim(AnimState.MOVE);
            
            // Physics Lean (Visual flair)
            const dir = a.facing;
            a.physics.vx += dir * 2; 
            
            return NodeState.RUNNING;
        }

        // Truly unreachable (walled off)
        return NodeState.FAILURE;
    }

    public moveAgent(a: Agent, t: Agent, r: number, engine: GameEngine, speedMult: number = 1.0): NodeState {
        // When chasing a unit, we want to get within range R of them.
        return this.moveAgentToHex(a, {q: t.q, r: t.r}, r, engine, speedMult);
    }

    public resolveStacking(engine: GameEngine) {
        // Delegate complex stacking logic
        this.stackingResolver.resolve(engine);
    }
}
