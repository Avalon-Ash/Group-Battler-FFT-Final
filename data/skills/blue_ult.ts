
import { Role, Skill, Team } from '../../types';

export const BLUE_ULT: Skill[] = [
    // 🛡️ TANK: Global Defense / Lockdown
    // VFX: Falling Golden Monoliths
    { id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '神聖領域', desc: '召喚巨石陣暈眩敵人', range: 0, cast: 1.0, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 300, color: '#f59e0b', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.5 },
    // VFX: Ascending Holy Light
    { id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '王者祝福', desc: '自身無敵+持續回血', range: 0, cast: 0.5, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: 0, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0, ccType: 'BANISH', ccDur: 6.0, ccType2: 'HOT', ccForce2: 100, ccDur2: 6.0 },
    { id: 'tb_u3', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '神盾降臨', desc: '全體擊退+護盾', range: 0, cast: 0.8, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 200, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 8 },
    { id: 'tb_u4', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '泰坦重擊', desc: '單體超長暈眩', range: 1, cast: 1.2, cd: 25.0, cost: 100, gain: 0, type: 'SINGLE', power: 500, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 5.0 },
    { id: 'tb_u5', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '最終防線', desc: '持續回血與燃魔', range: 0, cast: 0.5, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: -50, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 100, ccDur: 8, effectType: 'MANA_BURN', effectVal: 20 },

    // ⚔️ WARRIOR: Shockwave / Disruption
    // VFX: Electric Discharge
    { id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '雷霆跳斬', desc: '突進並釋放電漿衝擊', range: 6, cast: 1.5, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 450, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 900, ccType: 'STUN', ccDur: 2.5 },
    // VFX: Sun Strike Sphere
    { id: 'wb_u2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '破曉', desc: '太陽耀斑爆發', range: 0, cast: 1.0, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 500, color: '#fffbeb', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0 },
    { id: 'wb_u3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '王者之劍', desc: '斬殺虛弱目標', range: 2, cast: 0.8, cd: 20.0, cost: 100, gain: 0, type: 'SINGLE', power: 800, color: '#facc15', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 2.5 },
    { id: 'wb_u4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '劍刃風暴', desc: '持續範圍高傷', range: 0, cast: 0.2, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 150, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 100, ccDur: 4 },
    { id: 'wb_u5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '光速衝擊', desc: '全圖突進暈眩', range: 10, cast: 1.0, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: 400, color: '#e0f2fe', visual: 'BEAM', projectileSpeed: 2000, ccType: 'STUN', ccDur: 3.0 },

    // 🏹 RANGER: Precision / Global
    // VFX: Glass Shatter
    { id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '水晶巨箭', desc: '全圖凍結暈眩', range: 12, cast: 2.0, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: 600, color: '#60a5fa', visual: 'ARROW', projectileSpeed: 1200, ccType: 'STUN', ccDur: 4.5 },
    // VFX: Starfall Rain
    { id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '星隕箭雨', desc: '召喚流星雨轟炸', range: 8, cast: 1.5, cd: 25.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 400, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 600 },
    { id: 'rb_u3', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '軌道轟炸', desc: '科技光束打擊', range: 10, cast: 2.5, cd: 35.0, cost: 100, gain: 0, type: 'SINGLE', power: 1200, color: '#22d3ee', visual: 'BEAM', projectileSpeed: 3000 },
    { id: 'rb_u4', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '絕對封鎖', desc: '範圍長時間沉默', range: 8, cast: 1.0, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 200, color: '#8b5cf6', visual: 'BOMB', projectileSpeed: 800, ccType: 'SILENCE', ccDur: 8.0 },
    { id: 'rb_u5', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '超載連射', desc: '極速單體爆發', range: 6, cast: 3.0, cd: 25.0, cost: 100, gain: 0, type: 'SINGLE', power: 250, color: '#fff', visual: 'ARROW', projectileSpeed: 1500, ccType: 'DOT', ccForce: 150, ccDur: 2.0 }, // Simulated rapid fire via heavy DoT

    // 🔮 MAGE: Black Hole / Time Stop
    // VFX: Black Hole Accretion Disk (Generic)
    { id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '事件視界', desc: '黑洞牽引+重力場', range: 7, cast: 2.0, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 350, color: '#0f172a', visual: 'SMASH', projectileSpeed: 200, ccType: 'PULL', ccForce: 6, ccDur: 6.0 },
    // VFX: Ice Spikes
    { id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '絕對零度', desc: '冰河世紀凍結', range: 6, cast: 1.5, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 250, color: '#e0f2fe', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 5.0 },
    { id: 'mb_u3', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '時間停止', desc: '大範圍凝滯', range: 0, cast: 1.0, cd: 40.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 10, power: 50, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 4.0 },
    { id: 'mb_u4', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '奧術洪流', desc: '全體沉默與燒魔', range: 0, cast: 1.2, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 6, power: 200, color: '#a855f7', visual: 'SMASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 5.0, effectType: 'MANA_BURN', effectVal: 100 },
    { id: 'mb_u5', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '聚能光束', desc: '持續性雷射傷害', range: 8, cast: 3.0, cd: 25.0, cost: 100, gain: 0, type: 'SINGLE', power: 800, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, ccType: 'DOT', ccForce: 200, ccDur: 3.0 },

    // ⚕️ SUPPORT: Miracle
    // VFX: Wings of Light
    { id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖干涉', desc: '光之翼守護(無敵)', range: 5, cast: 0.5, cd: 40.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: -300, color: '#fef08a', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 4.0, ccType2: 'HOT', ccDur2: 4.0, ccForce2: 50 },
    // VFX: Green Life Pillar
    { id: 'sb_u2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '復活之光', desc: '單體完全治癒', range: 8, cast: 2.0, cd: 30.0, cost: 100, gain: 0, type: 'SINGLE', power: -2000, color: '#4ade80', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_u3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '英勇讚美詩', desc: '全體極速回魔', range: 0, cast: 3.0, cd: 35.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 10, power: 0, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 200 },
    { id: 'sb_u4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神之怒', desc: '擊退並暈眩敵人', range: 0, cast: 1.0, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 250, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 8, ccType2: 'STUN', ccDur2: 2.0 },
    { id: 'sb_u5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '寧靜之雨', desc: '全場持續治療', range: 0, cast: 2.0, cd: 30.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 20, power: -50, color: '#86efac', visual: 'SMASH', projectileSpeed: 0, ccType: 'HOT', ccForce: 50, ccDur: 8.0 },
];
