import { Role, Team, AnimState } from '../../types';

export const ROLE_MAP: Record<Role, { label: string; color: string; border: string }> = {
    [Role.TANK]:    { label: '坦克 (Tank)',    color: 'text-amber-400', border: 'border-amber-500' },
    [Role.WARRIOR]: { label: '戰士 (Warrior)', color: 'text-red-400',   border: 'border-red-500' },
    [Role.RANGER]:  { label: '遊俠 (Ranger)',  color: 'text-emerald-400', border: 'border-emerald-500' },
    [Role.MAGE]:    { label: '法師 (Mage)',    color: 'text-cyan-400',    border: 'border-cyan-500' },
    [Role.SUPPORT]: { label: '輔助 (Support)', color: 'text-purple-400', border: 'border-purple-500' }
};

export const TEAM_MAP: Record<Team, { label: string; color: string; bg: string }> = {
    [Team.BLUE]: { label: '藍軍 (Imperial)', color: 'text-cyan-400', bg: 'bg-cyan-900' },
    [Team.RED]:  { label: '紅軍 (Covenant)', color: 'text-red-400',  bg: 'bg-red-900' }
};

export const TAG_MAP: Record<string, { label: string; color: string }> = {
    'ULT':    { label: '奧義序列', color: 'text-purple-400' },
    'ACTIVE': { label: '主動技能', color: 'text-cyan-400' },
    'BASIC':  { label: '基本打擊', color: 'text-slate-400' }
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

export const SKILL_FIELD_GROUPS = [
    {
        name: '數據序列定義 (VFX Sequence)',
        fields: [
            { key: 'name', label: '序列名稱', type: 'text' },
            { key: 'id', label: '序列 ID', type: 'text' },
            { key: 'tag', label: '執行權重', type: 'select', simpleOptions: Object.keys(TAG_MAP) },
            { key: 'visual', label: '基礎外觀', type: 'select', simpleOptions: ['SLASH', 'ARROW', 'FIREBALL', 'BOLT', 'BEAM', 'BOMB', 'SMASH'] },
            { key: 'color', label: '核心色標', type: 'color' },
        ]
    },
    {
        name: '彈道與範圍 (Ballistics / AOE)',
        fields: [
            { key: 'projectileSpeed', label: '彈道速度 (0=瞬發)', type: 'number', step: 100 },
            { key: 'range', label: '極限射程', type: 'number', step: 1 },
            { key: 'type', label: '影響模式', type: 'select', simpleOptions: ['SINGLE', 'AOE'] },
            { key: 'aoeRadius', label: '爆炸半徑 (Hex)', type: 'number', step: 0.5 },
        ]
    },
    {
        name: '邏輯參數 (Combat Logic)',
        fields: [
            { key: 'power', label: '威力 (負值為治療)', type: 'number' },
            { key: 'cost', label: '魔力消耗', type: 'number' },
            { key: 'cd', label: '冷卻時間 (s)', type: 'number', step: 0.1 },
            { key: 'element', label: '元素屬性', type: 'select', simpleOptions: ['PHYSICAL', 'FIRE', 'ICE', 'LIGHTNING', 'HOLY', 'VOID', 'POISON', 'ARCANE', 'BLOOD'] },
        ]
    }
];

export const Helpers = {
    getRoleConfig: (role: Role) => ROLE_MAP[role] || { label: role, color: 'text-slate-400', border: 'border-slate-500' },
    getTeamConfig: (team: Team) => TEAM_MAP[team] || { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-800' },
    getTagLabel: (tag: string) => TAG_MAP[tag]?.label || tag,
    getStatusLabel: (status: string) => status.toUpperCase()
};