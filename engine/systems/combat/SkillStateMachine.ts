// ╔══════════════════════════════════════════════════════════╗
// ║  SkillStateMachine — 技能槽的狀態機                      ║
// ║  職責：回答「這招現在能不能放、為什麼不能」（activationBlock）║
// ║        並且是施法狀態欄位的唯一寫入處（前搖開始、結束、   ║
// ║        扣魔進冷卻、被打斷的懲罰）。                       ║
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
import { CAST_LOCKOUT, CAST_RULES, COMBAT_PARAM } from "../../../constants";

export type SkillPhase = 'READY' | 'WINDUP' | 'COOLDOWN';

export type SkillTrigger = 'ACTIVATE' | 'RESOLVE' | 'INTERRUPT' | 'CD_DONE';

/** 合法的轉移。冷卻剩極短時（容差內）可以直接開始下一次前搖；被打斷的普攻沒有冷卻懲罰，回到就緒 */
export const SKILL_PHASE_EDGES: readonly { from: SkillPhase; to: SkillPhase; on: SkillTrigger }[] = [
    { from: 'READY', to: 'WINDUP', on: 'ACTIVATE' },
    { from: 'COOLDOWN', to: 'WINDUP', on: 'ACTIVATE' },
    { from: 'WINDUP', to: 'COOLDOWN', on: 'RESOLVE' },
    { from: 'WINDUP', to: 'COOLDOWN', on: 'INTERRUPT' },
    { from: 'WINDUP', to: 'READY', on: 'INTERRUPT' },
    { from: 'COOLDOWN', to: 'READY', on: 'CD_DONE' },
];

export function skillPhase(a: Agent, idx: number): SkillPhase {
    if (a.castingSkillIdx === idx) return 'WINDUP';
    return (a.curCDs[idx] || 0) > 0 ? 'COOLDOWN' : 'READY';
}

export type ActivationBlock = 'NO_SKILL' | 'DEAD' | 'CONTROLLED' | 'SILENCED' | 'BUSY' | 'RECOVERY' | 'COOLDOWN' | 'MANA';

/** 這招不能放的原因；null＝可以。已在前搖的那一招視為可以繼續 */
export function activationBlock(a: Agent, idx: number): ActivationBlock | null {
    const skill = a.skills[idx];
    if (!skill) return 'NO_SKILL';
    if (a.hp <= 0) return 'DEAD';
    if (isActionBlocked(a, 'CAST')) return 'CONTROLLED';
    if (skill.tag !== 'BASIC' && isActionBlocked(a, 'SKILL')) return 'SILENCED';
    if (a.castingSkillIdx !== -1 && a.castingSkillIdx !== idx) return 'BUSY';
    if (a._castCompleteCooldown > 0 || a._interruptCooldown > 0) return 'RECOVERY';
    if (a.castingSkillIdx !== idx) {
        const tolerance = skill.tag === 'BASIC' ? COMBAT_PARAM.BASIC_CD_TOLERANCE : COMBAT_PARAM.SKILL_CD_TOLERANCE;
        if ((a.curCDs[idx] || 0) > tolerance) return 'COOLDOWN';
    }
    if (a.mp < skill.cost) return 'MANA';
    return null;
}

/** 前搖開始 */
export function beginWindup(a: Agent, idx: number, skill: Skill): void {
    const duration = Math.max(skill.cast, CAST_RULES.MIN_CAST_DURATION);
    a.castingSkillIdx = idx;
    a.castTimer = duration;
    a.castingAnimationTimer = duration;
}

/** 前搖推進；回傳前搖是否走完 */
export function advanceWindup(a: Agent, dt: number): boolean {
    a.castTimer -= dt;
    if (a.castingAnimationTimer > 0) a.castingAnimationTimer -= dt;
    return a.castTimer <= 0;
}

/** 前搖走完：扣魔、回魔、進冷卻 */
export function commitSkill(a: Agent, idx: number, skill: Skill): void {
    a.mp = Math.min(a.maxMp, Math.max(0, a.mp - skill.cost + skill.gain));
    // BASIC attacks do not have a mandatory 0.3s floor CD
    const minCd = skill.tag === 'BASIC' ? CAST_RULES.MIN_BASIC_RETRY_CD : CAST_RULES.MIN_SKILL_RETRY_CD;
    a.curCDs[idx] = Math.max(skill.cd ?? 0, minCd);
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
}
