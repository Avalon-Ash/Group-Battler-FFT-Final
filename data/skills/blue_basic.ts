
import { Role, Skill, Team } from '../../types';

export const BLUE_BASIC: Skill[] = [
    // ==========================================
    // 🛡️ BLUE TANK (Paladin/Guardian)
    // Theme: Holy, Protection, Mana Recovery
    // ==========================================
    { id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '聖光之錘', desc: '回復額外魔力', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 50, type: 'SINGLE', power: 45, color: '#facc15', visual: 'SMASH', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 20 },
    { id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '制裁', desc: '神聖傷害', range: 1, cast: 0.7, cd: 0.9, cost: 0, gain: 40, type: 'SINGLE', power: 60, color: '#cbd5e1', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '守護平砍', desc: '快速連擊', range: 1, cast: 0.5, cd: 0.6, cost: 0, gain: 40, type: 'SINGLE', power: 35, color: '#93c5fd', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'tb_b4', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '正義追擊', desc: '微量吸血', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 45, color: '#bfdbfe', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.3 },
    { id: 'tb_b5', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '盾牌猛擊', desc: '擊退普攻', range: 1, cast: 0.8, cd: 1.2, cost: 0, gain: 50, type: 'SINGLE', power: 65, color: '#1e3a8a', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 2 },

    // ==========================================
    // ⚔️ BLUE WARRIOR (Knight/Swordmaster)
    // Theme: Precision, Speed, Dueling
    // ==========================================
    { id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '迅捷劍', desc: '極快攻擊', range: 1, cast: 0.3, cd: 0.4, cost: 0, gain: 25, type: 'SINGLE', power: 45, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b2', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '騎士斬', desc: '標準劍術', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 70, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '破魔劍', desc: '燃燒魔力', range: 1, cast: 0.6, cd: 0.6, cost: 0, gain: 30, type: 'SINGLE', power: 50, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 25 },
    { id: 'wb_b4', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '二連擊', desc: '雙重判定', range: 1, cast: 0.8, cd: 0.9, cost: 0, gain: 40, type: 'SINGLE', power: 80, color: '#ffffff', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b5', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '刺擊', desc: '無視防禦感', range: 1, cast: 0.5, cd: 0.5, cost: 0, gain: 25, type: 'SINGLE', power: 55, color: '#93c5fd', visual: 'BOLT', projectileSpeed: 0 },

    // ==========================================
    // 🏹 BLUE RANGER (Longbowman/Sniper)
    // Theme: Long Range, Ice Arrows
    // ==========================================
    { id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '長弓射擊', desc: '遠距普攻', range: 7, cast: 0.8, cd: 0.9, cost: 0, gain: 35, type: 'SINGLE', power: 75, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 900 },
    { id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '連發', desc: '快速攻擊', range: 5, cast: 0.4, cd: 0.5, cost: 0, gain: 20, type: 'SINGLE', power: 40, color: '#fbbf24', visual: 'ARROW', projectileSpeed: 1000 },
    { id: 'rb_b3', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '寒冰箭', desc: '微量緩速', range: 6, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 60, color: '#bae6fd', visual: 'ARROW', projectileSpeed: 800 },
    { id: 'rb_b4', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '重矢', desc: '高傷擊退', range: 5, cast: 1.0, cd: 1.2, cost: 0, gain: 45, type: 'SINGLE', power: 95, color: '#d97706', visual: 'ARROW', projectileSpeed: 700, ccType: 'KNOCKBACK', ccForce: 1 },
    { id: 'rb_b5', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '精靈火', desc: '燃魔射擊', range: 6, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 50, color: '#818cf8', visual: 'BOLT', projectileSpeed: 1200, effectType: 'MANA_BURN', effectVal: 15 },

    // ==========================================
    // 🔮 BLUE MAGE (Arcanist/Cryomancer)
    // Theme: Arcane, Frost, Consistency
    // ==========================================
    { id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '奧術飛彈', desc: '魔法導彈', range: 6, cast: 0.6, cd: 0.7, cost: 0, gain: 40, type: 'SINGLE', power: 65, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 600 },
    { id: 'mb_b2', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '冰錐術', desc: '冰霜傷害', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 60, color: '#bae6fd', visual: 'BOLT', projectileSpeed: 700 },
    { id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '法力汲取', desc: '吸取魔力', range: 5, cast: 0.8, cd: 0.9, cost: 0, gain: 50, type: 'SINGLE', power: 45, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 40 },
    { id: 'mb_b4', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '充能法球', desc: '高回魔', range: 5, cast: 0.9, cd: 1.0, cost: 0, gain: 60, type: 'SINGLE', power: 50, color: '#60a5fa', visual: 'FIREBALL', projectileSpeed: 500 },
    { id: 'mb_b5', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '閃電鏈', desc: '微型AOE', range: 5, cast: 0.8, cd: 0.8, cost: 0, gain: 35, type: 'AOE', aoeRadius: 1, power: 50, color: '#fef08a', visual: 'BOLT', projectileSpeed: 900 },

    // ==========================================
    // ⚕️ BLUE SUPPORT (Cleric/Priest)
    // Theme: Healing, Holy Light
    // ==========================================
    { id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '懲戒之光', desc: '神聖傷害', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 50, color: '#fef08a', visual: 'BOLT', projectileSpeed: 600 },
    { id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '祈禱', desc: '大量回魔', range: 0, cast: 1.0, cd: 1.1, cost: 0, gain: 70, type: 'SINGLE', power: 0, color: '#fff', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_b3', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '祝福打擊', desc: '近戰回魔', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 50, type: 'SINGLE', power: 45, color: '#fde047', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'sb_b4', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '光耀飛彈', desc: '遠程普攻', range: 6, cast: 0.8, cd: 0.9, cost: 0, gain: 40, type: 'SINGLE', power: 45, color: '#fff', visual: 'BOLT', projectileSpeed: 700 },
    { id: 'sb_b5', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '聖印', desc: '持續恢復', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 15, color: '#86efac', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 20, ccDur: 4 },
];
