
import { Role, Skill, Team } from '../../types';

export const RED_ULT: Skill[] = [
    // --- TANK ---
    { id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '斷頭台', desc: '單體斬殺', range: 1, cast: 0.8, cd: 2.0, cost: 90, gain: 0, type: 'SINGLE', power: 700, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 3.5 },
    { id: 'tr_u3', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '瘋狂衝撞', desc: '範圍擊退', range: 0, cast: 0.6, cd: 4.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 4, power: 100, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 5 },

    // --- WARRIOR ---
    { id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '諸神黃昏', desc: '毀滅打擊', range: 1, cast: 1.0, cd: 2.0, cost: 100, gain: 0, type: 'SINGLE', power: 650, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '血腥旋風', desc: '範圍吸血', range: 2, cast: 1.5, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 280, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.2 },

    // --- RANGER ---
    { id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '終極爆破', desc: '極高斬殺', range: 7, cast: 2.0, cd: 4.0, cost: 100, gain: 0, type: 'SINGLE', power: 900, color: '#000000', visual: 'BOLT', projectileSpeed: 900, effectType: 'EXECUTE', effectVal: 2.0 },
    { id: 'rr_u4', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '全彈發射', desc: '全場亂射', range: 0, cast: 0.8, cd: 5.0, cost: 95, gain: 0, type: 'AOE', aoeRadius: 10, power: 180, color: '#f87171', visual: 'BOLT', projectileSpeed: 0 },

    // --- MAGE ---
    { id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '超新星', desc: '大範圍爆炸', range: 5, cast: 2.0, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 500, color: '#fbbf24', visual: 'FIREBALL', projectileSpeed: 250, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'new_m_meteor', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '毀滅隕石', desc: '暈眩隕石', range: 6, cast: 3.0, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 850, color: '#ea580c', visual: 'FIREBALL', projectileSpeed: 150, ccType: 'STUN', ccDur: 2.5 },

    // --- SUPPORT ---
    { id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '混亂風暴', desc: '擊退傷害', range: 5, cast: 1.2, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 180, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 200, ccType: 'KNOCKBACK', ccForce: 3 },
    { id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '靈魂連結', desc: '全場沉默', range: 0, cast: 1.5, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 15, power: 60, color: '#1e1b4b', visual: 'SMASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 5.0 }
];
