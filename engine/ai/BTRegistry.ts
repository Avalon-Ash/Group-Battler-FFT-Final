// Fix: Use 'import type' to break circular dependency with GameEngine
import type { Agent, GameEngine } from "../game";
import { NodeState, AIState, MovementType, ActionState } from "../../types";
import { HexUtils } from "../utils";
import { HEX_SIZE } from "../../constants";

export type BTConditionFn = (agent: Agent, engine: GameEngine, args?: any) => boolean;
export type BTActionFn = (agent: Agent, engine: GameEngine, args?: any) => NodeState;

export const BTConditions: Record<string, BTConditionFn> = {
    "IsDead": (a) => a.hp <= 0,
    "IsAlive": (a) => a.hp > 0,
    "IsStunned": (a) => a.stunTimer > 0,
    "IsBanished": (a) => a.banishTimer > 0,
    "IsSilenced": (a) => a.silenceTimer > 0,
    "IsFeared": (a) => a.fearTimer > 0, 
    "IsEvading": (a) => a.aiState === AIState.EVADING_URGENT ||
                        a.aiState === AIState.LAST_STAND_PUSH,
    
    "HasTarget": (a, engine) => {
        if (!a.target && a._savedCombatTarget && a._savedCombatTarget.hp > 0) {
            a.target = a._savedCombatTarget;
            a._savedCombatTarget = null;
        }

        if (a.target && a.target.hp > 0 && !a.target.banished) {
            return true; 
        }
        // target 死亡或不存在：立刻重新選目標
        engine.updateTarget(a);
        return a.target !== null;
    },
    
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    
    "IsInWarningZone": (a, engine) => {
        // [FIX] Only check warning tiles for survival logic (SSOT)
        const myKey = HexUtils.key(a);
        if (engine.isWarningTile(myKey)) return true;

        // Project based on physics velocity (knockback)
        const isKnockedBack = Math.abs(a.physics.vx) > 100 || Math.abs(a.physics.vy) > 100;
        if (isKnockedBack && a.movementType !== MovementType.FLYING) {
            // Intentional: flying units skip physics prediction because
            // their knockback landing grid is non-deterministic across terrain.
            const dt_est = 1 / 30; 
            const ticks = 8; 
            const predPx = a.px + a.physics.vx * ticks * dt_est;
            const predPy = a.py + a.physics.vy * ticks * dt_est;
            const predHex = HexUtils.fromPx(predPx, predPy, engine.mapConfig);
            if (engine.isWarningTile(HexUtils.key(predHex))) return true;
        }

        return false;
    },
    
    "IsInUrgentDanger": (a, engine) => {
        const myKey = HexUtils.key(a);
        if (engine.isWarningTile(myKey)) return true;

        if (a.escapeCooldown > 0) return false;

        // [FIX] Priority to grid coord. Only use pixel-fallback during movement
        // to avoid jitter when the agent has logically reached a safe hex but px/py lag.
        if (!a.isMoving) return false;

        const pixelHex = HexUtils.fromPx(a.px, a.py, engine.mapConfig);
        const pixelKey = HexUtils.key(pixelHex);
        return engine.isWarningTile(pixelKey);
    },

    "IsInWarningZoneOrEvading": (a, engine) =>
        BTConditions["IsEvading"](a, engine) ||
        BTConditions["IsInWarningZone"](a, engine),

    "SkillReady": (a, _, args) => {
        const idx = args.slot; 
        if (idx === undefined || idx < 0 || idx >= a.skills.length) return false;
        const s = a.skills[idx];
        if (!s) return false;
        
        // 正在詠唱其他技能：整條 skill branch 失敗
        if (a.castingSkillIdx !== -1 && a.castingSkillIdx !== idx) return false;
        
        let cd = a.curCDs[idx];
        if (isNaN(cd) || cd < 0) cd = 0;

        // Increase tolerance slightly for non-basic to avoid frame-edge race conditions
        const tolerance = (s.tag === 'BASIC') ? 0.15 : 0.05;
        const isOnCD = cd > tolerance; 
        
        if (isOnCD || a.mp < s.cost) return false;
        if (a.stunTimer > 0 || a.banished || a.fearTimer > 0) return false;
        if (a.silenceTimer > 0 && s.tag !== 'BASIC') return false;
        
        return true;
    },
    
    "FindOptimalTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;
        
        const result = engine.calculateOptimalTarget(a, skill);
        
        if (result.targetAgent) {
            a.target = result.targetAgent;
            a.targetHex = null;
            return true;
        } else if (result.targetHex) {
            // 不清除 a.target，保留作為單體目標退化之用 (解決 AOE 跑到空地發呆)
            a.targetHex = result.targetHex;
            return true;
        }
        return false;
    },
    
    "IsTargetInRange": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;
        
        // [FIX] 正在詠唱時不重新判定距離，避免極限範圍內目標移動導致動作被取消或目標迷失
        if (a.castingSkillIdx === idx) return true;
        
        let tQ = 0, tR = 0;
        if (a.targetHex) { tQ = a.targetHex.q; tR = a.targetHex.r; }
        else if (a.target) { tQ = a.target.q; tR = a.target.r; }
        else return false;
        
        const effRange = engine.getEffectiveRange(a, tQ, tR, skill.range);
        const gridDist = a.targetHex ? HexUtils.dist(a, a.targetHex) : HexUtils.dist(a, a.target!);
        
        // [FIX] 使用更嚴格的容差，與 SkillExecutor 保持同步，避免 AI 誤判射程導致空放
        if (gridDist > effRange + 0.1) return false;

        if (effRange <= 1.1) {
            const startPx = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            let endPx;
            if (a.targetHex) endPx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig);
            else endPx = { x: a.target!.px, y: a.target!.py };
            const dx = startPx.x - endPx.x;
            const dy = startPx.y - endPx.y;
            const pxDist = Math.sqrt(dx*dx + dy*dy);
            
            // 普攻/近戰目標的像素距離檢查
            if (pxDist > HEX_SIZE * 2.2) return false;
        }
        
        return true;
    },
    
    "HasPushPullSkill": (a) => {
        // [FIX] 如果正在詠唱非普攻技能，先讓它放完，不急著觸發背水一戰判定，避免邏輯抖動
        if (a.castingSkillIdx !== -1) {
            const currentSkill = a.skills[a.castingSkillIdx];
            if (currentSkill && currentSkill.tag !== 'BASIC') {
                // 檢查是否當前正在詠唱的就是推拉技能，如果是，則視為 Ready 以維持 BT 狀態
                const isPushPull = currentSkill.ccType === 'KNOCKBACK' || currentSkill.ccType === 'PULL' || 
                                 currentSkill.ccType2 === 'KNOCKBACK' || currentSkill.ccType2 === 'PULL';
                return isPushPull;
            }
        }

        // 檢查是否有推拉技能可用於背水一戰
        return a.skills.some((s, idx) => {
            if (!s) return false;
            const isPushPull = s.ccType === 'KNOCKBACK' || s.ccType === 'PULL' || s.ccType2 === 'KNOCKBACK' || s.ccType2 === 'PULL';
            if (!isPushPull) return false;
            
            let cd = a.curCDs[idx];
            if (isNaN(cd)) cd = 0;
            return cd <= 0.1 && a.mp >= s.cost;
        });
    }
};

export const BTActions: Record<string, BTActionFn> = {
    "Wait": (a, engine, args) => {
        a.aiState = args.state || AIState.WAITING;
        a.actionState = ActionState.IDLE;

        // 硬控狀態（CC_INTERRUPTED）強制中斷詠唱
        if (args.state === AIState.CC_INTERRUPTED && a.castingSkillIdx !== -1) {
            engine.combat.breakCast(a, engine);
        }

        return NodeState.RUNNING;
    },
    "Idle": (a) => {
        a.aiState = AIState.IDLE;
        a.actionState = ActionState.IDLE;
        if (a.isMoving) {
            a.isMoving = false;
            a.path = [];
        }
        return NodeState.SUCCESS;
    },
    "EscapeWarning": (a, engine) => {
        const inDanger = BTConditions["IsInWarningZone"](a, engine) || BTConditions["IsInUrgentDanger"](a, engine);

        if (!inDanger) {
            if (a.actionState === ActionState.EVADING) a.actionState = ActionState.IDLE;
            if (a.aiState === AIState.EVADING_URGENT || a.aiState === AIState.LAST_STAND_PUSH) {
                a.aiState = AIState.IDLE;
            }
            return NodeState.FAILURE;
        }

        // ★ 核心修正：只有在沒有逃跑目標、或目標本身也淪陷時，才重新尋路
        const needsNewTarget = !a.targetHex || (() => {
            const tk = HexUtils.key(a.targetHex);
            const hazardAtTarget = engine.state.hazards.get(tk);
            return engine.isWarningTile(tk) || (!!hazardAtTarget && hazardAtTarget.team !== a.team);
        })();

        if (needsNewTarget) {
            // 中斷詠唱邏輯
            if (a.castingSkillIdx !== -1) {
                const castSkill = a.skills[a.castingSkillIdx];
                if (castSkill) {
                    const myKey = HexUtils.key(a);
                    const hazard = engine.state.hazards.get(myKey);
                    const isWarning = engine.isWarningTile(myKey);
                    let isFatal = false;
                    if (isWarning) isFatal = castSkill.tag === 'BASIC' || a.castTimer > 0.8;
                    if (!isFatal && hazard && hazard.team !== a.team && hazard.timer < a.castTimer) isFatal = true;
                    if (isFatal) engine.combat.breakCast(a, engine);
                }
            }

            const realHex = HexUtils.fromPx(a.px, a.py, engine.mapConfig);
            const path = engine.movement.pathfinder.findPathToSafety(realHex, a, engine, engine.movement.targeting);

            if (path.length > 0) {
                a.targetHex = path[path.length - 1];
            } else {
                // 備援：鄰格評分 (Two-pass to prioritize safety)
                const neighbors = HexUtils.neighbors(a);
                let bestNeighbor: any = null;
                let lowestDanger = Infinity;

                for (let pass = 0; pass < 2; pass++) {
                    for (const n of neighbors) {
                        if (!engine.map.isValid(n.q, n.r)) continue;
                        const nKey = HexUtils.key(n);
                        const isWarn = engine.isWarningTile(nKey);
                        
                        // Pass 0: Only non-warning tiles
                        if (pass === 0 && isWarn) continue;

                        const nHazard = engine.state.hazards.get(nKey);
                        const isEnemyHazard = nHazard && nHazard.team !== a.team;
                        const dangerScore = isEnemyHazard ? 100 : (isWarn ? 10 : 0);
                        const occ = engine.getAgentAt(n.q, n.r);
                        const occPenalty = occ ? (occ.team === a.team ? 2 : 5) : 0;
                        const totalScore = dangerScore + occPenalty;
                        if (totalScore < lowestDanger) {
                            lowestDanger = totalScore;
                            bestNeighbor = n;
                        }
                    }
                    if (bestNeighbor) break;
                }

                if (bestNeighbor) {
                    a.targetHex = bestNeighbor;
                    engine.log(a, 'DECISION', '逃生備援', '', `路徑失敗，強制移往鄰格(${bestNeighbor.q},${bestNeighbor.r})`);
                }
            }
        }

        a.actionState = ActionState.EVADING;

        if (a.targetHex) {
            const state = engine.moveAgentToHex(a, a.targetHex, 0, 1.8, true);
            if (state === NodeState.SUCCESS) {
                a.targetHex = null;
                a.escapeCooldown = 0.15; // Buffer to prevent immediate re-trigger
                if (a.aiState === AIState.EVADING_URGENT || a.aiState === AIState.LAST_STAND_PUSH) {
                    a.aiState = AIState.IDLE;
                }
                return NodeState.FAILURE;
            }
            if (state === NodeState.RUNNING) {
                a.aiState = AIState.EVADING_URGENT;
                return NodeState.RUNNING;
            }
            if (state === NodeState.FAILURE) {
                // 移動失敗清掉目標下一幀重找
                a.targetHex = null;
                a.aiState = AIState.IDLE;
                return NodeState.FAILURE;
            }
        }

        // targetHex 完全為 null（完全被包圍無路可走）
        // 如果還在危險中，保持 RUNNING 保護，防止走進 Combat 分支發呆
        if (BTConditions["IsInWarningZone"](a, engine) || BTConditions["IsInUrgentDanger"](a, engine)) {
            a.aiState = AIState.EVADING_URGENT;
            a.actionState = ActionState.EVADING;
            return NodeState.RUNNING;
        }
        return NodeState.FAILURE;
    },
    "CastSkill": (a, engine, args) => {
        const idx = args.slot;
        // 已在詠唱自己：維持 RUNNING，讓 combat.update 自行推進 castTimer
        if (a.castingSkillIdx === idx) {
            a.actionState = ActionState.CASTING;
            return NodeState.RUNNING;
        }
        
        // [FIX] 如果有任何詠唱在進行（但不是自己），拒絕啟動
        // 這防止 interrupt 清掉 _runningIdx 後重新呼叫 initiateCast 的問題
        if (a.castingSkillIdx !== -1) {
            return NodeState.FAILURE;
        }

        const state = engine.initiateCast(a, idx);
        if (state === NodeState.RUNNING) a.actionState = ActionState.CASTING;
        return state;
    },
    "MoveToOptimal": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return NodeState.FAILURE;
        const isLowHp = a.target && (a.target.hp / a.target.maxHp < 0.25);
        const speedMult = isLowHp ? 1.6 : (skill.tag === 'ULT' ? 1.3 : 1.0);
        let dest = a.targetHex || (a.target ? {q: a.target.q, r: a.target.r} : null);
        
        if (dest) {
            // Destination safety check
            const destKey = HexUtils.key(dest);
            const hazard = engine.state.hazards.get(destKey);
            const isUnsafe = engine.isWarningTile(destKey) || (hazard && hazard.team !== a.team);
            
            if (isUnsafe) {
                const realHex = HexUtils.fromPx(a.px, a.py, engine.mapConfig);
                const path = engine.movement.pathfinder.findPathToSafety(realHex, a, engine, engine.movement.targeting);
                if (path.length > 0) {
                    dest = path[path.length - 1];
                } else {
                    return NodeState.FAILURE;
                }
            }

            if (a.q === dest.q && a.r === dest.r) return NodeState.SUCCESS;
            const state = engine.moveAgentToHex(a, dest, skill.range, speedMult);
            if (state === NodeState.RUNNING) a.actionState = ActionState.WALKING;
            return state;
        }
        return NodeState.FAILURE;
    },
    "ChaseTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill || !a.target) return NodeState.FAILURE;
        const isLowHp = a.target.hp / a.target.maxHp < 0.25;
        const speedMult = isLowHp ? 1.6 : ((skill.tag === 'ULT') ? 1.4 : 1.1);
        a.aiState = AIState.TRACKING;

        let dest = { q: a.target.q, r: a.target.r };
        const destKey = HexUtils.key(dest);
        const hazard = engine.state.hazards.get(destKey);
        const isUnsafe = engine.isWarningTile(destKey) || (hazard && hazard.team !== a.team);

        if (isUnsafe) {
            const realHex = HexUtils.fromPx(a.px, a.py, engine.mapConfig);
            const path = engine.movement.pathfinder.findPathToSafety(realHex, a, engine, engine.movement.targeting);
            if (path.length > 0) {
                dest = path[path.length - 1] as any;
            } else {
                return NodeState.FAILURE;
            }
        }

        const state = engine.moveAgentToHex(a, dest, skill.range, speedMult);
        if (state === NodeState.RUNNING) a.actionState = ActionState.WALKING;
        return state;
    },
    "CastPushPull": (a, engine) => {
        const savedTarget = a.target;
        const savedTargetHex = a.targetHex;

        // [Task 5] Decoupled Path-Clearing Targeting
        // 尋找第一個可用的推拉技能
        const idx = a.skills.findIndex((s, i) => {
            if (!s) return false;
            const isPushPull = s.ccType === 'KNOCKBACK' || s.ccType === 'PULL' || s.ccType2 === 'KNOCKBACK' || s.ccType2 === 'PULL';
            if (!isPushPull) return false;
            let cd = a.curCDs[i];
            if (isNaN(cd) || cd < 0) cd = 0;
            return cd <= 0.1 && a.mp >= s.cost;
        });

        if (idx === -1) return NodeState.FAILURE;
        const skill = a.skills[idx]!;

        // 1. Path-Clearing Logic: Only trigger if in danger or evading
        if (a.aiState === AIState.EVADING_URGENT || BTConditions["IsInWarningZone"](a, engine)) {
            let isTargetSafe = false;
            if (a.targetHex) {
                const targetKey = HexUtils.key(a.targetHex);
                const hazard = engine.state.hazards.get(targetKey);
                isTargetSafe = !engine.isWarningTile(targetKey) && (!hazard || hazard.team === a.team);
            }
            if (isTargetSafe) {
                // Get line towards safety
                const line = HexUtils.line(a, a.targetHex);
                for (const h of line) {
                    if (h.q === a.q && h.r === a.r) continue;
                    const occupant = engine.getAgentAt(h.q, h.r);
                    if (occupant && occupant.team !== a.team) {
                        a.target = occupant;
                        a.targetHex = null;
                        break;
                    }
                    if (engine.map.hasObstacle(h.q, h.r)) break; 
                }
            }
        }

        // [FIX] 詠唱衝突檢查
        if (a.castingSkillIdx !== -1) {
            if (a.castingSkillIdx === idx) return NodeState.RUNNING;
            
            const s = a.skills[a.castingSkillIdx];
            if (s && s.tag === 'BASIC') {
                engine.combat.breakCast(a, engine);
            } else {
                return NodeState.FAILURE;
            }
        }

        const result = engine.calculateOptimalTarget(a, skill);
        
        const prevTarget = a.target;
        if (result.targetAgent) {
            a.target = result.targetAgent;
            a.targetHex = null;
        } else if (result.targetHex) {
            a.target = null;
            a.targetHex = result.targetHex;
        } else {
            return NodeState.FAILURE;
        }

        // 檢查射程
        let tQ = a.targetHex ? a.targetHex.q : a.target!.q;
        let tR = a.targetHex ? a.targetHex.r : a.target!.r;
        const effRange = engine.getEffectiveRange(a, tQ, tR, skill.range);
        const dist = a.targetHex ? HexUtils.dist(a, a.targetHex) : HexUtils.dist(a, a.target!);
        
        if (dist <= effRange + 0.1) {
            a.aiState = AIState.LAST_STAND_PUSH;
            const state = engine.initiateCast(a, idx);
            if (state === NodeState.RUNNING) {
                a.actionState = ActionState.CASTING;
                // 以 savedTarget 作為後備，等詠唱結束後 HasTarget 能找回正確作戰目標
                a._savedCombatTarget = savedTarget;
            }
            return state;
        }

        // 射程不夠：嘗試走近，而非直接放棄
        if (a.aiState === AIState.EVADING_URGENT || BTConditions["IsInWarningZone"](a, engine)) {
            const dest = a.targetHex ?? (a.target ? { q: a.target.q, r: a.target.r } : null);
            if (dest) {
                a.aiState = AIState.LAST_STAND_PUSH; 
                const state = engine.moveAgentToHex(a, dest, skill.range, 1.5, false);
                if (state === NodeState.RUNNING) a.actionState = ActionState.WALKING;
                if (state === NodeState.FAILURE) {
                    a.target = prevTarget;
                    a.targetHex = null;
                }
                return state;
            }
        }
        
        a.target = prevTarget;
        a.targetHex = null;
        return NodeState.FAILURE;
    }
};
