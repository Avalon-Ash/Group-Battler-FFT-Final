
import { Role, Skill, Team } from './types';

// =========================================================================================
// 技能資料庫 (平衡性重製版 v2.3 - Visual Standardization)
// 
// VISUAL STANDARDS:
// 1. RANGER/PHYSICAL: projectileSpeed = 600 (Snappy)
// 2. MAGE/MAGIC: projectileSpeed = 400 (Floating)
// 3. HEAVY/BOMB: projectileSpeed = 300 (Weighty)
// 4. INSTANT/BEAM: projectileSpeed = 0 (Immediate)
// =========================================================================================

export const DEFAULT_SKILL_DB: Skill[] = [
    // =====================================================================================
    // 🛡️ 坦克 - 藍方 (Blue Tank): 守護者 / 聖騎士
    // =====================================================================================
    // BASICS
    { id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '聖光之錘', desc: '回復額外魔力', range: 1, cast: 0.6, cd: 1.0, cost: 0, gain: 35, type: 'SINGLE', power: 30, color: '#facc15', visual: 'SMASH', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 10 },
    { id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '制裁', desc: '神聖傷害', range: 1, cast: 0.7, cd: 1.2, cost: 0, gain: 25, type: 'SINGLE', power: 45, color: '#cbd5e1', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '守護平砍', desc: '快速回魔', range: 1, cast: 0.5, cd: 0.8, cost: 0, gain: 40, type: 'SINGLE', power: 20, color: '#93c5fd', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tb_b4', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '盾牌猛擊', desc: '造成虛弱(降傷)', range: 1, cast: 0.5, cd: 1.5, cost: 0, gain: 20, type: 'SINGLE', power: 25, color: '#64748b', visual: 'SMASH', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 15 },

    // ACTIVES
    { id: 'tb_a1', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '正義審判', desc: '單體暈眩', range: 1, cast: 0.5, cd: 8.0, cost: 30, gain: 0, type: 'SINGLE', power: 50, color: '#eab308', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.5 },
    { id: 'tb_a2', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '神聖護盾', desc: '自我持續治療', range: 0, cast: 0.5, cd: 10.0, cost: 25, gain: 0, type: 'SINGLE', power: 0, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 40, ccDur: 5 },
    { id: 'tb_a3', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '挑釁', desc: '單體嘲諷(牽引)', range: 3, cast: 0.4, cd: 7.0, cost: 30, gain: 0, type: 'SINGLE', power: 10, color: '#fde047', visual: 'BEAM', projectileSpeed: 0, ccType: 'PULL', ccForce: 2 },
    { id: 'tb_a4', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '復仇之盾', desc: '遠程單體暈眩', range: 4, cast: 0.6, cd: 9.0, cost: 35, gain: 0, type: 'SINGLE', power: 40, color: '#fbbf24', visual: 'BOLT', projectileSpeed: 500, ccType: 'STUN', ccDur: 1.2 },

    // ULTS
    { id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '不朽壁壘', desc: '海量自我回復', range: 0, cast: 0.5, cd: 3.0, cost: 100, gain: 0, type: 'SINGLE', power: 0, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 300, ccDur: 8 },
    { id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '神聖領域', desc: '大範圍暈眩(低傷)', range: 2, cast: 1.2, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 50, color: '#ffffff', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.5 },
    { id: 'tb_u3', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '秩序之鏈', desc: '全場沉默與牽引', range: 0, cast: 1.5, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 8, power: 40, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 4.0, ccType2: 'PULL', ccForce2: 3 },
    { id: 'tb_u4', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '大天使之怒', desc: '範圍擊退(中傷)', range: 3, cast: 1.0, cd: 4.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 2, power: 150, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 4 },

    // =====================================================================================
    // 🛡️ 坦克 - 紅方 (Red Tank): 戰爭巨獸 / 狂戰坦克
    // =====================================================================================
    // BASICS
    { id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '碎顱', desc: '高傷普攻', range: 1, cast: 0.8, cd: 1.2, cost: 0, gain: 30, type: 'SINGLE', power: 60, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '吸血打擊', desc: '攻擊吸血', range: 1, cast: 0.6, cd: 1.0, cost: 0, gain: 25, type: 'SINGLE', power: 30, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.5 },
    { id: 'tr_b3', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '鋸齒砍', desc: '造成流血', range: 1, cast: 0.6, cd: 1.0, cost: 0, gain: 25, type: 'SINGLE', power: 30, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 15, ccDur: 4 },
    { id: 'tr_b4', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '殘廢重擊', desc: '燒魔打擊', range: 1, cast: 0.9, cd: 1.5, cost: 0, gain: 30, type: 'SINGLE', power: 40, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 20 },

    // ACTIVES
    { id: 'tr_a1', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '戰爭踢擊', desc: '單體強力擊退', range: 1, cast: 0.4, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 60, color: '#991b1b', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'tr_a2', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '鮮血渴望', desc: '單體高吸血', range: 1, cast: 0.5, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 80, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.0 },
    { id: 'tr_a3', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '死亡之鉤', desc: '單體抓人', range: 5, cast: 0.8, cd: 10.0, cost: 35, gain: 0, type: 'SINGLE', power: 30, color: '#450a0a', visual: 'BOLT', projectileSpeed: 600, ccType: 'PULL', ccForce: 5 },
    { id: 'tr_a4', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '恐懼凝視', desc: '單體放逐(恐懼)', range: 3, cast: 0.5, cd: 12.0, cost: 30, gain: 0, type: 'SINGLE', power: 20, color: '#7f1d1d', visual: 'BEAM', projectileSpeed: 0, ccType: 'BANISH', ccDur: 2.5 },

    // ULTS
    { id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '斷頭台', desc: '單體極致斬殺(無控)', range: 1, cast: 1.0, cd: 2.0, cost: 90, gain: 0, type: 'SINGLE', power: 600, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 3.0 },
    { id: 'tr_u2', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '血腥領域', desc: '範圍吸血與傷害', range: 3, cast: 1.2, cd: 4.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 100, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 50, ccDur: 5, effectType: 'VAMP', effectVal: 1.0 },
    { id: 'tr_u3', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '瘋狂衝撞', desc: '範圍擊退與流血', range: 0, cast: 0.8, cd: 4.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 3, power: 80, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 4, ccType2: 'DOT', ccDur2: 6 },
    { id: 'new_t_spikes', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '尖刺外殼', desc: '範圍暈眩並回血', range: 0, cast: 0.5, cd: 5.0, cost: 80, gain: 0, type: 'AOE', aoeRadius: 2, power: 50, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0, ccType2: 'HOT', ccForce2: 100 },

    // =====================================================================================
    // ⚔️ 戰士 - 藍方 (Blue Warrior): 劍士 / 決鬥者
    // =====================================================================================
    // BASICS
    { id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '迅捷劍', desc: '快速攻擊', range: 1, cast: 0.4, cd: 0.6, cost: 0, gain: 18, type: 'SINGLE', power: 35, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b2', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '刺擊', desc: '微弱斬殺效果', range: 2, cast: 0.5, cd: 1.0, cost: 0, gain: 22, type: 'SINGLE', power: 45, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 1.2 },
    { id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '破魔劍', desc: '燃燒魔力', range: 1, cast: 0.6, cd: 1.2, cost: 0, gain: 25, type: 'SINGLE', power: 35, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 20 },
    { id: 'wb_b4', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '格擋反擊', desc: '低傷高回魔', range: 1, cast: 0.3, cd: 0.5, cost: 0, gain: 30, type: 'SINGLE', power: 25, color: '#93c5fd', visual: 'SLASH', projectileSpeed: 0 },

    // ACTIVES
    { id: 'wb_a1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '圓月斬', desc: '周圍AOE傷害', range: 1, cast: 0.5, cd: 6.0, cost: 30, gain: 0, type: 'AOE', power: 80, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_a2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '無畏衝鋒', desc: '單體衝鋒暈眩', range: 4, cast: 0.3, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 50, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.5 },
    { id: 'wb_a3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '劍氣波', desc: '遠程傷害', range: 5, cast: 0.6, cd: 5.0, cost: 25, gain: 0, type: 'SINGLE', power: 90, color: '#a5f3fc', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'wb_a4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '弱點擊破', desc: '單體爆發', range: 1, cast: 0.8, cd: 7.0, cost: 30, gain: 0, type: 'SINGLE', power: 140, color: '#1d4ed8', visual: 'SLASH', projectileSpeed: 0 },

    // ULTS
    { id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '無雙亂舞', desc: '周圍毀滅傷害(無控)', range: 0, cast: 1.5, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 350, color: '#1d4ed8', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_u2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '決鬥者之舞', desc: '單體暈眩斬殺', range: 1, cast: 1.0, cd: 3.0, cost: 90, gain: 0, type: 'SINGLE', power: 400, color: '#2563eb', visual: 'SLASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.5, effectType: 'EXECUTE', effectVal: 2.2 },
    { id: 'wb_u3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '鎮魂曲', desc: '範圍沈默(低傷)', range: 2, cast: 1.2, cd: 5.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 2, power: 80, color: '#1e3a8a', visual: 'SLASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 4.0 },
    { id: 'new_w_bladestorm', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '劍刃風暴', desc: '持續範圍傷害', range: 0, cast: 3.0, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 450, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0 },

    // =====================================================================================
    // ⚔️ 戰士 - 紅方 (Red Warrior): 狂戰士 / 蠻族
    // =====================================================================================
    // BASICS
    { id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '狂暴揮擊', desc: '高傷普攻', range: 1, cast: 0.7, cd: 1.0, cost: 0, gain: 28, type: 'SINGLE', power: 70, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '嗜血斬', desc: '普攻吸血', range: 1, cast: 0.6, cd: 0.9, cost: 0, gain: 22, type: 'SINGLE', power: 50, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.5 },
    { id: 'wr_b3', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '旋風斬', desc: '小範圍AOE', range: 1, cast: 0.8, cd: 1.5, cost: 0, gain: 32, type: 'AOE', power: 35, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_b4', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '處決試探', desc: '低血量加成', range: 1, cast: 0.8, cd: 1.2, cost: 0, gain: 25, type: 'SINGLE', power: 45, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 1.5 },

    // ACTIVES
    { id: 'wr_a1', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '撕裂傷口', desc: '單體重度流血', range: 1, cast: 0.5, cd: 6.0, cost: 25, gain: 0, type: 'SINGLE', power: 60, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 40, ccDur: 5 },
    { id: 'wr_a2', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '野蠻衝撞', desc: '單體擊退', range: 3, cast: 0.5, cd: 7.0, cost: 30, gain: 0, type: 'SINGLE', power: 80, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 3 },
    { id: 'wr_a3', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '斬首', desc: '單體斬殺', range: 1, cast: 0.8, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 100, color: '#450a0a', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 2.0 },
    { id: 'wr_a4', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '投擲飛斧', desc: '遠程單體暈眩', range: 4, cast: 0.6, cd: 9.0, cost: 30, gain: 0, type: 'SINGLE', power: 60, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 500, ccType: 'STUN', ccDur: 1.2 },

    // ULTS
    { id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '諸神黃昏', desc: '單體毀滅打擊(無控)', range: 1, cast: 1.2, cd: 2.0, cost: 100, gain: 0, type: 'SINGLE', power: 600, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '血腥旋風', desc: '範圍吸血', range: 2, cast: 1.5, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 250, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.0 },
    { id: 'wr_u3', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '滅絕一擊', desc: '範圍擊退並流血', range: 1, cast: 1.0, cd: 4.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 2, power: 200, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 5, ccType2: 'DOT', ccDur2: 8 },
    { id: 'wr_u4', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '不滅戰魂', desc: '範圍吸血爆發', range: 0, cast: 0.5, cd: 3.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 3, power: 180, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 2.0 },

    // =====================================================================================
    // 🏹 射手 - 藍方 (Blue Ranger): 精靈弓箭手
    // =====================================================================================
    // BASICS
    { id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '長弓射擊', desc: '遠距普攻', range: 5, cast: 0.9, cd: 1.1, cost: 0, gain: 28, type: 'SINGLE', power: 55, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 600 },
    { id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '連發', desc: '快速低傷', range: 5, cast: 0.4, cd: 0.6, cost: 0, gain: 18, type: 'SINGLE', power: 32, color: '#fbbf24', visual: 'ARROW', projectileSpeed: 650 },
    { id: 'rb_b3', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '破魔矢', desc: '燃燒魔力', range: 6, cast: 1.0, cd: 1.8, cost: 0, gain: 25, type: 'SINGLE', power: 40, color: '#60a5fa', visual: 'ARROW', projectileSpeed: 600, effectType: 'MANA_BURN', effectVal: 30 },
    { id: 'rb_b4', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '風之矢', desc: '極快射擊', range: 5, cast: 0.3, cd: 0.5, cost: 0, gain: 15, type: 'SINGLE', power: 25, color: '#bef264', visual: 'ARROW', projectileSpeed: 800 },

    // ACTIVES
    { id: 'rb_a1', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '爆裂箭', desc: '範圍傷害(無控)', range: 5, cast: 1.0, cd: 7.0, cost: 35, gain: 0, type: 'AOE', aoeRadius: 1, power: 90, color: '#ea580c', visual: 'FIREBALL', projectileSpeed: 350 },
    { id: 'rb_a2', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '擊退矢', desc: '單體強力擊退', range: 4, cast: 0.8, cd: 9.0, cost: 30, gain: 0, type: 'SINGLE', power: 60, color: '#fff', visual: 'ARROW', projectileSpeed: 600, ccType: 'KNOCKBACK', ccForce: 3 },
    { id: 'rb_a3', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '沉默射擊', desc: '單體沉默', range: 6, cast: 1.2, cd: 10.0, cost: 35, gain: 0, type: 'SINGLE', power: 50, color: '#94a3b8', visual: 'ARROW', projectileSpeed: 600, ccType: 'SILENCE', ccDur: 3.5 },
    { id: 'rb_a4', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '冰霜陷阱', desc: '單體凍結', range: 5, cast: 1.0, cd: 9.0, cost: 40, gain: 0, type: 'SINGLE', power: 60, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 300, ccType: 'STUN', ccDur: 2.0 },

    // ULTS
    { id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '星隕箭雨', desc: '大範圍AOE(無控)', range: 6, cast: 1.5, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 280, color: '#f59e0b', visual: 'ARROW', projectileSpeed: 400 },
    { id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '水晶巨箭', desc: '全圖單體暈眩', range: 12, cast: 2.0, cd: 5.0, cost: 100, gain: 0, type: 'SINGLE', power: 250, color: '#60a5fa', visual: 'ARROW', projectileSpeed: 500, ccType: 'STUN', ccDur: 4.0 },
    { id: 'rb_u3', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '風行者', desc: '單體擊退並沉默', range: 5, cast: 1.0, cd: 4.0, cost: 80, gain: 0, type: 'SINGLE', power: 180, color: '#a3e635', visual: 'ARROW', projectileSpeed: 600, ccType: 'KNOCKBACK', ccForce: 3, ccType2: 'SILENCE', ccDur2: 3.0 },
    { id: 'new_r_snipe', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '精準狙擊', desc: '超遠距離斬殺(無控)', range: 15, cast: 2.5, cd: 3.0, cost: 100, gain: 0, type: 'SINGLE', power: 650, color: '#facc15', visual: 'ARROW', projectileSpeed: 1000, effectType: 'EXECUTE', effectVal: 2.0 },

    // =====================================================================================
    // 🏹 射手 - 紅方 (Red Ranger): 火槍手 / 投彈手
    // =====================================================================================
    // BASICS
    { id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '黑火藥射擊', desc: '高爆發', range: 4, cast: 1.2, cd: 1.5, cost: 0, gain: 40, type: 'SINGLE', power: 80, color: '#7f1d1d', visual: 'BOLT', projectileSpeed: 600 },
    { id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '散彈', desc: '近距高傷', range: 3, cast: 0.8, cd: 1.0, cost: 0, gain: 25, type: 'SINGLE', power: 60, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 600 },
    { id: 'rr_b3', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '燃燒彈', desc: '附加燃燒', range: 4, cast: 1.0, cd: 1.5, cost: 0, gain: 30, type: 'SINGLE', power: 45, color: '#ef4444', visual: 'BOMB', projectileSpeed: 300, ccType: 'DOT', ccForce: 15, ccDur: 3 },
    { id: 'rr_b4', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '槍托重擊', desc: '近戰高傷', range: 1, cast: 0.6, cd: 1.5, cost: 0, gain: 20, type: 'SINGLE', power: 60, color: '#52525b', visual: 'SMASH', projectileSpeed: 0 },

    // ACTIVES
    { id: 'rr_a1', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '毒氣手雷', desc: '範圍中毒(無控)', range: 4, cast: 1.0, cd: 8.0, cost: 35, gain: 0, type: 'AOE', aoeRadius: 2, power: 40, color: '#4ade80', visual: 'BOMB', projectileSpeed: 250, ccType: 'DOT', ccForce: 25, ccDur: 5 },
    { id: 'rr_a2', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '震盪彈', desc: '單體擊退', range: 5, cast: 1.2, cd: 9.0, cost: 45, gain: 0, type: 'SINGLE', power: 60, color: '#1f2937', visual: 'BOLT', projectileSpeed: 500, ccType: 'KNOCKBACK', ccForce: 3 },
    { id: 'rr_a3', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '穿甲彈', desc: '高傷貫穿', range: 6, cast: 1.5, cd: 7.0, cost: 40, gain: 0, type: 'SINGLE', power: 120, color: '#fca5a5', visual: 'BOLT', projectileSpeed: 800 },
    { id: 'rr_a4', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '照明彈', desc: '範圍燃燒燒魔', range: 5, cast: 1.0, cd: 9.0, cost: 30, gain: 0, type: 'AOE', aoeRadius: 2, power: 30, color: '#fbbf24', visual: 'BOMB', projectileSpeed: 350, ccType: 'DOT', ccDur: 4, effectType: 'MANA_BURN', effectVal: 40 },

    // ULTS
    { id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '終極爆破', desc: '極高單體斬殺(無控)', range: 7, cast: 2.5, cd: 4.0, cost: 100, gain: 0, type: 'SINGLE', power: 800, color: '#000000', visual: 'BOLT', projectileSpeed: 700, effectType: 'EXECUTE', effectVal: 1.8 },
    { id: 'rr_u2', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '死亡蓮華', desc: '範圍吸血亂射', range: 4, cast: 2.5, cd: 4.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 400, color: '#7f1d1d', visual: 'BOLT', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.4 },
    { id: 'rr_u3', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '化學轟炸', desc: '範圍擊退並中毒', range: 5, cast: 1.5, cd: 5.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 3, power: 150, color: '#10b981', visual: 'BOMB', projectileSpeed: 250, ccType: 'KNOCKBACK', ccForce: 3, ccType2: 'DOT', ccDur2: 8 },
    { id: 'rr_u4', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '全彈發射', desc: '全場亂射', range: 0, cast: 1.0, cd: 5.0, cost: 95, gain: 0, type: 'AOE', aoeRadius: 8, power: 150, color: '#f87171', visual: 'BOLT', projectileSpeed: 0 },

    // =====================================================================================
    // 🔮 法師 - 藍方 (Blue Mage): 冰霜 / 奧術
    // =====================================================================================
    // BASICS
    { id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '奧術飛彈', desc: '魔法導彈', range: 5, cast: 0.6, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 50, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 400 },
    { id: 'mb_b2', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '寒冰箭', desc: '冰霜傷害', range: 5, cast: 0.8, cd: 1.0, cost: 0, gain: 32, type: 'SINGLE', power: 65, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 400 },
    { id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '法力汲取', desc: '吸取魔力', range: 4, cast: 0.8, cd: 1.0, cost: 0, gain: 35, type: 'SINGLE', power: 30, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 30 },
    { id: 'mb_b4', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '霜火之箭', desc: '小範圍傷害', range: 5, cast: 0.9, cd: 1.2, cost: 0, gain: 30, type: 'AOE', aoeRadius: 1, power: 40, color: '#a855f7', visual: 'FIREBALL', projectileSpeed: 400 },

    // ACTIVES
    { id: 'mb_a1', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '奧術新星', desc: '自身範圍爆發(無控)', range: 2, cast: 0.6, cd: 6.0, cost: 35, gain: 0, type: 'AOE', power: 100, color: '#c084fc', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'mb_a2', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '變形術', desc: '單體放逐', range: 4, cast: 0.8, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: 10, color: '#d946ef', visual: 'BOLT', projectileSpeed: 400, ccType: 'BANISH', ccDur: 3.0 },
    { id: 'mb_a3', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '冰霜射線', desc: '單體凍結', range: 4, cast: 1.0, cd: 9.0, cost: 45, gain: 0, type: 'SINGLE', power: 80, color: '#bae6fd', visual: 'BEAM', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0 },
    { id: 'mb_a4', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '暴風雪', desc: '範圍持續傷害', range: 6, cast: 1.5, cd: 10.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 3, power: 100, color: '#e0f2fe', visual: 'BOLT', projectileSpeed: 250 },

    // ULTS
    { id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '事件視界', desc: '範圍黑洞牽引', range: 4, cast: 2.0, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 220, color: '#172554', visual: 'FIREBALL', projectileSpeed: 150, ccType: 'PULL', ccForce: 4 },
    { id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '絕對零度', desc: '大範圍凍結(低傷)', range: 4, cast: 1.8, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 100, color: '#e0f2fe', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.5 },
    { id: 'mb_u3', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '時空裂隙', desc: '單體放逐並燒魔', range: 5, cast: 1.2, cd: 5.0, cost: 90, gain: 0, type: 'SINGLE', power: 150, color: '#c084fc', visual: 'BOLT', projectileSpeed: 300, ccType: 'BANISH', ccDur: 4.0, effectType: 'MANA_BURN', effectVal: 100 },
    { id: 'mb_u4', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '祕法洪流', desc: '全場沉默與燒魔', range: 0, cast: 1.0, cd: 6.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 10, power: 80, color: '#8b5cf6', visual: 'BEAM', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 4.0, effectType: 'MANA_BURN', effectVal: 80 },

    // =====================================================================================
    // 🔮 法師 - 紅方 (Red Mage): 術士 / 火法
    // =====================================================================================
    // BASICS
    { id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '暗影箭', desc: '黑暗能量', range: 5, cast: 0.7, cd: 1.0, cost: 0, gain: 32, type: 'SINGLE', power: 60, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 400 },
    { id: 'mr_b2', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '燃燒之手', desc: '近身火焰', range: 2, cast: 0.4, cd: 0.7, cost: 0, gain: 25, type: 'SINGLE', power: 50, color: '#f97316', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '生命虹吸', desc: '吸血', range: 4, cast: 1.0, cd: 1.2, cost: 0, gain: 28, type: 'SINGLE', power: 40, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.0 },
    { id: 'mr_b4', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '痛苦鞭笞', desc: '持續傷害', range: 4, cast: 0.8, cd: 1.0, cost: 0, gain: 30, type: 'SINGLE', power: 20, color: '#a21caf', visual: 'BEAM', projectileSpeed: 0, ccType: 'DOT', ccDur: 4 },

    // ACTIVES
    { id: 'mr_a1', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '地獄烈焰', desc: '範圍燃燒', range: 3, cast: 1.0, cd: 7.0, cost: 45, gain: 0, type: 'AOE', power: 120, color: '#ef4444', visual: 'FIREBALL', projectileSpeed: 400, ccType: 'DOT', ccForce: 20, ccDur: 5 },
    { id: 'mr_a2', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '恐懼術', desc: '單體放逐(恐懼)', range: 3, cast: 0.5, cd: 10.0, cost: 35, gain: 0, type: 'SINGLE', power: 20, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 2.5 },
    { id: 'mr_a3', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '腐蝕術', desc: '單體高DoT', range: 5, cast: 0.8, cd: 6.0, cost: 25, gain: 0, type: 'SINGLE', power: 60, color: '#22c55e', visual: 'BOLT', projectileSpeed: 300, ccType: 'DOT', ccForce: 30, ccDur: 8 },
    { id: 'mr_a4', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '混亂箭', desc: '單體高傷暈眩', range: 5, cast: 1.5, cd: 9.0, cost: 40, gain: 0, type: 'SINGLE', power: 130, color: '#16a34a', visual: 'BOLT', projectileSpeed: 300, ccType: 'STUN', ccDur: 1.5 },

    // ULTS
    { id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '超新星', desc: '大範圍擊退爆炸', range: 4, cast: 2.5, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 450, color: '#fbbf24', visual: 'FIREBALL', projectileSpeed: 200, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'mr_u2', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '靈魂收割', desc: '斬殺並吸血(無控)', range: 4, cast: 1.5, cd: 4.0, cost: 100, gain: 0, type: 'AOE', power: 300, color: '#881337', visual: 'SMASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.8, effectType2: 'EXECUTE' },
    { id: 'mr_u3', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '末日守衛', desc: '單體持續燃燒暈眩', range: 5, cast: 1.5, cd: 6.0, cost: 100, gain: 0, type: 'SINGLE', power: 200, color: '#b91c1c', visual: 'BEAM', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.5, ccType2: 'DOT', ccDur2: 12 },
    { id: 'new_m_meteor', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '毀滅隕石', desc: '超慢詠唱大範圍暈眩', range: 6, cast: 4.0, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 800, color: '#ea580c', visual: 'FIREBALL', projectileSpeed: 100, ccType: 'STUN', ccDur: 2.5 },

    // =====================================================================================
    // ⚕️ 輔助 - 藍方 (Blue Support): 牧師 / 附魔師
    // =====================================================================================
    // BASICS
    { id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '懲戒之光', desc: '神聖傷害', range: 4, cast: 0.7, cd: 0.9, cost: 0, gain: 22, type: 'SINGLE', power: 35, color: '#fef08a', visual: 'BOLT', projectileSpeed: 400 },
    { id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '祈禱', desc: '大量回魔', range: 0, cast: 1.0, cd: 1.8, cost: 0, gain: 55, type: 'SINGLE', power: 0, color: '#fff', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_b3', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '法力燃燒', desc: '燒魔', range: 3, cast: 0.6, cd: 2.0, cost: 0, gain: 20, type: 'SINGLE', power: 25, color: '#cbd5e1', visual: 'BOLT', projectileSpeed: 400, effectType: 'MANA_BURN', effectVal: 20 },
    { id: 'sb_b4', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '懲擊', desc: '單體傷害', range: 4, cast: 0.6, cd: 1.0, cost: 0, gain: 25, type: 'SINGLE', power: 40, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0 },

    // ACTIVES
    { id: 'sb_a1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '快速治療', desc: '單體大補', range: 5, cast: 0.8, cd: 5.0, cost: 30, gain: 0, type: 'SINGLE', power: -160, color: '#86efac', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_a2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '驅逐', desc: '單體擊退', range: 3, cast: 0.5, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 40, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 3 },
    { id: 'sb_a3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '恢復術', desc: '持續治療', range: 5, cast: 0.6, cd: 4.0, cost: 20, gain: 0, type: 'SINGLE', power: -40, color: '#4ade80', visual: 'BOLT', projectileSpeed: 400, ccType: 'HOT', ccForce: 40, ccDur: 8 },
    { id: 'sb_a4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '守護天使', desc: '單體無敵(放逐)治療', range: 5, cast: 0.5, cd: 12.0, cost: 40, gain: 0, type: 'SINGLE', power: -50, color: '#ffffff', visual: 'BEAM', projectileSpeed: 0, ccType: 'BANISH', ccDur: 3.0 },

    // ULTS
    { id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖讚美詩', desc: '全場大範圍Hot', range: 0, cast: 2.0, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 6, power: -80, color: '#4ade80', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 100, ccDur: 8 },
    { id: 'sb_u2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '奇蹟', desc: '單體滿血(無控)', range: 6, cast: 1.5, cd: 5.0, cost: 100, gain: 0, type: 'SINGLE', power: -999, color: '#ffffff', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_u3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖干涉', desc: '範圍無敵(放逐+回血)', range: 4, cast: 1.0, cd: 8.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: -300, color: '#fef08a', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 3.5, ccType2: 'HOT', ccDur2: 3.5 },
    { id: 'new_s_clarity', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '清晰術', desc: '全隊大量回魔', range: 0, cast: 1.0, cd: 6.0, cost: 0, gain: 0, type: 'AOE', aoeRadius: 8, power: 0, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 100 },

    // =====================================================================================
    // ⚕️ 輔助 - 紅方 (Red Support): 巫醫 / 薩滿
    // =====================================================================================
    // BASICS
    { id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '毒鏢', desc: '傷害', range: 4, cast: 0.5, cd: 0.8, cost: 0, gain: 25, type: 'SINGLE', power: 30, color: '#a3e635', visual: 'ARROW', projectileSpeed: 600 },
    { id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '厄運詛咒', desc: '燒魔', range: 4, cast: 0.7, cd: 1.2, cost: 0, gain: 30, type: 'SINGLE', power: 20, color: '#581c87', visual: 'BOLT', projectileSpeed: 350, effectType: 'MANA_BURN', effectVal: 25 },
    { id: 'sr_b3', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '麻痺毒', desc: '持續中毒', range: 4, cast: 0.6, cd: 1.5, cost: 0, gain: 22, type: 'SINGLE', power: 15, color: '#a3e635', visual: 'ARROW', projectileSpeed: 600, ccType: 'DOT', ccDur: 3 },
    { id: 'sr_b4', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '衰弱詛咒', desc: '燒魔傷害', range: 4, cast: 0.8, cd: 1.8, cost: 0, gain: 25, type: 'SINGLE', power: 20, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 350, effectType: 'MANA_BURN', effectVal: 15 },

    // ACTIVES
    { id: 'sr_a1', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '巫毒圖騰', desc: '單體暈眩', range: 4, cast: 1.0, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 30, color: '#8b5cf6', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0 },
    { id: 'sr_a2', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '連鎖閃電', desc: '高傷AOE(無控)', range: 5, cast: 0.8, cd: 7.0, cost: 35, gain: 0, type: 'AOE', power: 95, color: '#facc15', visual: 'BOLT', projectileSpeed: 700 },
    { id: 'sr_a3', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '靜電場', desc: '單體沉默', range: 3, cast: 0.6, cd: 9.0, cost: 40, gain: 0, type: 'SINGLE', power: 20, color: '#e2e8f0', visual: 'SMASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 3.5 },
    { id: 'sr_a4', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '治療鏈', desc: '群體治療', range: 5, cast: 1.0, cd: 8.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: -90, color: '#fde047', visual: 'BOLT', projectileSpeed: 450 },

    // ULTS
    { id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '混亂風暴', desc: '範圍擊退傷害', range: 5, cast: 1.5, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 150, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 150, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '靈魂連結', desc: '全場長時間沉默', range: 0, cast: 2.0, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 15, power: 50, color: '#1e1b4b', visual: 'SMASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 6.0 },
    { id: 'sr_u3', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '劇毒新星', desc: '範圍中毒與短暈', range: 3, cast: 1.2, cd: 5.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 5, power: 60, color: '#166534', visual: 'FIREBALL', projectileSpeed: 200, ccType: 'DOT', ccForce: 80, ccDur: 8.0, ccType2: 'STUN', ccDur2: 1.0 },
    { id: 'sr_u4', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '大巫毒儀式', desc: '範圍無敵回血圖騰', range: 4, cast: 1.0, cd: 8.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: -200, color: '#a855f7', visual: 'SMASH', projectileSpeed: 0, ccType: 'HOT', ccForce: 200, ccDur: 5.0 }
];
