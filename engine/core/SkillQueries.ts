// ╔══════════════════════════════════════════════════════════╗
// ║  SkillQueries — 問一招「它會做什麼」的唯一入口            ║
// ║  職責：讀技能的動作清單（onCast／onImpact／onHit／onEnd） ║
// ║        與意圖（intents），回答 AI、結算、顯示要的問題。   ║
// ║  [ARCH] 新增動作種類時，只要這裡和                        ║
// ║  engine/systems/combat/SkillActions.ts 要動；AI 問意圖，   ║
// ║  不看動作細節。                                           ║
// ╚══════════════════════════════════════════════════════════╝

import type { HitAction, Skill, SkillIntent, SkillStatus, SkillTeams } from '../../types';

type HitActionKind = HitAction['action'];
type ValueHitAction = Extract<HitAction, { value?: number }>;

/** 打中目標時會不會套這個狀態（不含施法者自己身上的） */
export function appliesStatusOnHit(skill: Pick<Skill, 'onHit'>, statuses: ReadonlySet<SkillStatus>): boolean {
    const hit = skill.onHit;
    if (!hit) return false;
    for (let i = 0; i < hit.length; i++) {
        const a = hit[i];
        if (a.action === 'STATUS' && statuses.has(a.status)) return true;
    }
    return false;
}

/** 這招有沒有這些狀態（打中目標或施法者自己都算） */
export function hasStatusIn(skill: Pick<Skill, 'onHit' | 'onEnd'>, statuses: ReadonlySet<SkillStatus>): boolean {
    if (appliesStatusOnHit(skill, statuses)) return true;
    const end = skill.onEnd;
    if (!end) return false;
    for (let i = 0; i < end.length; i++) {
        if (statuses.has(end[i].status)) return true;
    }
    return false;
}

const DOT_STATUS: ReadonlySet<SkillStatus> = new Set<SkillStatus>(['DOT']);

/** 持續傷害類：傷害浮字與打擊回饋要另外處理 */
export function isDotSkill(skill: Pick<Skill, 'onHit' | 'onEnd'>): boolean {
    return hasStatusIn(skill, DOT_STATUS);
}

/** 這招有沒有任何狀態 */
export function hasAnyStatus(skill: Skill): boolean {
    if (skill.onEnd && skill.onEnd.length > 0) return true;
    const hit = skill.onHit;
    if (!hit) return false;
    for (let i = 0; i < hit.length; i++) {
        if (hit[i].action === 'STATUS') return true;
    }
    return false;
}

export function hasHitAction(skill: Skill, kind: HitActionKind): boolean {
    const hit = skill.onHit;
    if (!hit) return false;
    for (let i = 0; i < hit.length; i++) {
        if (hit[i].action === kind) return true;
    }
    return false;
}

export function findHitAction<K extends HitActionKind>(skill: Skill, kind: K): Extract<HitAction, { action: K }> | undefined {
    const hit = skill.onHit;
    if (!hit) return undefined;
    for (let i = 0; i < hit.length; i++) {
        if (hit[i].action === kind) return hit[i] as Extract<HitAction, { action: K }>;
    }
    return undefined;
}

/** 這種命中動作的數值總和；value 為 0 或沒寫的用 fallback */
export function sumHitActionValue(skill: Skill, kind: ValueHitAction['action'], fallback: number): number {
    const hit = skill.onHit;
    if (!hit) return 0;
    let total = 0;
    for (let i = 0; i < hit.length; i++) {
        const a = hit[i];
        if (a.action === kind) total += (a as ValueHitAction).value || fallback;
    }
    return total;
}

export function hasIntentIn(skill: Skill, intents: ReadonlySet<SkillIntent>): boolean {
    const own = skill.intents;
    if (!own) return false;
    for (let i = 0; i < own.length; i++) {
        if (intents.has(own[i])) return true;
    }
    return false;
}

/** 這招對誰有效。沒寫就看威力：傷害打敵人、治療打友軍、威力 0 不限 */
export function skillTeams(skill: Skill): SkillTeams {
    if (skill.teams) return skill.teams;
    if (skill.power > 0) return 'ENEMY';
    return skill.power < 0 ? 'ALLY' : 'ANY';
}
