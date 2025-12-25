
import { Role, Skill, Team } from '../../types';

export const BLUE_ULT: Skill[] = [
    // 🛡️ TANK: Global Defense / Lockdown
    { id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '神聖領域', desc: '大範圍暈眩', range: 0, cast: 1.0, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 300, color: '#ffffff', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.5 },
    { id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '王者祝福', desc: '自身無敵+回血', range: 0, cast: 0.5, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: 0, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0, ccType: 'BANISH', ccDur: 6.0, ccType2: 'HOT', ccForce2: 100, ccDur2: 6.0 },

    // ⚔️ WARRIOR: Shockwave / Disruption
    { id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '雷霆跳斬', desc: '遠程開戰暈眩', range: 6, cast: 1.5, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 450, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 900, ccType: 'STUN', ccDur: 2.5 },
    { id: 'wb_u2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '破曉', desc: '致盲(暈眩)爆發', range: 0, cast: 1.0, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 500, color: '#fff', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0 },

    // 🏹 RANGER: Precision / Global
    { id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '水晶巨箭', desc: '全圖暈眩', range: 12, cast: 2.0, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: 600, color: '#60a5fa', visual: 'ARROW', projectileSpeed: 1200, ccType: 'STUN', ccDur: 4.5 },
    { id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '星隕箭雨', desc: '持續AOE', range: 8, cast: 1.5, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 400, color: '#f59e0b', visual: 'ARROW', projectileSpeed: 600 },

    // 🔮 MAGE: Black Hole / Time Stop
    { id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '事件視界', desc: '黑洞牽引+傷害', range: 7, cast: 2.0, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 350, color: '#172554', visual: 'SMASH', projectileSpeed: 200, ccType: 'PULL', ccForce: 6, ccDur: 6.0 },
    { id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '絕對零度', desc: '超大範圍凍結', range: 6, cast: 1.5, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 250, color: '#e0f2fe', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 5.0 },

    // ⚕️ SUPPORT: Miracle
    { id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖干涉', desc: '群體無敵', range: 5, cast: 0.5, cd: 40.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: -300, color: '#fef08a', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 4.0, ccType2: 'HOT', ccDur2: 4.0, ccForce2: 50 },
    { id: 'sb_u2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '復活之光', desc: '單體滿血', range: 8, cast: 2.0, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: -2000, color: '#86efac', visual: 'BEAM', projectileSpeed: 0 },
];
