
import { GameEngine, Agent } from "../game";
import { HexUtils } from "../utils";
import { Point } from "../../types";

export class DirectorSystem {
    // Dynamic Zoom Baselines (Calculated based on Aspect Ratio)
    private idleZoom = 0.9;
    private combatZoom = 1.15;
    private ultZoom = 1.45;
    
    // Controls
    public enabled: boolean = true;

    // State
    private currentFocusPoint: Point = { x: 0, y: 0 };
    private hasInitialized: boolean = false;
    private lastCentroidX: number = 0;
    private lastCentroidY: number = 0;
    private lastAspectRatio: number = 0;

    public reset(engine: GameEngine) {
        const ds = engine.state.director;
        ds.targetId = null;
        ds.focusTimer = 0;
        ds.priorityTimer = 0;
        this.hasInitialized = false;
        this.enabled = true;
    }

    public forceFocus(engine: GameEngine, id: string, duration: number = 2.0) {
        const ds = engine.state.director;
        ds.targetId = id;
        ds.priorityTimer = duration; 
        ds.focusTimer = duration;
    }

    public update(engine: GameEngine, dt: number) {
        if (!this.enabled) return;

        // 0. Update Zoom Logic based on Canvas Aspect Ratio
        // Responsive Scaling: Adjust zoom to fit content based on screen shape
        const currentAR = engine.screenAspect || 1.77;
        
        if (Math.abs(currentAR - this.lastAspectRatio) > 0.1) {
            this.lastAspectRatio = currentAR;
            
            // Base modifier
            let zoomMod = 1.0;
            
            if (currentAR > 2.0) {
                // Ultra-wide: Zoom out slightly to fit vertical height
                zoomMod = 0.85;
            } else if (currentAR < 1.0) {
                // Portrait (Mobile): Zoom out significantly to fit horizontal width
                zoomMod = 0.65;
            } else if (currentAR < 1.4) {
                // 4:3 or similar: Zoom out a bit
                zoomMod = 0.8;
            }

            this.idleZoom = 0.9 * zoomMod;
            this.combatZoom = 1.15 * zoomMod;
            this.ultZoom = 1.45 * zoomMod;
        }

        const ds = engine.state.director;
        
        // 1. Timer Logic
        if (ds.priorityTimer > 0) ds.priorityTimer -= dt;
        if (ds.focusTimer > 0) ds.focusTimer -= dt;

        // 2. Select Target (Decision Making)
        this.decideTarget(engine, ds);

        // 3. Calculate Cinematic Frame (Computation)
        const frame = this.calculateFrame(engine, ds.targetId);

        // 4. Push to Camera System (Decoupled Action via Event Bus)
        if (frame) {
            engine.bus.emit('CAMERA_MOVE', frame);
        }
    }

    private decideTarget(engine: GameEngine, ds: any) {
        if (ds.priorityTimer > 0) return;

        let needNewTarget = false;
        
        if (ds.targetId) {
            const current = engine.agents.find(a => a.id === ds.targetId);
            if (!current || current.hp <= 0 || current.banished) {
                needNewTarget = true;
            } else if (ds.focusTimer <= 0) {
                needNewTarget = true; 
            }
        } else {
            needNewTarget = true;
        }

        if (needNewTarget) {
            const bestCandidate = this.findBestCandidate(engine);
            if (bestCandidate) {
                if (ds.targetId !== bestCandidate.id) {
                    ds.targetId = bestCandidate.id;
                    const isAction = bestCandidate.castingSkillIdx !== -1;
                    ds.focusTimer = isAction ? 4.0 : 2.5;
                }
            } else {
                ds.targetId = null;
            }
        }
    }

    private findBestCandidate(engine: GameEngine): Agent | null {
        let candidates: Agent[] = [];
        let maxScore = -1;
        let best: Agent | null = null;

        for (const a of engine.agents) {
            if (a.hp <= 0 || a.banished) continue;

            let score = Math.random() * 10; 

            if (a.castingSkillIdx !== -1) {
                const skill = a.skills[a.castingSkillIdx];
                if (skill?.tag === 'ULT') score += 50; 
                else if (skill?.tag === 'ACTIVE') score += 20;
                else score += 5; 
            }
            if (a.hitFlashTimer > 0) score += 15; 
            if (a.isMoving) score += 5;

            if (a.role === 'WARRIOR' || a.role === 'TANK') score += 2;

            if (score > maxScore) {
                maxScore = score;
                best = a;
            }
        }
        return best;
    }

    private calculateFrame(engine: GameEngine, targetId: string | null): { x: number, y: number, zoom: number } | null {
        let targetX = 0;
        let targetY = 0;
        let targetZoom = this.idleZoom;

        const mainActor = targetId ? engine.agents.find(a => a.id === targetId) : null;

        if (mainActor && mainActor.hp > 0) {
            targetX = mainActor.px;
            targetY = mainActor.py;
            
            if (mainActor.target && mainActor.target.hp > 0) {
                const t = mainActor.target;
                targetX = mainActor.px * 0.6 + t.px * 0.4;
                targetY = mainActor.py * 0.6 + t.py * 0.4;
                
                const dist = HexUtils.dist(mainActor, t);
                if (dist < 2) targetZoom = this.combatZoom; 
                else if (dist < 6) targetZoom = (this.combatZoom + this.idleZoom) / 2;
                else targetZoom = this.idleZoom;
                
            } else if (mainActor.isMoving && mainActor.path.length > 0) {
                targetX += mainActor.physics.vx * 0.5; 
                targetY += mainActor.physics.vy * 0.5;
                targetZoom = this.idleZoom;
            } else {
                targetZoom = this.idleZoom * 1.1; 
            }

            if (mainActor.castingSkillIdx !== -1) {
                const skill = mainActor.skills[mainActor.castingSkillIdx];
                if (skill?.tag === 'ULT') {
                    targetX = mainActor.px;
                    targetY = mainActor.py - 20; 
                    targetZoom = this.ultZoom;
                }
            }

        } else {
            // Wide shot logic
            let sumX = 0, sumY = 0, count = 0;
            for (const a of engine.agents) {
                if (a.hp > 0) {
                    sumX += a.px;
                    sumY += a.py;
                    count++;
                }
            }

            if (count > 0) {
                targetX = sumX / count;
                targetY = sumY / count;
                // If battle is spread out, zoom out more
                // If map is large, zoom out more
                targetZoom = this.idleZoom * 0.9;
            } else {
                const centerHex = { q: Math.floor(engine.mapConfig.w/2), r: Math.floor(engine.mapConfig.h/2) };
                const centerPx = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
                targetX = centerPx.x;
                targetY = centerPx.y;
                targetZoom = 0.75; // Maximum wide shot
            }
        }

        // Smoothing
        if (!this.hasInitialized) {
            this.lastCentroidX = targetX;
            this.lastCentroidY = targetY;
            this.hasInitialized = true;
        }

        this.lastCentroidX += (targetX - this.lastCentroidX) * 0.1;
        this.lastCentroidY += (targetY - this.lastCentroidY) * 0.1;

        return { x: targetX, y: targetY, zoom: targetZoom };
    }
}
