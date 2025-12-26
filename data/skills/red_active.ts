
import { Role, Skill, Team } from '../../types';

export const RED_ACTIVE: Skill[] = [
    // 🛡️ RED TANK
    { id: 'tr_a1', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '死亡之鉤', desc: '單體牽引', range: 5, cast: 0.6, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: 80, color: '#450a0a', visual: 'BOLT', projectileSpeed: 800, ccType: 'PULL', ccForce: 5 },
    { id: 'tr_a2', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '絞殺', desc: '沉默+傷害', range: 1, cast: 0.5, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 150, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 3.0 },
    { id: 'tr_a3', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '鮮血沸騰', desc: '範圍吸血', range: 0, cast: 0.5, cd: 8.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: 80, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.6 },
    { id: 'tr_a4', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '瘟疫爆發', desc: '範圍中毒', range: 0, cast: 0.8, cd: 10.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 3, power: 60, color: '#a3e635', visual: 'SMASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 25, ccDur: 5 },
    { id: 'tr_a5', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '反魔法護罩', desc: '護盾與回魔', range: 0, cast: 0.4, cd: 12.0, cost: 30, gain: 0, type: 'SINGLE', power: -150, color: '#a855f7', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 50 },

    // ⚔️ RED WARRIOR
    { id: 'wr_a1', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '斬殺', desc: '殘血收割', range: 1, cast: 0.4, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 150, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 2.0 },
    { id: 'wr_a2', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '旋風斬', desc: '範圍傷害', range: 0, cast: 0.8, cd: 7.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 2, power: 140, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_a3', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '撕裂傷口', desc: '重度流血', range: 1, cast: 0.4, cd: 6.0, cost: 35, gain: 0, type: 'SINGLE', power: 80, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 60, ccDur: 4 },
    { id: 'wr_a4', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '戰爭怒吼', desc: '範圍嘲諷與吸血', range: 0, cast: 0.3, cd: 10.0, cost: 35, gain: 0, type: 'AOE', aoeRadius: 3, power: 0, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, ccType: 'TAUNT', ccDur: 2.5, effectType: 'VAMP', effectVal: 0.5 },
    { id: 'wr_a5', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '野蠻衝撞', desc: '擊退並暈眩', range: 3, cast: 0.5, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: 120, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 6 },

    // 🏹 RED RANGER
    { id: 'rr_a1', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '穿甲彈', desc: '極高單體傷', range: 6, cast: 1.5, cd: 8.0, cost: 45, gain: 0, type: 'SINGLE', power: 250, color: '#18181b', visual: 'BOLT', projectileSpeed: 1500 },
    { id: 'rr_a2', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '爆炸射擊', desc: '範圍火傷', range: 5, cast: 1.0, cd: 9.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 2, power: 140, color: '#f87171', visual: 'FIREBALL', projectileSpeed: 800 },
    { id: 'rr_a3', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '震盪彈', desc: '緩速擊退', range: 5, cast: 0.8, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: 100, color: '#52525b', visual: 'BOLT', projectileSpeed: 800, ccType: 'KNOCKBACK', ccForce: 4, ccType2: 'SLOW', ccDur2: 3.0 },
    { id: 'rr_a4', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '集束炸彈', desc: '隨機多次傷害', range: 6, cast: 1.2, cd: 12.0, cost: 55, gain: 0, type: 'AOE', aoeRadius: 3, power: 80, color: '#fca5a5', visual: 'BOMB', projectileSpeed: 600, ccType: 'STUN', ccDur: 0.5 },
    { id: 'rr_a5', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '腐蝕酸液', desc: '範圍破甲', range: 5, cast: 0.8, cd: 10.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: 60, color: '#a3e635', visual: 'BOMB', projectileSpeed: 500, ccType: 'DOT', ccForce: 20, ccDur: 5 },

    // 🔮 RED MAGE
    { id: 'mr_a1', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '暗影灼燒', desc: '斬殺法術', range: 5, cast: 0.6, cd: 6.0, cost: 40, gain: 0, type: 'SINGLE', power: 180, color: '#581c87', visual: 'BOLT', projectileSpeed: 900, effectType: 'EXECUTE', effectVal: 1.8 },
    { id: 'mr_a2', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '地獄烈焰', desc: '範圍持續傷', range: 5, cast: 1.0, cd: 8.0, cost: 55, gain: 0, type: 'AOE', aoeRadius: 3, power: 120, color: '#ef4444', visual: 'FIREBALL', projectileSpeed: 450, ccType: 'DOT', ccForce: 40, ccDur: 5 },
    { id: 'mr_a3', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '恐懼術', desc: '恐懼目標', range: 4, cast: 0.5, cd: 12.0, cost: 45, gain: 0, type: 'SINGLE', power: 30, color: '#9333ea', visual: 'SMASH', projectileSpeed: 0, ccType: 'FEAR', ccDur: 3.5 },
    { id: 'mr_a4', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '靈魂碎片', desc: '回復魔力', range: 0, cast: 0.8, cd: 15.0, cost: 0, gain: 80, type: 'SINGLE', power: 0, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 50 },
    { id: 'mr_a5', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '混沌之箭', desc: '極高隨機傷害', range: 6, cast: 1.5, cd: 10.0, cost: 60, gain: 0, type: 'SINGLE', power: 300, color: '#22c55e', visual: 'BOLT', projectileSpeed: 600 },

    // ⚕️ RED SUPPORT
    { id: 'sr_a1', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '治療鏈', desc: '群體治療', range: 5, cast: 1.0, cd: 6.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 2, power: -140, color: '#facc15', visual: 'BOLT', projectileSpeed: 600 },
    { id: 'sr_a2', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '妖術', desc: '變羊(放逐)', range: 5, cast: 0.5, cd: 12.0, cost: 50, gain: 0, type: 'SINGLE', power: 20, color: '#84cc16', visual: 'BOLT', projectileSpeed: 700, ccType: 'BANISH', ccDur: 3.0 },
    { id: 'sr_a3', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '暗言術:痛', desc: '強力DoT', range: 6, cast: 0.5, cd: 5.0, cost: 35, gain: 0, type: 'SINGLE', power: 50, color: '#7e22ce', visual: 'BOLT', projectileSpeed: 0, ccType: 'DOT', ccForce: 50, ccDur: 6 },
    { id: 'sr_a4', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '嗜血術', desc: '範圍回魔加速', range: 0, cast: 0.8, cd: 15.0, cost: 60, gain: 0, type: 'AOE', aoeRadius: 3, power: 0, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 30 },
    { id: 'sr_a5', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '地縛圖騰', desc: '範圍定身', range: 0, cast: 0.6, cd: 10.0, cost: 40, gain: 0, type: 'AOE', aoeRadius: 4, power: 40, color: '#78350f', visual: 'SMASH', projectileSpeed: 0, ccType: 'ROOT', ccDur: 3.0 },
];