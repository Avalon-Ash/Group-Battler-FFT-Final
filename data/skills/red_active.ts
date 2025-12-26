
import { Role, Skill, Team } from '../../types';

export const RED_ACTIVE: Skill[] = [
    // ==========================================
    // 🛡️ RED TANK (Aggressive Tank)
    // ==========================================
    { id: 'tr_a1', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '死亡之鉤', desc: '單體牽引', range: 5, cast: 0.6, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: 80, color: '#450a0a', visual: 'BOLT', projectileSpeed: 800, ccType: 'PULL', ccForce: 5 },
    { id: 'tr_a2', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '絞殺', desc: '沉默+傷害', range: 1, cast: 0.5, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 150, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 3.0 },
    { id: 'tr_a3', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', name: '鮮血沸騰', desc: '範圍吸血', range: 0, cast: 0.5, cd: 8.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: 80, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.6 },

    // ==========================================
    // ⚔️ RED WARRIOR (Berserker)
    // ==========================================
    { id: 'wr_a1', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '斬殺', desc: '殘血收割', range: 1, cast: 0.4, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 150, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 2.0 },
    { id: 'wr_a2', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '旋風斬', desc: '範圍傷害', range: 0, cast: 0.8, cd: 7.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 2, power: 140, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_a3', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', name: '撕裂傷口', desc: '重度流血', range: 1, cast: 0.4, cd: 6.0, cost: 35, gain: 0, type: 'SINGLE', power: 80, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 60, ccDur: 4 },

    // ==========================================
    // 🏹 RED RANGER (Explosive)
    // ==========================================
    { id: 'rr_a1', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '穿甲彈', desc: '極高單體傷', range: 6, cast: 1.5, cd: 8.0, cost: 45, gain: 0, type: 'SINGLE', power: 250, color: '#18181b', visual: 'BOLT', projectileSpeed: 1500 },
    { id: 'rr_a2', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '爆炸射擊', desc: '範圍火傷', range: 5, cast: 1.0, cd: 9.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 2, power: 140, color: '#f87171', visual: 'FIREBALL', projectileSpeed: 800 },
    { id: 'rr_a3', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', name: '震盪彈', desc: '擊退', range: 5, cast: 0.8, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: 100, color: '#52525b', visual: 'BOLT', projectileSpeed: 800, ccType: 'KNOCKBACK', ccForce: 4 },

    // ==========================================
    // 🔮 RED MAGE (Warlock)
    // ==========================================
    { id: 'mr_a1', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '暗影灼燒', desc: '斬殺法術', range: 5, cast: 0.6, cd: 6.0, cost: 40, gain: 0, type: 'SINGLE', power: 180, color: '#581c87', visual: 'BOLT', projectileSpeed: 900, effectType: 'EXECUTE', effectVal: 1.8 },
    { id: 'mr_a2', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '地獄烈焰', desc: '範圍持續傷', range: 5, cast: 1.0, cd: 8.0, cost: 55, gain: 0, type: 'AOE', aoeRadius: 3, power: 120, color: '#ef4444', visual: 'FIREBALL', projectileSpeed: 450, ccType: 'DOT', ccForce: 40, ccDur: 5 },
    { id: 'mr_a3', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', name: '恐懼術', desc: '短暫放逐', range: 4, cast: 0.5, cd: 12.0, cost: 45, gain: 0, type: 'SINGLE', power: 30, color: '#9333ea', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 2.5 },

    // ==========================================
    // ⚕️ RED SUPPORT (Debuffer)
    // ==========================================
    { id: 'sr_a1', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '治療鏈', desc: '群體治療', range: 5, cast: 1.0, cd: 6.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 2, power: -140, color: '#facc15', visual: 'BOLT', projectileSpeed: 600 },
    { id: 'sr_a2', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '妖術', desc: '變羊(放逐)', range: 5, cast: 0.5, cd: 12.0, cost: 50, gain: 0, type: 'SINGLE', power: 20, color: '#84cc16', visual: 'BOLT', projectileSpeed: 700, ccType: 'BANISH', ccDur: 3.0 },
    { id: 'sr_a3', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', name: '暗言術:痛', desc: '強力DoT', range: 6, cast: 0.5, cd: 5.0, cost: 35, gain: 0, type: 'SINGLE', power: 50, color: '#7e22ce', visual: 'BOLT', projectileSpeed: 0, ccType: 'DOT', ccForce: 50, ccDur: 6 },
];
