
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
    private lastZoom: number = 0.9;
    private lastAspectRatio: number = 0;

    public reset(engine: GameEngine) {
        const ds = engine.state.director;
        ds.targetId = null;
        ds.focusTimer = 0;
        ds.priorityTimer = 0;
        this.hasInitialized = false;
        // Keep enabled state as is
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
            
            // [FIX] 忽略正在墜落或腳下無地的單位，避免導播鏡頭被帶走
            if (a.physics.z < -50 || !engine.isValid(a.q, a.r)) continue;

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

        // [FIX] 如果目標正在墜落或腳下無地，視為失去目標，切換回全景模式
        const isFalling = mainActor && (mainActor.physics.z < -50 || !engine.isValid(mainActor.q, mainActor.r));

        if (mainActor && mainActor.hp > 0 && !isFalling) {
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
            // Wide shot logic: Calculate centroid of all active agents
            let sumX = 0, sumY = 0, count = 0;
            for (const a of engine.agents) {
                if (a.hp > 0 && !a.banished && a.physics.z > -100) {
                    sumX += a.px;
                    sumY += a.py;
                    count++;
                }
            }

            if (count > 0) {
                targetX = sumX / count;
                targetY = sumY / count;
                
                // [FIX] Dynamic Zoom based on map size to prevent sudden zoom-in when map shrinks
                // Use the map bounding box to determine minimum zoom
                const mapKeys = engine.map.mapKeys;
                if (mapKeys.size > 0) {
                    // We want to maintain a stable zoom even as tiles fall
                    // Instead of zooming in tightly, we respect the "active area"
                    targetZoom = this.idleZoom * 0.9;
                } else {
                    targetZoom = this.idleZoom * 0.8;
                }
            } else {
                // Fallback to map center
                const centerQ = Math.floor((engine.mapConfig.w - 1) / 2);
                const centerR = Math.floor((engine.mapConfig.h - 1) / 2);
                const centerPx = HexUtils.toPx(centerQ, centerR, engine.mapConfig);
                targetX = centerPx.x;
                targetY = centerPx.y;
                targetZoom = 0.7; 
            }
        }

        // Smoothing
        if (!this.hasInitialized) {
            this.lastCentroidX = targetX;
            this.lastCentroidY = targetY;
            this.lastZoom = targetZoom;
            this.hasInitialized = true;
        }

        // [REFACTOR] Adaptive Smoothing
        // Use slower smoothing for wide shots to prevent jittering during map collapse
        const isWideShot = !mainActor;
        const lerpFactor = isWideShot ? 0.03 : 0.06; 
        
        this.lastCentroidX += (targetX - this.lastCentroidX) * lerpFactor;
        this.lastCentroidY += (targetY - this.lastCentroidY) * lerpFactor;
        
        // Zoom smoothing should be even slower to prevent "pumping"
        const zoomLerpFactor = 0.02;
        this.lastZoom += (targetZoom - this.lastZoom) * zoomLerpFactor;

        return { x: this.lastCentroidX, y: this.lastCentroidY, zoom: this.lastZoom };
    }
}
