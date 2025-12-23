
import { Role, Skill, Team } from '../../types';

export const BLUE_BASIC: Skill[] = [
    // --- TANK ---
    { id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '聖光之錘', desc: '回復額外魔力', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 45, type: 'SINGLE', power: 30, color: '#facc15', visual: 'SMASH', projectileSpeed: 0, effectType: 'MANA_RESTORE', effectVal: 15 },
    { id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '制裁', desc: '神聖傷害', range: 1, cast: 0.7, cd: 0.9, cost: 0, gain: 35, type: 'SINGLE', power: 45, color: '#cbd5e1', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', name: '守護平砍', desc: '快速連擊', range: 1, cast: 0.5, cd: 0.6, cost: 0, gain: 40, type: 'SINGLE', power: 25, color: '#93c5fd', visual: 'SMASH', projectileSpeed: 0 },
    
    // --- WARRIOR ---
    { id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '迅捷劍', desc: '極快攻擊', range: 1, cast: 0.4, cd: 0.5, cost: 0, gain: 20, type: 'SINGLE', power: 40, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', name: '破魔劍', desc: '燃燒魔力', range: 1, cast: 0.6, cd: 0.6, cost: 0, gain: 25, type: 'SINGLE', power: 40, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 25 },

    // --- RANGER ---
    { id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '長弓射擊', desc: '遠距普攻', range: 5, cast: 0.8, cd: 0.9, cost: 0, gain: 30, type: 'SINGLE', power: 60, color: '#fcd34d', visual: 'ARROW', projectileSpeed: 800 },
    { id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', name: '連發', desc: '快速攻擊', range: 5, cast: 0.4, cd: 0.5, cost: 0, gain: 15, type: 'SINGLE', power: 35, color: '#fbbf24', visual: 'ARROW', projectileSpeed: 900 },

    // --- MAGE ---
    { id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '奧術飛彈', desc: '魔法導彈', range: 5, cast: 0.6, cd: 0.7, cost: 0, gain: 35, type: 'SINGLE', power: 55, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', name: '法力汲取', desc: '吸取魔力', range: 4, cast: 0.8, cd: 0.9, cost: 0, gain: 45, type: 'SINGLE', power: 35, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, effectType: 'MANA_BURN', effectVal: 35 },

    // --- SUPPORT ---
    { id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '懲戒之光', desc: '神聖傷害', range: 4, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 40, color: '#fef08a', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', name: '祈禱', desc: '大量回魔', range: 0, cast: 1.0, cd: 1.1, cost: 0, gain: 60, type: 'SINGLE', power: 0, color: '#fff', visual: 'BEAM', projectileSpeed: 0 },
];
