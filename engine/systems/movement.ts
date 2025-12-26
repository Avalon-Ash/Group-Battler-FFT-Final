
import { Agent, GameEngine } from "../game";
import { HexUtils, Vector } from "../utils";
import { AnimState, Hex, NodeState, MovementType } from "../../types";

// Modules
import { PhysicsEngine } from "../physics/PhysicsEngine";
import { Pathfinder } from "../ai/Pathfinder";
import { TargetingSystem } from "../ai/TargetingSystem";

const STACKING_RESOLUTION_FORCE = 5;

export class MovementSystem {
    public physics: PhysicsEngine;
    public pathfinder: Pathfinder;
    public targeting: TargetingSystem;

    private _stackingMap = new Map<number, Agent[]>();

    constructor() {
        this.physics = new PhysicsEngine();
        this.pathfinder = new Pathfinder();
        this.targeting = new TargetingSystem();
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

    public updatePhysics(a: Agent, dt: number, engine: GameEngine) {
        this.physics.update(a, dt, engine);
    }

    public updateMovement(a: Agent, dt: number, engine: GameEngine) {
        // --- 1. SLOW EFFECT LOGIC ---
        // If slowed, reduce speed by 50%
        // We multiply the incoming speedMult (e.g. Charge) by the slow factor
        let effectiveSpeedMult = a.moveSpeedMult;
        if (a.slowTimer > 0) {
            effectiveSpeedMult *= 0.5;
        }

        a.moveProgress += a.moveSpeed * effectiveSpeedMult * dt;
        
        const c = HexUtils.toPx(a.q, a.r, engine.mapConfig);
        const nextHex = a.path[0];
        const n = HexUtils.toPx(nextHex.q, nextHex.r, engine.mapConfig);
        
        if (n.x > c.x) a.facing = 1;
        else if (n.x < c.x) a.facing = -1;
        
        a.px = HexUtils.lerp(c.x, n.x, a.moveProgress);
        a.py = HexUtils.lerp(c.y, n.y, a.moveProgress);
        
        if (a.moveProgress >= 1) {
            engine.updateAgentPosition(a, nextHex.q, nextHex.r);
            // Log logic kept minimal to avoid spam
            // engine.log(a, 'MOVE', '移動', `(${nextHex.q},${nextHex.r})`, '抵達目的地');
            
            a.isMoving = false;
            a.moveSpeedMult = 1.0; 
            a.physics.vx -= a.facing * STACKING_RESOLUTION_FORCE; 
        }
    }

    public moveAgentToHex(a: Agent, targetHex: Hex, r: number, engine: GameEngine, speedMult: number = 1.0): NodeState {
        // --- 2. ROOT / STUN / BANISH CHECK ---
        if (a.stunTimer > 0 || a.banished || a.rootTimer > 0) {
            if (a.isMoving) {
                // Force stop if rooted mid-move
                a.isMoving = false;
                a.path = [];
                a.setAnim(AnimState.IDLE);
            }
            return NodeState.FAILURE;
        }

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

            // engine.log(a, 'MOVE', '移動', `前往 (${next.q},${next.r})`, '開始移動');
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
        // --- 3. FEAR & CONFUSION LOGIC ---
        
        // FEAR: Run away from source
        if (a.fearTimer > 0 && a.fearSourceId) {
            const source = engine.agents.find(ag => ag.id === a.fearSourceId);
            if (source) {
                // Find neighbor furthest from source
                const neighbors = HexUtils.neighbors(a);
                let bestN = null;
                let maxDist = -1;
                
                for (const n of neighbors) {
                    if (engine.map.isValid(n.q, n.r) && !engine.map.isBlocked(n.q, n.r, engine, a.id, a.movementType)) {
                        const d = HexUtils.dist(n, source);
                        if (d > maxDist) {
                            maxDist = d;
                            bestN = n;
                        }
                    }
                }
                
                if (bestN) {
                    // Override any tactical movement with Flee
                    return this.moveAgentToHex(a, bestN, 0, engine, 1.2); // Flee slightly faster?
                }
            }
        }

        // CONFUSION: Move Randomly
        if (a.confusionTimer > 0) {
            const neighbors = HexUtils.neighbors(a);
            const valid = neighbors.filter(n => engine.map.isValid(n.q, n.r) && !engine.map.isBlocked(n.q, n.r, engine, a.id, a.movementType));
            
            if (valid.length > 0) {
                const rnd = valid[Math.floor(Math.random() * valid.length)];
                return this.moveAgentToHex(a, rnd, 0, engine, 0.8); // Stumble speed
            }
        }

        // Standard Chase
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
                
                const stationary = list.filter(a => !a.isMoving);
                const keep = stationary.length > 0 ? stationary[0] : list[0];
                const toDisplace = list.filter(a => a !== keep);
                
                toDisplace.forEach(agent => {
                    // Rooted units cannot be displaced easily, but for physics engine we allow it to prevent bug overlap
                    const neighbors = HexUtils.neighbors(coords);
                    for (let i = neighbors.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
                    }
                    
                    let target = neighbors.find(n => engine.map.isValid(n.q, n.r) && !engine.map.isBlocked(n.q, n.r, engine, agent.id, agent.movementType));
                    
                    if (!target) target = neighbors.find(n => engine.map.isValid(n.q, n.r) && !engine.map.hasObstacle(n.q, n.r));
                    
                    if (target) {
                        engine.updateAgentPosition(agent, target.q, target.r);
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
