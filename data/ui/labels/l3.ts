import { Role, Team } from '../../../types';
import type { BodyTypeId, Skill } from '../../../types';
import type { InspectorStatusKind, TeamTone } from '../../../types/ui/l3';
import { BODY_TYPE_PROFILE } from '../../units/appearance/bodyTypes';

/** L3（單位檢查器、技能配置、導演監視器）的標籤與選項清單。標題用英文全大寫，內文維持繁體中文。 */

type LabelTone = 'neutral' | 'accent' | 'danger' | 'warn' | 'success' | 'blue' | 'red';

export const TEAM_TONE: Readonly<Record<Team, TeamTone>> = {
    [Team.BLUE]: 'blue',
    [Team.RED]: 'red',
};

export const TEAM_CODE: Readonly<Record<TeamTone, string>> = {
    blue: 'BLU',
    red: 'RED',
};

export const INSPECTOR_TABS: { value: string; label: string; title: string }[] = [
    { value: 'STATUS', label: 'STATUS', title: '狀態監控' },
    { value: 'SKILLS', label: 'SKILLS', title: '技能配置 (LINK)' },
];

export const INSPECTOR_STATUS_TAG: Readonly<Record<InspectorStatusKind, { label: string; tone: LabelTone }>> = {
    STUN: { label: '暈眩', tone: 'warn' },
    SILENCE: { label: '沉默', tone: 'neutral' },
};

export const ROLE_OPTIONS: { value: Role; label: string }[] = Object.values(Role).map((role) => ({ value: role, label: role }));

export const BODY_TYPE_OPTIONS: { value: BodyTypeId; label: string }[] = (Object.keys(BODY_TYPE_PROFILE) as BodyTypeId[])
    .filter((id) => BODY_TYPE_PROFILE[id].enabled)
    .map((id) => ({ value: id, label: BODY_TYPE_PROFILE[id].label }));

export const INSPECTOR_TEXT = {
    noSelectionTitle: '請先選取單位',
    noSelectionHint: '在戰場中點選任意單位以檢視詳情',
    deadTitle: '單位已陣亡',
    deadHint: '請先選取單位以檢視詳情',
    editToggle: '編輯單位屬性',
    openBehaviorTree: '開啟行為樹',
    role: '職業',
    bodyType: '體型',
    hp: '生命值',
    mp: '能量值',
    maxHp: '最大生命值',
    maxMp: '最大能量值',
    coordinate: '目前座標',
    shield: '護盾值',
    aiHeading: 'AI STATE',
    skillHeading: 'SKILL LINKAGE',
    skillSlot: '技能槽',
} as const;

/** 技能槽順序：skillIds 的索引 0..3 依序對應這四種 tag。 */
export const SKILL_SLOT_TAGS: readonly Skill['tag'][] = ['ULT', 'ACTIVE', 'BASIC', 'MOBILITY'];

export const SKILL_TAG_TONE: Readonly<Record<Skill['tag'], LabelTone>> = {
    ULT: 'warn',
    ACTIVE: 'accent',
    BASIC: 'neutral',
    MOBILITY: 'neutral',
};

/** 技能選單的職業分組順序。 */
export const SKILL_ROLE_ORDER: readonly Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

/** 隊伍專屬技能在選單中的後綴。 */
export const SKILL_TEAM_SUFFIX: Readonly<Record<Team, string>> = {
    [Team.BLUE]: '（藍軍）',
    [Team.RED]: '（紅軍）',
};

export const SKILL_UNASSIGNED_LABEL = '未配置技能';

export const SKILL_STAT_FIELDS: readonly { key: 'power' | 'cd' | 'cost' | 'range'; label: string; suffix: string }[] = [
    { key: 'power', label: '威力', suffix: '' },
    { key: 'cd', label: '冷卻', suffix: 's' },
    { key: 'cost', label: '消耗', suffix: '' },
    { key: 'range', label: '射程', suffix: '' },
];

export const MONITOR_TEXT = {
    heading: 'TRACKING',
    emptyTitle: '尚未鎖定目標',
    emptyHint: '鏡頭尚未聚焦任何單位，開始戰鬥後會自動追蹤',
    hp: '生命值',
    mp: '能量值',
    engageHeading: 'ENGAGE',
    target: '目標單位',
    noTarget: '無鎖定目標',
    flow: '執行流程',
} as const;
