
import { Agent, GameEngine } from "../game";
import { HexUtils, Vector, NEIGHBOR_HASH_OFFSETS } from "../utils";
import { AnimState, Hex, NodeState, MovementType } from "../../types";
import { BLOCK_HEIGHT } from "../../constants";
import { OBSTACLE_DB } from "../../data/obstacles";

// Constants extracted from game.ts
const PATHFINDING_MAX_ITERATIONS = 2500; 
const QUEUE_CAPACITY = 4096; 
const STACKING_RESOLUTION_FORCE = 5;

const PHYSICS_STIFFNESS_ALIVE = 150;
const PHYSICS_STIFFNESS_DEAD = 0;
// INCREASED DAMPING: Makes units stop snappier, reducing "floating" feel
const PHYSICS_DAMPING_ALIVE = 25; 
const PHYSICS_DAMPING_DEAD = 1.0; 

const GRAVITY = 2000; 

export class MovementSystem {
    // Pathfinding Memory Buffers (Reused to avoid GC)
    private _pfQueue: Int32Array; 
    private _pfCameFrom: Map<number, number> = new Map();
    private _pfBlockers: Set<number> = new Set();
    
    // Optimization: Reuse Stacking Map to reduce GC
    private _stackingMap = new Map<number, Agent[]>();

    constructor() {
        this._pfQueue = new Int32Array(QUEUE_CAPACITY);
    }

    // =========================================================================================
    // 🏹 RANGE CALCULATION (High Ground Bonus)
    // =========================================================================================

    public getEffectiveRange(a: Hex, targetQ: number, targetR: number, baseRange: number, engine: GameEngine): number {
        const h1 = engine.map.getTerrainHeight(a.q, a.r);
        const h2 = engine.map.getTerrainHeight(targetQ, targetR);
        
        // Bonus: +1 Range per Block Height advantage
        // Only applies if attacker is higher. No penalty for low ground (to avoid frustration).
        const deltaH = h1 - h2;
        const heightBonus = Math.max(0, Math.floor(deltaH / BLOCK_HEIGHT));
        
        return baseRange + heightBonus;
    }

    // =========================================================================================
    // 🏃 MOVEMENT & PHYSICS
    // =========================================================================================

    public updatePhysics(a: Agent, dt: number, engine: GameEngine) {
        const isDead = a.hp <= 0;
        const stiffness = isDead ? PHYSICS_STIFFNESS_DEAD : PHYSICS_STIFFNESS_ALIVE; 
        
        // If airborne (z > 0), reduce drag to allow projectile motion
        const isAirborne = a.physics.z > 0;
        const damping = (isDead && isAirborne) ? 0.5 : (isDead ? PHYSICS_DAMPING_DEAD : PHYSICS_DAMPING_ALIVE);

        // 1. Spring Forces (Return to 0,0 relative local space)
        const fx = -stiffness * a.physics.x;
        const fy = -stiffness * a.physics.y;
        const fRot = -stiffness * a.physics.angle * 0.1; 
        
        // 2. Acceleration (Force - Damping)
        const ax = fx - damping * a.physics.vx;
        const ay = fy - damping * a.physics.vy;
        const aRot = fRot - damping * a.physics.vAngle;
        
        // 3. Integrate Velocity
        a.physics.vx += ax * dt;
        a.physics.vy += ay * dt;
        a.physics.vAngle += aRot * dt;
        
        // 4. Vertical Dynamics (Gravity vs Flight)
        if (a.movementType === MovementType.FLYING && !isDead) {
            // Flying Unit Logic
            if (a.stunTimer > 0 || a.visualStatus === 'FROZEN' || a.visualStatus === 'POLYMORPH') {
                // CRASH STATE: Apply Gravity immediately
                a.physics.vz -= GRAVITY * dt;
            } else {
                // HOVER STATE: Bob around a target altitude
                // Increased to 90 to visually clear walls (80px)
                const hoverHeight = 90; 
                const hoverFreq = 3;
                const targetZ = hoverHeight + Math.sin(engine.battleTime * hoverFreq) * 10;
                
                // Soft spring to maintain height
                const dz = targetZ - a.physics.z;
                a.physics.vz += dz * 5 * dt;
                a.physics.vz *= 0.95; // Drag to stop oscillation
            }
        } else {
            // Ground Unit Logic
            if (isDead || isAirborne) {
                a.physics.vz -= GRAVITY * dt;
            }
        }

        // 5. Integrate Position
        a.physics.x += a.physics.vx * dt;
        a.physics.y += a.physics.vy * dt;
        a.physics.z += a.physics.vz * dt;
        a.physics.angle += a.physics.vAngle * dt;
        
        // 6. Ground Collision (Bounce)
        if (a.physics.z < 0) {
            a.physics.z = 0;
            // Elastic collision with ground loss
            if (Math.abs(a.physics.vz) > 100) {
                a.physics.vz = -a.physics.vz * 0.5; // Bounce back
                a.physics.vx *= 0.6; // Ground friction
                a.physics.vy *= 0.6;
                a.physics.vAngle *= 0.5;
            } else {
                a.physics.vz = 0;
            }
        }

        // 7. World Position Drift (Slide effect for dead units)
        if (!isDead && !a.isMoving) {
            const targetPos = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            const dx = targetPos.x - a.px;
            const dy = targetPos.y - a.py;
            const distSq = dx*dx + dy*dy;
            
            // Increased snap threshold to stop jitter
            if (distSq > 0.5) {
                const driftSpeed = 12.0 * dt;
                a.px += dx * driftSpeed;
                a.py += dy * driftSpeed;
                if (distSq < 2) {
                    a.px = targetPos.x;
                    a.py = targetPos.y;
                }
            } else {
                a.px = targetPos.x;
                a.py = targetPos.y;
            }
        } else if (isDead) {
            // Apply physics velocity to world position (Flying through air)
            a.px += a.physics.vx * dt * 0.1; 
            a.py += a.physics.vy * dt * 0.1;
        }
    }

    public updateMovement(a: Agent, dt: number, engine: GameEngine) {
        // Use per-agent move speed WITH dynamic multiplier (Charge effect)
        a.moveProgress += a.moveSpeed * a.moveSpeedMult * dt;
        
        const c = HexUtils.toPx(a.q, a.r, engine.mapConfig);
        const nextHex = a.path[0];
        const n = HexUtils.toPx(nextHex.q, nextHex.r, engine.mapConfig);
        
        // Vertical interpolation logic can be handled in UnitRenderSystem, 
        // here we mostly care about X/Y transition for logic updates
        
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
        const effRange = this.getEffectiveRange(a, targetHex.q, targetHex.r, r, engine);
        if (HexUtils.dist(a, targetHex) <= effRange) {
            a.setAnim(AnimState.COMBAT_IDLE);
            return NodeState.SUCCESS;
        }
        
        // 1. Try Standard Pathfinding (Respecting Allies)
        let path = this.findPath(a, targetHex.q, targetHex.r, r, false, engine);
        
        // 2. Fallback: Ghost Pathfinding (Ignoring Allies)
        // If normal path failed, try to find a path ignoring units to see if "direction" exists
        if (path.length === 0) {
            path = this.findPath(a, targetHex.q, targetHex.r, r, true, engine); // true = ignoreUnits
        }

        if (path.length > 0) {
            const next = path[0];
            
            // CRITICAL CHECK: Even if we found a ghost path, is the IMMEDIATE NEXT STEP blocked?
            // Updated to pass movementType to isBlocked
            if (engine.isBlocked(next.q, next.r, a.id, a.movementType)) {
                // We know where we WANT to go, but it's blocked right now.
                // Instead of failing (which causes AI jitter/wandering), we WAIT.
                // This simulates "queueing" behind the frontline.
                a.setAnim(AnimState.COMBAT_IDLE);
                
                // Only log block once to avoid spam
                if (Math.random() < 0.05) {
                    engine.log(a, 'MOVE', '移動', `(${next.q},${next.r})`, '路徑被阻擋，等待中');
                }
                
                // Return RUNNING to keep the AI node active, preventing re-calculation jitter
                return NodeState.RUNNING; 
            }

            engine.log(a, 'MOVE', '移動', `前往 (${next.q},${next.r})`, '開始移動');
            a.path = [next];
            a.trajectory = path; // Visual only
            a.isMoving = true;
            a.moveProgress = 0;
            a.moveSpeedMult = speedMult;
            a.setAnim(AnimState.MOVE);
            
            // Physics Lean
            const dir = a.facing;
            a.physics.vx += dir * 2; 
            
            return NodeState.RUNNING;
        }

        // Truly unreachable (walled off)
        return NodeState.FAILURE;
    }

    public moveAgent(a: Agent, t: Agent, r: number, engine: GameEngine, speedMult: number = 1.0): NodeState {
        // When chasing a unit, we want to get within range R of them.
        // We don't necessarily need to step ON their tile.
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
                    const neighbors = HexUtils.neighbors(coords);
                    for (let i = neighbors.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
                    }
                    
                    let target = neighbors.find(n => engine.map.isValid(n.q, n.r) && !engine.map.isBlocked(n.q, n.r, engine, agent.id, agent.movementType));
                    
                    // Fallback: Try valid but not obstacle (ignoring units)
                    if (!target) target = neighbors.find(n => engine.map.isValid(n.q, n.r) && !engine.map.hasObstacle(n.q, n.r));
                    
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

    // =========================================================================================
    // 🗺️ PATHFINDING (A* / Multi-Layer BFS)
    // =========================================================================================

    public findPath(
        startAgent: Agent, 
        endQ: number, 
        endR: number, 
        range: number,
        ignoreUnits: boolean, 
        engine: GameEngine
    ): Hex[] {
        const startH = HexUtils.hash(startAgent.q, startAgent.r);
        
        // Optimization: Pre-check if start satisfies range (using Height Bonus)
        const effRange = this.getEffectiveRange(startAgent, endQ, endR, range, engine);
        const startDist = HexUtils.dist({q: startAgent.q, r: startAgent.r}, {q: endQ, r: endR});
        if (startDist <= effRange) return [];

        this._pfCameFrom.clear();
        this._pfBlockers.clear();

        // 1. Populate Blockers
        // If ignoreUnits is TRUE (Ghost Mode), we only block Walls/Obstacles
        if (!ignoreUnits) {
            for (const a of engine.agents) {
                if (a.hp > 0 && !a.banished && a !== startAgent) {
                    const h = HexUtils.hash(a.q, a.r);
                    this._pfBlockers.add(h);
                    
                    if (a.isMoving && a.path.length > 0) {
                        const hp = HexUtils.hash(a.path[0].q, a.path[0].r);
                        this._pfBlockers.add(hp);
                    }
                }
            }
        }

        let head = 0; 
        let tail = 0; 
        this._pfQueue[head++] = startH; 
        this._pfCameFrom.set(startH, -1); 

        let iterations = 0;
        let foundHash = -1;
        const targetHex = { q: endQ, r: endR };
        
        while (tail < head) {
            iterations++;
            if (iterations > PATHFINDING_MAX_ITERATIONS) break;

            const currentH = this._pfQueue[tail++]; 
            const currentHex = HexUtils.unhash(currentH);
            const currentTerrainH = engine.map.getTerrainHeight(currentHex.q, currentHex.r);

            // SUCCESS CONDITION: Inside Range? (Check height for this specific tile)
            const currentEffRange = this.getEffectiveRange(currentHex, targetHex.q, targetHex.r, range, engine);
            if (HexUtils.dist(currentHex, targetHex) <= currentEffRange) {
                foundHash = currentH;
                break;
            }

            for(let j = 0; j < 6; j++) {
                const offset = NEIGHBOR_HASH_OFFSETS[j];
                const nextH = currentH + offset;
                
                if (this._pfCameFrom.has(nextH)) continue;
                
                // Map Bounds Check
                if (!engine.map.isValidHash(nextH)) continue;
                
                // Static Obstacle Check
                // NEW: Flying Logic Check
                if (engine.map.hasObstacleHash(nextH)) {
                    // We need to check obstacle type
                    const obstacleTypeId = engine.map.obstacles.get(HexUtils.key(HexUtils.unhash(nextH)));
                    const obstacleDef = OBSTACLE_DB[obstacleTypeId || 'WALL'];
                    
                    if (startAgent.movementType === MovementType.FLYING) {
                        // Flying units only blocked by specific "Sky Blockers" (like tall pillars)
                        if (obstacleDef?.blocksFlying) continue;
                    } else {
                        // Ground units blocked by standard "blocksMovement"
                        if (obstacleDef?.blocksMovement) continue;
                    }
                }
                
                // Dynamic Unit Check (Only if not ignoring units)
                if (!ignoreUnits && this._pfBlockers.has(nextH)) {
                    continue;
                }

                // --- TACTICS OGRE HEIGHT CHECK ---
                // Flying units IGNORE terrain height traversal costs
                if (startAgent.movementType !== MovementType.FLYING) {
                    const nextHexCoord = HexUtils.unhash(nextH);
                    const nextTerrainH = engine.map.getTerrainHeight(nextHexCoord.q, nextHexCoord.r);
                    const deltaH = Math.abs(nextTerrainH - currentTerrainH);
                    
                    // Allow climb/drop if deltaH <= Jump Height (in pixels)
                    // Using max(1, jump) to ensure at least 1 block can be traversed by default
                    const maxClimb = Math.max(1, startAgent.jump) * BLOCK_HEIGHT;
                    
                    if (deltaH > maxClimb) {
                        continue; // Too steep!
                    }
                }

                this._pfCameFrom.set(nextH, currentH);
                
                if (head < QUEUE_CAPACITY) {
                    this._pfQueue[head++] = nextH;
                }
            }
        }

        if (foundHash !== -1) {
            const path: Hex[] = [];
            let curr = foundHash;
            
            let sanity = 0;
            while (curr !== startH && sanity++ < 100) {
                path.push(HexUtils.unhash(curr));
                const prev = this._pfCameFrom.get(curr);
                if (prev === undefined || prev === -1) break;
                curr = prev;
            }
            return path.reverse();
        }

        return [];
    }

    // =========================================================================================
    // 🎯 TARGETING & TACTICS
    // =========================================================================================

    public updateTarget(a: Agent, engine: GameEngine) {
        if (a.target && (a.target.hp <= 0 || a.target.banished)) a.target = null;
        let minD = 999;
        let t: Agent | null = null;
        
        for (const o of engine.agents) {
            if (o.team !== a.team && o.hp > 0 && !o.banished) {
                const d = HexUtils.dist(a, o);
                if (d < minD) { minD = d; t = o; }
            }
        }
        a.target = t;
    }

    public calculateOptimalTarget(source: Agent, skill: any, engine: GameEngine): { targetAgent: Agent | null, targetHex: Hex | null } {
        if (skill.ccType === 'SILENCE' || skill.ccType2 === 'SILENCE') {
            const enemies = engine.agents.filter(a => 
                a.team !== source.team && a.hp > 0 && !a.banished && 
                HexUtils.dist(source, a) <= this.getEffectiveRange(source, a.q, a.r, skill.range, engine)
            );
            
            if (enemies.length > 0) {
                enemies.sort((a, b) => {
                    const score = (u: Agent) => {
                        if (u.castingSkillIdx === -1) return 0;
                        const s = u.skills[u.castingSkillIdx];
                        if (s?.tag === 'ULT') return 3;
                        if (s?.tag === 'ACTIVE') return 2;
                        return 1;
                    };
                    const sA = score(a);
                    const sB = score(b);
                    if (sA !== sB) return sB - sA;
                    return HexUtils.dist(source, a) - HexUtils.dist(source, b);
                });
                return { targetAgent: enemies[0], targetHex: null };
            }
        }

        if (skill.type === 'AOE') {
            const candidateHexes = new Set<number>();
            const radius = skill.aoeRadius || 1;
            // Rough search: Range + Radius + small buffer.
            // Exact check happens inside the loop using effective range.
            const searchDist = skill.range + 5; 

            engine.agents.forEach(enemy => {
                if (enemy.team !== source.team && enemy.hp > 0 && !enemy.banished) {
                    if (HexUtils.dist(source, enemy) <= searchDist) {
                        candidateHexes.add(HexUtils.hash(enemy.q, enemy.r));
                        HexUtils.neighbors(enemy).forEach(n => candidateHexes.add(HexUtils.hash(n.q, n.r)));
                    }
                }
            });

            let bestHex: Hex | null = null;
            let bestScore = -1;

            candidateHexes.forEach(hHash => {
                const h = HexUtils.unhash(hHash);
                if (!engine.map.isValid(h.q, h.r)) return;

                // Range Check: Can source cast to this ground position?
                const effRange = this.getEffectiveRange(source, h.q, h.r, skill.range, engine);
                if (HexUtils.dist(source, h) > effRange) return;

                let score = 0;
                let hitCount = 0;
                
                for (const target of engine.agents) {
                    if (target.hp <= 0 || target.banished) continue;
                    
                    if (HexUtils.dist(h, target) <= radius) {
                        if (skill.power >= 0) {
                            if (target.team !== source.team) {
                                hitCount++;
                                score += 10;
                                if (target.castingSkillIdx !== -1) score += 5;
                            }
                        } else {
                            if (target.team === source.team) {
                                hitCount++;
                                score += 10;
                                if (target.hp < target.maxHp * 0.5) score += 5;
                            }
                        }
                    }
                }

                if (hitCount > 0 && score > bestScore) {
                    bestScore = score;
                    bestHex = h;
                }
            });

            if (bestHex) {
                return { targetAgent: null, targetHex: bestHex };
            }
        }

        let minD = 999;
        let t: Agent | null = null;
        for (const o of engine.agents) {
            if (o.team !== source.team && o.hp > 0 && !o.banished) {
                const d = HexUtils.dist(source, o);
                // Check against Height-Aware Range
                const effRange = this.getEffectiveRange(source, o.q, o.r, skill.range, engine);
                if (d <= effRange && d < minD) { minD = d; t = o; }
            }
        }
        return { targetAgent: t, targetHex: null };
    }
}
