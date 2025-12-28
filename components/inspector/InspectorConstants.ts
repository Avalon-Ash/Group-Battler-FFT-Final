
import { Role, Skill, Team, AnimState } from '../../types';
import { VFX_REGISTRY } from '../../data/vfx/VFXRegistry';

// =========================================================================================
// [SYSTEM DEPENDENCIES & CONSTANTS]
// Version: 7.1.1 (Precision Patch)
// =========================================================================================

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
    'ULT':    { label: '奧義', color: 'text-purple-400' },
    'ACTIVE': { label: '主動', color: 'text-cyan-400' },
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
// 2. SKILL & COMBAT CONSTANTS
// =========================================================================================

export const VISUAL_TYPES = [
    { value: 'ARROW', label: '箭矢 (Arrow)', icon: '🏹' },
    { value: 'FIREBALL', label: '火球 (Fireball)', icon: '🔥' },
    { value: 'BOLT', label: '飛彈 (Bolt)', icon: '⚡' },
    { value: 'SLASH', label: '斬擊 (Slash)', icon: '⚔️' },
    { value: 'SMASH', label: '重擊 (Smash)', icon: '🔨' },
    { value: 'BEAM', label: '光束 (Beam)', icon: '✨' },
    { value: 'BOMB', label: '爆彈 (Bomb)', icon: '💣' },
    // NEW VISUALS V7.0
    { value: 'CRYSTAL', label: '冰晶 (Crystal)', icon: '❄️' },
    { value: 'HEX_DART', label: '科技鏢 (Hex Dart)', icon: '💠' },
    { value: 'AXE', label: '飛斧 (Axe)', icon: '🪓' },
    { value: 'ORB', label: '奧術球 (Orb)', icon: '🔮' }
];

export const VFX_HIT_EFFECTS = Object.keys(VFX_REGISTRY).map(key => ({
    value: key,
    label: `${key}`
}));

export const CC_TYPES = [
    { value: 'NONE', label: '無', color: '#94a3b8' },
    // Hard CC
    { value: 'STUN', label: '暈眩 (Stun)', color: '#facc15' },
    { value: 'BANISH', label: '放逐 (Banish)', color: '#c084fc' },
    { value: 'FEAR', label: '恐懼 (Fear)', color: '#a855f7' },
    { value: 'TAUNT', label: '嘲諷 (Taunt)', color: '#ef4444' },
    // Soft CC
    { value: 'ROOT', label: '禁錮 (Root)', color: '#fbbf24' },
    { value: 'SILENCE', label: '沉默 (Silence)', color: '#94a3b8' },
    { value: 'BLIND', label: '致盲 (Blind)', color: '#cbd5e1' },
    // Physics
    { value: 'KNOCKBACK', label: '擊退 (Knockback)', color: '#fff' },
    { value: 'PULL', label: '牽引 (Pull)', color: '#fff' },
    // Buffs/Debuffs
    { value: 'SHIELD', label: '護盾 (Shield)', color: '#bae6fd' },
    { value: 'DOT', label: '持續傷 (DoT)', color: '#10b981' },
    { value: 'HOT', label: '再生 (HoT)', color: '#86efac' }
];

export const EFFECT_TYPES = [
    { value: 'NONE', label: '無', color: '#94a3b8' },
    { value: 'VAMP', label: '吸血 (Vamp)', color: '#ef4444' },
    { value: 'MANA_BURN', label: '燃魔 (Mana Burn)', color: '#3b82f6' },
    { value: 'EXECUTE', label: '斬殺 (Execute)', color: '#dc2626' },
    { value: 'MANA_RESTORE', label: '回魔 (Mana Restore)', color: '#60a5fa' }
];

export const ELEMENT_TYPES = [
    { value: 'PHYSICAL', label: '物理 (Physical)' },
    { value: 'FIRE', label: '火焰 (Fire)' },
    { value: 'ICE', label: '冰霜 (Ice)' },
    { value: 'LIGHTNING', label: '雷電 (Lightning)' },
    { value: 'HOLY', label: '神聖 (Holy)' },
    { value: 'VOID', label: '虛空 (Void)' },
    { value: 'POISON', label: '毒素 (Poison)' },
    { value: 'ARCANE', label: '奧術 (Arcane)' },
    { value: 'BLOOD', label: '鮮血 (Blood)' }
];

export const SPECIAL_STATUS_TYPES = [
    { value: 'NONE', label: '無' },
    { value: 'POLYMORPH', label: '變形 (Polymorph/Sheep)' },
    { value: 'STASIS', label: '凝滯 (Stasis/Golden)' },
    { value: 'FROZEN', label: '凍結 (Frozen)' }
];

// =========================================================================================
// 4. FIELD DEFINITIONS
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
            { key: 'id', label: 'ID (奧義需對應 UltArchitect)', type: 'text' },
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
                label: '投射物 / 模型', 
                type: 'select', 
                options: VISUAL_TYPES.map(v => ({ value: v.value, label: `${v.icon} ${v.label}` })) 
            },
            { 
                key: 'visualHitEffect', 
                label: '命中特效 (VFX Registry)', 
                type: 'select', 
                options: [{value: '', label: '預設 (Default)'}, ...VFX_HIT_EFFECTS]
            },
            { key: 'color', label: '主色調 (Hex/RGBA)', type: 'color' }, 
            { key: 'projectileSpeed', label: '彈速 (0=即時)', type: 'number', step: 50 },
            { 
                key: 'element', 
                label: '屬性 (Element)', 
                type: 'select', 
                options: ELEMENT_TYPES 
            }
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
            {
                key: 'specialVisualStatus',
                label: '特殊狀態模型',
                type: 'select',
                options: SPECIAL_STATUS_TYPES
            }
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

export const Helpers = {
    getRoleConfig: (role: Role) => ROLE_MAP[role] || { label: role, color: 'text-slate-400', border: 'border-slate-500' },
    getTeamConfig: (team: Team) => TEAM_MAP[team] || { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-800' },
    getTagLabel: (tag: string) => TAG_MAP[tag]?.label || tag,
    getCCColor: (type?: string) => CC_TYPES.find(c => c.value === type)?.color || '#fff',
    getEffectLabel: (type?: string) => EFFECT_TYPES.find(e => e.value === type)?.label || type,
    getStatusLabel: (status: string) => {
        if(status === '待機') return 'IDLE';
        if(status === '移動') return 'MOVING';
        if(status === '暈眩') return 'STUNNED';
        if(status === '放逐') return 'BANISHED';
        if(status === '沉默') return 'SILENCED';
        if(status === '死亡') return 'KIA';
        if(status === '被控') return 'DISABLED';
        if(status === '等待') return 'WAITING';
        if(status.startsWith('詠唱')) return 'CASTING';
        return status.toUpperCase();
    }
};
