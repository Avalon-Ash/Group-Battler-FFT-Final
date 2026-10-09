
// ╔══════════════════════════════════════════════════════════╗
// ║  DirectorSystem — 戰鬥演出導演                           ║
// ║  職責：CameraSystem 目標決策 / 戲劇性鏡頭切換邏輯        ║
// ║  上游：GameEngine.tick / 戰鬥事件（DEATH / KILL）        ║
// ║  下游：CameraSystem.setTarget()                          ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine, Agent } from "../game";
import { HexUtils } from "../utils";
import { Point, AIState } from "../../types";
import { CameraTargetGroup } from "./CameraTargetGroup";
import { HEX_SIZE } from "../../constants";
import { VisualMath } from "../math/VisualMath";

export class DirectorSystem {
    // Dynamic Zoom Baselines (Calculated based on Aspect Ratio)
    private idleZoom = 0.9;
    private combatZoom = 1.15;
    private ultZoom = 1.45;

    private readonly MIN_ZOOM = 0.45;
    private readonly MAX_ZOOM = 1.6;
    
    // Controls
    public enabled: boolean = true;

    // State
    private targetGroup = new CameraTargetGroup();
    private lastAspectRatio: number = 0;

    public reset(engine: GameEngine) {
        const ds = engine.state.director;
        ds.targetId = null;
        ds.focusTimer = 0;
        ds.priorityTimer = 0;
        // Keep enabled state as is
    }

    public bind(engine: GameEngine) {
        engine.bus.on('KILL', (data) => {
            if (data.killerId) {
                this.forceFocus(engine, data.killerId, 2.5);
            }
        });
        engine.bus.on('CAST_START', (data) => {
            if (data.skill?.tag === 'ULT' && data.sourceId) {
                this.forceFocus(engine, data.sourceId, 3.5);
            }
        });
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
        const frame = this._buildTargetGroup(engine, ds.targetId);

        // 4. Push to Camera System (Decoupled Action via Event Bus)
        if (frame) {
            engine.bus.emit('CAMERA_MOVE', frame);
        }
    }

    private decideTarget(engine: GameEngine, ds: GameEngine['state']['director']) {
        if (ds.priorityTimer > 0) return;

        let needNewTarget = false;
        
        if (ds.targetId) {
            const current = engine.agents.find(a => a.id === ds.targetId);
            if (!current || current.hp <= 0 || current.banished || current.outOfBounds) {
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
            if (a.hp <= 0 || a.banished || a.outOfBounds) continue;
            
            // [FIX] 忽略正在墜落或腳下無地的單位，避免導播鏡頭被帶走
            if (a.physics.z < -50 || !engine.isValid(a.q, a.r)) continue;

            // Deterministic tie-breaker based on ID to prevent camera jitter
            const deterministicRng = a.id.charCodeAt(0) % 10;
            let score = deterministicRng; 

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

    private _agentVisualY(a: Agent): number {
        return VisualMath.getVisualBodyCenterY(
            a.py + a.physics.y,
            a.physics.z
        );
    }

    private _buildTargetGroup(engine: GameEngine, priorityId: string | null): { x: number, y: number, zoom: number } | null {
        this.targetGroup.clear();

        // 優先度 0: 強制焦點 (priorityId)
        if (engine.state.director.priorityTimer > 0 && priorityId) {
            const focal = engine.agents.find(a => a.id === priorityId && a.hp > 0);
            if (focal) {
                this.targetGroup.add(focal.px + focal.physics.x, this._agentVisualY(focal), 2.0, 100);
            }
        }

        // 優先度 1: 有 ULT 施法者
        const ultCasters = engine.agents.filter(a => a.hp > 0 && a.castingSkillIdx !== -1 && a.skills[a.castingSkillIdx]?.tag === "ULT");
        if (ultCasters.length > 0) {
            for (const caster of ultCasters) {
                this.targetGroup.add(caster.px + caster.physics.x, this._agentVisualY(caster), 1.2, 120);
                const skill = caster.skills[caster.castingSkillIdx]!;
                if (skill.type === 'AOE' && caster.targetHex) {
                    const targetPx = HexUtils.toPx(caster.targetHex.q, caster.targetHex.r, engine.mapConfig);
                    const aoeRadiusPx = (skill.aoeRadius || 1) * HEX_SIZE;
                    this.targetGroup.add(targetPx.x, targetPx.y, 0.6, aoeRadiusPx);
                }
            }
            const solved = this.targetGroup.solve(engine.screenW, engine.screenH);
            solved.zoom = Math.max(this.ultZoom, solved.zoom);
            return this.smooth(solved);
        }

        // 優先度 2: ACTIVE 技能施法 / 近戰交火 (多人同時處理)
        const activeCasters = engine.agents.filter(a => 
            a.hp > 0 && 
            a.castingSkillIdx !== -1 && 
            a.physics.z > -50 && 
            engine.isValid(a.q, a.r)
        );

        if (activeCasters.length > 0) {
            for (const caster of activeCasters) {
                const skill = caster.skills[caster.castingSkillIdx];
                const w = skill?.tag === 'ACTIVE' ? 1.0 : 0.6;
                this.targetGroup.add(caster.px + caster.physics.x, this._agentVisualY(caster), w, 80);
                const target = caster.target;
                if (target && target.hp > 0) {
                    this.targetGroup.add(target.px + target.physics.x, this._agentVisualY(target), w * 0.7, 80);
                    // 附近的敵人也稍微抓進來
                    engine.agents.forEach(a => {
                        if (a.hp > 0 && a.team !== caster.team && a.id !== target.id) {
                            const d = HexUtils.dist(a, target);
                            if (d <= 1) this.targetGroup.add(a.px + a.physics.x, this._agentVisualY(a), 0.3, 60);
                        }
                    });
                }
            }
            return this.smooth(this.targetGroup.solve(engine.screenW, engine.screenH));
        }

        // 優先度 3: 逃生中
        const evaders = engine.agents.filter(a => a.hp > 0 && (a.aiState === AIState.EVADING_URGENT || a.aiState === AIState.LAST_STAND_PUSH));
        if (evaders.length > 0) {
            for (const a of evaders) {
                this.targetGroup.add(a.px + a.physics.x, this._agentVisualY(a), 1.0, 80);
                if (a.targetHex) {
                    const destPx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig);
                    this.targetGroup.add(destPx.x, destPx.y, 0.4, 40);
                }
            }
            return this.smooth(this.targetGroup.solve(engine.screenW, engine.screenH));
        }

        // 優先度 4: 全景 (修正血量權重)
        let hasTargets = false;
        for (const a of engine.agents) {
            if (a.hp > 0 && !a.banished && !a.outOfBounds && a.physics.z > -100) {
                // 滿血=0.5, 快死=1.0 (低血量權重較高)
                const weight = 1.0 - (a.hp / a.maxHp) * 0.5;
                this.targetGroup.add(a.px + a.physics.x, this._agentVisualY(a), weight, 50);
                hasTargets = true;
            }
        }

        if (!hasTargets) {
            const centerQ = Math.floor((engine.mapConfig.w - 1) / 2);
            const centerR = Math.floor((engine.mapConfig.h - 1) / 2);
            const centerPx = HexUtils.toPx(centerQ, centerR, engine.mapConfig);
            return this.smooth({ x: centerPx.x, y: centerPx.y, zoom: 0.7 });
        }

        return this.smooth(this.targetGroup.solve(engine.screenW, engine.screenH));
    }

    private smooth(solved: { x: number, y: number, zoom: number }): { x: number, y: number, zoom: number } {
        // [MIN/MAX ZOOM 限制]
        solved.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, solved.zoom));
        return solved;
    }
}
