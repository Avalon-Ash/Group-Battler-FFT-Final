
// ╔══════════════════════════════════════════════════════════════════╗
// ║  InspectorConstants — Inspector UI 顯示常數與欄位定義             ║
// ║                                                                  ║
// ║  [VISUAL SSOT 分工]                                              ║
// ║  技能特效 (Skill VFX) ─────────────── VISUAL_OPTIONS (本檔)      ║
// ║  單位外觀 (Unit Appearance) ────────── data/units/appearance/    ║
// ║                                        └ UNIT_APPEARANCE (SSOT) ║
// ║                                          RoleAppearance 欄位：   ║
// ║                                          bodyWidth, bodyHeight,  ║
// ║                                          headRadius, primaryColor║
// ║                                          secondaryColor,         ║
// ║                                          accentColor, capeColor, ║
// ║                                          weaponType              ║
// ║                                                                  ║
// ║  修改流程：                                                       ║
// ║    調整顏色/尺寸/武器類型 → data/units/appearance/*.ts            ║
// ║    調整技能特效類型      → VISUAL_OPTIONS (本檔)                  ║
// ║    調整繪製方式/動畫     → engine/renderers/units/factions/       ║
// ║                           engine/renderers/units/painters/       ║
// ╚══════════════════════════════════════════════════════════════════╝

import { Role, Team, AnimState, AIState, ActionState } from '../../types';
import { PALETTE } from '../../constants';

// [APPEARANCE SSOT] 單位外觀唯一資料源路徑，供 Inspector UI 說明文字使用
export const UNIT_APPEARANCE_SOURCE = 'data/units/appearance/index.ts';

export const ROLE_MAP: Record<Role, { label: string; color: string; border: string }> = {
    [Role.TANK]:    { label: '坦克 (TANK)',    color: 'text-amber-400', border: 'border-amber-500' },
    [Role.WARRIOR]: { label: '戰士 (WARRIOR)', color: 'text-red-400',   border: 'border-red-500' },
    [Role.RANGER]:  { label: '遊俠 (RANGER)',  color: 'text-emerald-400', border: 'border-emerald-500' },
    [Role.MAGE]:    { label: '法師 (MAGE)',    color: 'text-cyan-400',    border: 'border-cyan-500' },
    [Role.SUPPORT]: { label: '輔助 (SUPPORT)', color: 'text-purple-400', border: 'border-purple-500' }
};

export const TEAM_MAP: Record<Team, { label: string; color: string; bg: string }> = {
    [Team.BLUE]: { 
        label: '帝國軍 (IMPERIAL)', 
        color: 'text-cyan-400', 
        bg: 'bg-cyan-900' 
    },
    [Team.RED]:  { 
        label: '誓約軍團 (COVENANT)', 
        color: 'text-red-400',  
        bg: 'bg-red-900' 
    }
};

export const TAG_MAP: Record<string, { label: string; color: string }> = {
    'ULT':    { label: '奧義大絕', color: 'text-purple-400' },
    'ACTIVE': { label: '戰術主動', color: 'text-cyan-400' },
    'BASIC':  { label: '基礎普攻', color: 'text-slate-400' }
};

export const AI_STATE_NAME_MAP: Record<AIState, string> = {
    [AIState.IDLE]: '待機掃描',
    [AIState.WAITING]: '等待信號',
    [AIState.CC_INTERRUPTED]: '受控中斷',
    [AIState.DEAD]: '單位陣亡',
    [AIState.CASTING_ULT]: '施放奧義',
    [AIState.CASTING_ACTIVE]: '施放主動技',
    [AIState.CASTING_BASIC]: '執行普攻',
    [AIState.TRACKING]: '鎖定追蹤',
    [AIState.EVADING]: '規避危險區',
    [AIState.EVADING_URGENT]: '緊急避險',
    [AIState.LAST_STAND_PUSH]: '背水一戰(推)',
    [AIState.LAST_STAND_ATTACK]: '背水一戰(攻)',
    [AIState.COMBAT_LOCK]: '交戰鎖定',
};

export const ACTION_STATE_MAP: Record<ActionState, string> = {
    [ActionState.IDLE]: '待機',
    [ActionState.WALKING]: '移動中',
    [ActionState.ATTACKING]: '攻擊中',
    [ActionState.CASTING]: '詠唱中',
    [ActionState.EVADING]: '閃避中',
    [ActionState.STUNNED]: '受控硬直',
    [ActionState.DYING]: '陣亡消散'
};

export const ANIM_STATUS_MAP: Record<string, string> = {
    [AnimState.IDLE]: '待命',
    [AnimState.COMBAT_IDLE]: '備戰',
    [AnimState.MOVE]: '位移',
    [AnimState.ATTACK]: '攻擊',
    [AnimState.HIT]: '受擊',
    [AnimState.STUN]: '硬直',
    [AnimState.DEAD]: '終止'
};

export const CC_OPTIONS = ['NONE', 'STUN', 'BANISH', 'KNOCKBACK', 'PULL', 'GRAVITY', 'DOT', 'HOT', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND', 'SHIELD'];
export const EFFECT_OPTIONS = ['NONE', 'VAMP', 'MANA_BURN', 'EXECUTE', 'MANA_RESTORE', 'DASH', 'SELF_DAMAGE'];
export const ELEMENT_OPTIONS = ['PHYSICAL', 'FIRE', 'ICE', 'LIGHTNING', 'HOLY', 'VOID', 'POISON', 'ARCANE', 'BLOOD'];

export const CC_OPTIONS_MAP = [
    { value: 'NONE', label: '無 (NONE)' },
    { value: 'STUN', label: '暈眩 (STUN)' },
    { value: 'BANISH', label: '放逐 (BANISH)' },
    { value: 'KNOCKBACK', label: '擊退 (KNOCKBACK)' },
    { value: 'PULL', label: '拉拽 (PULL)' },
    { value: 'GRAVITY', label: '重力吸引 (GRAVITY)' },
    { value: 'DOT', label: '持續傷害 (DOT)' },
    { value: 'HOT', label: '持續治療 (HOT)' },
    { value: 'SILENCE', label: '沉默 (SILENCE)' },
    { value: 'ROOT', label: '禁錮定身 (ROOT)' },
    { value: 'FEAR', label: '恐懼 (FEAR)' },
    { value: 'TAUNT', label: '嘲諷 (TAUNT)' },
    { value: 'BLIND', label: '致盲 (BLIND)' },
    { value: 'SHIELD', label: '護盾 (SHIELD)' }
];

export const EFFECT_OPTIONS_MAP = [
    { value: 'NONE', label: '無 (NONE)' },
    { value: 'VAMP', label: '生命吸取 (VAMP)' },
    { value: 'MANA_BURN', label: '法力燃燒 (MANA_BURN)' },
    { value: 'EXECUTE', label: '殘血斬殺 (EXECUTE)' },
    { value: 'MANA_RESTORE', label: '法力回復 (MANA_RESTORE)' },
    { value: 'DASH', label: '位移突進 (DASH)' },
    { value: 'SELF_DAMAGE', label: '自殘反噬 (SELF_DAMAGE)' }
];

export const ELEMENT_OPTIONS_MAP = [
    { value: 'PHYSICAL', label: '物理 (PHYSICAL)' },
    { value: 'FIRE', label: '火焰 (FIRE)' },
    { value: 'ICE', label: '冰霜 (ICE)' },
    { value: 'LIGHTNING', label: '雷電 (LIGHTNING)' },
    { value: 'HOLY', label: '神聖 (HOLY)' },
    { value: 'VOID', label: '虛空 (VOID)' },
    { value: 'POISON', label: '劇毒 (POISON)' },
    { value: 'ARCANE', label: '秘法 (ARCANE)' },
    { value: 'BLOOD', label: '鮮血 (BLOOD)' }
];

export const SPECIAL_VISUAL_MAP = [
    { value: 'NONE', label: '正常 (NONE)' },
    { value: 'POLYMORPH', label: '變形 (POLYMORPH)' },
    { value: 'STASIS', label: '停滯 (STASIS)' },
    { value: 'FROZEN', label: '冰凍 (FROZEN)' },
    { value: 'DANGER', label: '危險警告 (DANGER)' }
];

export const TARGET_TYPE_MAP = [
    { value: 'SINGLE', label: '單體目標 (SINGLE)' },
    { value: 'AOE', label: '範圍傷害 (AOE)' }
];

// [VISUAL SSOT] 此清單僅管理「技能特效 VFX ID」，不管理單位外觀。
// 單位外觀（身體顏色/尺寸/武器）請至 data/units/appearance/ 修改。
export const VISUAL_OPTIONS = ['SLASH', 'ARROW', 'FIREBALL', 'BOLT', 'BEAM', 'BOMB', 'SMASH', 'HEX_HALO', 'HEX_PRISM', 'HEX_RUNE', 'HEX_SHIELD', 'HEX_SKULL', 'HEX_ANGRY', 'HEX_EYE', 'HEX_LOCK'];

export const SKILL_FIELD_GROUPS = [
  {
    name: '視覺與資源定義 (Visual SSOT)',
    fields: [
      { key: 'name', label: '技能名稱', type: 'text' },
      { key: 'desc', label: '技能描述', type: 'text' },
      { key: 'tag', label: '技能類型', type: 'select', options: Object.keys(TAG_MAP).map(k => ({ value: k, label: `${TAG_MAP[k].label} (${k})` })) },
      { key: 'visual', label: '基礎外觀 (Mesh)', type: 'select', simpleOptions: VISUAL_OPTIONS },
      { key: 'visualHitEffect', label: '命中特效 (VFX_ID)', type: 'text' },
      { key: 'visualProjectileEffect', label: '彈道特效 (VFX_ID)', type: 'text' },
      { key: 'specialVisualStatus', label: '特殊視覺狀態', type: 'select', options: SPECIAL_VISUAL_MAP },
      { key: 'color', label: '核心色標 (Hex)', type: 'color' },
    ]
  },
  {
    name: '物理與空間 (Spatial)',
    fields: [
      { key: 'projectileSpeed', label: '彈道速度', type: 'number', step: 100 },
      { key: 'range', label: '極限射程', type: 'number', step: 1 },
      { key: 'type', label: '目標模式', type: 'select', options: TARGET_TYPE_MAP },
      { key: 'aoeRadius', label: '範圍半徑', type: 'number', step: 0.5 },
    ]
  },
  {
    name: '戰術參數 (Combat)',
    fields: [
      { key: 'power', label: '威力指數', type: 'number' },
      { key: 'cast', label: '詠唱時間 (秒)', type: 'number', step: 0.1 },
      { key: 'cost', label: '能量消耗 (MP)', type: 'number' },
      { key: 'gain', label: '能量獲取 (MP)', type: 'number' },
      { key: 'cd', label: '冷卻時長 (秒)', type: 'number', step: 0.1 },
      { key: 'element', label: '元素屬性', type: 'select', options: ELEMENT_OPTIONS_MAP },
    ]
  },
  {
    name: '控制與特殊效果 (CC / Effects)',
    fields: [
      { key: 'ccType', label: '主控制類型', type: 'select', options: CC_OPTIONS_MAP },
      { key: 'ccDur', label: '持續時間 (秒)', type: 'number', step: 0.1 },
      { key: 'ccForce', label: '力度參數', type: 'number' },
      { key: 'ccType2', label: '次控制類型', type: 'select', options: CC_OPTIONS_MAP },
      { key: 'ccDur2', label: '次控時間 (秒)', type: 'number', step: 0.1 },
      { key: 'ccForce2', label: '次控力度', type: 'number' },
      { key: 'effectType', label: '附加效果 1', type: 'select', options: EFFECT_OPTIONS_MAP },
      { key: 'effectVal', label: '數值 1', type: 'number' },
      { key: 'effectType2', label: '附加效果 2', type: 'select', options: EFFECT_OPTIONS_MAP },
      { key: 'effectVal2', label: '數值 2', type: 'number' },
    ]
  }
];

export const Helpers = {
    getRoleConfig: (role: Role) => ROLE_MAP[role] || { label: role, color: 'text-slate-400', border: 'border-slate-500' },
    getTeamConfig: (team: Team) => TEAM_MAP[team] || { label: '未知陣營', color: 'text-slate-400', bg: 'bg-slate-800' },
    getTagLabel: (tag: string) => TAG_MAP[tag]?.label || '未定義標籤',
    getAIStateLabel: (state: AIState) => AI_STATE_NAME_MAP[state] || '未知狀態',
    getActionStateLabel: (state: ActionState) => ACTION_STATE_MAP[state] || '未知動作'
};
