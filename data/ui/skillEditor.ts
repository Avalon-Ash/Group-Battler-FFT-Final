import type { Skill } from '../../types';

/**
 * 技能資料庫編輯面板（SkillDbTab）可改的欄位：UICommandSystem 的 UPDATE_SKILL 只接受這些，
 * 表單（components/inspector/InspectorConstants.ts SKILL_FIELD_GROUPS）的欄位必須是它的子集（tests/SkillEditor.test.ts）。
 */
export const SKILL_EDITABLE_FIELDS = [
    'name', 'desc', 'tag', 'team', 'visual', 'visualHitEffect', 'visualProjectileEffect', 'specialVisualStatus', 'color',
    'projectileSpeed', 'range', 'type', 'aoeRadius',
    'power', 'cast', 'cost', 'gain', 'cd', 'element',
    'ccType', 'ccDur', 'ccForce', 'ccSelf',
    'ccType2', 'ccDur2', 'ccForce2', 'ccSelf2',
    'effectType', 'effectVal', 'effectType2', 'effectVal2',
] as const satisfies readonly (keyof Skill)[];

export type SkillEditableField = typeof SKILL_EDITABLE_FIELDS[number];

const EDITABLE: ReadonlySet<string> = new Set(SKILL_EDITABLE_FIELDS);

export function isSkillEditableField(field: string): field is SkillEditableField {
    return EDITABLE.has(field);
}
