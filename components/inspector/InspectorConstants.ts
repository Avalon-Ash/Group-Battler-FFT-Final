
import { Role, Skill, Team, ToolType, AnimState } from '../../types';
import { SCENE_DB } from '../../data/scenes';
import { OBSTACLE_DB } from '../../data/obstacles';

// =========================================================================================
// 1. CORE ENUM MAPPINGS (Visual & Labels)
// =========================================================================================

export const ROLE_MAP: Record<Role, { label: string; icon: string; color: string; border: string }> = {
    [Role.TANK]:    { label: '坦克', icon: '🛡️', color: 'text-amber-400', border: 'border-amber-500' },
    [Role.WARRIOR]: { label: '戰士', icon: '⚔️', color: 'text-red-400', border: 'border-red-500' },
    [Role.RANGER]:  { label: '遊俠', icon: '🏹', color: 'text-emerald-400', border: 'border-emerald-500' },
    [Role.MAGE]:    { label: '法師', icon: '🔮', color: 'text-blue-400', border: 'border-blue-500' },
    [Role.SUPPORT]: { label: '輔助', icon: '⚕️', color: 'text-cyan-400', border: 'border-cyan-500' }
};

export const TEAM_MAP: Record<Team, { label: string; color: string; bg: string }> = {
    [Team.BLUE]: { label: '藍軍 (Alliance)', color: 'text-blue-400', bg: 'bg-blue-900' },
    [Team.RED]:  { label: '紅軍 (Horde)',    color: 'text-red-400',  bg: 'bg-red-900' }
};

export const TAG_MAP: Record<string, { label: string; color: string }> = {
    'ULT':    { label: '奧義', color: 'text-purple-400' },
    'ACTIVE': { label: '主動', color: 'text-blue-400' },
    'BASIC':  { label: '普攻', color: 'text-slate-400' }
};

export const ANIM_STATUS_MAP: Record<string, string> = {
    [AnimState.IDLE]: 'IDLE',
    [AnimState.COMBAT_IDLE]: 'COMBAT',
    [AnimState.MOVE]: 'MOVING',
    [AnimState.ATTACK]: 'ATTACKING',
    [AnimState.HIT]: 'HIT',
    [AnimState.STUN]: 'STUNNED',
    [AnimState.DEAD]: 'DEAD'
};

// =========================================================================================
// 2. SKILL & COMBAT CONSTANTS (Effects & Visuals)
// =========================================================================================

export const VISUAL_TYPES = [
    { value: 'ARROW', label: '箭矢 (Arrow)', icon: '🏹' },
    { value: 'FIREBALL', label: '火球 (Fireball)', icon: '🔥' },
    { value: 'BOLT', label: '飛彈 (Bolt)', icon: '⚡' },
    { value: 'SLASH', label: '斬擊 (Slash)', icon: '⚔️' },
    { value: 'SMASH', label: '重擊 (Smash)', icon: '🔨' },
    { value: 'BEAM', label: '光束 (Beam)', icon: '✨' },
    { value: 'BOMB', label: '爆彈 (Bomb)', icon: '💣' }
];

export const CC_TYPES = [
    { value: 'NONE', label: '無', color: '#94a3b8' },
    { value: 'STUN', label: '暈眩 (Stun)', color: '#facc15' },
    { value: 'BANISH', label: '放逐 (Banish)', color: '#c084fc' },
    { value: 'KNOCKBACK', label: '擊退 (Knockback)', color: '#fff' },
    { value: 'PULL', label: '牽引 (Pull)', color: '#fff' },
    { value: 'DOT', label: '持續傷 (DoT)', color: '#10b981' },
    { value: 'HOT', label: '再生 (HoT)', color: '#86efac' },
    { value: 'SILENCE', label: '沉默 (Silence)', color: '#94a3b8' }
];

export const EFFECT_TYPES = [
    { value: 'NONE', label: '無', color: '#94a3b8' },
    { value: 'VAMP', label: '吸血 (Vamp)', color: '#ef4444' },
    { value: 'MANA_BURN', label: '燃魔 (Mana Burn)', color: '#3b82f6' },
    { value: 'EXECUTE', label: '斬殺 (Execute)', color: '#dc2626' },
    { value: 'MANA_RESTORE', label: '回魔 (Mana Restore)', color: '#60a5fa' }
];

// =========================================================================================
// 3. ENVIRONMENT & TOOLS
// =========================================================================================

export const SCENE_OPTIONS = SCENE_DB.map(s => ({ 
    value: s.id, 
    label: s.name,
    color: s.fogColor 
}));

export const OBSTACLE_OPTIONS = Object.values(OBSTACLE_DB).map(o => ({
    value: o.id,
    label: o.name
}));

export const TOOL_MAP: Record<ToolType, string> = {
    [ToolType.SELECT]: '選取游標',
    [ToolType.ADD_BLUE]: '部署藍軍',
    [ToolType.ADD_RED]: '部署紅軍',
    [ToolType.OBSTACLE]: '地形編輯',
    [ToolType.DELETE]: '移除物件'
};

// =========================================================================================
// 4. FIELD DEFINITIONS (For Inspector Forms)
// =========================================================================================

export type FieldType = 'text' | 'number' | 'select' | 'textarea' | 'color';

export interface FieldDef {
    key: keyof Skill;
    label: string;
    type: FieldType;
    options?: { value: string | number; label: string }[];
    simpleOptions?: string[]; 
    step?: number;
}

export const SKILL_FIELD_GROUPS: { name: string; fields: FieldDef[] }[] = [
    {
        name: '基本資訊 (Basic)',
        fields: [
            { key: 'name', label: '技能名稱', type: 'text' },
            { key: 'id', label: 'ID', type: 'text' },
            { key: 'tag', label: '類型標籤', type: 'select', simpleOptions: Object.keys(TAG_MAP) },
            { key: 'role', label: '專屬職階', type: 'select', simpleOptions: Object.values(Role) },
            { key: 'team', label: '專屬陣營', type: 'select', simpleOptions: ['ANY', 'BLUE', 'RED'] },
            { key: 'desc', label: '技能描述', type: 'textarea' },
        ]
    },
    {
        name: '戰鬥數值 (Combat)',
        fields: [
            { key: 'power', label: '威力 (負數為治療)', type: 'number' },
            { key: 'cost', label: '魔力消耗', type: 'number' },
            { key: 'gain', label: '魔力回復', type: 'number' },
            { key: 'cd', label: '冷卻時間 (秒)', type: 'number', step: 0.1 },
            { key: 'cast', label: '詠唱時間 (秒)', type: 'number', step: 0.1 },
            { key: 'range', label: '射程 (格)', type: 'number' },
            { key: 'type', label: '目標類型', type: 'select', simpleOptions: ['SINGLE', 'AOE'] },
            { key: 'aoeRadius', label: 'AOE 半徑', type: 'number' },
        ]
    },
    {
        name: '視覺表現 (Visuals)',
        fields: [
            { 
                key: 'visual', 
                label: '特效模型', 
                type: 'select', 
                options: VISUAL_TYPES.map(v => ({ value: v.value, label: `${v.icon} ${v.label}` })) 
            },
            { key: 'color', label: '主色調 (Hex/RGBA)', type: 'color' }, 
            { key: 'projectileSpeed', label: '彈速 (0=即時)', type: 'number', step: 50 },
        ]
    },
    {
        name: '特效模組 A (Primary Effect)',
        fields: [
            { 
                key: 'ccType', 
                label: '控場類型', 
                type: 'select', 
                options: CC_TYPES.map(c => ({ value: c.value, label: c.label })) 
            },
            { key: 'ccDur', label: '持續時間', type: 'number', step: 0.5 },
            { key: 'ccForce', label: '強度/層數', type: 'number' },
            { 
                key: 'effectType', 
                label: '特殊效果', 
                type: 'select', 
                options: EFFECT_TYPES.map(e => ({ value: e.value, label: e.label })) 
            },
            { key: 'effectVal', label: '係數/數值', type: 'number', step: 0.1 },
        ]
    },
    {
        name: '特效模組 B (Secondary Effect)',
        fields: [
            { 
                key: 'ccType2', 
                label: '控場類型', 
                type: 'select', 
                options: CC_TYPES.map(c => ({ value: c.value, label: c.label })) 
            },
            { key: 'ccDur2', label: '持續時間', type: 'number', step: 0.5 },
            { key: 'ccForce2', label: '強度/層數', type: 'number' },
            { 
                key: 'effectType2', 
                label: '特殊效果', 
                type: 'select', 
                options: EFFECT_TYPES.map(e => ({ value: e.value, label: e.label })) 
            },
            { key: 'effectVal2', label: '係數/數值', type: 'number', step: 0.1 },
        ]
    }
];

// =========================================================================================
// 5. HELPER FUNCTIONS (Safe Accessors)
// =========================================================================================

export const Helpers = {
    getRoleConfig: (role: Role) => ROLE_MAP[role] || { label: role, icon: '❓', color: 'text-slate-400', border: 'border-slate-500' },
    
    getTeamConfig: (team: Team) => TEAM_MAP[team] || { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-800' },
    
    getTagLabel: (tag: string) => TAG_MAP[tag]?.label || tag,
    
    getCCColor: (type?: string) => CC_TYPES.find(c => c.value === type)?.color || '#fff',
    
    getEffectLabel: (type?: string) => EFFECT_TYPES.find(e => e.value === type)?.label || type,

    getStatusLabel: (status: string) => {
        // Mapping raw strings from game engine to friendly UI labels
        if(status === '待機') return 'IDLE';
        if(status === '移動') return 'MOVING';
        if(status === '暈眩') return 'STUNNED';
        if(status === '放逐') return 'BANISHED';
        if(status === '沉默') return 'SILENCED';
        if(status === '死亡') return 'KIA';
        if(status.startsWith('詠唱')) return 'CASTING';
        return status;
    }
};
