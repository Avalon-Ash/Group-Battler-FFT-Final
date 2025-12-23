
import { Role, Skill, Team } from '../../types';

export const RED_BASIC: Skill[] = [
    // ==========================================
    // 🛡️ RED TANK (Death Knight/Abomination)
    // Theme: Life Steal, Brutality
    // ==========================================
    { id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '碎顱', desc: '沉重打擊', range: 1, cast: 0.9, cd: 1.0, cost: 0, gain: 40, type: 'SINGLE', power: 70, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '吸血打擊', desc: '攻擊吸血', range: 1, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 35, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.3 },
    { id: 'tr_b3', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '瘟疫爪', desc: '持續傷害', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 25, type: 'SINGLE', power: 20, color: '#a3e635', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 15, ccDur: 3 },
    { id: 'tr_b4', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '鮮血轉化', desc: '高回魔', range: 1, cast: 0.5, cd: 0.6, cost: 0, gain: 50, type: 'SINGLE', power: 30, color: '#dc2626', visual: 'SMASH', projectileSpeed: 0 },
    { id: 'tr_b5', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '死亡纏繞', desc: '遠程普攻', range: 3, cast: 0.8, cd: 0.9, cost: 0, gain: 30, type: 'SINGLE', power: 45, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 500 },

    // ==========================================
    // ⚔️ RED WARRIOR (Berserker/Orc)
    // Theme: Rage, Bleed, AOE Cleave
    // ==========================================
    { id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '狂暴揮擊', desc: '高傷普攻', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 75, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '嗜血斬', desc: '普攻吸血', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 25, type: 'SINGLE', power: 55, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.3 },
    { id: 'wr_b3', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '順劈斬', desc: '前方AOE', range: 1, cast: 0.8, cd: 0.9, cost: 0, gain: 35, type: 'AOE', aoeRadius: 1, power: 50, color: '#fca5a5', visual: 'SLASH', projectileSpeed: 0 },
    { id: 'wr_b4', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '致殘打擊', desc: '緩速普攻', range: 1, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 50, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 1 },
    { id: 'wr_b5', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '投擲飛斧', desc: '遠程普攻', range: 3, cast: 0.5, cd: 0.6, cost: 0, gain: 25, type: 'SINGLE', power: 40, color: '#78350f', visual: 'BOLT', projectileSpeed: 700 },

    // ==========================================
    // 🏹 RED RANGER (Gunner/Shadow Hunter)
    // Theme: Explosives, Poison, Mid-Range
    // ==========================================
    { id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '黑火藥射擊', desc: '高爆發', range: 4, cast: 1.0, cd: 1.1, cost: 0, gain: 45, type: 'SINGLE', power: 90, color: '#7f1d1d', visual: 'BOLT', projectileSpeed: 800 },
    { id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '散彈', desc: '近距爆發', range: 3, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 70, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 800 },
    { id: 'rr_b3', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '毒標', desc: '中毒', range: 5, cast: 0.5, cd: 0.6, cost: 0, gain: 20, type: 'SINGLE', power: 30, color: '#4ade80', visual: 'ARROW', projectileSpeed: 900, ccType: 'DOT', ccForce: 10, ccDur: 3 },
    { id: 'rr_b4', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '快速裝填', desc: '極快連射', range: 4, cast: 0.3, cd: 0.4, cost: 0, gain: 15, type: 'SINGLE', power: 30, color: '#fca5a5', visual: 'BOLT', projectileSpeed: 1000 },
    { id: 'rr_b5', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '燃燒瓶', desc: '微型AOE', range: 4, cast: 0.9, cd: 1.0, cost: 0, gain: 35, type: 'AOE', aoeRadius: 1, power: 40, color: '#ef4444', visual: 'BOMB', projectileSpeed: 500 },

    // ==========================================
    // 🔮 RED MAGE (Warlock/Pyromancer)
    // Theme: Fire, Shadow, Life Drain
    // ==========================================
    { id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '暗影箭', desc: '黑暗能量', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 65, color: '#4c1d95', visual: 'BOLT', projectileSpeed: 500 },
    { id: 'mr_b2', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '火球術', desc: '經典火球', range: 6, cast: 0.8, cd: 0.9, cost: 0, gain: 40, type: 'SINGLE', power: 70, color: '#ef4444', visual: 'FIREBALL', projectileSpeed: 600 },
    { id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '生命虹吸', desc: '吸血', range: 4, cast: 0.9, cd: 1.0, cost: 0, gain: 30, type: 'SINGLE', power: 45, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.5 },
    { id: 'mr_b4', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '獻祭', desc: '燃燒DoT', range: 5, cast: 0.6, cd: 0.7, cost: 0, gain: 25, type: 'SINGLE', power: 20, color: '#f97316', visual: 'BOLT', projectileSpeed: 700, ccType: 'DOT', ccForce: 20, ccDur: 4 },
    { id: 'mr_b5', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '混亂箭', desc: '隨機高傷', range: 5, cast: 1.2, cd: 1.5, cost: 0, gain: 50, type: 'SINGLE', power: 120, color: '#22c55e', visual: 'BOLT', projectileSpeed: 400 },

    // ==========================================
    // ⚕️ RED SUPPORT (Shaman/Witch Doctor)
    // Theme: Totems, Blood Magic, Debuffs
    // ==========================================
    { id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '毒鏢', desc: '傷害', range: 4, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 35, color: '#a3e635', visual: 'ARROW', projectileSpeed: 700 },
    { id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '厄運詛咒', desc: '燒魔', range: 4, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 25, color: '#581c87', visual: 'BOLT', projectileSpeed: 450, effectType: 'MANA_BURN', effectVal: 30 },
    { id: 'sr_b3', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '閃電箭', desc: '中等傷害', range: 5, cast: 0.8, cd: 0.9, cost: 0, gain: 35, type: 'SINGLE', power: 50, color: '#facc15', visual: 'BOLT', projectileSpeed: 800 },
    { id: 'sr_b4', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '鮮血儀式', desc: '吸血普攻', range: 4, cast: 0.8, cd: 0.9, cost: 0, gain: 30, type: 'SINGLE', power: 30, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.5 },
    { id: 'sr_b5', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '醫療波', desc: '彈跳治療', range: 5, cast: 0.9, cd: 1.0, cost: 0, gain: 40, type: 'AOE', aoeRadius: 1, power: -30, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0 },
];
