
import { Role, Skill, Team } from '../../types';

export const RED_BASIC: Skill[] = [
    // --- TANK ---
    { id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '碎顱', desc: '沉重打擊', range: 1, cast: 0.9, cd: 1.0, cost: 0, gain: 40, type: 'SINGLE', power: 70, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '吸血打擊', desc: '攻擊吸血', range: 1, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 35, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.6 },

    // --- WARRIOR ---
    { id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '狂暴揮擊', desc: '高傷普攻', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 75, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '嗜血斬', desc: '普攻吸血', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 25, type: 'SINGLE', power: 55, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.6 },

    // --- RANGER ---
    { id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '黑火藥射擊', desc: '高爆發', range: 4, cast: 1.0, cd: 1.1, cost: 0, gain: 45, type: 'SINGLE', power: 90, color: '#7f1d1d', visual: 'BOLT', projectileSpeed: 800 },
    { id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '散彈', desc: '近距爆發', range: 3, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 70, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 800 },

    // --- MAGE ---
    { id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '暗影箭', desc: '黑暗能量', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 65, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '生命虹吸', desc: '吸血', range: 4, cast: 0.9, cd: 1.0, cost: 0, gain: 30, type: 'SINGLE', power: 45, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, effectType: 'VAMP', effectVal: 1.0 },

    // --- SUPPORT ---
    { id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '毒鏢', desc: '傷害', range: 4, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 35, color: '#a3e635', visual: 'ARROW', projectileSpeed: 700 },
    { id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '厄運詛咒', desc: '燒魔', range: 4, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 25, color: '#581c87', visual: 'BOLT', projectileSpeed: 450, effectType: 'MANA_BURN', effectVal: 30 },
];
