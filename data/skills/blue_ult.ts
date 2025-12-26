
import { Role, Skill, Team } from '../../types';

export const BLUE_ULT: Skill[] = [
    // 🛡️ TANK: Global Defense / Lockdown
    // VFX: Falling Golden Monoliths
    { id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '神聖領域', desc: '召喚巨石陣暈眩敵人', range: 0, cast: 1.0, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 300, color: '#f59e0b', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.5 },
    // VFX: Ascending Holy Light
    { id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '王者祝福', desc: '自身無敵+持續回血', range: 0, cast: 0.5, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: 0, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0, ccType: 'BANISH', ccDur: 6.0, ccType2: 'HOT', ccForce2: 100, ccDur2: 6.0 },

    // ⚔️ WARRIOR: Shockwave / Disruption
    // VFX: Electric Discharge
    { id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '雷霆跳斬', desc: '突進並釋放電漿衝擊', range: 6, cast: 1.5, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 450, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 900, ccType: 'STUN', ccDur: 2.5 },
    // VFX: Sun Strike Sphere
    { id: 'wb_u2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '破曉', desc: '太陽耀斑爆發', range: 0, cast: 1.0, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 500, color: '#fffbeb', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0 },

    // 🏹 RANGER: Precision / Global
    // VFX: Glass Shatter
    { id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '水晶巨箭', desc: '全圖凍結暈眩', range: 12, cast: 2.0, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: 600, color: '#60a5fa', visual: 'ARROW', projectileSpeed: 1200, ccType: 'STUN', ccDur: 4.5 },
    // VFX: Starfall Rain
    { id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '星隕箭雨', desc: '召喚流星雨轟炸', range: 8, cast: 1.5, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 400, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 600 },

    // 🔮 MAGE: Black Hole / Time Stop
    // VFX: Black Hole Accretion Disk (Generic)
    { id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '事件視界', desc: '黑洞牽引+重力場', range: 7, cast: 2.0, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 350, color: '#0f172a', visual: 'SMASH', projectileSpeed: 200, ccType: 'PULL', ccForce: 6, ccDur: 6.0 },
    // VFX: Ice Spikes
    { id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '絕對零度', desc: '冰河世紀凍結', range: 6, cast: 1.5, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 250, color: '#e0f2fe', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 5.0 },

    // ⚕️ SUPPORT: Miracle
    // VFX: Wings of Light
    { id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖干涉', desc: '光之翼守護(無敵)', range: 5, cast: 0.5, cd: 40.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: -300, color: '#fef08a', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 4.0, ccType2: 'HOT', ccDur2: 4.0, ccForce2: 50 },
    // VFX: Green Life Pillar
    { id: 'sb_u2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '復活之光', desc: '單體完全治癒', range: 8, cast: 2.0, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: -2000, color: '#4ade80', visual: 'BEAM', projectileSpeed: 0 },
];
