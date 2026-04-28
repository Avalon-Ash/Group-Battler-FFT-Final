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

        // [FIX] Danger is objective. Cooldown should not hide it.
        // But we allow a small grace period for physics-based knockbacks to settle.

        if (!a.isMoving) {
            // Check current logical grid
            if (engine.isWarningTile(myKey)) return true;
        }

        // Projection check for fluid movement
        const pixelHex = HexUtils.fromPx(a.px, a.py, engine.mapConfig);
        const pixelKey = HexUtils.key(pixelHex);
        return engine.isWarningTile(pixelKey);
    },

    "IsInWarningZoneOrEvading": (a, engine) =>
        BTConditions["IsEvading"](a, engine) ||
        BTConditions["IsInWarningZone"](a, engine),

    "SkillReady": (a, engine, args) => {
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
        if (a._castCompleteCooldown > 0) return false;
        if (a._interruptCooldown > 0) return false;
        if (a.stunTimer > 0 || a.banished || a.fearTimer > 0) return false;
        if (a.silenceTimer > 0 && s.tag !== 'BASIC') return false;
        
        // [FIX] Survival Check: Don't even start a skill if it will likely lead to death via ground collapse
        if (engine.isWarningTile(HexUtils.key(a))) {
            const timeToCollapse = engine.zones.shrinkTimer;
            const safetyBuffer = 0.2;
            if (s.tag === 'BASIC') return false; // Never stand still for basics in a collapse zone
            if ((s.cast + safetyBuffer) > timeToCollapse) return false;
        }

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
    "Idle": (a, engine) => {
        if (engine && engine.isWarningTile(HexUtils.key(a))) {
            engine.log(a, 'DECISION', '決策異常', '', '注意：單位在危險區進入 IDLE 狀態！可能是戰鬥邏輯均失敗。');
        }
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
            engine.log(a, 'DECISION', '生存：重置目標', '', '需要新的逃生路徑...');
            // 中斷詠唱邏輯
            if (a.castingSkillIdx !== -1) {
                const castSkill = a.skills[a.castingSkillIdx];
                if (castSkill) {
                    const myKey = HexUtils.key(a);
                    const hazard = engine.state.hazards.get(myKey);
                    const isWarning = engine.isWarningTile(myKey);
                    let isFatal = false;

                    // [REFACTORED] Use refined SkillReady check to prevent initiation, 
                    // but keep the break-logic for skills that became fatal after starting.
                    const timeToCollapse = engine.zones.shrinkTimer;
                    const safetyBuffer = 0.2; 

                    if (isWarning) {
                        if (castSkill.tag === 'BASIC') {
                            isFatal = true;
                        } else {
                            isFatal = (a.castTimer + safetyBuffer) > timeToCollapse;
                        }
                    }
                    
                    if (!isFatal && hazard && hazard.team !== a.team && hazard.timer < a.castTimer) isFatal = true;
                    
                    if (isFatal) {
                        engine.log(a, 'DECISION', '中斷詠唱', '', `地面即將塌陷 (${timeToCollapse.toFixed(1)}s)，放棄詠唱 ${castSkill.name}`);
                        engine.combat.breakCast(a, engine);
                        // [FIX] Long lockout for fatal breaks to ensure the unit actually tries to move 
                        // before the next AI tick potentially re-evaluates SkillReady
                        a._interruptCooldown = 0.5;
                    }
                }
            }

            const path = engine.movement.pathfinder.findPathToSafety(a, a, engine, engine.movement.targeting);

            if (path.length > 1) {
                // path[0] is current pos, we want a target that is NOT current pos
                a.targetHex = path[path.length - 1];
                engine.log(a, 'DECISION', '生存：啟動路徑逃離', '', `找到安全路徑，目標：${HexUtils.key(a.targetHex)}`);
            } else {
                // 備援：鄰格評分 (Two-pass to prioritize safety)
                const neighbors = HexUtils.neighbors(a);
                let bestNeighbor: any = null;
                let lowestDanger = Infinity;

                for (let pass = 0; pass < 2; pass++) {
                    for (const n of neighbors) {
                        if (!engine.map.isValid(n.q, n.r)) continue;
                        
                        // [FIX] Don't pick neighbors that are physically blocked by terrain
                        if (engine.isBlocked(n.q, n.r, a.id, a.movementType)) continue;

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
                    engine.log(a, 'DECISION', '生存：鄰格備援', '', `無路徑，強制移往鄰格 ${HexUtils.key(bestNeighbor)}`);
                } else {
                    engine.log(a, 'DECISION', '生存：絕望', '', `無路徑且無可通行的鄰格！嘗試暴力衝刺至任意鄰位以打破死鎖。`);
                    // [PANIC] If totally stuck, just pick any logical non-collapsed neighbor even if blocked by unit
                    const anyNeighbor = neighbors.find(n => engine.map.isValid(n.q, n.r) && !engine.hasObstacleHash(HexUtils.hash(n.q, n.r)));
                    if (anyNeighbor) {
                        a.targetHex = anyNeighbor;
                    }
                }
            }
        }

        a.actionState = ActionState.EVADING;

        if (a.targetHex) {
            // [FIX] If casting a non-fatal skill, wait for it to finish before moving.
            // This prevents "twitching" (gliding while casting) and respects casting priority.
            if (a.castingSkillIdx !== -1) {
                const currentSkill = a.skills[a.castingSkillIdx];
                if (currentSkill && currentSkill.tag !== 'BASIC') {
                    return NodeState.RUNNING;
                }
            }

            const state = engine.moveAgentToHex(a, a.targetHex, 0, 1.8, true);
            if (state === NodeState.SUCCESS) {
                engine.log(a, 'DECISION', '生存：脫離險境', '', `已抵達目標點 ${HexUtils.key(a.targetHex)}`);
                a.targetHex = null;
                // [FIX] Reduce cooldown significantly. 0.2s is enough to prevent jitter 
                // but 1.0s was making them sit on dangerous tiles far too long.
                a.escapeCooldown = 0.2; 
                if (a.aiState === AIState.EVADING_URGENT || a.aiState === AIState.LAST_STAND_PUSH) {
                    a.aiState = AIState.IDLE;
                }
                return NodeState.SUCCESS;
            }
            if (state === NodeState.RUNNING) {
                a.aiState = AIState.EVADING_URGENT;
                return NodeState.RUNNING;
            }
            if (state === NodeState.FAILURE) {
                engine.log(a, 'DECISION', '生存：移動失敗', '', `無法移動至目標格 ${HexUtils.key(a.targetHex)}`);
                // 移動失敗清掉目標下一幀重找，並回傳 FAILURE 讓 AI 有機會思考其他解法
                a.targetHex = null;
                a.aiState = AIState.IDLE;
                return NodeState.FAILURE; 
            }
        }

        // targetHex 完全為 null（完全被包圍無路可走）
        // 如果還在危險中，我們返回 FAILURE 讓 AI 有機會至少執行 Combat 分支（困獸之鬥）
        // 而不是停留在此分支返回 RUNNING 導致發呆
        if (BTConditions["IsInWarningZone"](a, engine) || BTConditions["IsInUrgentDanger"](a, engine)) {
            // 如果已經在移動中，則維持 RUNNING
            if (a.isMoving) {
                a.aiState = AIState.EVADING_URGENT;
                a.actionState = ActionState.EVADING;
                return NodeState.RUNNING;
            }
            engine.log(a, 'DECISION', '生存：無路可退', '', '處於死亡網格且無處可躲，強制開啟戰鬥決策');
            return NodeState.FAILURE; 
        }
        return NodeState.SUCCESS;
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
            // [FIX] Attacks should be allowed even if target is in a danger zone.
            // Only the ATTACKER needs to find a safe destination.
            
            // Check if our current destination is safe FOR US
            const destKey = HexUtils.key(dest);
            const hazard = engine.state.hazards.get(destKey);
            const isUnsafeForMe = engine.isWarningTile(destKey) || (hazard && hazard.team !== a.team);
            
            if (isUnsafeForMe) {
                const startHex = { q: a.q, r: a.r };
                const path = engine.movement.pathfinder.findPathToSafety(startHex, a, engine, engine.movement.targeting);
                if (path.length > 1) {
                    dest = path[path.length - 1];
                } else if (engine.isWarningTile(HexUtils.key(startHex))) {
                   // If we are currently in danger and can't find safety, abort combat to allow survival logic to rethink
                   return NodeState.FAILURE;
                } else {
                   // Cannot reach target safely, try another target if possible
                   return NodeState.FAILURE;
                }
            }

            if (a.q === dest.q && a.r === dest.r) return NodeState.SUCCESS;

            const state = engine.moveAgentToHex(a, dest, skill.range, speedMult);
            if (state === NodeState.RUNNING) {
                a.aiState = AIState.TRACKING; // Now safe to set
                a.actionState = ActionState.WALKING;
            }
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
        
        let dest = { q: a.target.q, r: a.target.r };

        // [FIX] Attacker safety check: are we chasing them into a death trap?
        const destKey = HexUtils.key(dest);
        const hazard = engine.state.hazards.get(destKey);
        const isUnsafeForMe = engine.isWarningTile(destKey) || (hazard && hazard.team !== a.team);

        if (isUnsafeForMe) {
            const startHex = { q: a.q, r: a.r };
            const path = engine.movement.pathfinder.findPathToSafety(startHex, a, engine, engine.movement.targeting);
            if (path.length > 1) {
                dest = path[path.length - 1];
            } else if (engine.isWarningTile(HexUtils.key(startHex))) {
                // If we are currently in danger and cannot find safety, abort combat to allow survival logic to rethink
                return NodeState.FAILURE; 
            } else {
                // Target is in danger, but we are safe and can't go closer safely.
                // If we are already in range, this is fine (we'll just stand and attack).
                // If not in range, we'll return failure so the BT can try another target.
                const dist = HexUtils.dist(startHex, dest);
                if (dist > skill.range + 0.1) return NodeState.FAILURE;
            }
        }

        const state = engine.moveAgentToHex(a, dest, skill.range, speedMult);
        
        if (state === NodeState.RUNNING) {
            a.aiState = AIState.TRACKING;
            a.actionState = ActionState.WALKING;
        }
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
