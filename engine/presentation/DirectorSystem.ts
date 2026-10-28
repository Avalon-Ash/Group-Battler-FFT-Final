
// ╔══════════════════════════════════════════════════════════╗
// ║  DirectorSystem — 戰鬥演出導演                           ║
// ║  職責：CameraSystem 目標決策 / 戲劇性鏡頭切換邏輯        ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine, Agent } from "../game";
import { HexUtils } from "../utils";
import { AIState } from "../../types";
import { CameraTargetGroup } from "./CameraTargetGroup";
import { DIRECTOR_PARAM, HEX_SIZE, UI_SETTINGS } from "../../constants";
import { VisualMath } from "../math/VisualMath";

export class DirectorSystem {
    // Dynamic Zoom Baselines (Calculated based on Aspect Ratio)
    private ultZoom: number = DIRECTOR_PARAM.ULT_ZOOM;

    private readonly MIN_ZOOM = UI_SETTINGS.CAMERA_ZOOM.directorMin;
    private readonly MAX_ZOOM = UI_SETTINGS.CAMERA_ZOOM.directorMax;
    
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
                this.forceFocus(engine, data.killerId, DIRECTOR_PARAM.KILL_FOCUS_S);
            }
        });
        engine.bus.on('CAST_START', (data) => {
            if (data.skill?.tag === 'ULT' && data.sourceId) {
                this.forceFocus(engine, data.sourceId, DIRECTOR_PARAM.ULT_FOCUS_S);
            }
        });
    }

    public forceFocus(engine: GameEngine, id: string, duration: number = DIRECTOR_PARAM.DEFAULT_FOCUS_S) {
        const ds = engine.state.director;
        ds.targetId = id;
        ds.priorityTimer = duration; 
        ds.focusTimer = duration;
    }

    public update(engine: GameEngine, dt: number) {
        if (!this.enabled) return;

        // 0. Update Zoom Logic based on Canvas Aspect Ratio
        // Responsive Scaling: Adjust zoom to fit content based on screen shape
        const currentAR = engine.screenAspect || DIRECTOR_PARAM.DEFAULT_ASPECT;
        
        if (Math.abs(currentAR - this.lastAspectRatio) > DIRECTOR_PARAM.ASPECT_EPSILON) {
            this.lastAspectRatio = currentAR;
            
            // Base modifier
            let zoomMod = 1.0;
            
            if (currentAR > DIRECTOR_PARAM.ULTRAWIDE_ASPECT) {
                // Ultra-wide: Zoom out slightly to fit vertical height
                zoomMod = DIRECTOR_PARAM.ULTRAWIDE_ZOOM;
            } else if (currentAR < 1.0) {
                // Portrait (Mobile): Zoom out significantly to fit horizontal width
                zoomMod = DIRECTOR_PARAM.PORTRAIT_ZOOM;
            } else if (currentAR < DIRECTOR_PARAM.NARROW_ASPECT) {
                // 4:3 or similar: Zoom out a bit
                zoomMod = DIRECTOR_PARAM.NARROW_ZOOM;
            }

            this.ultZoom = DIRECTOR_PARAM.ULT_ZOOM * zoomMod;
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
                    ds.focusTimer = isAction ? DIRECTOR_PARAM.ACTION_FOCUS_S : DIRECTOR_PARAM.IDLE_FOCUS_S;
                }
            } else {
                ds.targetId = null;
            }
        }
    }

    private findBestCandidate(engine: GameEngine): Agent | null {
        let maxScore = -1;
        let best: Agent | null = null;

        for (const a of engine.agents) {
            if (a.hp <= 0 || a.banished || a.outOfBounds) continue;
            
            // [FIX] 忽略正在墜落或腳下無地的單位，避免導播鏡頭被帶走
            if (a.physics.z < -DIRECTOR_PARAM.FALL_DEPTH || !engine.isValid(a.q, a.r)) continue;

            // Deterministic tie-breaker based on ID to prevent camera jitter
            const deterministicRng = a.id.charCodeAt(0) % 10;
            let score = deterministicRng; 

            if (a.castingSkillIdx !== -1) {
                const skill = a.skills[a.castingSkillIdx];
                if (skill?.tag === 'ULT') score += DIRECTOR_PARAM.ULT_SCORE;
                else if (skill?.tag === 'ACTIVE') score += DIRECTOR_PARAM.ACTIVE_SCORE;
                else score += DIRECTOR_PARAM.BASIC_SCORE;
            }
            if (a.view.hitFlashTimer > 0) score += DIRECTOR_PARAM.HIT_SCORE;
            if (a.isMoving) score += DIRECTOR_PARAM.MOVING_SCORE;

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
                this.targetGroup.add(caster.px + caster.physics.x, this._agentVisualY(caster), DIRECTOR_PARAM.ULT_WEIGHT, DIRECTOR_PARAM.ULT_RADIUS);
                const skill = caster.skills[caster.castingSkillIdx]!;
                if (skill.type === 'AOE' && caster.targetHex) {
                    const targetPx = HexUtils.toPx(caster.targetHex.q, caster.targetHex.r, engine.mapConfig);
                    const aoeRadiusPx = (skill.aoeRadius || 1) * HEX_SIZE;
                    this.targetGroup.add(targetPx.x, targetPx.y, DIRECTOR_PARAM.AOE_WEIGHT, aoeRadiusPx);
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
            a.physics.z > -DIRECTOR_PARAM.FALL_DEPTH &&
            engine.isValid(a.q, a.r)
        );

        if (activeCasters.length > 0) {
            for (const caster of activeCasters) {
                const skill = caster.skills[caster.castingSkillIdx];
                const w = skill?.tag === 'ACTIVE' ? 1.0 : DIRECTOR_PARAM.BASIC_WEIGHT;
                this.targetGroup.add(caster.px + caster.physics.x, this._agentVisualY(caster), w, DIRECTOR_PARAM.CAST_RADIUS);
                const target = caster.target;
                if (target && target.hp > 0) {
                    this.targetGroup.add(target.px + target.physics.x, this._agentVisualY(target), w * DIRECTOR_PARAM.TARGET_WEIGHT_MULT, DIRECTOR_PARAM.TARGET_RADIUS);
                    // 附近的敵人也稍微抓進來
                    engine.agents.forEach(a => {
                        if (a.hp > 0 && a.team !== caster.team && a.id !== target.id) {
                            const d = HexUtils.dist(a, target);
                            if (d <= 1) this.targetGroup.add(a.px + a.physics.x, this._agentVisualY(a), DIRECTOR_PARAM.NEARBY_WEIGHT, DIRECTOR_PARAM.NEARBY_RADIUS);
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
                this.targetGroup.add(a.px + a.physics.x, this._agentVisualY(a), 1.0, DIRECTOR_PARAM.TARGET_RADIUS);
                if (a.targetHex) {
                    const destPx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig);
                    this.targetGroup.add(destPx.x, destPx.y, DIRECTOR_PARAM.DEST_WEIGHT, DIRECTOR_PARAM.DEST_RADIUS);
                }
            }
            return this.smooth(this.targetGroup.solve(engine.screenW, engine.screenH));
        }

        // 優先度 4: 全景 (修正血量權重)
        let hasTargets = false;
        for (const a of engine.agents) {
            if (a.hp > 0 && !a.banished && !a.outOfBounds && a.physics.z > -DIRECTOR_PARAM.PANORAMA_FALL_DEPTH) {
                // 滿血=0.5, 快死=1.0 (低血量權重較高)
                const weight = 1.0 - (a.hp / a.maxHp) * 0.5;
                this.targetGroup.add(a.px + a.physics.x, this._agentVisualY(a), weight, DIRECTOR_PARAM.PANORAMA_RADIUS);
                hasTargets = true;
            }
        }

        if (!hasTargets) {
            const centerQ = Math.floor((engine.mapConfig.w - 1) / 2);
            const centerR = Math.floor((engine.mapConfig.h - 1) / 2);
            const centerPx = HexUtils.toPx(centerQ, centerR, engine.mapConfig);
            return this.smooth({ x: centerPx.x, y: centerPx.y, zoom: DIRECTOR_PARAM.EMPTY_ZOOM });
        }

        return this.smooth(this.targetGroup.solve(engine.screenW, engine.screenH));
    }

    private smooth(solved: { x: number, y: number, zoom: number }): { x: number, y: number, zoom: number } {
        // [MIN/MAX ZOOM 限制]
        solved.zoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, solved.zoom));
        return solved;
    }
}
