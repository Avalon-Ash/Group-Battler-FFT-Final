
import { Role, Skill, Team } from '../../types';

export const RED_BASIC: Skill[] = [
    // ==========================================
    // 🛡️ RED TANK (Death Knight)
    // Concept: Lifesteal Tanking, Higher Damage
    // ==========================================
    { id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '吸血打擊', desc: '攻擊吸血', range: 1, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 45, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.5 },
    { id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '碎顱', desc: '高傷普攻', range: 1, cast: 0.9, cd: 1.0, cost: 0, gain: 40, type: 'SINGLE', power: 65, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tr_b3', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '瘟疫爪', desc: '持續傷害', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 25, type: 'SINGLE', power: 30, color: '#a3e635', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 15, ccDur: 3 },

    // ==========================================
    // ⚔️ RED WARRIOR (Berserker)
    // Concept: Cleave, Bleed, High DPS
    // ==========================================
    { id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '狂暴揮擊', desc: '高傷普攻', range: 1, cast: 0.5, cd: 0.6, cost: 0, gain: 30, type: 'SINGLE', power: 75, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '順劈斬', desc: '前方AOE', range: 1, cast: 0.8, cd: 0.9, cost: 0, gain: 35, type: 'AOE', aoeRadius: 1, power: 55, color: '#fca5a5', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_b3', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '投擲飛斧', desc: '中程攻擊', range: 3, cast: 0.5, cd: 0.6, cost: 0, gain: 25, type: 'SINGLE', power: 50, color: '#78350f', visual: 'BOLT', projectileSpeed: 700 },

    // ==========================================
    // 🏹 RED RANGER (Gunner)
    // Concept: Mid Range (5), Explosive, Burst
    // ==========================================
    { id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '黑火藥射擊', desc: '高爆發', range: 5, cast: 1.0, cd: 1.2, cost: 0, gain: 45, type: 'SINGLE', power: 95, color: '#7f1d1d', visual: 'BOLT', projectileSpeed: 900 },
    { id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '散彈', desc: '近距AOE', range: 3, cast: 0.7, cd: 0.9, cost: 0, gain: 30, type: 'AOE', aoeRadius: 1, power: 60, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 800 },
    { id: 'rr_b3', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '毒標', desc: '中毒', range: 5, cast: 0.5, cd: 0.6, cost: 0, gain: 20, type: 'SINGLE', power: 35, color: '#4ade80', visual: 'ARROW', projectileSpeed: 900, ccType: 'DOT', ccForce: 12, ccDur: 3 },

    // ==========================================
    // 🔮 RED MAGE (Warlock)
    // Concept: Fire, DoT, Chaos
    // ==========================================
    { id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '火球術', desc: '高傷法術', range: 5, cast: 0.8, cd: 0.9, cost: 0, gain: 40, type: 'SINGLE', power: 75, color: '#ef4444', visual: 'FIREBALL', projectileSpeed: 600 },
    { id: 'mr_b2', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '獻祭', desc: '燃燒DoT', range: 5, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 30, color: '#f97316', visual: 'BOLT', projectileSpeed: 700, ccType: 'DOT', ccForce: 25, ccDur: 4 },
    { id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '生命虹吸', desc: '吸血光束', range: 4, cast: 0.9, cd: 1.0, cost: 0, gain: 35, type: 'SINGLE', power: 50, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.6 },

    // ==========================================
    // ⚕️ RED SUPPORT (Shaman/Witch Doctor)
    // Concept: Offensive Support, Debuffs
    // ==========================================
    { id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '閃電箭', desc: '傷害支援', range: 5, cast: 0.8, cd: 0.9, cost: 0, gain: 35, type: 'SINGLE', power: 55, color: '#facc15', visual: 'BOLT', projectileSpeed: 800 },
    { id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '厄運詛咒', desc: '燒魔', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 30, color: '#581c87', visual: 'BOLT', projectileSpeed: 450, effectType: 'MANA_BURN', effectVal: 40 },
    { id: 'sr_b3', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '醫療波', desc: '彈跳治療', range: 5, cast: 0.9, cd: 1.0, cost: 0, gain: 40, type: 'AOE', aoeRadius: 1, power: -45, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0 },
];
