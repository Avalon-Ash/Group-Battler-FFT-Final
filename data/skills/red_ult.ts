
import { Role, Skill, Team } from '../../types';

export const RED_ULT: Skill[] = [
    // 🛡️ TANK: Execute / Chaos
    // VFX: Giant Guillotine Blade
    { id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '斷頭台', desc: '處刑巨刃斬殺', range: 1, cast: 0.8, cd: 20.0, cost: 100, gain: 0, type: 'SINGLE', power: 800, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 3.0 },
    // VFX: Green Fog & Tombstones
    { id: 'tr_u2', role: Role.TANK, team: Team.RED, tag: 'ULT', name: '亡靈大軍', desc: '召喚墓碑腐化大地', range: 0, cast: 1.0, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 150, color: '#a3e635', visual: 'SMASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 80, ccDur: 8 },

    // ⚔️ WARRIOR: Burst / Lifesteal
    // VFX: Magma Eruption
    { id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '諸神黃昏', desc: '熔岩地裂爆發', range: 1, cast: 1.0, cd: 25.0, cost: 100, gain: 0, type: 'SINGLE', power: 900, color: '#ea580c', visual: 'SMASH', projectileSpeed: 0 },
    // VFX: Blood Tornado
    { id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', name: '血腥旋風', desc: '鮮血龍捲風', range: 0, cast: 1.5, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 350, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.0 },

    // 🏹 RANGER: Nuke / Execute
    // VFX: Railgun Beam
    { id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '終極爆破', desc: '磁軌砲貫穿', range: 8, cast: 2.0, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: 1000, color: '#000000', visual: 'BOLT', projectileSpeed: 1500, effectType: 'EXECUTE', effectVal: 2.5 },
    // VFX: Mushroom Cloud
    { id: 'rr_u2', role: Role.RANGER, team: Team.RED, tag: 'ULT', name: '戰術核彈', desc: '蕈狀雲毀滅打擊', range: 6, cast: 2.5, cd: 40.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 700, color: '#ef4444', visual: 'BOMB', projectileSpeed: 400, ccType: 'KNOCKBACK', ccForce: 6 },

    // 🔮 MAGE: Chaos / Meteor
    // VFX: Falling Meteor
    { id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '毀滅隕石', desc: '召喚隕石撞擊', range: 6, cast: 2.5, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 1000, color: '#f97316', visual: 'FIREBALL', projectileSpeed: 150, ccType: 'STUN', ccDur: 2.0 },
    // VFX: Red Death Ray
    { id: 'mr_u2', role: Role.MAGE, team: Team.RED, tag: 'ULT', name: '死亡一指', desc: '紅色死亡射線', range: 6, cast: 2.0, cd: 40.0, cost: 100, gain: 0, type: 'SINGLE', power: 1500, color: '#be123c', visual: 'BEAM', projectileSpeed: 0 },

    // ⚕️ SUPPORT: Mass Curse / Revive
    // VFX: Void Web
    { id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '靈魂連結', desc: '虛空鎖鏈沉默', range: 0, cast: 1.5, cd: 40.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 15, power: 150, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 6.0 },
    // VFX: Green Spirit Fire
    { id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', name: '先祖之魂', desc: '圖騰之火復活', range: 0, cast: 2.0, cd: 45.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 10, power: -600, color: '#bef264', visual: 'BEAM', projectileSpeed: 0 },
];
