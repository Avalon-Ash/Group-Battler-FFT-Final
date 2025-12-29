
import { Role, Skill, Team, AnimState } from '../../types';
import { VFX_REGISTRY } from '../../data/vfx/VFXRegistry';

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

export const VISUAL_TYPES = [
    { value: 'SEQUENCE', label: '動作序列 (v9.0)', icon: '🎬' },
    { value: 'BEAM', label: '光束投影', icon: '✨' },
    { value: 'BOMB', label: '重型爆彈', icon: '💣' },
    { value: 'SLASH', label: '近身斬擊', icon: '⚔️' }
];

export const SKILL_FIELD_GROUPS = [
    {
        name: '數據序列定義 (VFX Sequence)',
        fields: [
            { key: 'name', label: '序列名稱', type: 'text' },
            { key: 'id', label: '序列 ID (對應 SKILL_SEQUENCES)', type: 'text' },
            { key: 'tag', label: '執行權重', type: 'select', simpleOptions: Object.keys(TAG_MAP) },
            { key: 'desc', label: '演出描述', type: 'textarea' },
        ]
    },
    {
        name: '邏輯參數 (Combat Logic)',
        fields: [
            { key: 'power', label: '威力/補量', type: 'number' },
            { key: 'cost', label: '魔力消耗', type: 'number' },
            { key: 'cd', label: '冷卻 (秒)', type: 'number', step: 0.1 },
            { key: 'range', label: '射程', type: 'number' },
            { key: 'type', label: '影響目標', type: 'select', simpleOptions: ['SINGLE', 'AOE'] },
        ]
    }
];

export const Helpers = {
    getRoleConfig: (role: Role) => ROLE_MAP[role] || { label: role, color: 'text-slate-400', border: 'border-slate-500' },
    getTeamConfig: (team: Team) => TEAM_MAP[team] || { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-800' },
    getTagLabel: (tag: string) => TAG_MAP[tag]?.label || tag,
    getStatusLabel: (status: string) => status.toUpperCase()
};
