// ╔══════════════════════════════════════════════════════════╗
// ║  SkillQueries — 問一招「它會做什麼」的唯一入口            ║
// ║  職責：讀技能的動作清單（onCast／onImpact／onHit／onEnd） ║
// ║        與意圖（intents），回答 AI、結算、顯示要的問題。   ║
// ║  [ARCH] 新增動作種類時，只要這裡和                        ║
// ║  engine/systems/combat/SkillActions.ts 要動；AI 問意圖，   ║
// ║  不看動作細節。                                           ║
// ╚══════════════════════════════════════════════════════════╝

import type { CastAction, CastTargeting, HitAction, Role, Skill, SkillIntent, SkillStatus, SkillTeams, Team } from '../../types';
import { sameSide } from './Allegiance';

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

/** 出手時施法者自己怎麼位移（讀 onCast）：TOWARD＝往目標去（DASH 突進、BLINK 瞬移到目標身邊）、BACK＝往遠離目標的方向後撤（RETREAT）、null＝不動 */
type CastMotion = 'TOWARD' | 'BACK';
/** 單一出手動作怎麼移動施法者（null＝不移動自己）。新增 CastAction 種類時這裡少處理一種就編譯失敗，逼新增者決定它算不算移動。 */
function motionOfAction(a: CastAction): CastMotion | null {
    switch (a.action) {
        case 'DASH':
        case 'BLINK':
            return 'TOWARD';
        case 'RETREAT':
            return 'BACK';
        default: {
            const unhandled: never = a;
            return unhandled;
        }
    }
}
export function castMotion(skill: Pick<Skill, 'onCast'>): CastMotion | null {
    for (const a of skill.onCast ?? []) {
        const motion = motionOfAction(a);
        if (motion !== null) return motion;
    }
    return null;
}

/** 出手時會不會移動施法者自己（定身時不能放、有出手位移的不再前衝） */
export function movesSelf(skill: Pick<Skill, 'onCast'>): boolean {
    return castMotion(skill) !== null;
}

/** 出手動作裡有沒有這一種（例如只認 DASH 的突進落點規則；BLINK 算不算是玩法決定，另議） */
export function hasCastAction(skill: Pick<Skill, 'onCast'>, action: CastAction['action']): boolean {
    return skill.onCast?.some((a) => a.action === action) ?? false;
}

/** 這招開始前搖時會不會發 CAST_START（詠唱字、詠唱序列、預警格）；取消時同一個判斷決定要不要發 CAST_CANCEL */
export function announcesCast(skill: Pick<Skill, 'cast' | 'tag'>): boolean {
    return skill.cast > 0 && skill.tag !== 'BASIC';
}

/** 這個職業、這一隊能帶的技能：職業相同，且技能沒有限定隊伍或限定的就是這一隊（生成單位與 PLAY 選主角共用） */
export function roleSkills(db: readonly Skill[], role: Role, team: Team): Skill[] {
    return db.filter((s) => s.role === role && (s.team === undefined || s.team === team));
}

/** 這招對誰有效。沒寫就看威力：傷害打敵人、治療打友軍、威力 0 不限 */
export function skillTeams(skill: Skill): SkillTeams {
    if (skill.teams) return skill.teams;
    if (skill.power > 0) return 'ENEMY';
    return skill.power < 0 ? 'ALLY' : 'ANY';
}

/** 這招對這個單位有沒有效（依 teams） */
export function isSkillTarget(skill: Skill, source: Parameters<typeof sameSide>[1], unit: Parameters<typeof sameSide>[0]): boolean {
    const teams = skillTeams(skill);
    return teams === 'ANY' || (teams === 'ENEMY') === !sameSide(unit, source);
}

/**
 * 選目標的方式（單一定義：castTargeting 與 BTRegistry 的 OrderCast 共用，ADR 0025／0026）：
 * - 射程 0：SELF（按一下就放；射程 0 要先判斷，避免給射程 0 的招點地面走不到而卡住）。
 * - 機動技依出手位移（castMotion）：後撤（BACK）＝SELF；突進／瞬移（TOWARD）＝UNIT_OR_GROUND；其餘照一般規則。
 * - 一般技能：範圍技（AOE）＝UNIT_OR_GROUND；單體＝UNIT。
 */
export function targetModeOf(skill: Skill): CastTargeting['mode'] {
    if (skill.range === 0) return 'SELF';
    if (skill.tag === 'MOBILITY') {
        const motion = castMotion(skill);
        if (motion === 'BACK') return 'SELF';
        if (motion === 'TOWARD') return 'UNIT_OR_GROUND';
    }
    return skill.type === 'AOE' ? 'UNIT_OR_GROUND' : 'UNIT';
}
