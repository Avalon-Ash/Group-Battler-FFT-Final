
import { Role, Skill, Team } from '../../types';

export const BLUE_BASIC: Skill[] = [
    // ==========================================
    // 🛡️ BLUE TANK (Paladin)
    // Concept: Low damage, high utility, resource generation
    // ==========================================
    { id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '聖光之錘', desc: '回復額外魔力', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 45, type: 'SINGLE', power: 40, color: '#facc15', visual: 'SMASH', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 15 },
    { id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '制裁', desc: '微量緩速', range: 1, cast: 0.7, cd: 1.0, cost: 0, gain: 40, type: 'SINGLE', power: 50, color: '#cbd5e1', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 1 },
    { id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '守護打擊', desc: '快速防禦', range: 1, cast: 0.5, cd: 0.6, cost: 0, gain: 35, type: 'SINGLE', power: 35, color: '#93c5fd', visual: 'SLASH', projectileSpeed: 0 },
    
    // ==========================================
    // ⚔️ BLUE WARRIOR (Knight)
    // Concept: Consistent damage, stable combat
    // ==========================================
    { id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '迅捷劍', desc: '極快攻擊', range: 1, cast: 0.4, cd: 0.5, cost: 0, gain: 25, type: 'SINGLE', power: 45, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b2', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '騎士斬', desc: '標準劍術', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 65, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '破魔劍', desc: '燃燒魔力', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 50, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 20 },

    // ==========================================
    // 🏹 BLUE RANGER (Longbow)
    // Concept: High Range (7), Precision, Ice
    // ==========================================
    { id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '長弓射擊', desc: '超遠射程', range: 7, cast: 0.9, cd: 1.0, cost: 0, gain: 35, type: 'SINGLE', power: 70, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 800 },
    { id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '寒冰箭', desc: '微量減速', range: 6, cast: 0.8, cd: 0.9, cost: 0, gain: 30, type: 'SINGLE', power: 55, color: '#bae6fd', visual: 'ARROW', projectileSpeed: 600, ccType: 'KNOCKBACK', ccForce: 1 },
    { id: 'rb_b3', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '連發', desc: '快速射擊', range: 5, cast: 0.5, cd: 0.6, cost: 0, gain: 20, type: 'SINGLE', power: 40, color: '#fbbf24', visual: 'ARROW', projectileSpeed: 900 },

    // ==========================================
    // 🔮 BLUE MAGE (Arcanist)
    // Concept: Mana control, Frost
    // ==========================================
    { id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '奧術飛彈', desc: '標準魔法', range: 6, cast: 0.6, cd: 0.7, cost: 0, gain: 45, type: 'SINGLE', power: 60, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 600 },
    { id: 'mb_b2', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '冰錐術', desc: '冰霜傷害', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 40, type: 'SINGLE', power: 55, color: '#bae6fd', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '法力汲取', desc: '高回魔', range: 5, cast: 0.8, cd: 0.8, cost: 0, gain: 60, type: 'SINGLE', power: 40, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 30 },

    // ==========================================
    // ⚕️ BLUE SUPPORT (Cleric)
    // Concept: Light healing, Buffs
    // ==========================================
    { id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '懲戒之光', desc: '神聖傷害', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 45, color: '#fef08a', visual: 'BOLT', projectileSpeed: 700 },
    { id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '祈禱', desc: '治療自身', range: 0, cast: 1.0, cd: 1.2, cost: 0, gain: 50, type: 'SINGLE', power: -40, color: '#fff', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_b3', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '聖印', desc: '持續恢復', range: 5, cast: 0.7, cd: 0.9, cost: 0, gain: 30, type: 'SINGLE', power: 20, color: '#86efac', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 15, ccDur: 4 },
];
