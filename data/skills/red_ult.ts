
import { Role, Skill, Team } from '../../types';

export const RED_ULT: Skill[] = [
    // 🛡️ TANK: Execute / Chaos
    { id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '斷頭台', desc: '單體斬殺', range: 1, cast: 0.8, cd: 20.0, cost: 100, gain: 0, type: 'SINGLE', power: 800, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 3.0 },
    { id: 'tr_u2', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '亡靈大軍', desc: '範圍死區(DoT)', range: 0, cast: 1.0, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 150, color: '#a3e635', visual: 'SMASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 80, ccDur: 8 },

    // ⚔️ WARRIOR: Burst / Lifesteal
    { id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '諸神黃昏', desc: '毀滅單體', range: 1, cast: 1.0, cd: 25.0, cost: 100, gain: 0, type: 'SINGLE', power: 900, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '血腥旋風', desc: '範圍吸血風暴', range: 0, cast: 1.5, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 350, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.0 },

    // 🏹 RANGER: Nuke / Execute
    { id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '終極爆破', desc: '遠程斬殺', range: 8, cast: 2.0, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: 1000, color: '#000000', visual: 'BOLT', projectileSpeed: 1500, effectType: 'EXECUTE', effectVal: 2.5 },
    { id: 'rr_u2', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '戰術核彈', desc: '大範圍毀滅', range: 6, cast: 2.5, cd: 40.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 700, color: '#ef4444', visual: 'BOMB', projectileSpeed: 400, ccType: 'KNOCKBACK', ccForce: 6 },

    // 🔮 MAGE: Chaos / Meteor
    { id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '毀滅隕石', desc: '範圍暈眩重擊', range: 6, cast: 2.5, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 1000, color: '#ea580c', visual: 'FIREBALL', projectileSpeed: 150, ccType: 'STUN', ccDur: 2.0 },
    { id: 'mr_u2', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '死亡一指', desc: '極限單體傷害', range: 6, cast: 2.0, cd: 40.0, cost: 100, gain: 0, type: 'SINGLE', power: 1500, color: '#be123c', visual: 'BEAM', projectileSpeed: 0 },

    // ⚕️ SUPPORT: Mass Curse / Revive
    { id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '靈魂連結', desc: '全場沉默', range: 0, cast: 1.5, cd: 40.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 15, power: 150, color: '#1e1b4b', visual: 'SMASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 6.0 },
    { id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '先祖之魂', desc: '群體復活(大補)', range: 0, cast: 2.0, cd: 45.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 10, power: -600, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0 },
];
