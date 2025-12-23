
import { Role, Skill, Team } from './types';

// =========================================================================================
// 技能資料庫 (Rebalance v3.0 - "No-Idle" Flow & Normalized Physics)
// 
// DESIGN RULES:
// 1. FILLER: Basic Attack CD must be <= Cast + 0.2s.
// 2. PHYSICS: Knockback Force capped at 5 (Map limits).
// 3. CC: Hard CC capped at 1.5s (Active) / 3.0s (Ult).
// =========================================================================================

export const DEFAULT_SKILL_DB: Skill[] = [
    // =====================================================================================
    // 🛡️ 坦克 - 藍方 (Blue Tank): 守護者
    // =====================================================================================
    // BASICS (High MP Gain, Low CD)
    { id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '聖光之錘', desc: '回復額外魔力', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 45, type: 'SINGLE', power: 30, color: '#facc15', visual: 'SMASH', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 15 },
    { id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '制裁', desc: '神聖傷害', range: 1, cast: 0.7, cd: 0.9, cost: 0, gain: 35, type: 'SINGLE', power: 45, color: '#cbd5e1', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '守護平砍', desc: '快速連擊', range: 1, cast: 0.5, cd: 0.6, cost: 0, gain: 40, type: 'SINGLE', power: 25, color: '#93c5fd', visual: 'SMASH', projectileSpeed: 0 },
    
    // ACTIVES (Tactical Control)
    { id: 'tb_a1', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '正義審判', desc: '單體暈眩', range: 1, cast: 0.4, cd: 7.0, cost: 40, gain: 0, type: 'SINGLE', power: 60, color: '#eab308', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.5 },
    { id: 'tb_a3', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '挑釁', desc: '單體嘲諷(牽引)', range: 4, cast: 0.3, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 10, color: '#fde047', visual: 'BEAM', projectileSpeed: 0, ccType: 'PULL', ccForce: 3 },
    { id: 'tb_a4', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '復仇之盾', desc: '遠程擊暈', range: 5, cast: 0.5, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 50, color: '#fbbf24', visual: 'BOLT', projectileSpeed: 600, ccType: 'STUN', ccDur: 1.2 },

    // ULTS (Big Impact)
    { id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '不朽壁壘', desc: '海量自我回復', range: 0, cast: 0.5, cd: 3.0, cost: 100, gain: 0, type: 'SINGLE', power: 0, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 400, ccDur: 6 },
    { id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '神聖領域', desc: '範圍暈眩', range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 80, color: '#ffffff', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.5 },

    // =====================================================================================
    // 🛡️ 坦克 - 紅方 (Red Tank): 戰爭巨獸
    // =====================================================================================
    // BASICS
    { id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '碎顱', desc: '沉重打擊', range: 1, cast: 0.9, cd: 1.0, cost: 0, gain: 40, type: 'SINGLE', power: 70, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '吸血打擊', desc: '攻擊吸血', range: 1, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 35, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.6 },
    
    // ACTIVES
    { id: 'tr_a1', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '戰爭踢擊', desc: '強力擊退', range: 1, cast: 0.4, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 80, color: '#991b1b', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'tr_a3', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '死亡之鉤', desc: '抓人', range: 5, cast: 0.6, cd: 9.0, cost: 35, gain: 0, type: 'SINGLE', power: 40, color: '#450a0a', visual: 'BOLT', projectileSpeed: 700, ccType: 'PULL', ccForce: 5 },

    // ULTS
    { id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '斷頭台', desc: '單體斬殺', range: 1, cast: 0.8, cd: 2.0, cost: 90, gain: 0, type: 'SINGLE', power: 700, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 3.5 },
    { id: 'tr_u3', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '瘋狂衝撞', desc: '範圍擊退', range: 0, cast: 0.6, cd: 4.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 4, power: 100, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 5 },

    // =====================================================================================
    // ⚔️ 戰士 - 藍方 (Blue Warrior): 劍士
    // =====================================================================================
    // BASICS
    { id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '迅捷劍', desc: '極快攻擊', range: 1, cast: 0.4, cd: 0.5, cost: 0, gain: 20, type: 'SINGLE', power: 40, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '破魔劍', desc: '燃燒魔力', range: 1, cast: 0.6, cd: 0.6, cost: 0, gain: 25, type: 'SINGLE', power: 40, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 25 },

    // ACTIVES
    { id: 'wb_a2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '無畏衝鋒', desc: '衝鋒暈眩', range: 4, cast: 0.2, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 60, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.2 },
    { id: 'wb_a4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '弱點擊破', desc: '爆發傷害', range: 1, cast: 0.5, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 160, color: '#1d4ed8', visual: 'SLASH', projectileSpeed: 0 },

    // ULTS
    { id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '無雙亂舞', desc: '毀滅傷害', range: 0, cast: 1.2, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 400, color: '#1d4ed8', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'new_w_bladestorm', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '劍刃風暴', desc: '持續AoE', range: 0, cast: 2.5, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 500, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0 },

    // =====================================================================================
    // ⚔️ 戰士 - 紅方 (Red Warrior): 狂戰士
    // =====================================================================================
    // BASICS
    { id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '狂暴揮擊', desc: '高傷普攻', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 75, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '嗜血斬', desc: '普攻吸血', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 25, type: 'SINGLE', power: 55, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.6 },

    // ACTIVES
    { id: 'wr_a1', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '撕裂傷口', desc: '重度流血', range: 1, cast: 0.4, cd: 5.0, cost: 30, gain: 0, type: 'SINGLE', power: 70, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 50, ccDur: 4 },
    { id: 'wr_a4', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '投擲飛斧', desc: '遠程暈眩', range: 4, cast: 0.5, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 70, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 650, ccType: 'STUN', ccDur: 1.2 },

    // ULTS
    { id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '諸神黃昏', desc: '毀滅打擊', range: 1, cast: 1.0, cd: 2.0, cost: 100, gain: 0, type: 'SINGLE', power: 650, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '血腥旋風', desc: '範圍吸血', range: 2, cast: 1.5, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 280, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.2 },

    // =====================================================================================
    // 🏹 射手 - 藍方 (Blue Ranger): 精靈弓箭手
    // =====================================================================================
    // BASICS (High Attack Speed)
    { id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '長弓射擊', desc: '遠距普攻', range: 5, cast: 0.8, cd: 0.9, cost: 0, gain: 30, type: 'SINGLE', power: 60, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 800 },
    { id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '連發', desc: '快速攻擊', range: 5, cast: 0.4, cd: 0.5, cost: 0, gain: 15, type: 'SINGLE', power: 35, color: '#fbbf24', visual: 'ARROW', projectileSpeed: 900 },

    // ACTIVES (Kiting)
    { id: 'rb_a2', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '擊退矢', desc: '擊退敵人', range: 4, cast: 0.6, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 70, color: '#fff', visual: 'ARROW', projectileSpeed: 800, ccType: 'KNOCKBACK', ccForce: 2 },
    { id: 'rb_a4', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '冰霜陷阱', desc: '凍結', range: 5, cast: 0.8, cd: 10.0, cost: 45, gain: 0, type: 'SINGLE', power: 70, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 400, ccType: 'STUN', ccDur: 1.5 },

    // ULTS
    { id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '星隕箭雨', desc: '大範圍AOE', range: 7, cast: 1.2, cd: 3.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 3, power: 300, color: '#f59e0b', visual: 'ARROW', projectileSpeed: 600 },
    { id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '水晶巨箭', desc: '全圖暈眩', range: 12, cast: 1.5, cd: 5.0, cost: 100, gain: 0, type: 'SINGLE', power: 300, color: '#60a5fa', visual: 'ARROW', projectileSpeed: 700, ccType: 'STUN', ccDur: 3.0 },

    // =====================================================================================
    // 🏹 射手 - 紅方 (Red Ranger): 火槍手
    // =====================================================================================
    // BASICS
    { id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '黑火藥射擊', desc: '高爆發', range: 4, cast: 1.0, cd: 1.1, cost: 0, gain: 45, type: 'SINGLE', power: 90, color: '#7f1d1d', visual: 'BOLT', projectileSpeed: 800 },
    { id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '散彈', desc: '近距爆發', range: 3, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 70, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 800 },

    // ACTIVES
    { id: 'rr_a1', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '毒氣手雷', desc: '範圍中毒', range: 5, cast: 0.8, cd: 7.0, cost: 40, gain: 0, type: 'AOE', aoeRadius: 2, power: 50, color: '#4ade80', visual: 'BOMB', projectileSpeed: 350, ccType: 'DOT', ccForce: 30, ccDur: 5 },
    { id: 'rr_a2', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '震盪彈', desc: '擊退', range: 5, cast: 1.0, cd: 9.0, cost: 50, gain: 0, type: 'SINGLE', power: 80, color: '#1f2937', visual: 'BOLT', projectileSpeed: 700, ccType: 'KNOCKBACK', ccForce: 3 },

    // ULTS
    { id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '終極爆破', desc: '極高斬殺', range: 7, cast: 2.0, cd: 4.0, cost: 100, gain: 0, type: 'SINGLE', power: 900, color: '#000000', visual: 'BOLT', projectileSpeed: 900, effectType: 'EXECUTE', effectVal: 2.0 },
    { id: 'rr_u4', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '全彈發射', desc: '全場亂射', range: 0, cast: 0.8, cd: 5.0, cost: 95, gain: 0, type: 'AOE', aoeRadius: 10, power: 180, color: '#f87171', visual: 'BOLT', projectileSpeed: 0 },

    // =====================================================================================
    // 🔮 法師 - 藍方 (Blue Mage): 奧術/冰霜
    // =====================================================================================
    // BASICS
    { id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '奧術飛彈', desc: '魔法導彈', range: 5, cast: 0.6, cd: 0.7, cost: 0, gain: 35, type: 'SINGLE', power: 55, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '法力汲取', desc: '吸取魔力', range: 4, cast: 0.8, cd: 0.9, cost: 0, gain: 45, type: 'SINGLE', power: 35, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 35 },

    // ACTIVES
    { id: 'mb_a2', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '變形術', desc: '單體放逐', range: 5, cast: 0.8, cd: 12.0, cost: 50, gain: 0, type: 'SINGLE', power: 10, color: '#d946ef', visual: 'BOLT', projectileSpeed: 500, ccType: 'BANISH', ccDur: 2.5 },
    { id: 'mb_a4', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '暴風雪', desc: '持續範圍傷', range: 6, cast: 1.2, cd: 8.0, cost: 60, gain: 0, type: 'AOE', aoeRadius: 3, power: 120, color: '#e0f2fe', visual: 'BOLT', projectileSpeed: 300 },

    // ULTS
    { id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '事件視界', desc: '範圍黑洞牽引', range: 5, cast: 1.5, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 250, color: '#172554', visual: 'FIREBALL', projectileSpeed: 200, ccType: 'PULL', ccForce: 4 },
    { id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '絕對零度', desc: '大範圍凍結', range: 5, cast: 1.2, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 120, color: '#e0f2fe', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.0 },

    // =====================================================================================
    // 🔮 法師 - 紅方 (Red Mage): 術士
    // =====================================================================================
    // BASICS
    { id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '暗影箭', desc: '黑暗能量', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 65, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '生命虹吸', desc: '吸血', range: 4, cast: 0.9, cd: 1.0, cost: 0, gain: 30, type: 'SINGLE', power: 45, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.0 },

    // ACTIVES
    { id: 'mr_a1', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '地獄烈焰', desc: '範圍燃燒', range: 4, cast: 1.0, cd: 8.0, cost: 50, gain: 0, type: 'AOE', power: 140, color: '#ef4444', visual: 'FIREBALL', projectileSpeed: 450, ccType: 'DOT', ccForce: 30, ccDur: 5 },
    { id: 'mr_a2', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '恐懼術', desc: '放逐(恐懼)', range: 4, cast: 0.5, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: 20, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 2.0 },

    // ULTS
    { id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '超新星', desc: '大範圍爆炸', range: 5, cast: 2.0, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 500, color: '#fbbf24', visual: 'FIREBALL', projectileSpeed: 250, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'new_m_meteor', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '毀滅隕石', desc: '暈眩隕石', range: 6, cast: 3.0, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 850, color: '#ea580c', visual: 'FIREBALL', projectileSpeed: 150, ccType: 'STUN', ccDur: 2.5 },

    // =====================================================================================
    // ⚕️ 輔助 - 藍方 (Blue Support): 牧師
    // =====================================================================================
    // BASICS
    { id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '懲戒之光', desc: '神聖傷害', range: 4, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 40, color: '#fef08a', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '祈禱', desc: '大量回魔', range: 0, cast: 1.0, cd: 1.1, cost: 0, gain: 60, type: 'SINGLE', power: 0, color: '#fff', visual: 'BEAM', projectileSpeed: 0 },

    // ACTIVES
    { id: 'sb_a1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '快速治療', desc: '單體大補', range: 5, cast: 0.6, cd: 4.0, cost: 40, gain: 0, type: 'SINGLE', power: -180, color: '#86efac', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_a2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '驅逐', desc: '單體擊退', range: 4, cast: 0.4, cd: 7.0, cost: 35, gain: 0, type: 'SINGLE', power: 50, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 3 },

    // ULTS
    { id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖讚美詩', desc: '全場回復', range: 0, cast: 1.5, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 8, power: -100, color: '#4ade80', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 120, ccDur: 8 },
    { id: 'sb_u3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖干涉', desc: '範圍無敵', range: 4, cast: 0.5, cd: 8.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: -300, color: '#fef08a', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 3.0, ccType2: 'HOT', ccDur2: 3.0 },

    // =====================================================================================
    // ⚕️ 輔助 - 紅方 (Red Support): 巫醫
    // =====================================================================================
    // BASICS
    { id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '毒鏢', desc: '傷害', range: 4, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 35, color: '#a3e635', visual: 'ARROW', projectileSpeed: 700 },
    { id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '厄運詛咒', desc: '燒魔', range: 4, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 25, color: '#581c87', visual: 'BOLT', projectileSpeed: 450, effectType: 'MANA_BURN', effectVal: 30 },

    // ACTIVES
    { id: 'sr_a1', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '巫毒圖騰', desc: '暈眩', range: 4, cast: 0.8, cd: 8.0, cost: 45, gain: 0, type: 'SINGLE', power: 40, color: '#8b5cf6', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.5 },
    { id: 'sr_a4', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '治療鏈', desc: '群體治療', range: 5, cast: 1.0, cd: 6.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 2, power: -100, color: '#fde047', visual: 'BOLT', projectileSpeed: 500 },

    // ULTS
    { id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '混亂風暴', desc: '擊退傷害', range: 5, cast: 1.2, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 180, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 200, ccType: 'KNOCKBACK', ccForce: 3 },
    { id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '靈魂連結', desc: '全場沉默', range: 0, cast: 1.5, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 15, power: 60, color: '#1e1b4b', visual: 'SMASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 5.0 }
];
