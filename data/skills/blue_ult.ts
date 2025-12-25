
import { Role, Skill, Team } from '../../types';

export const BLUE_ULT: Skill[] = [
    // ==========================================
    // 🛡️ BLUE TANK
    // ==========================================
    { id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '不朽壁壘', desc: '海量自我回復', range: 0, cast: 0.5, cd: 3.0, cost: 100, gain: 0, type: 'SINGLE', power: 0, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 500, ccDur: 8 },
    { id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '神聖領域', desc: '範圍暈眩', range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 250, color: '#ffffff', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.0 }, // Power 150 -> 250
    { id: 'tb_u3', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '正義裁決', desc: '單體超重擊', range: 1, cast: 1.2, cd: 4.0, cost: 100, gain: 0, type: 'SINGLE', power: 800, color: '#f59e0b', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.5 },
    { id: 'tb_u4', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '聖盾衝撞', desc: '範圍擊退', range: 0, cast: 0.8, cd: 5.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 5, power: 300, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 8 }, // Power 250 -> 300
    { id: 'tb_u5', role: Role.TANK, team: Team.BLUE, tag: 'ULT', name: '王者祝福', desc: '自身無敵回復', range: 0, cast: 0.5, cd: 6.0, cost: 100, gain: 0, type: 'SINGLE', power: 0, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0, ccType: 'BANISH', ccDur: 5.0, ccType2: 'HOT', ccForce2: 250, ccDur2: 5.0 },

    // ==========================================
    // ⚔️ BLUE WARRIOR
    // ==========================================
    { id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '無雙亂舞', desc: '毀滅傷害', range: 0, cast: 1.2, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 2, power: 550, color: '#1d4ed8', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_u2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '劍刃風暴', desc: '持續AoE', range: 0, cast: 2.5, cd: 3.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 700, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_u3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '審判之劍', desc: '斬殺+沉默', range: 1, cast: 1.0, cd: 4.0, cost: 100, gain: 0, type: 'SINGLE', power: 800, color: '#fbbf24', visual: 'SMASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 2.0, ccType: 'SILENCE', ccDur: 6.0 }, // Power 750 -> 800
    { id: 'wb_u4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '雷霆跳斬', desc: '遠程範圍暈眩', range: 6, cast: 1.5, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 3, power: 550, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 900, ccType: 'STUN', ccDur: 2.5 }, // Power 450 -> 550
    { id: 'wb_u5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', name: '破曉', desc: '致盲閃光', range: 0, cast: 0.8, cd: 6.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 4, power: 450, color: '#fff', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 3.0 }, // Power 350 -> 450

    // ==========================================
    // 🏹 BLUE RANGER
    // ==========================================
    { id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '星隕箭雨', desc: '大範圍AOE', range: 8, cast: 1.2, cd: 3.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 4, power: 400, color: '#f59e0b', visual: 'ARROW', projectileSpeed: 700 },
    { id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '水晶巨箭', desc: '全圖暈眩', range: 12, cast: 1.5, cd: 5.0, cost: 100, gain: 0, type: 'SINGLE', power: 700, color: '#60a5fa', visual: 'ARROW', projectileSpeed: 800, ccType: 'STUN', ccDur: 4.0 }, // Power 600 -> 700
    { id: 'rb_u3', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '精準狙殺', desc: '必殺單體', range: 10, cast: 2.5, cd: 5.0, cost: 100, gain: 0, type: 'SINGLE', power: 1200, color: '#dc2626', visual: 'BOLT', projectileSpeed: 1800, effectType: 'EXECUTE', effectVal: 2.5 },
    { id: 'rb_u4', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '冰河時代', desc: '範圍凍結', range: 7, cast: 1.2, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 400, color: '#bfdbfe', visual: 'BOMB', projectileSpeed: 600, ccType: 'STUN', ccDur: 4.0 }, // Power 300 -> 400
    { id: 'rb_u5', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', name: '月神軌道', desc: '全場隨機轟炸', range: 0, cast: 1.0, cd: 5.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 10, power: 400, color: '#e0e7ff', visual: 'BOLT', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 3.0 }, // Power 350 -> 400

    // ==========================================
    // 🔮 BLUE MAGE
    // ==========================================
    // Updated: High Pull Force (5), 6s Duration for maximum suction effect
    { id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '事件視界', desc: '黑洞牽引+緩速', range: 6, cast: 1.5, cd: 5.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 5, power: 400, color: '#172554', visual: 'SMASH', projectileSpeed: 200, ccType: 'PULL', ccForce: 6, ccDur: 6.0 }, 
    { id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '絕對零度', desc: '大範圍凍結', range: 6, cast: 1.2, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: 300, color: '#e0f2fe', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 4.0 }, // Power 200 -> 300
    { id: 'mb_u3', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '奧術洪流', desc: '範圍沉默+燒魔', range: 0, cast: 0.8, cd: 5.0, cost: 90, gain: 0, type: 'AOE', aoeRadius: 5, power: 400, color: '#7c3aed', visual: 'SMASH', projectileSpeed: 0, ccType: 'SILENCE', ccDur: 5.0, effectType: 'MANA_BURN', effectVal: 150 }, // Power 300 -> 400
    { id: 'mb_u4', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '時空裂隙', desc: '單體長時放逐', range: 7, cast: 1.0, cd: 8.0, cost: 100, gain: 0, type: 'SINGLE', power: 200, color: '#d946ef', visual: 'BOLT', projectileSpeed: 500, ccType: 'BANISH', ccDur: 8.0 }, // Power 150 -> 200
    { id: 'mb_u5', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', name: '天界雷擊', desc: '極高單體爆發', range: 8, cast: 2.0, cd: 6.0, cost: 100, gain: 0, type: 'SINGLE', power: 1400, color: '#facc15', visual: 'BOLT', projectileSpeed: 0 },

    // ==========================================
    // ⚕️ BLUE SUPPORT
    // ==========================================
    { id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖讚美詩', desc: '全場回復', range: 0, cast: 1.5, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 10, power: -200, color: '#4ade80', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 150, ccDur: 8 },
    { id: 'sb_u2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '復活之光', desc: '單體極效治療', range: 7, cast: 2.0, cd: 8.0, cost: 100, gain: 0, type: 'SINGLE', power: -1500, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_u3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '神聖干涉', desc: '範圍無敵', range: 5, cast: 0.5, cd: 8.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 4, power: -400, color: '#fef08a', visual: 'SMASH', projectileSpeed: 0, ccType: 'BANISH', ccDur: 4.0, ccType2: 'HOT', ccDur2: 4.0 },
    { id: 'sb_u4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '守護天使', desc: '全場護盾(假血)', range: 0, cast: 1.0, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 12, power: -600, color: '#e0f2fe', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'sb_u5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', name: '法力之潮', desc: '全場回魔', range: 0, cast: 1.0, cd: 6.0, cost: 100, gain: 0, type: 'AOE', aoeRadius: 12, power: 0, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 150 },
];
