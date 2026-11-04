import type { SegmentedOption } from '../../../components/ui/primitives';
import type { SelectOption } from '../../../components/ui/primitives';
import { Role } from '../../../types';
import { VFX_REGISTRY } from '../../vfx/VFXRegistry';
import { PROJECTILE_VISUALS } from '../../vfx/projectile_visuals';

export const ROLE_LABELS: Record<Role, string> = {
    [Role.TANK]: '坦克',
    [Role.WARRIOR]: '戰士',
    [Role.RANGER]: '遊俠',
    [Role.MAGE]: '法師',
    [Role.SUPPORT]: '輔助',
};

export const TAG_LABELS: Record<string, string> = {
    ULT: '奧義',
    ACTIVE: '戰術',
    MOBILITY: '機動',
    BASIC: '普攻',
};

export const SKILL_DB_TYPE_OPTIONS: SegmentedOption[] = [
    { value: 'ALL', label: '全部' },
    { value: 'BASIC', label: '普攻' },
    { value: 'ACTIVE', label: '戰術' },
    { value: 'ULT', label: '奧義' },
    { value: 'MOBILITY', label: '機動' },
];

export const SKILL_DB_ROLE_OPTIONS: SelectOption[] = [
    { value: 'ALL', label: '全部職業' },
    { value: Role.TANK, label: '坦克' },
    { value: Role.WARRIOR, label: '戰士' },
    { value: Role.RANGER, label: '遊俠' },
    { value: Role.MAGE, label: '法師' },
    { value: Role.SUPPORT, label: '輔助' },
];

export const LOG_CATEGORY_OPTIONS: SegmentedOption[] = [
    { value: 'ALL', label: '全部' },
    { value: 'BATTLE', label: '戰鬥' },
    { value: 'SKILL', label: '技能' },
    { value: 'OTHER', label: '其他' },
];

export const LOG_SOURCE_OPTIONS: SegmentedOption[] = [
    { value: 'ALL', label: '全軍' },
    { value: 'BLUE', label: '藍軍' },
    { value: 'RED', label: '紅軍' },
];

export const VFX_TAB_OPTIONS: SegmentedOption[] = [
    { value: 'PARTS', label: '零件' },
    { value: 'REGISTRY', label: '登記特效' },
    { value: 'STATUS', label: '狀態' },
];

export const SKILL_EDIT_TAG_OPTIONS: SelectOption[] = [
    { value: 'BASIC', label: '基礎普攻' },
    { value: 'ACTIVE', label: '戰術主動' },
    { value: 'ULT', label: '奧義大絕' },
    { value: 'MOBILITY', label: '機動' },
];

export const SKILL_EDIT_TARGET_OPTIONS: SelectOption[] = [
    { value: 'SINGLE', label: '單體目標' },
    { value: 'AOE', label: '範圍傷害' },
];

export const SKILL_EDIT_ELEMENT_OPTIONS: SelectOption[] = [
    { value: 'PHYSICAL', label: '物理' },
    { value: 'FIRE', label: '火焰' },
    { value: 'ICE', label: '冰霜' },
    { value: 'LIGHTNING', label: '雷電' },
    { value: 'HOLY', label: '神聖' },
    { value: 'VOID', label: '虛空' },
    { value: 'POISON', label: '劇毒' },
    { value: 'ARCANE', label: '秘法' },
    { value: 'BLOOD', label: '鮮血' },
];

export const SKILL_EDIT_SPECIAL_VISUAL_OPTIONS: SelectOption[] = [
    { value: 'NONE', label: '正常' },
    { value: 'POLYMORPH', label: '變形' },
    { value: 'STASIS', label: '停滯' },
    { value: 'FROZEN', label: '冰凍' },
    { value: 'INVINCIBLE', label: '無敵' },
];

export const SKILL_EDIT_CC_OPTIONS: SelectOption[] = [
    { value: 'NONE', label: '無' },
    { value: 'STUN', label: '暈眩' },
    { value: 'BANISH', label: '放逐' },
    { value: 'KNOCKBACK', label: '擊退' },
    { value: 'PULL', label: '拉拽' },
    { value: 'DOT', label: '持續傷害' },
    { value: 'HOT', label: '持續治療' },
    { value: 'SILENCE', label: '沉默' },
    { value: 'ROOT', label: '禁錮定身' },
    { value: 'FEAR', label: '恐懼' },
    { value: 'TAUNT', label: '嘲諷' },
    { value: 'BLIND', label: '致盲' },
    { value: 'SHIELD', label: '護盾' },
    { value: 'POLYMORPH', label: '變羊' },
    { value: 'INVINCIBLE', label: '無敵' },
    { value: 'VULNERABLE', label: '易傷' },
    { value: 'HASTE', label: '加速' },
    { value: 'REFLECT', label: '反傷' },
    { value: 'LIFESTEAL', label: '吸血' },
    { value: 'SLOW', label: '緩速' },
];

export const SKILL_EDIT_EFFECT_OPTIONS: SelectOption[] = [
    { value: 'NONE', label: '無' },
    { value: 'VAMP', label: '生命吸取' },
    { value: 'MANA_BURN', label: '法力燃燒' },
    { value: 'EXECUTE', label: '殘血斬殺' },
    { value: 'MANA_RESTORE', label: '法力回復' },
    { value: 'DASH', label: '位移突進' },
    { value: 'SELF_DAMAGE', label: '自殘反噬' },
];

export const SKILL_EDIT_BOOL_OPTIONS: SelectOption[] = [
    { value: 'false', label: '否' },
    { value: 'true', label: '是' },
];

export const SKILL_EDIT_VISUAL_OPTIONS: SelectOption[] = [
    { value: 'NONE', label: '無' },
    { value: 'SLASH', label: '斬擊' },
    { value: 'ARROW', label: '箭矢' },
    { value: 'FIREBALL', label: '火球' },
    { value: 'BOLT', label: '箭彈' },
    { value: 'BEAM', label: '光束' },
    { value: 'BOMB', label: '炸彈' },
    { value: 'SMASH', label: '重擊' },
];

export const SKILL_EDIT_HIT_OPTIONS: SelectOption[] = [
    { value: 'NONE', label: '無' },
    ...Object.keys(VFX_REGISTRY).sort().map((k) => ({ value: k, label: k })),
];

export const SKILL_EDIT_PROJECTILE_OPTIONS: SelectOption[] = [
    { value: 'NONE', label: '無' },
    ...Object.keys(PROJECTILE_VISUALS).sort().map((k) => ({ value: k, label: k })),
];

export const SKILL_EDIT_HAZARD_OPTIONS: SelectOption[] = [
    { value: 'NONE', label: '無' },
    { value: 'POISON', label: '劇毒' },
    { value: 'FIRE', label: '火焰' },
    { value: 'ICE', label: '冰霜' },
    { value: 'GRAVITY', label: '重力' },
];

export const SKILL_EDIT_TEAM_OPTIONS: SelectOption[] = [
    { value: 'ANY', label: '任意陣營' },
    { value: 'BLUE', label: '帝國' },
    { value: 'RED', label: '誓約' },
];
