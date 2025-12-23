
import { Role, Skill, Team } from '../../types';

export const BLUE_ULT: Skill[] = [
    // --- TANK ---
    { id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '不朽壁壘', desc: '海量自我回復', range: 0, cast: 0.5, cd: 3.0, cost: 100, gain: 0, type: 'SINGLE', power: 0, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 400, ccDur: 6 },
    { id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '神聖領域', desc: '範圍暈眩', range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 80, color: '#ffffff', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.5 },

    // --- WARRIOR ---
    { id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '無雙亂舞', desc: '毀滅傷害', range: 0, cast: 1.2, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 400, color: '#1d4ed8', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'new_w_bladestorm', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '劍刃風暴', desc: '持續AoE', range: 0, cast: 2.5, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 500, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0 },

    // --- RANGER ---
    { id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '星隕箭雨', desc: '大範圍AOE', range: 7, cast: 1.2, cd: 3.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 3, power: 300, color: '#f59e0b', visual: 'ARROW', projectileSpeed: 600 },
    { id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '水晶巨箭', desc: '全圖暈眩', range: 12, cast: 1.5, cd: 5.0, cost: 100, gain: 0, type: 'SINGLE', power: 300, color: '#60a5fa', visual: 'ARROW', projectileSpeed: 700, ccType: 'STUN', ccDur: 3.0 },

    // --- MAGE ---
    { id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '事件視界', desc: '範圍黑洞牽引', range: 5, cast: 1.5, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 250, color: '#172554', visual: 'FIREBALL', projectileSpeed: 200, ccType: 'PULL', ccForce: 4 },
    { id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '絕對零度', desc: '大範圍凍結', range: 5, cast: 1.2, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 120, color: '#e0f2fe', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.0 },

    // --- SUPPORT ---
    { id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖讚美詩', desc: '全場回復', range: 0, cast: 1.5, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 8, power: -100, color: '#4ade80', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 120, ccDur: 8 },
    { id: 'sb_u3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖干涉', desc: '範圍無敵', range: 4, cast: 0.5, cd: 8.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: -300, color: '#fef08a', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 3.0, ccType2: 'HOT', ccDur2: 3.0 },
];
