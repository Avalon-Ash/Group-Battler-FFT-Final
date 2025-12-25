
import { Role, Skill, Team } from '../../types';

export const BLUE_ACTIVE: Skill[] = [
    // ==========================================
    // 🛡️ BLUE TANK
    // ==========================================
    { id: 'tb_a1', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '正義審判', desc: '單體暈眩', range: 1, cast: 0.4, cd: 7.0, cost: 40, gain: 0, type: 'SINGLE', power: 130, color: '#eab308', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0 },
    { id: 'tb_a2', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '神聖震擊', desc: '範圍回復', range: 0, cast: 0.5, cd: 8.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: -100, color: '#fef08a', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tb_a3', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '挑釁', desc: '單體嘲諷(牽引)', range: 5, cast: 0.3, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 50, color: '#fde047', visual: 'BEAM', projectileSpeed: 0, ccType: 'PULL', ccForce: 4 },
    { id: 'tb_a4', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '復仇之盾', desc: '遠程擊暈', range: 5, cast: 0.5, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 140, color: '#fbbf24', visual: 'BOLT', projectileSpeed: 800, ccType: 'STUN', ccDur: 1.5 },
    { id: 'tb_a5', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '聖域守護', desc: '擊退周圍', range: 0, cast: 0.6, cd: 9.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 3, power: 80, color: '#fff', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 5 },

    // ==========================================
    // ⚔️ BLUE WARRIOR
    // ==========================================
    { id: 'wb_a1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '半月斬', desc: '前方順劈', range: 1, cast: 0.5, cd: 5.0, cost: 35, gain: 0, type: 'AOE', aoeRadius: 1, power: 150, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_a2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '無畏衝鋒', desc: '衝鋒暈眩', range: 5, cast: 0.2, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 150, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.5 },
    { id: 'wb_a3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '雷霆一擊', desc: '範圍緩速', range: 0, cast: 0.6, cd: 6.0, cost: 40, gain: 0, type: 'AOE', aoeRadius: 2, power: 110, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 3 }, // Force 2 -> 3
    { id: 'wb_a4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '弱點擊破', desc: '爆發傷害', range: 1, cast: 0.5, cd: 6.0, cost: 30, gain: 0, type: 'SINGLE', power: 200, color: '#1d4ed8', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_a5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '劍刃屏障', desc: '自我招架(補血)', range: 0, cast: 0.2, cd: 10.0, cost: 30, gain: 0, type: 'SINGLE', power: -150, color: '#eff6ff', visual: 'BEAM', projectileSpeed: 0 },

    // ==========================================
    // 🏹 BLUE RANGER
    // ==========================================
    { id: 'rb_a1', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '多重射擊', desc: '範圍箭雨', range: 7, cast: 0.8, cd: 6.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: 110, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 800 },
    { id: 'rb_a2', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '擊退矢', desc: '擊退敵人', range: 6, cast: 0.6, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 90, color: '#fff', visual: 'ARROW', projectileSpeed: 900, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'rb_a3', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '狙擊', desc: '遠程斬殺', range: 9, cast: 1.5, cd: 10.0, cost: 50, gain: 0, type: 'SINGLE', power: 280, color: '#f59e0b', visual: 'BOLT', projectileSpeed: 1500, effectType: 'EXECUTE', effectVal: 1.5 },
    { id: 'rb_a4', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '冰霜陷阱', desc: '凍結', range: 6, cast: 0.8, cd: 10.0, cost: 45, gain: 0, type: 'SINGLE', power: 130, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 500, ccType: 'STUN', ccDur: 2.0 },
    { id: 'rb_a5', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '壓制射擊', desc: '沉默射擊', range: 7, cast: 0.7, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 100, color: '#94a3b8', visual: 'ARROW', projectileSpeed: 1000, ccType: 'SILENCE', ccDur: 4.0 },

    // ==========================================
    // 🔮 BLUE MAGE
    // ==========================================
    { id: 'mb_a1', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '奧術衝擊', desc: '高傷單體', range: 7, cast: 1.0, cd: 5.0, cost: 40, gain: 0, type: 'SINGLE', power: 220, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 700 },
    { id: 'mb_a2', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '變形術', desc: '單體放逐', range: 6, cast: 0.8, cd: 10.0, cost: 50, gain: 0, type: 'SINGLE', power: 10, color: '#d946ef', visual: 'BOLT', projectileSpeed: 600, ccType: 'BANISH', ccDur: 3.5 },
    { id: 'mb_a3', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '冰霜新星', desc: '範圍凍結', range: 0, cast: 0.6, cd: 10.0, cost: 50, gain: 0, type: 'AOE', aoeRadius: 3, power: 140, color: '#bfdbfe', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.5 },
    { id: 'mb_a4', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '暴風雪', desc: '持續範圍傷', range: 6, cast: 1.2, cd: 8.0, cost: 60, gain: 0, type: 'AOE', aoeRadius: 3, power: 150, color: '#e0f2fe', visual: 'BOLT', projectileSpeed: 300 },
    { id: 'mb_a5', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '法力燃燒', desc: '大量燒魔', range: 6, cast: 0.8, cd: 8.0, cost: 30, gain: 0, type: 'SINGLE', power: 70, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 80 },

    // ==========================================
    // ⚕️ BLUE SUPPORT
    // ==========================================
    { id: 'sb_a1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '快速治療', desc: '單體大補', range: 6, cast: 0.6, cd: 4.0, cost: 40, gain: 0, type: 'SINGLE', power: -220, color: '#86efac', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_a2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '驅逐', desc: '單體擊退', range: 5, cast: 0.4, cd: 7.0, cost: 35, gain: 0, type: 'SINGLE', power: 70, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 4 },
    { id: 'sb_a3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '神聖護盾', desc: '治療+HoT', range: 6, cast: 0.5, cd: 6.0, cost: 45, gain: 0, type: 'SINGLE', power: -120, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccDur: 6, ccForce: 25 },
    { id: 'sb_a4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '沉默封印', desc: '遠程沉默', range: 7, cast: 0.5, cd: 9.0, cost: 40, gain: 0, type: 'SINGLE', power: 80, color: '#cbd5e1', visual: 'BOLT', projectileSpeed: 900, ccType: 'SILENCE', ccDur: 4.0 },
    { id: 'sb_a5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '群體回復', desc: '小範圍治療', range: 0, cast: 1.0, cd: 8.0, cost: 60, gain: 0, type: 'AOE', aoeRadius: 3, power: -180, color: '#4ade80', visual: 'SMASH', projectileSpeed: 0 },
];
