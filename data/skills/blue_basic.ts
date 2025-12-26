
import { Role, Skill, Team } from '../../types';

export const BLUE_BASIC: Skill[] = [
    // 🛡️ BLUE TANK
    { id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '充能重擊', desc: '攻擊並回復魔力', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 45, type: 'SINGLE', power: 40, color: '#facc15', visual: 'SMASH', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 15 },
    { id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '鎮壓盾擊', desc: '造成微量定身', range: 1, cast: 0.7, cd: 1.0, cost: 0, gain: 40, type: 'SINGLE', power: 50, color: '#cbd5e1', visual: 'SMASH', projectileSpeed: 0, ccType: 'ROOT', ccDur: 0.5 },
    { id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '守護式', desc: '快速防禦打擊', range: 1, cast: 0.5, cd: 0.6, cost: 0, gain: 35, type: 'SINGLE', power: 35, color: '#93c5fd', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'tb_b4', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '聖光審判', desc: '中距離神聖打擊', range: 2, cast: 0.8, cd: 1.2, cost: 0, gain: 40, type: 'SINGLE', power: 45, color: '#fef08a', visual: 'BOLT', projectileSpeed: 600 },
    { id: 'tb_b5', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '能量吸取', desc: '燃燒對手魔力', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 30, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 15 },

    // ⚔️ BLUE WARRIOR
    { id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '迅捷劍', desc: '極快連擊', range: 1, cast: 0.4, cd: 0.5, cost: 0, gain: 25, type: 'SINGLE', power: 45, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b2', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '騎士斬', desc: '標準重斬', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 65, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '破魔劍', desc: '燃燒魔力', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 50, color: '#3b82f6', visual: 'SLASH', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 20 },
    { id: 'wb_b4', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '穿刺', desc: '中距突刺', range: 2, cast: 0.5, cd: 0.9, cost: 0, gain: 30, type: 'SINGLE', power: 55, color: '#e0f2fe', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'wb_b5', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '雷光斬', desc: '帶有微量暈眩', range: 1, cast: 0.7, cd: 1.2, cost: 0, gain: 40, type: 'SINGLE', power: 60, color: '#fcd34d', visual: 'SLASH', projectileSpeed: 0, ccType: 'STUN', ccDur: 0.1 },

    // 🏹 BLUE RANGER
    { id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '精準射擊', desc: '超遠射程', range: 7, cast: 0.9, cd: 1.0, cost: 0, gain: 35, type: 'SINGLE', power: 70, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 1200 },
    { id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '液態氮射擊', desc: '緩速射擊', range: 6, cast: 0.8, cd: 0.9, cost: 0, gain: 30, type: 'SINGLE', power: 55, color: '#bae6fd', visual: 'ARROW', projectileSpeed: 900, ccType: 'SLOW', ccDur: 2.0 },
    { id: 'rb_b3', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '連發模式', desc: '快速低傷', range: 5, cast: 0.4, cd: 0.5, cost: 0, gain: 15, type: 'SINGLE', power: 35, color: '#fbbf24', visual: 'ARROW', projectileSpeed: 1500 },
    { id: 'rb_b4', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '電磁彈', desc: '燃魔射擊', range: 6, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 50, color: '#3b82f6', visual: 'BOLT', projectileSpeed: 1200, effectType: 'MANA_BURN', effectVal: 10 },
    { id: 'rb_b5', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '重型弩箭', desc: '擊退射擊', range: 5, cast: 1.2, cd: 1.5, cost: 0, gain: 50, type: 'SINGLE', power: 90, color: '#94a3b8', visual: 'ARROW', projectileSpeed: 800, ccType: 'KNOCKBACK', ccForce: 3 },

    // 🔮 BLUE MAGE
    { id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '奧術飛彈', desc: '標準魔法', range: 6, cast: 0.6, cd: 0.7, cost: 0, gain: 45, type: 'SINGLE', power: 60, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 700 },
    { id: 'mb_b2', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '冰錐術', desc: '冰霜緩速', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 40, type: 'SINGLE', power: 55, color: '#bae6fd', visual: 'BOLT', projectileSpeed: 600, ccType: 'SLOW', ccDur: 2.5 },
    { id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '法力汲取', desc: '高回魔', range: 5, cast: 0.8, cd: 0.8, cost: 0, gain: 60, type: 'SINGLE', power: 40, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 30 },
    { id: 'mb_b4', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '霜火之箭', desc: '持續傷害', range: 6, cast: 0.8, cd: 1.0, cost: 0, gain: 40, type: 'SINGLE', power: 50, color: '#60a5fa', visual: 'FIREBALL', projectileSpeed: 600, ccType: 'DOT', ccDur: 3, ccForce: 10 },
    { id: 'mb_b5', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '能量超載', desc: '近距AOE', range: 3, cast: 0.5, cd: 0.8, cost: 0, gain: 30, type: 'AOE', aoeRadius: 1, power: 45, color: '#c084fc', visual: 'SMASH', projectileSpeed: 0 },

    // ⚕️ BLUE SUPPORT
    { id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '懲戒之光', desc: '神聖傷害', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 45, color: '#fef08a', visual: 'BOLT', projectileSpeed: 700 },
    { id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '祈禱', desc: '治療自身', range: 0, cast: 1.0, cd: 1.2, cost: 0, gain: 50, type: 'SINGLE', power: -40, color: '#ffffff', visual: 'BEAM', projectileSpeed: 0 },
    { id: 'sb_b3', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '真言術:韌', desc: '給予再生', range: 5, cast: 0.7, cd: 0.9, cost: 0, gain: 30, type: 'SINGLE', power: 20, color: '#86efac', visual: 'BEAM', projectileSpeed: 0, ccType: 'HOT', ccForce: 15, ccDur: 4 },
    { id: 'sb_b4', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '驅散衝擊', desc: '擊退敵人', range: 4, cast: 0.6, cd: 1.0, cost: 0, gain: 40, type: 'SINGLE', power: 30, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 800, ccType: 'KNOCKBACK', ccForce: 3 },
    { id: 'sb_b5', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '冥想', desc: '快速回魔', range: 0, cast: 1.0, cd: 1.0, cost: 0, gain: 70, type: 'SINGLE', power: 0, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0 },
];
