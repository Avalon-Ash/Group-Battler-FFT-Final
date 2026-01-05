import { Role, Team, AnimState } from '../../types';

export const ROLE_MAP: Record<Role, { label: string; color: string; border: string }> = {
    [Role.TANK]:    { label: 'T-01 (TANK)',    color: 'text-amber-400', border: 'border-amber-500' },
    [Role.WARRIOR]: { label: 'W-02 (WARRIOR)', color: 'text-red-400',   border: 'border-red-500' },
    [Role.RANGER]:  { label: 'R-03 (RANGER)',  color: 'text-emerald-400', border: 'border-emerald-500' },
    [Role.MAGE]:    { label: 'M-04 (MAGE)',    color: 'text-cyan-400',    border: 'border-cyan-500' },
    [Role.SUPPORT]: { label: 'S-05 (SUPPORT)', color: 'text-purple-400', border: 'border-purple-500' }
};

export const TEAM_MAP: Record<Team, { label: string; color: string; bg: string }> = {
    [Team.BLUE]: { label: 'IMPERIAL_FORCE', color: 'text-cyan-400', bg: 'bg-cyan-900' },
    [Team.RED]:  { label: 'COVENANT_LEGI', color: 'text-red-400',  bg: 'bg-red-900' }
};

export const TAG_MAP: Record<string, { label: string; color: string }> = {
    'ULT':    { label: 'ULTIMATE_SEQ', color: 'text-purple-400' },
    'ACTIVE': { label: 'ACTIVE_MOD', color: 'text-cyan-400' },
    'BASIC':  { label: 'BASE_PULSE', color: 'text-slate-400' }
};

// 用於翻譯內部中文狀態至監測面板的 OS 規格字符
export const BT_STATUS_MAP: Record<string, string> = {
    '待機': 'IDLE_SCAN',
    '待機中': 'IDLE_SCAN',
    '等待': 'WAIT_SIGNAL',
    '被控': 'SIGNAL_INTERRUPTED',
    '死亡': 'UNIT_TERMINATED',
    '詠唱 ULT': 'EXEC_ULT_SEQ',
    '詠唱 ACTIVE': 'EXEC_ACT_MOD',
    '詠唱 BASIC': 'EXEC_BASE_ATK',
    '中斷': 'CORE_FAILURE',
    '放逐結束': 'RE_LINK_INIT'
};

export const ANIM_STATUS_MAP: Record<string, string> = {
    [AnimState.IDLE]: 'STANDBY',
    [AnimState.COMBAT_IDLE]: 'READY',
    [AnimState.MOVE]: 'TRANSIT',
    [AnimState.ATTACK]: 'SEQUENCING',
    [AnimState.HIT]: 'REACTION',
    [AnimState.STUN]: 'DISRUPTED',
    [AnimState.DEAD]: 'TERMINATED'
};

const CC_OPTIONS = ['NONE', 'STUN', 'BANISH', 'KNOCKBACK', 'PULL', 'DOT', 'HOT', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND', 'SHIELD'];
const EFFECT_OPTIONS = ['NONE', 'VAMP', 'MANA_BURN', 'EXECUTE', 'MANA_RESTORE'];

export const SKILL_FIELD_GROUPS = [
    {
        name: '數據序列定義 (Core Sequence)',
        fields: [
            { key: 'name', label: '序列名稱', type: 'text' },
            { key: 'id', label: '序列 ID', type: 'text' },
            { key: 'tag', label: '執行權重', type: 'select', simpleOptions: Object.keys(TAG_MAP) },
            { key: 'visual', label: '基礎外觀', type: 'select', simpleOptions: ['SLASH', 'ARROW', 'FIREBALL', 'BOLT', 'BEAM', 'BOMB', 'SMASH'] },
            { key: 'color', label: '核心色標', type: 'color' },
        ]
    },
    {
        name: '物理與空間參數 (Ballistics / AOE)',
        fields: [
            { key: 'projectileSpeed', label: '彈道速度', type: 'number', step: 100 },
            { key: 'range', label: '極限射程', type: 'number', step: 1 },
            { key: 'type', label: '影響模式', type: 'select', simpleOptions: ['SINGLE', 'AOE'] },
            { key: 'aoeRadius', label: '影響半徑', type: 'number', step: 0.5 },
        ]
    },
    {
        name: '戰術邏輯 (Combat Logic)',
        fields: [
            { key: 'power', label: '核心威力', type: 'number' },
            { key: 'cost', label: '能量消耗', type: 'number' },
            { key: 'cd', label: '循環冷卻', type: 'number', step: 0.1 },
            { key: 'element', label: '元素屬性', type: 'select', simpleOptions: ['PHYSICAL', 'FIRE', 'ICE', 'LIGHTNING', 'HOLY', 'VOID', 'POISON', 'ARCANE', 'BLOOD'] },
        ]
    },
    {
        name: '控場與效果序列 (CC / Effects)',
        fields: [
            { key: 'ccType', label: '主控場類型', type: 'select', simpleOptions: CC_OPTIONS },
            { key: 'ccDur', label: '控場時長', type: 'number', step: 0.1 },
            { key: 'ccForce', label: '位移力度/數值', type: 'number' },
            { key: 'effectType', label: '次要效果', type: 'select', simpleOptions: EFFECT_OPTIONS },
            { key: 'effectVal', label: '效果係數', type: 'number', step: 0.1 },
        ]
    }
];

export const Helpers = {
    getRoleConfig: (role: Role) => ROLE_MAP[role] || { label: role, color: 'text-slate-400', border: 'border-slate-500' },
    getTeamConfig: (team: Team) => TEAM_MAP[team] || { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-800' },
    getTagLabel: (tag: string) => TAG_MAP[tag]?.label || tag,
    getStatusLabel: (status: string) => {
        if (status.startsWith('追蹤')) return 'TARGET_INTCP';
        if (status.startsWith('截擊')) return 'INTERCEPT_PROC';
        if (status.startsWith('詠唱')) {
            const tag = status.split(' ')[1];
            return BT_STATUS_MAP[`詠唱 ${tag}`] || 'EXEC_SEQ';
        }
        return BT_STATUS_MAP[status] || status.toUpperCase();
    }
};