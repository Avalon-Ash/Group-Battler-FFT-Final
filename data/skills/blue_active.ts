
import { Role, Skill, Team } from '../../types';

export const BLUE_ACTIVE: Skill[] = [
    // ==========================================
    // 🛡️ BLUE TANK (Crowd Control)
    // ==========================================
    { id: 'tb_a1', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '正義審判', desc: '單體暈眩', range: 1, cast: 0.4, cd: 8.0, cost: 40, gain: 0, type: 'SINGLE', power: 120, color: '#eab308', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 2.0 },
    { id: 'tb_a2', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '聖盾衝撞', desc: '強力擊退', range: 1, cast: 0.5, cd: 7.0, cost: 35, gain: 0, type: 'SINGLE', power: 100, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 5 },
    { id: 'tb_a3', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', name: '神聖護盾', desc: '自我護盾', range: 0, cast: 0.3, cd: 10.0, cost: 40, gain: 0, type: 'SINGLE', power: -200, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0 }, // Self-Heal effectively acts as shield

    // ==========================================
    // ⚔️ BLUE WARRIOR (Utility Fighter)
    // ==========================================
    { id: 'wb_a1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '雷霆一擊', desc: '範圍緩速', range: 0, cast: 0.6, cd: 7.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: 130, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 2 },
    { id: 'wb_a2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '無畏衝鋒', desc: '突進暈眩', range: 4, cast: 0.2, cd: 9.0, cost: 40, gain: 0, type: 'SINGLE', power: 140, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 1.2 },
    { id: 'wb_a3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', name: '半月斬', desc: '前方順劈', range: 1, cast: 0.5, cd: 5.0, cost: 30, gain: 0, type: 'AOE', aoeRadius: 1, power: 160, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0 },

    // ==========================================
    // 🏹 BLUE RANGER (Control Marksman)
    // ==========================================
    { id: 'rb_a1', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '冰霜陷阱', desc: '凍結', range: 6, cast: 0.8, cd: 12.0, cost: 50, gain: 0, type: 'SINGLE', power: 100, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 600, ccType: 'STUN', ccDur: 2.5 },
    { id: 'rb_a2', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '多重射擊', desc: '範圍箭雨', range: 7, cast: 1.0, cd: 8.0, cost: 45, gain: 0, type: 'AOE', aoeRadius: 2, power: 120, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 800 },
    { id: 'rb_a3', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', name: '擊退矢', desc: '擊退敵人', range: 6, cast: 0.5, cd: 8.0, cost: 35, gain: 0, type: 'SINGLE', power: 110, color: '#fff', visual: 'ARROW', projectileSpeed: 1000, ccType: 'KNOCKBACK', ccForce: 4 },

    // ==========================================
    // 🔮 BLUE MAGE (Frost/Arcane Control)
    // ==========================================
    { id: 'mb_a1', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '暴風雪', desc: '範圍緩速', range: 6, cast: 1.5, cd: 10.0, cost: 60, gain: 0, type: 'AOE', aoeRadius: 3, power: 140, color: '#e0f2fe', visual: 'BOLT', projectileSpeed: 300, ccType: 'DOT', ccForce: 10, ccDur: 4 }, // Slow implied by visual/dot
    { id: 'mb_a2', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '變形術', desc: '單體放逐', range: 6, cast: 0.8, cd: 14.0, cost: 55, gain: 0, type: 'SINGLE', power: 20, color: '#d946ef', visual: 'BOLT', projectileSpeed: 600, ccType: 'BANISH', ccDur: 4.0 },
    { id: 'mb_a3', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', name: '法力燃燒', desc: '大量燒魔', range: 6, cast: 0.8, cd: 8.0, cost: 30, gain: 0, type: 'SINGLE', power: 80, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 100 },

    // ==========================================
    // ⚕️ BLUE SUPPORT (Healer)
    // ==========================================
    { id: 'sb_a1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '快速治療', desc: '單體大補', range: 6, cast: 0.8, cd: 5.0, cost: 40, gain: 0, type: 'SINGLE', power: -250, color: '#86efac', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_a2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '群體回復', desc: '範圍治療', range: 0, cast: 1.2, cd: 10.0, cost: 70, gain: 0, type: 'AOE', aoeRadius: 3, power: -150, color: '#4ade80', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'sb_a3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', name: '驅逐', desc: '保命擊退', range: 4, cast: 0.4, cd: 8.0, cost: 30, gain: 0, type: 'SINGLE', power: 60, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 5 },
];
