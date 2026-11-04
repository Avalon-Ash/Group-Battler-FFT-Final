// Fix: Use 'import type' to break circular dependency with GameEngine
import type { Agent, GameEngine } from "../game";
import { NodeState, AIState, MovementType, ActionState, Hex } from "../../types";
import { HexUtils } from "../utils";
import { HEX_SIZE, CAST_LOCKOUT, BT_RULES, COMBAT_PARAM, TARGET_RULES } from "../../constants";
import { stopMovement } from "../systems/movement/MotionCommands";
import { isActionBlocked, isIncapacitated } from "../core/Effects";
import { activationBlock } from "../systems/combat/SkillStateMachine";
import { hasIntentIn } from "../core/SkillQueries";
import type { SkillIntent } from "../../types";
import { isHostileSkill } from "./TargetingSystem";
import { isGroundMeleeRange, isMeleeAttackCell } from "./MeleeAttack";
import { canStepUp } from "../math/ClimbRule";
const REPOSITION_RADIUS = 3; // Reposition 搜尋半徑（格）
import type { BTArgs } from "../../data/ai_profiles";
import { sameSide } from '../core/Allegiance';

export type BTConditionFn = (agent: Agent, engine: GameEngine, args: BTArgs) => boolean;
export type BTActionFn = (agent: Agent, engine: GameEngine, args: BTArgs) => NodeState;

function restoreCombatTarget(a: Agent, engine: GameEngine): void {
    if (a.target && sameSide(a.target, a)) {
        if (a._savedCombatTarget && a._savedCombatTarget.hp > 0 && !sameSide(a._savedCombatTarget, a)) {
            a.target = a._savedCombatTarget;
            a._savedCombatTarget = null;
        } else {
            a.target = null;
            engine.updateTarget(a);
        }
    } else if (!a.target && a._savedCombatTarget && a._savedCombatTarget.hp > 0 && !sameSide(a._savedCombatTarget, a)) {
        a.target = a._savedCombatTarget;
        a._savedCombatTarget = null;
    }
}

/** 離最近敵人的格距（沒有敵人回 Infinity） */
function distToNearestEnemy(a: Agent, cell: Hex, engine: GameEngine): number {
    let best = Infinity;
    for (const o of engine.agents) {
        if (sameSide(o, a) || !engine.movement.targeting.isValidTarget(o, engine)) continue;
        best = Math.min(best, HexUtils.dist(cell, o));
    }
    return best;
}

function lockTarget(a: Agent, target: Agent, engine: GameEngine): void {
    a.target = target;
    a.targetLockUntil = engine.battleTime + TARGET_RULES.LOCK_S;
}

/** 現在站的地方基本攻擊打得到的最近敵人 */
function enemyInReach(a: Agent, engine: GameEngine): Agent | null {
    const basicRange = a.skills.find(s => s?.tag === 'BASIC')?.range ?? 0;
    let best: Agent | null = null;
    let bestDist = Infinity;
    for (const o of engine.agents) {
        if (sameSide(o, a) || !engine.movement.targeting.isValidTarget(o, engine)) continue;
        const d = HexUtils.dist(a, o);
        if (d < bestDist && d <= engine.getEffectiveRange(a, o.q, o.r, basicRange)) { bestDist = d; best = o; }
    }
    return best;
}

/**
 * 站在警告格上還能留多久：塌陷前的時間，扣掉走到最近安全格的時間與餘裕。
 * <= 0 就該動身；走不到安全格也回 0（交給 TRAPPED）。
 */
function secondsBeforeLeaving(a: Agent, engine: GameEngine): number {
    const steps = engine.movement.pathfinder.stepsToSafety(a, engine);
    if (steps === Infinity) return 0;
    const travel = steps / engine.movement.escapeSpeed(a, engine);
    return engine.zones.shrinkTimer - travel - BT_RULES.RETREAT_MARGIN_S;
}

/** 走得到的格子裡離敵人最近、而且比現在更近的格；同距離挑離自己近的。沒有這種格回 null。 */
function bestAdvanceCell(a: Agent, engine: GameEngine): Hex | null {
    let bestDist = distToNearestEnemy(a, a, engine);
    if (bestDist === Infinity) return null;
    let best: Hex | null = null;
    let bestStep = Infinity;
    for (const h of engine.movement.pathfinder.reachableCells(a, engine)) {
        if (h.q === a.q && h.r === a.r) continue;
        if (engine.isBlocked(h.q, h.r, a.id, a.movementType)) continue;
        if (engine.isCollapsingSoon(HexUtils.key(h))) continue;
        if (engine.getSpatialHazardsAt(h.q, h.r).some(hz => !sameSide(hz, a))) continue;
        const d = distToNearestEnemy(a, h, engine);
        const step = HexUtils.dist(a, h);
        if (d < bestDist || (d === bestDist && best && step < bestStep)) {
            bestDist = d;
            bestStep = step;
            best = h;
        }
    }
    return best;
}

const PUSH_PULL: ReadonlySet<SkillIntent> = new Set<SkillIntent>(['HOOK', 'PEEL']);

function isThreat(a: Agent, e: Agent, within: number): boolean {
    return !sameSide(e, a) && e.hp > 0 && !e.banished && !e.outOfBounds && HexUtils.dist(a, e) <= within;
}

export const BTConditions: Record<string, BTConditionFn> = {
    "IsDead": (a) => a.hp <= 0,
    "IsAlive": (a) => a.hp > 0,
    "IsStunned": (a) => isIncapacitated(a),
    "IsBanished": (a) => a.effects.BANISH.remaining > 0,
    "IsSilenced": (a) => a.effects.SILENCE.remaining > 0,
    "IsFeared": (a) => a.effects.FEAR.remaining > 0, 
    // 能否自行移動：被定身（root）／暈眩／放逐／恐懼時，任何「移動」節點都必須失敗，
    // 否則 Survival 的 Run! 會永遠 RUNNING，單位被釘在原地卻也不出手（大逃殺發呆成因 B，tests/AIIdlePriority.test.ts）。
    "CanMove": (a) => !isActionBlocked(a, 'MOVE') && !isActionBlocked(a, 'CAST'),
    "IsEvading": (a) => a.aiState === AIState.EVADING_URGENT ||
                        a.aiState === AIState.LAST_STAND_PUSH,
    "IsControlled": (a) => isActionBlocked(a, 'CAST'),
    // 最後一格落定才進 FINALE；最後一圈倒數時照原來的判斷逃、搶格子
    "IsLastStand": (_, engine) => engine.isFinalTileOnly,
    // 腳下有敵方 hazard、已經出界：馬上走。只是站在警告格上：算好時間，趕得及就先打。最後一格落定後不逃。
    "WantsRetreat": (a, engine, args) => {
        if (engine.isFinalTileOnly) return false;
        if (BTConditions["IsEvading"](a, engine, args)) return true;
        if (!BTConditions["IsInUrgentDanger"](a, engine, args)) return false;
        if (!engine.map.isValid(a.q, a.r)) return true;
        if (engine.getSpatialHazardsAt(a.q, a.r).some(h => !sameSide(h, a))) return true;
        return secondsBeforeLeaving(a, engine) <= 0;
    },
    // 被困時才重試逃生：逃不掉就留在 TRAPPED，不要每次決策在兩個模式之間彈
    "CanTryRetreat": (a, engine, args) => BTConditions["WantsRetreat"](a, engine, args) && !BTConditions["IsPinned"](a, engine, args),
    
    "TargetInBasicRange": (a, engine) => {
        if (!a.target || sameSide(a.target, a)) return false;
        const basicRange = a.skills.find(s => s?.tag === 'BASIC')?.range ?? 0;
        return HexUtils.dist(a, a.target) <= engine.getEffectiveRange(a, a.target.q, a.target.r, basicRange);
    },
    // 脫困判定：有敵人、打不到、而且走不到更近的地方（跳躍中也算還沒脫困）
    "IsBoxedIn": (a, engine) => {
        if (a.isMoving) return true;
        if (distToNearestEnemy(a, a, engine) === Infinity) return false;
        if (!BTConditions["CanMove"](a, engine, {})) return false;
        return !enemyInReach(a, engine) && bestAdvanceCell(a, engine) === null;
    },

    "HasTarget": (a, engine) => {
        restoreCombatTarget(a, engine);

        // 嘲諷中且目標不是嘲諷者：交給 TargetingSystem 的嘲諷強制鎖定重選（CCManager 不再直接寫 target）
        const tauntLocked = a.effects.TAUNT.remaining > 0 && a.effects.TAUNT.sourceId !== null && a.target?.id !== a.effects.TAUNT.sourceId;
        if (!tauntLocked && a.target && a.target.hp > 0 && !sameSide(a.target, a) && !a.target.banished && !a.target.outOfBounds && engine.map.isValid(a.target.q, a.target.r)) {
            return true;
        }
        // target 死亡、出界、同隊或地塊消失：立刻重新選目標
        a.target = null;
        engine.updateTarget(a);
        return a.target !== null && !sameSide(a.target, a);
    },
    
    "HpBelow": (a, _, args) => (a.hp / a.maxHp) < args.threshold,
    "MpAbove": (a, _, args) => a.mp >= args.amount,
    
    "IsInWarningZone": (a, engine) => {
        // [FIX] Only check warning tiles for survival logic (SSOT)
        const myKey = HexUtils.key(a);
        if (!engine.map.isValid(a.q, a.r)) return true;
        if (engine.isWarningTile(myKey)) return true;
        
        // [NEW] Check for enemy spatial hazards
        const enemyHazards = engine.getSpatialHazardsAt(a.q, a.r).filter(h => !sameSide(h, a));
        if (enemyHazards.length > 0) return true;

        // Project based on physics velocity (knockback)
        const isKnockedBack = Math.abs(a.physics.vx) > 100 || Math.abs(a.physics.vy) > 100;
        if (isKnockedBack && a.movementType !== MovementType.FLYING) {
            // Intentional: flying units skip physics prediction because
            // their knockback landing grid is non-deterministic across terrain.
            const dt_est = 1 / BT_RULES.PREDICTION_TICKS_PER_SEC; 
            const ticks = BT_RULES.PREDICTION_TICKS; 
            const predPx = a.px + a.physics.vx * ticks * dt_est;
            const predPy = a.py + a.physics.vy * ticks * dt_est;
            const predHex = HexUtils.fromPx(predPx, predPy, engine.mapConfig);
            if (engine.isWarningTile(HexUtils.key(predHex))) return true;

            const enemyHazardsAtPred = engine.getSpatialHazardsAt(predHex.q, predHex.r).filter(h => !sameSide(h, a));
            if (enemyHazardsAtPred.length > 0) return true;
        }

        return false;
    },
    
    "IsInUrgentDanger": (a, engine) => {
        const myKey = HexUtils.key(a);
        if (!engine.map.isValid(a.q, a.r)) return true;
        if (engine.isWarningTile(myKey)) return true;
        
        // [NEW] Check for enemy hazards
        const enemyHazards = engine.getSpatialHazardsAt(a.q, a.r).filter(h => !sameSide(h, a));
        if (enemyHazards.length > 0) return true;

        // [FIX] Danger is objective. Cooldown should not hide it.
        // But we allow a small grace period for physics-based knockbacks to settle.

        if (!a.isMoving) {
            // Check current logical grid
            if (engine.isWarningTile(myKey)) return true;
        }

        // Projection check for fluid movement
        const pixelHex = HexUtils.fromPx(a.px, a.py, engine.mapConfig);
        const pixelKey = HexUtils.key(pixelHex);
        if (engine.isWarningTile(pixelKey)) return true;
        
        const enemyHazardsAtPixel = engine.getSpatialHazardsAt(pixelHex.q, pixelHex.r).filter(h => !sameSide(h, a));
        if (enemyHazardsAtPixel.length > 0) return true;

        return false;
    },

    "HasEscapeRoute": (a, engine) => {
        // [ARCH] 前置檢查：避免 EscapeWarning 在無路況下無限循環
        return engine.movement.pathfinder.canEscape(a, engine);
    },

    // 被釘住：逃不掉（不能動，或站在塌陷格上但鄰格全被堵/全危險）。被釘住時「原地戰鬥」優先於求生姿態。
    "IsPinned": (a, engine) =>
        !BTConditions["CanMove"](a, engine, {}) || !BTConditions["HasEscapeRoute"](a, engine, {}),

    "IsInWarningZoneOrEvading": (a, engine) =>
        BTConditions["IsEvading"](a, engine, {}) ||
        BTConditions["IsInWarningZone"](a, engine, {}),

    "SkillReady": (a, engine, args) => {
        const idx = args.slot; 
        if (idx === undefined || idx < 0 || idx >= a.skills.length) return false;
        const s = a.skills[idx];
        if (!s) return false;
        if (activationBlock(a, idx)) return false;
        
        // 施法期間走不了：詠唱完還要趕得及逃才出手。被釘住（逃不掉）時不套用，原地出手勝過乾站到塌陷（成因 C）。
        if (engine.isWarningTile(HexUtils.key(a)) && !BTConditions["IsPinned"](a, engine, {})) {
            if (s.cast > secondsBeforeLeaving(a, engine)) return false;
        }

        return true;
    },
    
    "ActivationMet": (a, engine, args) => {
        const s = a.skills[args.slot];
        if (!s) return false;
        const need = s.activation;
        if (!need) return true;
        if (need.targetBeyond !== undefined) {
            if (!a.target || a.target.hp <= 0) return false;
            const dist = HexUtils.dist(a, a.target);
            if (dist <= need.targetBeyond) return false;
            if (dist > engine.getEffectiveRange(a, a.target.q, a.target.r, s.range) + COMBAT_PARAM.RANGE_TOLERANCE) return false;
        }
        if (need.enemyWithin !== undefined && !engine.agents.some((e) => isThreat(a, e, need.enemyWithin as number))) return false;
        return true;
    },

    "FindOptimalTarget": (a, engine, args) => {
        const idx = args.slot;
        const skill = a.skills[idx];
        if (!skill) return false;
        
        const result = engine.calculateOptimalTarget(a, skill);
        
        if (result.targetAgent) {
            if (sameSide(result.targetAgent, a)) {
                if (a.target && !sameSide(a.target, a)) {
                    a._savedCombatTarget = a.target;
                }
                const effRange = engine.getEffectiveRange(a, result.targetAgent.q, result.targetAgent.r, skill.range);
                const inRange = HexUtils.dist(a, result.targetAgent) <= effRange + COMBAT_PARAM.RANGE_TOLERANCE;
                if (inRange) {
                    a.target = result.targetAgent;
                    a.targetHex = null;
                } else {
                    restoreCombatTarget(a, engine);
                    a.targetHex = { q: result.targetAgent.q, r: result.targetAgent.r };
                }
            } else {
                a.target = result.targetAgent;
                a.targetHex = null;
            }
            return true;
        } else if (result.targetHex) {
            // 不清除 a.target，保留作為單體目標退化之用 (解決 AOE 跑到空地發呆)
            restoreCombatTarget(a, engine);
            a.targetHex = result.targetHex;
            return true;
        }

        // 未能計算出有效目標（如純治療無人受傷、PBAOE 範圍內無敵軍）：
        // 還原或尋找敵方戰鬥目標，防止 a.target 殘留友軍與 targetHex 殘留過期座標
        restoreCombatTarget(a, engine);
        a.targetHex = null;
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
        if (gridDist > effRange + COMBAT_PARAM.RANGE_TOLERANCE) return false;

        if (effRange <= BT_RULES.MELEE_CHECK_RANGE) {
            const startPx = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            let endPx;
            if (a.targetHex) endPx = HexUtils.toPx(a.targetHex.q, a.targetHex.r, engine.mapConfig);
            else endPx = { x: a.target!.px, y: a.target!.py };
            const dx = startPx.x - endPx.x;
            const dy = startPx.y - endPx.y;
            const pxDist = Math.sqrt(dx*dx + dy*dy);
            
            // 普攻/近戰目標的像素距離檢查
            if (pxDist > HEX_SIZE * BT_RULES.MELEE_PIXEL_RANGE_FACTOR) return false;
        }
        
        return true;
    },
    
    "HasPushPullSkill": (a) => {
        // [FIX] 如果正在詠唱非普攻技能，先讓它放完，不急著觸發背水一戰判定，避免邏輯抖動
        if (a.castingSkillIdx !== -1) {
            const currentSkill = a.skills[a.castingSkillIdx];
            if (currentSkill && currentSkill.tag !== 'BASIC') {
                // 檢查是否當前正在詠唱的就是推拉技能，如果是，則視為 Ready 以維持 BT 狀態
                const isPushPull = hasIntentIn(currentSkill, PUSH_PULL);
                return isPushPull;
            }
        }

        // 檢查是否有推拉技能可用於背水一戰
        return a.skills.some((s, idx) => {
            if (!s) return false;
            const isPushPull = hasIntentIn(s, PUSH_PULL);
            if (!isPushPull) return false;
            
            let cd = a.curCDs[idx];
            if (isNaN(cd)) cd = 0;
            return cd <= COMBAT_PARAM.READY_CD_TOLERANCE && a.mp >= s.cost;
        });
    }
};

/**
 * 追擊／走位前的致命檢查：只看「停下來的那一格」是否會塌陷，不看目標腳下。
 * 目標站在敵方 hazard（含己方自己丟的場）上不是理由原地不動——hazard 只是扣血，
 * 路徑成本已經懲罰它；只有塌陷格（致死）才拒絕靠近（成因 D）。
 * 回傳 true = 這次靠近會讓我停在即將塌陷的格子上。
 */
function approachEndsOnCollapse(a: Agent, engine: GameEngine, dest: Hex, range: number): boolean {
    if (!engine.isCollapsingSoon(HexUtils.key(dest)) &&
        engine.getSpatialHazardsAt(dest.q, dest.r).every(h => sameSide(h, a))) {
        return false; // 目標腳下無任何危險，不必試算
    }
    const pf = engine.movement.pathfinder;
    const tg = engine.movement.targeting;
    const effRange = range === 0 ? 1 : range;
    let path = pf.findPath(a, dest.q, dest.r, effRange, false, engine, tg, false);
    if (path.length === 0) path = pf.findPath(a, dest.q, dest.r, effRange, true, engine, tg, false);
    const stop: Hex = path.length > 0 ? path[path.length - 1] : { q: a.q, r: a.r };
    return engine.isCollapsingSoon(HexUtils.key(stop));
}

export const BTActions: Record<string, BTActionFn> = {
    "Wait": (a, engine, args) => {
        a.aiState = args.state || AIState.WAITING;
        a.actionState = ActionState.IDLE;

        // 硬控狀態（CC_INTERRUPTED）強制中斷詠唱
        if (args.state === AIState.CC_INTERRUPTED && a.castingSkillIdx !== -1) {
            engine.combat.breakCast(a, engine);
        }

        restoreCombatTarget(a, engine);

        return NodeState.RUNNING;
    },
    "Idle": (a, engine) => {
        if (engine && engine.isWarningTile(HexUtils.key(a))) {
            engine.log(a, 'DECISION', '決策異常', '', '注意：單位在危險區進入 IDLE 狀態！可能是戰鬥邏輯均失敗。');
        }
        restoreCombatTarget(a, engine);
        a.aiState = AIState.IDLE;
        a.actionState = ActionState.IDLE;
        if (a.isMoving) stopMovement(a);
        return NodeState.SUCCESS;
    },
    "EscapeWarning": (a, engine) => {
        restoreCombatTarget(a, engine);
        const inDanger = BTConditions["IsInWarningZone"](a, engine, {}) || BTConditions["IsInUrgentDanger"](a, engine, {});

        if (!inDanger) {
            if (a.actionState === ActionState.EVADING) a.actionState = ActionState.IDLE;
            if (a.aiState === AIState.EVADING_URGENT || a.aiState === AIState.LAST_STAND_PUSH) {
                a.aiState = AIState.IDLE;
            }
            return NodeState.FAILURE;
        }

        // 走不動：逃生分支不可 RUNNING（成因 B），交給 Last Stand／戰鬥分支。
        if (!BTConditions["CanMove"](a, engine, {})) {
            if (a.actionState === ActionState.EVADING) a.actionState = ActionState.IDLE;
            a.aiState = AIState.LAST_STAND_PUSH;
            return NodeState.FAILURE;
        }

        // [FIX] 前置：若無任何安全鄰格可逃，直接放棄逃生分支，讓戰鬥分支接管
        // 避免「被 AOE 包圍 → findPathToSafety 永遠 null → 無限逃生迴圈」
        if (inDanger && !BTConditions["HasEscapeRoute"](a, engine, {})) {
            // 若已在移動中（慣性），維持 RUNNING 讓它跑完
            if (a.isMoving) {
                a.aiState = AIState.EVADING_URGENT;
                a.actionState = ActionState.EVADING;
                return NodeState.RUNNING;
            }
            // 靜止時：直接宣告無路可退，觸發困獸之鬥
            a.aiState = AIState.LAST_STAND_PUSH;
            engine.log(a, 'DECISION', '生存：無路可逃', '', 
                '所有鄰格均為危險格或不可通行，放棄逃生，轉入困獸之鬥');
            return NodeState.FAILURE;
        }

        // ★ 核心修正：只有在沒有逃跑目標、或目標本身也淪陷時，才重新尋路
        const needsNewTarget = !a.escapeHex || (() => {
            if (!engine.map.isValid(a.escapeHex!.q, a.escapeHex!.r)) return true;
            const tk = HexUtils.key(a.escapeHex!);
            const hazardAtTarget = engine.getSpatialHazardsAt(a.escapeHex!.q, a.escapeHex!.r)
                .find(h => !sameSide(h, a));
            return engine.isWarningTile(tk) || (!!hazardAtTarget);
        })();

        if (needsNewTarget) {
            engine.log(a, 'DECISION', '生存：重置目標', '', '需要新的逃生路徑...');
            // 中斷詠唱邏輯
            if (a.castingSkillIdx !== -1) {
                const castSkill = a.skills[a.castingSkillIdx];
                if (castSkill) {
                    const myKey = HexUtils.key(a);
                    const hazard = engine.getSpatialHazardsAt(a.q, a.r).find(h => !sameSide(h, a));
                    const isWarning = engine.isWarningTile(myKey);
                    let isFatal = false;

                    // [REFACTORED] Use refined SkillReady check to prevent initiation, 
                    // but keep the break-logic for skills that became fatal after starting.
                    const timeToCollapse = engine.zones.shrinkTimer;
                    const safetyBuffer = BT_RULES.COLLAPSE_CAST_BUFFER; 

                    if (isWarning) {
                        if (castSkill.tag === 'BASIC') {
                            isFatal = true;
                        } else {
                            isFatal = (a.castTimer + safetyBuffer) > timeToCollapse;
                        }
                    }
                    
                    if (!isFatal && hazard && !sameSide(hazard, a) && hazard.duration < a.castTimer) isFatal = true;
                    
                    if (isFatal) {
                        engine.log(a, 'DECISION', '中斷詠唱', '', `地面即將塌陷 (${timeToCollapse.toFixed(1)}s)，放棄詠唱 ${castSkill.name}`);
                        // [FIX] Long lockout for fatal breaks to ensure the unit actually tries to move 
                        // before the next AI tick potentially re-evaluates SkillReady
                        engine.combat.breakCast(a, engine, CAST_LOCKOUT.FATAL_BREAK);
                    }
                }
            }

            const path: Hex[] | null = engine.movement.pathfinder.findPathToSafety(
                a, a, engine, engine.movement.targeting
            );
            
            if (path && path.length > 0) {
                a.escapeHex = path[path.length - 1];
                engine.log(a, 'DECISION', '生存：啟動路徑逃離', '', `找到安全路徑，目標：${HexUtils.key(a.escapeHex)}`);
            } else {
                // 備援：無路徑時的鄰格評分 (Two-pass to prioritize safety)
                const neighbors = HexUtils.neighbors(a);
                let bestNeighbor: Hex | null = null;
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

                        const hazardAtN = engine.getSpatialHazardsAt(n.q, n.r).find(h => !sameSide(h, a));
                        const dangerScore = hazardAtN ? 100 : (isWarn ? 10 : 0);
                        const occ = engine.getAgentAt(n.q, n.r);
                        const occPenalty = occ ? (sameSide(occ, a) ? 2 : BT_RULES.ENEMY_OCCUPANCY_PENALTY) : 0;
                        const totalScore = dangerScore + occPenalty;
                        if (totalScore < lowestDanger) {
                            lowestDanger = totalScore;
                            bestNeighbor = n;
                        }
                    }
                    if (bestNeighbor) break;
                }

                if (bestNeighbor) {
                    a.escapeHex = bestNeighbor;
                    engine.log(a, 'DECISION', '生存：鄰格備援', '', `無路徑，強制移往鄰格 ${HexUtils.key(bestNeighbor)}`);
                } else {
                    engine.log(a, 'DECISION', '生存：絕望', '', `無路徑且無可通行的鄰格！嘗試暴力衝刺至任意鄰位以打破死鎖。`);
                    // [PANIC] If totally stuck, just pick any logical non-collapsed neighbor even if blocked by unit
                    const anyNeighbor = neighbors.find(n => engine.map.isValid(n.q, n.r) && !engine.hasObstacleHash(HexUtils.hash(n.q, n.r)));
                    if (anyNeighbor) {
                        a.escapeHex = anyNeighbor;
                    } else {
                        // Fully surrounded by walls or map edge — no escape route exists.
                        // Trigger last-stand mode and let BT fall through to CastPushPull.
                        a.aiState = AIState.LAST_STAND_PUSH;
                        a.escapeHex = null;
                        engine.log(a, 'DECISION', '生存：無路可退', '', '處於死亡網格且無處可躲，進入困獸之鬥模式');
                        return NodeState.FAILURE;
                    }
                }
            }
        }

        a.actionState = ActionState.EVADING;

        if (a.escapeHex) {
            // [FIX] If casting a non-fatal skill, wait for it to finish before moving.
            // This prevents "twitching" (gliding while casting) and respects casting priority.
            if (a.castingSkillIdx !== -1) {
                const currentSkill = a.skills[a.castingSkillIdx];
                if (currentSkill && currentSkill.tag !== 'BASIC') {
                    return NodeState.RUNNING;
                }
            }

            const state = engine.moveAgentToHex(a, a.escapeHex, 0, BT_RULES.ESCAPE_SPEED_MULTIPLIER, true);
            if (state === NodeState.SUCCESS) {
                engine.log(a, 'DECISION', '生存：脫離險境', '', `已抵達目標點 ${HexUtils.key(a.escapeHex)}`);
                a.escapeHex = null;
                if (a.aiState === AIState.EVADING_URGENT || a.aiState === AIState.LAST_STAND_PUSH) {
                    a.aiState = AIState.IDLE;
                }
                // 抵達後若腳下仍危險（抵達格剛好被佔用危險），不可以 SUCCESS 吞掉這一 tick：交給下一層。
                const stillInDanger = BTConditions["IsInWarningZone"](a, engine, {}) || BTConditions["IsInUrgentDanger"](a, engine, {});
                return stillInDanger ? NodeState.FAILURE : NodeState.SUCCESS;
            }
            if (state === NodeState.RUNNING) {
                a.aiState = AIState.EVADING_URGENT;
                return NodeState.RUNNING;
            }
            if (state === NodeState.FAILURE) {
                engine.log(a, 'DECISION', '生存：移動失敗', '', `無法移動至目標格 ${HexUtils.key(a.escapeHex)}`);
                // 移動失敗清掉目標下一幀重找，並回傳 FAILURE 讓 AI 有機會思考其他解法
                a.escapeHex = null;
                a.aiState = AIState.IDLE;
                return NodeState.FAILURE; 
            }
        }

        // targetHex 完全為 null（完全被包圍無路可走）
        // 如果還在危險中，我們返回 FAILURE 讓 AI 有機會至少執行 Combat 分支（困獸之鬥）
        // 而不是停留在此分支返回 RUNNING 導致發呆
        if (BTConditions["IsInWarningZone"](a, engine, {}) || BTConditions["IsInUrgentDanger"](a, engine, {})) {
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
        if (!BTConditions["CanMove"](a, engine, {})) return NodeState.FAILURE;
        const isLowHp = a.target && (a.target.hp / a.target.maxHp < BT_RULES.LOW_HP_THRESHOLD);
        const speedMult = isLowHp ? BT_RULES.LOW_HP_SPEED_MULTIPLIER : (skill.tag === 'ULT' ? COMBAT_PARAM.MOVE_SPEED_ULT : 1.0);
        let dest = a.targetHex || (a.target ? {q: a.target.q, r: a.target.r} : null);
        
        if (dest) {
            const moveRange = (skill.range === 0) ? Math.max(1, skill.aoeRadius || 1) : skill.range;
            // 只有「停下來的格子會塌陷」才拒絕靠近；被困在塌陷格時（Survival 已放棄）直奔目標。
            if (approachEndsOnCollapse(a, engine, dest, moveRange)) {
                if (engine.isCollapsingSoon(HexUtils.key(a)) && a.target) {
                    dest = { q: a.target.q, r: a.target.r };
                } else {
                    return NodeState.FAILURE;
                }
            }

            if (a.q === dest.q && a.r === dest.r) return NodeState.SUCCESS;

            const state = engine.moveAgentToHex(a, dest, moveRange, speedMult);
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
        const skill = idx !== undefined ? a.skills[idx] : undefined;
        if (!skill) return NodeState.FAILURE;

        restoreCombatTarget(a, engine);
        if (!a.target || sameSide(a.target, a)) return NodeState.FAILURE;

        // 非對敵技能（治療／友軍增益／自身增益）在 Smart Cast 未命中條件時：
        // 若是 Ult (0) 或 Active (1)，不可攔截並追擊敵軍，必須回傳 FAILURE 讓 BT 繼續嘗試下一槽位技能（如普攻），
        // 直到所有技能皆無法施放時才由 Gap Close (slot 2) 推進。
        if (idx !== undefined && idx < 2 && !isHostileSkill(skill)) {
            return NodeState.FAILURE;
        }

        // 若技能 range === 0，對敵 PBAOE 追擊射程為 Math.max(1, skill.aoeRadius || 1)，非對敵技能用普攻射程
        const basicRange = a.skills[2]?.range || 1;
        const chaseRange = (skill.range === 0)
            ? (isHostileSkill(skill) ? Math.max(1, skill.aoeRadius || 1) : Math.max(1, basicRange))
            : skill.range;

        if (!BTConditions["CanMove"](a, engine, {})) {
            if (idx !== undefined && idx < 2) return NodeState.FAILURE;
            // 走不動但目標已在射程內：算「就位」（SUCCESS），不是失敗。
            const eff = engine.getEffectiveRange(a, a.target.q, a.target.r, chaseRange);
            return HexUtils.dist(a, a.target) <= eff + COMBAT_PARAM.RANGE_TOLERANCE ? NodeState.SUCCESS : NodeState.FAILURE;
        }

        const isLowHp = a.target.hp / a.target.maxHp < BT_RULES.LOW_HP_THRESHOLD;
        const speedMult = isLowHp ? BT_RULES.LOW_HP_SPEED_MULTIPLIER : ((skill.tag === 'ULT') ? COMBAT_PARAM.CHASE_SPEED_ULT : COMBAT_PARAM.CHASE_SPEED_NORMAL);
        
        const dest = { q: a.target.q, r: a.target.r };

        // 只有「停下來的格子會塌陷」才不追；被困在塌陷格時直奔目標，不放棄追擊。
        if (approachEndsOnCollapse(a, engine, dest, chaseRange) && !engine.isCollapsingSoon(HexUtils.key(a))) {
            // 目標在塌陷區邊緣、我在安全格：已在射程內就原地待命（moveAgentToHex 會回 SUCCESS），否則交給 Reposition。
            const dist = HexUtils.dist(a, dest);
            if (dist > engine.getEffectiveRange(a, dest.q, dest.r, chaseRange) + COMBAT_PARAM.RANGE_TOLERANCE) return NodeState.FAILURE;
        }

        const state = engine.moveAgentToHex(a, dest, chaseRange, speedMult);
        
        if (state === NodeState.RUNNING) {
            a.aiState = AIState.TRACKING;
            a.actionState = ActionState.WALKING;
        } else if (state === NodeState.SUCCESS && idx !== undefined && idx < 2) {
            // Ult / Active 的 Smart Cast 已失敗且無需移動：回傳 FAILURE 交給下一槽位技能出手，不可空轉吞掉此 tick
            return NodeState.FAILURE;
        }
        return state;
    },
    /**
     * 走位：追擊失敗（目標腳下將塌陷、被堵住…）時，往「離目標更近的安全格」挪，不是原地發呆。
     * 只挑嚴格更靠近目標、非塌陷、無敵方 hazard、無人佔用的格子，所以不會來回震盪；找不到就 FAILURE（交給 Idle）。
     */
    "Reposition": (a, engine) => {
        restoreCombatTarget(a, engine);
        if (!a.target || !BTConditions["CanMove"](a, engine, {})) return NodeState.FAILURE;
        if (engine.isCollapsingSoon(HexUtils.key(a))) return NodeState.FAILURE; // 這是 RETREAT 的事
        const curDist = HexUtils.dist(a, a.target);
        let best: Hex | null = null;
        let bestDist = curDist;
        // 地面近戰高低差感知：站得到同層攻擊格就優先去那裡（鄰著目標但差一層時，單看格距永遠找不到「更近」的格）
        const basicRange = a.skills.find(s => s?.tag === 'BASIC')?.range ?? 0;
        const meleeAware = isGroundMeleeRange(a, basicRange) &&
            !isMeleeAttackCell(engine.movement.targeting, a, a.target.q, a.target.r, basicRange, engine, a.jump);
        let bestIsAttack = false;
        let bestStep = Infinity;
        for (const h of HexUtils.range(a, REPOSITION_RADIUS)) {
            if (h.q === a.q && h.r === a.r) continue;
            if (!engine.map.isValid(h.q, h.r) || engine.isBlocked(h.q, h.r, a.id, a.movementType)) continue;
            if (engine.isCollapsingSoon(HexUtils.key(h))) continue;
            if (engine.getSpatialHazardsAt(h.q, h.r).some(hz => !sameSide(hz, a))) continue;
            if (meleeAware && isMeleeAttackCell(engine.movement.targeting, h, a.target.q, a.target.r, basicRange, engine, a.jump)) {
                // 攻擊格之間挑離自己最近的；有任何攻擊格就勝過「只是格距更近」的格
                const step = HexUtils.dist(a, h);
                if (!bestIsAttack || step < bestStep) { bestIsAttack = true; bestStep = step; best = h; }
                continue;
            }
            if (bestIsAttack) continue;
            const d = HexUtils.dist(h, a.target);
            if (d < bestDist) { bestDist = d; best = h; }
        }
        if (!best) return NodeState.FAILURE;
        const state = engine.moveAgentToHex(a, best, 0, 1.0);
        if (state === NodeState.RUNNING) {
            a.aiState = AIState.TRACKING;
            a.actionState = ActionState.WALKING;
        }
        return state;
    },
    /** 順手打：目標在射程外時，普攻好了又有別的敵人打得到就換過去（下一次決策進 FIGHT）。 */
    "StrikeNearby": (a, engine) => {
        if (a.castingSkillIdx !== -1 || a.effects.TAUNT.remaining > 0) return NodeState.FAILURE;
        if (BTConditions["TargetInBasicRange"](a, engine, {})) return NodeState.FAILURE;
        const basicIdx = a.skills.findIndex(s => s?.tag === 'BASIC');
        if (basicIdx < 0 || !BTConditions["SkillReady"](a, engine, { slot: basicIdx })) return NodeState.FAILURE;
        const near = enemyInReach(a, engine);
        if (!near) return NodeState.FAILURE;
        lockTarget(a, near, engine);
        if (a.isMoving) stopMovement(a);
        return NodeState.RUNNING;
    },
    /**
     * 前進：追擊和走位都不行時，走到走得到的格子裡離敵人最近的地方。
     * 不能動、或已經有敵人打得到（在等冷卻）是正當的等待；其餘 FAILURE 交給 UNSTICK。
     */
    "Advance": (a, engine) => {
        restoreCombatTarget(a, engine);
        const near = enemyInReach(a, engine);
        if (near || !BTConditions["CanMove"](a, engine, {})) {
            if (near) lockTarget(a, near, engine);
            a.aiState = AIState.WAITING;
            a.actionState = ActionState.IDLE;
            return NodeState.SUCCESS;
        }
        // 目標走不到：解除鎖定，下一次選敵才換得掉
        a.targetLockUntil = 0;
        const goal = bestAdvanceCell(a, engine);
        if (!goal) return NodeState.FAILURE;
        const state = engine.moveAgentToHex(a, goal, 0, 1.0);
        if (state === NodeState.RUNNING) {
            a.aiState = AIState.TRACKING;
            a.actionState = ActionState.WALKING;
        }
        return state;
    },
    /** 脫困：爬升規則走不到任何敵人時，短暫等待後強制跳上離敵人最近的鄰格（只在這裡無視 canStepUp）。 */
    "ForceJump": (a, engine) => {
        if (a.isMoving) return NodeState.RUNNING;
        restoreCombatTarget(a, engine);
        if (!BTConditions["CanMove"](a, engine, {})) return NodeState.FAILURE;
        a.aiState = AIState.WAITING;
        a.actionState = ActionState.IDLE;
        if (engine.battleTime - a.aiModeSince < BT_RULES.UNSTICK_WAIT_S) return NodeState.RUNNING;
        // 只挑爬升規則擋住的格：其他鄰格尋路本來就走得到，跳過去只會來回彈
        const fromH = engine.getTerrainHeight(a.q, a.r);
        let best: Hex | null = null;
        let bestDist = Infinity;
        for (const n of HexUtils.neighbors(a)) {
            if (!engine.isValid(n.q, n.r) || engine.isBlocked(n.q, n.r, a.id, a.movementType)) continue;
            if (engine.isCollapsingSoon(HexUtils.key(n))) continue;
            if (canStepUp(a, fromH, engine.getTerrainHeight(n.q, n.r))) continue;
            const d = distToNearestEnemy(a, n, engine);
            if (d < bestDist) { bestDist = d; best = n; }
        }
        if (!best) return NodeState.FAILURE;
        engine.movement.forceStep(a, best);
        return NodeState.RUNNING;
    },
    "CastPushPull": (a, engine) => {
        const savedTarget = a.target;

        // [Task 5] Decoupled Path-Clearing Targeting
        // 尋找第一個可用的推拉技能
        const idx = a.skills.findIndex((s, i) => {
            if (!s) return false;
            const isPushPull = hasIntentIn(s, PUSH_PULL);
            if (!isPushPull) return false;
            let cd = a.curCDs[i];
            if (isNaN(cd) || cd < 0) cd = 0;
            return cd <= COMBAT_PARAM.READY_CD_TOLERANCE && a.mp >= s.cost;
        });

        if (idx === -1) return NodeState.FAILURE;
        const skill = a.skills[idx]!;

        // 1. Path-Clearing Logic: Only trigger if in danger or evading
        if (a.aiState === AIState.EVADING_URGENT || BTConditions["IsInWarningZone"](a, engine, {})) {
            let isTargetSafe = false;
            if (a.escapeHex) {
                const targetKey = HexUtils.key(a.escapeHex);
                const hazardAtTarget = engine.getSpatialHazardsAt(a.escapeHex.q, a.escapeHex.r).find(h => !sameSide(h, a));
                isTargetSafe = !engine.isWarningTile(targetKey) && !hazardAtTarget;
            }
            if (isTargetSafe) {
                // Get line towards safety
                const line = HexUtils.line(a, a.escapeHex);
                for (const h of line) {
                    if (h.q === a.q && h.r === a.r) continue;
                    const occupant = engine.getAgentAt(h.q, h.r);
                    if (occupant && !sameSide(occupant, a)) {
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
        
        if (dist <= effRange + COMBAT_PARAM.RANGE_TOLERANCE) {
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
        if (a.aiState === AIState.EVADING_URGENT || BTConditions["IsInWarningZone"](a, engine, {})) {
            const dest = a.targetHex ?? (a.target ? { q: a.target.q, r: a.target.r } : null);
            if (dest) {
                a.aiState = AIState.LAST_STAND_PUSH; 
                const state = engine.moveAgentToHex(a, dest, skill.range, BT_RULES.SUPPORT_APPROACH_SPEED, false);
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
