import { Skill, Team } from '../../types';
import { COMBAT_PARAM } from '../../constants';
import { VFX_REGISTRY } from '../vfx/VFXRegistry';
import { PROJECTILE_VISUALS } from '../vfx/projectile_visuals';

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

// =========================================================================
// 共用 Enum 選項（純資料來源，受 types.ts 型別約束）
// =========================================================================
export const SKILL_TAG_OPTIONS = ['BASIC', 'ACTIVE', 'ULT'] as const satisfies readonly Skill['tag'][];
export const SKILL_TYPE_OPTIONS = ['SINGLE', 'AOE'] as const satisfies readonly Skill['type'][];
export const SKILL_VISUAL_OPTIONS = ['SLASH', 'ARROW', 'FIREBALL', 'BOLT', 'BEAM', 'BOMB', 'SMASH'] as const satisfies readonly NonNullable<Skill['visual']>[];
export const SKILL_ELEMENT_OPTIONS = ['PHYSICAL', 'FIRE', 'ICE', 'LIGHTNING', 'HOLY', 'VOID', 'POISON', 'ARCANE', 'BLOOD'] as const satisfies readonly NonNullable<Skill['element']>[];
export const SKILL_SPECIAL_VISUAL_STATUS_OPTIONS = ['POLYMORPH', 'STASIS', 'FROZEN', 'INVINCIBLE'] as const satisfies readonly NonNullable<Skill['specialVisualStatus']>[];
export const SKILL_CC_TYPE_OPTIONS = [
    'STUN', 'BANISH', 'KNOCKBACK', 'PULL', 'DOT', 'HOT', 'SILENCE', 'ROOT', 'FEAR',
    'TAUNT', 'BLIND', 'SHIELD', 'POLYMORPH', 'INVINCIBLE', 'VULNERABLE', 'HASTE', 'REFLECT', 'LIFESTEAL'
] as const satisfies readonly NonNullable<Skill['ccType']>[];
export const SKILL_EFFECT_TYPE_OPTIONS = [
    'VAMP', 'MANA_BURN', 'EXECUTE', 'MANA_RESTORE', 'DASH', 'SELF_DAMAGE'
] as const satisfies readonly NonNullable<Skill['effectType']>[];

const TAG_SET = new Set<string>(SKILL_TAG_OPTIONS);
const TYPE_SET = new Set<string>(SKILL_TYPE_OPTIONS);
const VISUAL_SET = new Set<string>(SKILL_VISUAL_OPTIONS);
const ELEMENT_SET = new Set<string>(SKILL_ELEMENT_OPTIONS);
const SPECIAL_VISUAL_SET = new Set<string>(SKILL_SPECIAL_VISUAL_STATUS_OPTIONS);
const CC_TYPE_SET = new Set<string>(SKILL_CC_TYPE_OPTIONS);
const EFFECT_TYPE_SET = new Set<string>(SKILL_EFFECT_TYPE_OPTIONS);

function isVfxRegistryOwnKey(val: unknown): boolean {
    return typeof val === 'string' && val.length > 0 && Object.prototype.hasOwnProperty.call(VFX_REGISTRY, val);
}

function isProjectileVisualsOwnKey(val: unknown): boolean {
    return typeof val === 'string' && val.length > 0 && Object.prototype.hasOwnProperty.call(PROJECTILE_VISUALS, val);
}

function isNonNegativeFiniteNumber(val: unknown): boolean {
    return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

function isFiniteNumber(val: unknown): boolean {
    return typeof val === 'number' && Number.isFinite(val);
}

// =========================================================================
// 逐欄驗證規則表（型別完整性檢查，覆蓋全部 SkillEditableField）
// =========================================================================
interface SkillFieldRule {
    required: boolean;
    validate: (val: unknown) => boolean;
}

const SKILL_FIELD_RULES: Record<SkillEditableField, SkillFieldRule> = {
    // 1. 必填、非負有限數值（>= 0，可小數）
    range: { required: true, validate: isNonNegativeFiniteNumber },
    cast: { required: true, validate: isNonNegativeFiniteNumber },
    cd: { required: true, validate: isNonNegativeFiniteNumber },
    cost: { required: true, validate: isNonNegativeFiniteNumber },
    gain: { required: true, validate: isNonNegativeFiniteNumber },

    // 2. 選填、非負有限數值（undefined 或 >= 0；0 合法）
    aoeRadius: { required: false, validate: (v) => v === undefined || isNonNegativeFiniteNumber(v) },
    projectileSpeed: { required: false, validate: (v) => v === undefined || isNonNegativeFiniteNumber(v) },
    ccDur: { required: false, validate: (v) => v === undefined || isNonNegativeFiniteNumber(v) },
    ccDur2: { required: false, validate: (v) => v === undefined || isNonNegativeFiniteNumber(v) },

    // 3. 必填有限數值（可負、零、正，負值為合法治療）
    power: { required: true, validate: isFiniteNumber },

    // 4. 選填有限數值（undefined 或有限數值，可負）
    ccForce: { required: false, validate: (v) => v === undefined || isFiniteNumber(v) },
    ccForce2: { required: false, validate: (v) => v === undefined || isFiniteNumber(v) },
    effectVal: { required: false, validate: (v) => v === undefined || isFiniteNumber(v) },
    effectVal2: { required: false, validate: (v) => v === undefined || isFiniteNumber(v) },

    // 5. 選填布林值（undefined 或真正 boolean，拒絕字串與數字）
    ccSelf: { required: false, validate: (v) => v === undefined || typeof v === 'boolean' },
    ccSelf2: { required: false, validate: (v) => v === undefined || typeof v === 'boolean' },

    // 6. 必填字串（本輪僅驗型別）
    name: { required: true, validate: (v) => typeof v === 'string' },
    color: { required: true, validate: (v) => typeof v === 'string' },

    // 7. 選填字串
    desc: { required: false, validate: (v) => v === undefined || typeof v === 'string' },

    // 8. 必填精確 enum
    tag: { required: true, validate: (v) => typeof v === 'string' && TAG_SET.has(v) },
    type: { required: true, validate: (v) => typeof v === 'string' && TYPE_SET.has(v) },

    // 9. 選填 enum（undefined 或合法值；team 為 Team enum 真值）
    team: { required: false, validate: (v) => v === undefined || v === Team.BLUE || v === Team.RED },
    visual: { required: false, validate: (v) => v === undefined || (typeof v === 'string' && VISUAL_SET.has(v)) },
    element: { required: false, validate: (v) => v === undefined || (typeof v === 'string' && ELEMENT_SET.has(v)) },
    specialVisualStatus: { required: false, validate: (v) => v === undefined || (typeof v === 'string' && SPECIAL_VISUAL_SET.has(v)) },
    ccType: { required: false, validate: (v) => v === undefined || (typeof v === 'string' && CC_TYPE_SET.has(v)) },
    ccType2: { required: false, validate: (v) => v === undefined || (typeof v === 'string' && CC_TYPE_SET.has(v)) },
    effectType: { required: false, validate: (v) => v === undefined || (typeof v === 'string' && EFFECT_TYPE_SET.has(v)) },
    effectType2: { required: false, validate: (v) => v === undefined || (typeof v === 'string' && EFFECT_TYPE_SET.has(v)) },

    // 10. 選填 VFX own key（拒絕空字串、未知鍵、繼承屬性鍵）
    visualHitEffect: { required: false, validate: (v) => v === undefined || isVfxRegistryOwnKey(v) },
    visualProjectileEffect: { required: false, validate: (v) => v === undefined || isProjectileVisualsOwnKey(v) },
} satisfies Record<SkillEditableField, SkillFieldRule>;

/**
 * 檢查給定欄位值是否符合規則（UI 與 UICommandSystem 共用）
 */
export function validateSkillFieldValue(field: SkillEditableField, value: unknown): boolean {
    const rule = SKILL_FIELD_RULES[field];
    if (!rule) return false;
    return rule.validate(value);
}

/**
 * 奧義詠唱下限：ULT 的 cast 低於 COMBAT_PARAM.ULT_MIN_CAST_SEC 時提高到下限，其他 tag 原樣。
 * 預設資料已滿足（tests/UltCastTiming.test.ts），編輯入口經 buildSkillUpdate 套用同一規則。
 */
export function normalizeSkillCast(tag: Skill['tag'], cast: number): number {
    return tag === 'ULT' && cast < COMBAT_PARAM.ULT_MIN_CAST_SEC ? COMBAT_PARAM.ULT_MIN_CAST_SEC : cast;
}

/**
 * UPDATE_SKILL 的候選更新：先驗證單一欄位，再以「套用後的完整技能」檢查詠唱下限
 * （改 cast，或把 tag 改成 ULT，都會把不足的 cast 正規化）。不合法回傳 null，不污染資料。
 */
export function buildSkillUpdate(skill: Skill, field: SkillEditableField, value: unknown): Partial<Record<keyof Skill, unknown>> | null {
    if (!validateSkillFieldValue(field, value)) return null;
    const patch: Partial<Record<keyof Skill, unknown>> = { [field]: value };
    // value 已通過該欄位的規則（tag 在 SKILL_TAG_OPTIONS 內、cast 為非負有限數），這裡只是收窄型別
    const tag = (field === 'tag' ? value : skill.tag) as Skill['tag'];
    const cast = (field === 'cast' ? value : skill.cast) as number;
    const normalized = normalizeSkillCast(tag, cast);
    if (normalized !== cast) patch.cast = normalized;
    return patch;
}

/**
 * 判定欄位是否為選填（選填在草稿為空時提交 undefined；必填在草稿為空時失焦還原）
 */
export function isSkillFieldOptional(field: SkillEditableField): boolean {
    return !SKILL_FIELD_RULES[field]?.required;
}
