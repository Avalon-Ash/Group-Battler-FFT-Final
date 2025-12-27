
import { Agent, GameEngine } from "../game";
import { HexUtils, Vector } from "../utils";
import { AnimState, Hex, NodeState, MovementType } from "../../types";
import { BLOCK_HEIGHT } from "../../constants";

// Modules
import { PhysicsEngine } from "../physics/PhysicsEngine";
import { Pathfinder } from "../ai/Pathfinder";
import { TargetingSystem } from "../ai/TargetingSystem";

const STACKING_RESOLUTION_FORCE = 5;

export class MovementSystem {
    // Logic Modules
    public physics: PhysicsEngine;
    public pathfinder: Pathfinder;
    public targeting: TargetingSystem;

    // Optimization: Reuse Stacking Map to reduce GC
    private _stackingMap = new Map<number, Agent[]>();

    constructor() {
        this.physics = new PhysicsEngine();
        this.pathfinder = new Pathfinder();
        this.targeting = new TargetingSystem();
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
    // 🏃 MOVEMENT & PHYSICS ORCHESTRATION
    // =========================================================================================

    public updatePhysics(a: Agent, dt: number, engine: GameEngine) {
        this.physics.update(a, dt, engine);
    }

    public updateMovement(a: Agent, dt: number, engine: GameEngine) {
        // Use per-agent move speed WITH dynamic multiplier (Charge effect)
        a.moveProgress += a.moveSpeed * a.moveSpeedMult * dt;
        
        const c = HexUtils.toPx(a.q, a.r, engine.mapConfig);
        const nextHex = a.path[0];
        const n = HexUtils.toPx(nextHex.q, nextHex.r, engine.mapConfig);
        
        // Simple facing logic based on screen X
        if (n.x > c.x) a.facing = 1;
        else if (n.x < c.x) a.facing = -1;
        
        a.px = HexUtils.lerp(c.x, n.x, a.moveProgress);
        a.py = HexUtils.lerp(c.y, n.y, a.moveProgress);
        
        if (a.moveProgress >= 1) {
            // Commit move
            engine.updateAgentPosition(a, nextHex.q, nextHex.r);
            engine.log(a, 'MOVE', '移動', `(${nextHex.q},${nextHex.r})`, '抵達目的地');
            
            a.isMoving = false;
            a.moveSpeedMult = 1.0; // Reset speed after step completes
            
            // Physics Stabilization: 
            // When arriving, ensure physics state (z) aligns with new terrain if grounded.
            if (a.movementType === MovementType.GROUND) {
                // updateAgentPosition already handles the Z-shift logic to maintain continuity.
                // We just need to dampen residual horizontal velocity to prevent drifting off the new tile.
                a.physics.vx *= 0.1;
                a.physics.vy *= 0.1;
            }
            
            // Small nudge to separate stacked units visually if they glitch
            a.physics.vx -= a.facing * STACKING_RESOLUTION_FORCE; 
        }
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
        this._stackingMap.clear();
        const map = this._stackingMap;
        
        engine.agents.forEach(a => {
            if (a.hp <= 0 || a.banished) return;
            const h = HexUtils.hash(a.q, a.r);
            if (!map.has(h)) map.set(h, []);
            map.get(h)!.push(a);
        });

        map.forEach((list, hash) => {
            if (list.length > 1) {
                const coords = HexUtils.unhash(hash);
                const currentHeight = engine.map.getTerrainHeight(coords.q, coords.r);
                
                const stationary = list.filter(a => !a.isMoving);
                const keep = stationary.length > 0 ? stationary[0] : list[0];
                const toDisplace = list.filter(a => a !== keep);
                
                toDisplace.forEach(agent => {
                    const neighbors = HexUtils.neighbors(coords);
                    // Shuffle neighbors to avoid directional bias
                    for (let i = neighbors.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
                    }
                    
                    let target = neighbors.find(n => {
                        // 1. Basic Validity
                        if (!engine.map.isValid(n.q, n.r)) return false;
                        
                        // 2. Obstacle Check
                        if (engine.isBlocked(n.q, n.r, agent.id, agent.movementType)) return false;
                        
                        // 3. Height Check (Safety)
                        // Don't push ground units off cliffs or into walls unintentionally
                        if (agent.movementType === MovementType.GROUND) {
                            const nHeight = engine.map.getTerrainHeight(n.q, n.r);
                            const deltaH = Math.abs(nHeight - currentHeight);
                            const maxSafeStep = Math.max(1, agent.jump) * BLOCK_HEIGHT;
                            if (deltaH > maxSafeStep) return false;
                        }
                        
                        // 4. Occupancy Check (Don't push into another stack)
                        // Allow pushing into empty tile only
                        if (engine.getAgentAt(n.q, n.r)) return false;
                        
                        return true;
                    });
                    
                    if (target) {
                        engine.updateAgentPosition(agent, target.q, target.r);
                        // Cancel current move to allow physics drift to slide unit visually
                        if (agent.isMoving) {
                            agent.isMoving = false;
                            agent.path = [];
                        }
                    }
                });
            }
        });
    }
}
