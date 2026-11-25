// ╔══════════════════════════════════════════════════════════╗
// ║  SkillStateMachine — 技能槽的狀態機                      ║
// ║  職責：回答「這招現在能不能放、為什麼不能」（activationBlock）║
// ║        並且是施法狀態欄位的唯一寫入處（前搖開始、推進與   ║
// ║        奧義逐步扣魔、結束、主動取消、結算進冷卻、打斷懲罰）║
// ║  [ARCH] 狀態機管「這招做到哪」；AI_MODE_GRAPH 管「單位想  ║
// ║  做什麼」。AI 只問 activationBlock 和呼叫施放，不直接判斷  ║
// ║  冷卻、魔力或控制。階段由 castingSkillIdx 與 curCDs 推導，║
// ║  不另存一份。                                             ║
// ║  [ARCH] 事件與結算不在這裡：CastingEngine 發打斷事件，     ║
// ║  CombatSystem 決定結算方式（瞬發、投射物、天降）。         ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from "../../core/Agent";
import type { Skill } from "../../../types";
import { isActionBlocked } from "../../core/Effects";
import { onSkillReleased } from "../../core/Orders";
import { CAST_LOCKOUT, CAST_RULES, COMBAT_PARAM } from "../../../constants";

export type SkillPhase = 'READY' | 'WINDUP' | 'COOLDOWN';

export type SkillTrigger = 'ACTIVATE' | 'RESOLVE' | 'INTERRUPT' | 'CANCEL' | 'CD_DONE';

/** 合法的轉移。冷卻剩極短時（容差內）可以直接開始下一次前搖；被打斷的普攻或玩家主動取消沒有冷卻懲罰，回到就緒 */
export const SKILL_PHASE_EDGES: readonly { from: SkillPhase; to: SkillPhase; on: SkillTrigger }[] = [
    { from: 'READY', to: 'WINDUP', on: 'ACTIVATE' },
    { from: 'COOLDOWN', to: 'WINDUP', on: 'ACTIVATE' },
    { from: 'WINDUP', to: 'COOLDOWN', on: 'RESOLVE' },
    { from: 'WINDUP', to: 'COOLDOWN', on: 'INTERRUPT' },
    { from: 'WINDUP', to: 'READY', on: 'INTERRUPT' },
    { from: 'WINDUP', to: 'READY', on: 'CANCEL' },
    { from: 'COOLDOWN', to: 'READY', on: 'CD_DONE' },
];

export function skillPhase(a: Agent, idx: number): SkillPhase {
    if (a.castingSkillIdx === idx) return 'WINDUP';
    return (a.curCDs[idx] || 0) > 0 ? 'COOLDOWN' : 'READY';
}

export type ActivationBlock = 'NO_SKILL' | 'DEAD' | 'CONTROLLED' | 'SILENCED' | 'ROOTED' | 'BUSY' | 'RECOVERY' | 'COOLDOWN' | 'MANA';

/** 這招是不是在前搖中逐步扣魔（ADR 0026：奧義；扣魔、結算與魔力檢查共用這一個判斷）。 */
function drainsManaDuringWindup(skill: Skill): boolean {
    return skill.tag === 'ULT';
}

/**
 * 冷卻或魔力不足的單一判斷（activationBlock 與 playerCastRefusal 共用，不另寫一份）。
 * isThisWindup：這一招正在前搖、而且會接著放下去（重開前搖的指令傳 false，照沒在前搖判斷）。
 */
function resourceBlock(a: Agent, idx: number, isThisWindup: boolean = a.castingSkillIdx === idx): 'COOLDOWN' | 'MANA' | null {
    const skill = a.skills[idx];
    if (!skill) return null;
    if (!isThisWindup) {
        const tolerance = skill.tag === 'BASIC' ? COMBAT_PARAM.BASIC_CD_TOLERANCE : COMBAT_PARAM.SKILL_CD_TOLERANCE;
        if ((a.curCDs[idx] || 0) > tolerance) return 'COOLDOWN';
    }
    if (!(isThisWindup && drainsManaDuringWindup(skill)) && a.mp < skill.cost) return 'MANA';
    return null;
}

/**
 * 玩家施放指令要不要拒收、HUD 技能鈕要不要變暗（ADR 0026；UICommandSystem 與 HUD 檢視共用）：
 * 冷卻中、魔力不足拒收；普攻的冷卻只是攻擊間隔（和 MOBA 一樣不拒收攻擊指令），不算。
 * restartsWindup：這道指令會取消這一招正在進行的前搖再重開（例如奧義詠唱中換目標）：
 * 已扣的魔力不退，所以照取消後的狀態判斷（K1～K4 終審 #1）。
 */
export function playerCastRefusal(a: Agent, idx: number, restartsWindup: boolean = false): 'COOLDOWN' | 'MANA' | null {
    const res = resourceBlock(a, idx, a.castingSkillIdx === idx && !restartsWindup);
    return res === 'COOLDOWN' && a.skills[idx]?.tag === 'BASIC' ? null : res;
}

/** 這招不能放的原因；null＝可以。已在前搖的那一招視為可以繼續 */
export function activationBlock(a: Agent, idx: number): ActivationBlock | null {
    const skill = a.skills[idx];
    if (!skill) return 'NO_SKILL';
    if (a.hp <= 0) return 'DEAD';
    if (isActionBlocked(a, 'CAST')) return 'CONTROLLED';
    if (skill.tag !== 'BASIC' && isActionBlocked(a, 'SKILL')) return 'SILENCED';
    // 突進、瞬移、後撤都是自己移動，被定身時不能放
    if (skill.onCast?.length && isActionBlocked(a, 'MOVE')) return 'ROOTED';
    const res = resourceBlock(a, idx);
    if (res) return res;
    if (a.castingSkillIdx !== -1 && a.castingSkillIdx !== idx) return 'BUSY';
    if (a._castCompleteCooldown > 0 || a._interruptCooldown > 0) return 'RECOVERY';
    return null;
}

/** 前搖有效時長（起手計時與逐步扣魔共用同一算式）。 */
function windupDuration(skill: Skill): number {
    return Math.max(skill.cast, CAST_RULES.MIN_CAST_DURATION);
}

/** 前搖開始 */
export function beginWindup(a: Agent, idx: number, skill: Skill): void {
    const duration = windupDuration(skill);
    a.castingSkillIdx = idx;
    a.castTimer = duration;
    a.castingAnimationTimer = duration;
}

/** 前搖推進（逐步扣魔技能依本 tick 實際走掉的時間扣魔，扣到 0 為止）；回傳前搖是否走完 */
export function advanceWindup(a: Agent, dt: number): boolean {
    const skill = a.castingSkillIdx !== -1 ? a.skills[a.castingSkillIdx] : null;
    if (skill && drainsManaDuringWindup(skill) && skill.cost > 0) {
        const elapsed = Math.max(0, Math.min(dt, a.castTimer));
        a.mp = Math.max(0, a.mp - (skill.cost * elapsed) / windupDuration(skill));
    }
    a.castTimer -= dt;
    if (a.castingAnimationTimer > 0) a.castingAnimationTimer -= dt;
    return a.castTimer <= 0;
}

/** 前搖走完：非逐步扣魔技能一次扣魔，所有技能照舊回魔（gain）並進冷卻 */
export function commitSkill(a: Agent, idx: number, skill: Skill): void {
    const cost = drainsManaDuringWindup(skill) ? 0 : skill.cost;
    a.mp = Math.min(a.maxMp, Math.max(0, a.mp - cost + skill.gain));
    // BASIC attacks do not have a mandatory 0.3s floor CD
    const minCd = skill.tag === 'BASIC' ? CAST_RULES.MIN_BASIC_RETRY_CD : CAST_RULES.MIN_SKILL_RETRY_CD;
    a.curCDs[idx] = Math.max(skill.cd ?? 0, minCd);
    // 玩家的施放指令到此完成（契約 G3）；被打斷不會走到這裡，指令留著重試
    onSkillReleased(a, idx);
}

/** 打斷的懲罰：短暫不能再施法，主動技和奧義另外進一小段冷卻（避免卡在部分控制下無限重放） */
export function applyInterruptPenalty(a: Agent, idx: number, skill: Skill): void {
    a._interruptCooldown = CAST_LOCKOUT.INTERRUPT;
    if (skill.tag !== 'BASIC') a.curCDs[idx] = Math.max(a.curCDs[idx] || 0, CAST_LOCKOUT.INTERRUPT_SKILL_CD);
}

/** 外部要求的施法鎖定（只會拉長，不會縮短） */
export function extendInterruptLockout(a: Agent, seconds: number): void {
    a._interruptCooldown = Math.max(a._interruptCooldown, seconds);
}

/** 離開前搖。走完的施法另外有短暫硬直，避免同一幀又開始下一招 */
export function endWindup(a: Agent, completed: boolean): void {
    a.castingSkillIdx = -1;
    a.castTimer = 0;
    a.castingAnimationTimer = 0;
    if (completed) a._castCompleteCooldown = CAST_RULES.COMPLETE_COOLDOWN;
    a.castTarget = null;
}

/** 玩家主動取消前搖（ADR 0026，WINDUP → READY on CANCEL）：不進冷卻、不設中斷鎖定、不寫被打斷紀錄；非奧義不扣魔，奧義在前搖中已逐步扣掉的魔力不退。 */
export function cancelWindup(a: Agent): boolean {
    if (a.castingSkillIdx === -1) return false;
    endWindup(a, false);
    a.currentTelegraph = null;
    return true;
}

/**
 * 選招時指定施法目標（契約 G2）：對友軍施法填友軍，其他情況填 null。
 * 前搖中不改：施法目標在施法開始時定下，結束或被打斷時由 endWindup 清掉；
 * 行為樹在前搖中照常每次決策重跑選招，這裡擋住才不會把施放中的治療換人或清掉。
 */
export function aimCastAt(a: Agent, target: Agent | null): void {
    if (a.castingSkillIdx !== -1) return;
    a.castTarget = target;
}

/**
 * 這次施法瞄準的單位：有施法目標（友軍）讀它，否則是戰鬥目標。
 * 施法管線（起手、轉向、結算、投射物、突進、預警區）一律讀這裡，不直接讀 target。
 */
export function castAim(a: Pick<Agent, 'castTarget' | 'target'>): Agent | null {
    return a.castTarget ?? a.target;
}
