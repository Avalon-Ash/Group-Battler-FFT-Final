// ╔══════════════════════════════════════════════════════════╗
// ║  flatView — 動作清單的「兩個控制槽＋兩個效果槽」表單視圖  ║
// ║  職責：技能編輯面板是固定欄位的表單，這裡在表單欄位和      ║
// ║        動作清單之間轉換。遊戲邏輯只讀動作清單。            ║
// ║  [ARCH] 表單表達不了的動作（新機制）轉換時原樣保留。       ║
// ╚══════════════════════════════════════════════════════════╝

import type { CastAction, EndAction, HitAction, ImpactAction, Skill, SkillIntent, SkillStatus, SpatialHazard } from '../../types';

export type SkillEffectKind = 'VAMP' | 'MANA_BURN' | 'EXECUTE' | 'MANA_RESTORE' | 'DASH' | 'SELF_DAMAGE';

export interface FlatSkillFields {
    ccType?: SkillStatus;
    ccDur?: number;
    ccForce?: number;
    ccSelf?: boolean;
    ccType2?: SkillStatus;
    ccDur2?: number;
    ccForce2?: number;
    ccSelf2?: boolean;
    effectType?: SkillEffectKind;
    effectVal?: number;
    effectType2?: SkillEffectKind;
    effectVal2?: number;
    hazardKind?: SpatialHazard['type'];
    hazardDur?: number;
}

export const FLAT_SKILL_FIELDS = [
    'ccType', 'ccDur', 'ccForce', 'ccSelf', 'ccType2', 'ccDur2', 'ccForce2', 'ccSelf2',
    'effectType', 'effectVal', 'effectType2', 'effectVal2', 'hazardKind', 'hazardDur',
] as const satisfies readonly (keyof FlatSkillFields)[];

const FLAT_FIELD_SET: ReadonlySet<string> = new Set(FLAT_SKILL_FIELDS);

export function isFlatSkillField(field: string): field is keyof FlatSkillFields {
    return FLAT_FIELD_SET.has(field);
}

const FLAT_HIT_KINDS: ReadonlySet<string> = new Set(['STATUS', 'VAMP', 'MANA_BURN', 'MANA_RESTORE', 'EXECUTE', 'SELF_DAMAGE']);
/** 由動作推得的意圖；其他意圖（ESCAPE 等）是人寫的，轉換時保留 */
const DERIVED_INTENTS: ReadonlySet<SkillIntent> = new Set(['GAP_CLOSE', 'HOOK', 'PEEL']);

export type SkillActionLists = Pick<Skill, 'onCast' | 'onImpact' | 'onHit' | 'onEnd' | 'intents'>;

/** 動作清單 → 表單欄位。狀態依序填進兩個控制槽（打中目標的在前） */
export function readFlatFields(skill: Skill): FlatSkillFields {
    const flat: FlatSkillFields = {};
    const slots: { status: SkillStatus; duration?: number; force?: number; self: boolean }[] = [];
    const effects: { kind: SkillEffectKind; value?: number }[] = [];
    for (const a of skill.onHit ?? []) {
        if (a.action === 'STATUS') slots.push({ status: a.status, duration: a.duration, force: a.force, self: false });
        else if (FLAT_HIT_KINDS.has(a.action)) effects.push({ kind: a.action as SkillEffectKind, value: a.value });
    }
    for (const a of skill.onEnd ?? []) slots.push({ status: a.status, duration: a.duration, force: a.force, self: true });
    if (skill.onCast?.some((a) => a.action === 'DASH')) effects.push({ kind: 'DASH' });
    const [c1, c2] = slots;
    if (c1) Object.assign(flat, { ccType: c1.status, ccDur: c1.duration, ccForce: c1.force, ccSelf: c1.self || undefined });
    if (c2) Object.assign(flat, { ccType2: c2.status, ccDur2: c2.duration, ccForce2: c2.force, ccSelf2: c2.self || undefined });
    const [e1, e2] = effects;
    if (e1) Object.assign(flat, { effectType: e1.kind, effectVal: e1.value });
    if (e2) Object.assign(flat, { effectType2: e2.kind, effectVal2: e2.value });
    const hazard = skill.onImpact?.find((a) => a.action === 'HAZARD');
    if (hazard) Object.assign(flat, { hazardKind: hazard.kind, hazardDur: hazard.duration });
    return flat;
}

function statusAction(status: SkillStatus, duration?: number, force?: number) {
    const a: { action: 'STATUS'; status: SkillStatus; duration?: number; force?: number } = { action: 'STATUS', status };
    if (duration !== undefined) a.duration = duration;
    if (force !== undefined) a.force = force;
    return a;
}

/** 表單欄位 → 動作清單。`existing`：表單表達不了的動作與人寫的意圖要保留；空清單回 undefined，才蓋得掉舊值 */
export function actionsFromFlat(flat: FlatSkillFields, existing?: SkillActionLists): SkillActionLists {
    const onCast: CastAction[] = [];
    const onImpact: ImpactAction[] = [];
    const onHit: HitAction[] = [];
    const onEnd: EndAction[] = [];

    for (const [kind, value] of [[flat.effectType, flat.effectVal], [flat.effectType2, flat.effectVal2]] as const) {
        if (!kind) continue;
        if (kind === 'DASH') onCast.push({ action: 'DASH' });
        else onHit.push(value === undefined ? { action: kind } : { action: kind, value });
    }
    if (flat.ccType) (flat.ccSelf ? onEnd : onHit).push(statusAction(flat.ccType, flat.ccDur, flat.ccForce));
    if (flat.ccType2) (flat.ccSelf2 ? onEnd : onHit).push(statusAction(flat.ccType2, flat.ccDur2, flat.ccForce2));
    if (flat.hazardKind) onImpact.push({ action: 'HAZARD', kind: flat.hazardKind, duration: flat.hazardDur ?? 0 });

    for (const a of existing?.onHit ?? []) if (!FLAT_HIT_KINDS.has(a.action)) onHit.push(a);
    for (const a of existing?.onCast ?? []) if (a.action !== 'DASH') onCast.push(a);
    for (const a of existing?.onImpact ?? []) if (a.action !== 'HAZARD') onImpact.push(a);

    const intents: SkillIntent[] = [];
    if (onCast.some((a) => a.action === 'DASH')) intents.push('GAP_CLOSE');
    if (onHit.some((a) => a.action === 'STATUS' && a.status === 'PULL')) intents.push('HOOK');
    if (onHit.some((a) => a.action === 'STATUS' && a.status === 'KNOCKBACK')) intents.push('PEEL');
    for (const i of existing?.intents ?? []) if (!DERIVED_INTENTS.has(i)) intents.push(i);

    return {
        onCast: onCast.length ? onCast : undefined,
        onImpact: onImpact.length ? onImpact : undefined,
        onHit: onHit.length ? onHit : undefined,
        onEnd: onEnd.length ? onEnd : undefined,
        intents: intents.length ? intents : undefined,
    };
}
