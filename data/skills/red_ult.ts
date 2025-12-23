
import { Role, Skill, Team } from '../../types';

export const RED_ULT: Skill[] = [
    // ==========================================
    // 🛡️ RED TANK
    // ==========================================
    { id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '斷頭台', desc: '單體斬殺', range: 1, cast: 0.8, cd: 2.0, cost: 90, gain: 0, type: 'SINGLE', power: 700, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 2.5 },
    { id: 'tr_u3', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '瘋狂衝撞', desc: '範圍擊退', range: 0, cast: 0.6, cd: 4.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 4, power: 100, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 5 },
    { id: 'tr_u2', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '吸血鬼之血', desc: '極限吸血', range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 150, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.5 },
    { id: 'tr_u4', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '亡靈大軍', desc: '範圍持續傷害', range: 0, cast: 1.0, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 100, color: '#a3e635', visual: 'SMASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 50, ccDur: 8 },
    { id: 'tr_u5', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '反魔法護罩', desc: '群體護盾', range: 0, cast: 0.8, cd: 5.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 4, power: -300, color: '#22c55e', visual: 'SMASH', projectileSpeed: 0 },

    // ==========================================
    // ⚔️ RED WARRIOR
    // ==========================================
    { id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '諸神黃昏', desc: '毀滅打擊', range: 1, cast: 1.0, cd: 2.0, cost: 100, gain: 0, type: 'SINGLE', power: 650, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '血腥旋風', desc: '範圍吸血', range: 2, cast: 1.5, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 280, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.8 },
    { id: 'wr_u3', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '泰坦之握', desc: '雙重打擊', range: 1, cast: 0.8, cd: 3.0, cost: 90, gain: 0, type: 'SINGLE', power: 300, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0, effectType: 'EXECUTE', effectVal: 1.5 },
    { id: 'wr_u4', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '魯莽', desc: '自殺式爆發', range: 1, cast: 0.5, cd: 4.0, cost: 100, gain: 0, type: 'SINGLE', power: 700, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'wr_u5', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '震盪波', desc: '扇形暈眩', range: 0, cast: 0.8, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 150, color: '#f59e0b', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.5 },

    // ==========================================
    // 🏹 RED RANGER
    // ==========================================
    { id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '終極爆破', desc: '極高斬殺', range: 7, cast: 2.0, cd: 4.0, cost: 100, gain: 0, type: 'SINGLE', power: 900, color: '#000000', visual: 'BOLT', projectileSpeed: 900, effectType: 'EXECUTE', effectVal: 2.0 },
    { id: 'rr_u4', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '全彈發射', desc: '全場亂射', range: 0, cast: 0.8, cd: 5.0, cost: 95, gain: 0, type: 'AOE', aoeRadius: 10, power: 180, color: '#f87171', visual: 'BOLT', projectileSpeed: 0 },
    { id: 'rr_u2', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '死亡標記', desc: '必中高傷', range: 8, cast: 1.5, cd: 4.0, cost: 90, gain: 0, type: 'SINGLE', power: 600, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 2000 },
    { id: 'rr_u3', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '戰術核彈', desc: '大範圍毀滅', range: 6, cast: 2.5, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 500, color: '#ef4444', visual: 'BOMB', projectileSpeed: 400, ccType: 'KNOCKBACK', ccForce: 5 },
    { id: 'rr_u5', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '劇毒新星', desc: '全場中毒', range: 0, cast: 1.0, cd: 5.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 8, power: 100, color: '#4ade80', visual: 'SMASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 60, ccDur: 8 },

    // ==========================================
    // 🔮 RED MAGE
    // ==========================================
    { id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '超新星', desc: '大範圍爆炸', range: 5, cast: 2.0, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 500, color: '#fbbf24', visual: 'FIREBALL', projectileSpeed: 250, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'mr_u2', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '毀滅隕石', desc: '暈眩隕石', range: 6, cast: 3.0, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 850, color: '#ea580c', visual: 'FIREBALL', projectileSpeed: 150, ccType: 'STUN', ccDur: 2.5 },
    { id: 'mr_u3', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '混亂之雨', desc: '隨機高傷', range: 0, cast: 1.5, cd: 5.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 6, power: 300, color: '#22c55e', visual: 'FIREBALL', projectileSpeed: 300 },
    { id: 'mr_u4', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '死亡一指', desc: '單體秒殺級', range: 5, cast: 2.5, cd: 6.0, cost: 100, gain: 0, type: 'SINGLE', power: 1200, color: '#be123c', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'mr_u5', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '靈魂收割', desc: '群體吸血', range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 200, color: '#4c1d95', visual: 'SMASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.8 },

    // ==========================================
    // ⚕️ RED SUPPORT
    // ==========================================
    { id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '混亂風暴', desc: '擊退傷害', range: 5, cast: 1.2, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 180, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 200, ccType: 'KNOCKBACK', ccForce: 3 },
    { id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '靈魂連結', desc: '全場沉默', range: 0, cast: 1.5, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 15, power: 60, color: '#1e1b4b', visual: 'SMASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 5.0 },
    { id: 'sr_u3', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '先祖之魂', desc: '群體復活(補)', range: 0, cast: 2.0, cd: 8.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 10, power: -500, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sr_u4', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '大巫毒術', desc: '全場無敵', range: 0, cast: 1.0, cd: 10.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 6, power: 0, color: '#d8b4fe', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 4.0 },
    { id: 'sr_u5', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '血肉詛咒', desc: '群體重傷', range: 0, cast: 1.0, cd: 6.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 8, power: 100, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 50, ccDur: 6.0 },
];
