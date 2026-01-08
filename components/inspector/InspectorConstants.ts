
import { Role, Team, AnimState } from '../../types';
import { PALETTE } from '../../constants';

export const ROLE_MAP: Record<Role, { label: string; color: string; border: string }> = {
    [Role.TANK]:    { label: 'T-01 (TANK)',    color: 'text-amber-400', border: 'border-amber-500' },
    [Role.WARRIOR]: { label: 'W-02 (WARRIOR)', color: 'text-red-400',   border: 'border-red-500' },
    [Role.RANGER]:  { label: 'R-03 (RANGER)',  color: 'text-emerald-400', border: 'border-emerald-500' },
    [Role.MAGE]:    { label: 'M-04 (MAGE)',    color: 'text-cyan-400',    border: 'border-cyan-500' },
    [Role.SUPPORT]: { label: 'S-05 (SUPPORT)', color: 'text-purple-400', border: 'border-purple-500' }
};

export const TEAM_MAP: Record<Team, { label: string; color: string; bg: string }> = {
    [Team.BLUE]: { 
        label: 'IMPERIAL_FORCE', 
        color: 'text-cyan-400', 
        bg: 'bg-cyan-900' 
    },
    [Team.RED]:  { 
        label: 'COVENANT_LEGI', 
        color: 'text-red-400',  
        bg: 'bg-red-900' 
    }
};

export const TAG_MAP: Record<string, { label: string; color: string }> = {
    'ULT':    { label: 'ULTIMATE_SEQ', color: 'text-purple-400' },
    'ACTIVE': { label: 'ACTIVE_MOD', color: 'text-cyan-400' },
    'BASIC':  { label: 'BASE_PULSE', color: 'text-slate-400' }
};

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
    '放逐結束': 'RE_LINK_INIT',
    '追蹤': 'TARGET_LOCK',
    '擠出': 'PHYS_SYNC'
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

export const CC_OPTIONS = ['NONE', 'STUN', 'BANISH', 'KNOCKBACK', 'PULL', 'DOT', 'HOT', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND', 'SHIELD', 'STASIS', 'FROZEN'];
export const EFFECT_OPTIONS = ['NONE', 'VAMP', 'MANA_BURN', 'EXECUTE', 'MANA_RESTORE'];
export const ELEMENT_OPTIONS = ['PHYSICAL', 'FIRE', 'ICE', 'LIGHTNING', 'HOLY', 'VOID', 'POISON', 'ARCANE', 'BLOOD'];
export const VISUAL_OPTIONS = ['SLASH', 'ARROW', 'FIREBALL', 'BOLT', 'BEAM', 'BOMB', 'SMASH', 'HEX_DART', 'CRYSTAL', 'ORB', 'AXE'];

export const SKILL_FIELD_GROUPS = [
  {
    name: '視覺與資源定義 (Visual SSOT)',
    fields: [
      { key: 'name', label: '序列名稱', type: 'text' },
      { key: 'tag', label: '權重標籤', type: 'select', simpleOptions: Object.keys(TAG_MAP) },
      { key: 'visual', label: '基礎外觀 (Mesh)', type: 'select', simpleOptions: VISUAL_OPTIONS },
      { key: 'visualHitEffect', label: '命中效果 (VFX_ID)', type: 'text' },
      { key: 'color', label: '核心色標 (Hex)', type: 'color' },
    ]
  },
  {
    name: '物理與空間 (Spatial)',
    fields: [
      { key: 'projectileSpeed', label: '彈道速度', type: 'number', step: 100 },
      { key: 'range', label: '極限射程', type: 'number', step: 1 },
      { key: 'type', label: '模式', type: 'select', simpleOptions: ['SINGLE', 'AOE'] },
      { key: 'aoeRadius', label: '影響半徑', type: 'number', step: 0.5 },
    ]
  },
  {
    name: '戰術參數 (Combat)',
    fields: [
      { key: 'power', label: '威力指數', type: 'number' },
      { key: 'cost', label: '能量消耗', type: 'number' },
      { key: 'cd', label: '冷卻時長', type: 'number', step: 0.1 },
      { key: 'element', label: '元素屬性', type: 'select', simpleOptions: ELEMENT_OPTIONS },
    ]
  },
  {
    name: '狀態序列 (CC / Effects)',
    fields: [
      { key: 'ccType', label: '主控類型', type: 'select', simpleOptions: CC_OPTIONS },
      { key: 'ccDur', label: '持續時間', type: 'number', step: 0.1 },
      { key: 'ccForce', label: '力度參數', type: 'number' },
      { key: 'effectType', label: '次要效果', type: 'select', simpleOptions: EFFECT_OPTIONS },
    ]
  }
];

export const Helpers = {
    getRoleConfig: (role: Role) => ROLE_MAP[role] || { label: role, color: 'text-slate-400', border: 'border-slate-500' },
    getTeamConfig: (team: Team) => TEAM_MAP[team] || { label: 'UNKNOWN_SIGNAL', color: 'text-slate-400', bg: 'bg-slate-800' },
    getTagLabel: (tag: string) => TAG_MAP[tag]?.label || 'UNDEFINED_TAG',
    getStatusLabel: (status: string) => {
        if (!status) return 'IDLE_SCAN';
        const base = status.split(' ')[0];
        if (BT_STATUS_MAP[status]) return BT_STATUS_MAP[status];
        if (BT_STATUS_MAP[base]) {
            const sub = status.split(' ')[1] || '';
            return `${BT_STATUS_MAP[base]}${sub ? '_' + sub.toUpperCase() : ''}`;
        }
        return status.replace(/\s+/g, '_').toUpperCase();
    }
};