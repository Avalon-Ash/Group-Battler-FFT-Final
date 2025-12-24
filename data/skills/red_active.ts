
import { Role, Skill, Team } from '../../types';

export const RED_ACTIVE: Skill[] = [
    // ==========================================
    // 🛡️ RED TANK
    // ==========================================
    { id: 'tr_a1', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '戰爭踢擊', desc: '強力擊退', range: 1, cast: 0.4, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 100, color: '#991b1b', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 4 }, // Power 80 -> 100
    { id: 'tr_a2', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '鮮血沸騰', desc: '範圍吸血', range: 0, cast: 0.5, cd: 9.0, cost: 40, gain: 0, type: 'AOE', aoeRadius: 2, power: 70, color: '#dc2626', visual: 'SMASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.5 }, // Power 50 -> 70
    { id: 'tr_a3', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '死亡之鉤', desc: '抓人', range: 5, cast: 0.6, cd: 10.0, cost: 35, gain: 0, type: 'SINGLE', power: 60, color: '#450a0a', visual: 'BOLT', projectileSpeed: 700, ccType: 'PULL', ccForce: 5 }, // Power 40 -> 60
    { id: 'tr_a4', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '骸骨護盾', desc: '護盾(假血)', range: 0, cast: 0.3, cd: 12.0, cost: 30, gain: 0, type: 'SINGLE', power: -200, color: '#f5f5f4', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tr_a5', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '絞殺', desc: '沉默+傷害', range: 1, cast: 0.5, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 130, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 2.5 }, // Power 90 -> 130 (Hard CC compensation)

    // ==========================================
    // ⚔️ RED WARRIOR
    // ==========================================
    { id: 'wr_a1', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '撕裂傷口', desc: '重度流血', range: 1, cast: 0.4, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 70, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 50, ccDur: 4 },
    { id: 'wr_a2', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '旋風斬', desc: '範圍傷害', range: 0, cast: 0.8, cd: 7.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: 100, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_a3', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '斬殺', desc: '殘血收割', range: 1, cast: 0.5, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 120, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 1.5 },
    { id: 'wr_a4', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '投擲飛斧', desc: '遠程暈眩', range: 4, cast: 0.5, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 110, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 650, ccType: 'STUN', ccDur: 1.2 }, // Power 70 -> 110
    { id: 'wr_a5', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '狂戰之怒', desc: '解除控制+回血', range: 0, cast: 0.2, cd: 12.0, cost: 0, gain: 50, type: 'SINGLE', power: -150, color: '#fca5a5', visual: 'SMASH', projectileSpeed: 0 },

    // ==========================================
    // 🏹 RED RANGER
    // ==========================================
    { id: 'rr_a1', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '毒氣手雷', desc: '範圍中毒', range: 5, cast: 0.8, cd: 8.0, cost: 40, gain: 0, type: 'AOE', aoeRadius: 2, power: 50, color: '#4ade80', visual: 'BOMB', projectileSpeed: 350, ccType: 'DOT', ccForce: 30, ccDur: 5 },
    { id: 'rr_a2', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '震盪彈', desc: '擊退', range: 5, cast: 1.0, cd: 9.0, cost: 50, gain: 0, type: 'SINGLE', power: 100, color: '#1f2937', visual: 'BOLT', projectileSpeed: 700, ccType: 'KNOCKBACK', ccForce: 3 }, // Power 80 -> 100
    { id: 'rr_a3', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '爆炸射擊', desc: '範圍火傷', range: 6, cast: 1.2, cd: 9.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: 120, color: '#f87171', visual: 'FIREBALL', projectileSpeed: 800 },
    { id: 'rr_a4', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '捕獸夾', desc: '定身', range: 5, cast: 0.5, cd: 10.0, cost: 35, gain: 0, type: 'SINGLE', power: 100, color: '#78350f', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0 }, // Power 40 -> 100
    { id: 'rr_a5', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '穿甲彈', desc: '破甲高傷', range: 6, cast: 1.5, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 200, color: '#000', visual: 'BOLT', projectileSpeed: 1500 },

    // ==========================================
    // 🔮 RED MAGE
    // ==========================================
    { id: 'mr_a1', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '地獄烈焰', desc: '範圍燃燒', range: 4, cast: 1.0, cd: 8.0, cost: 50, gain: 0, type: 'AOE', power: 140, color: '#ef4444', visual: 'FIREBALL', projectileSpeed: 450, ccType: 'DOT', ccForce: 30, ccDur: 5 },
    { id: 'mr_a2', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '恐懼術', desc: '放逐(恐懼)', range: 4, cast: 0.5, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: 40, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 2.0 }, // CD 12->10, Power 20->40
    { id: 'mr_a3', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '暗影灼燒', desc: '斬殺法術', range: 5, cast: 0.6, cd: 7.0, cost: 45, gain: 0, type: 'SINGLE', power: 150, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 800, effectType: 'EXECUTE', effectVal: 1.5 },
    { id: 'mr_a4', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '死亡纏繞', desc: '吸血+傷害', range: 5, cast: 0.8, cd: 9.0, cost: 50, gain: 0, type: 'SINGLE', power: 120, color: '#10b981', visual: 'BOLT', projectileSpeed: 500, effectType: 'VAMP', effectVal: 0.8 },
    { id: 'mr_a5', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '靈魂之火', desc: '極高傷消耗大', range: 6, cast: 2.5, cd: 8.0, cost: 80, gain: 0, type: 'SINGLE', power: 350, color: '#f97316', visual: 'FIREBALL', projectileSpeed: 700 },

    // ==========================================
    // ⚕️ RED SUPPORT
    // ==========================================
    { id: 'sr_a1', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '巫毒圖騰', desc: '暈眩', range: 4, cast: 0.8, cd: 9.0, cost: 45, gain: 0, type: 'SINGLE', power: 90, color: '#8b5cf6', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.5 }, // Power 40 -> 90
    { id: 'sr_a2', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '妖術', desc: '變羊(放逐)', range: 5, cast: 0.5, cd: 11.0, cost: 50, gain: 0, type: 'SINGLE', power: 30, color: '#22c55e', visual: 'BOLT', projectileSpeed: 600, ccType: 'BANISH', ccDur: 3.0 }, // CD 14 -> 11, Power 10 -> 30
    { id: 'sr_a3', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '嗜血術', desc: '群體加速(假)', range: 0, cast: 0.8, cd: 15.0, cost: 60, gain: 0, type: 'AOE', aoeRadius: 4, power: -50, color: '#dc2626', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'sr_a4', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '治療鏈', desc: '群體治療', range: 5, cast: 1.0, cd: 7.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 2, power: -100, color: '#fde047', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'sr_a5', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '暗言術:痛', desc: '強力DoT', range: 6, cast: 0.5, cd: 6.0, cost: 35, gain: 0, type: 'SINGLE', power: 40, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 0, ccType: 'DOT', ccForce: 40, ccDur: 5 },
];
