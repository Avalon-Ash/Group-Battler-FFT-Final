
import { Role, Skill, Team } from '../../types';

export const RED_BASIC: Skill[] = [
    // ==========================================
    // 🛡️ RED TANK (Death Knight / Abomination)
    // ==========================================
    { id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '吸血打擊', desc: '攻擊吸血', range: 1, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 45, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.5, visualHitEffect: 'FX_HIT_RED_BLOOD' },
    { id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '碎顱', desc: '高傷重擊', range: 1, cast: 0.9, cd: 1.0, cost: 0, gain: 40, type: 'SINGLE', power: 65, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, visualHitEffect: 'FX_HIT_RED_HEAVY' },
    { id: 'tr_b3', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '瘟疫爪', desc: '持續毒傷', range: 1, cast: 0.6, cd: 0.7, cost: 0, gain: 25, type: 'SINGLE', power: 30, color: '#a3e635', visual: 'SLASH', projectileSpeed: 0, ccType: 'DOT', ccForce: 15, ccDur: 3, visualHitEffect: 'FX_HIT_RED_FEL' },
    { id: 'tr_b4', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '死亡之握', desc: '微量牽引', range: 2, cast: 0.8, cd: 1.2, cost: 0, gain: 35, type: 'SINGLE', power: 40, color: '#581c87', visual: 'BEAM', projectileSpeed: 0, ccType: 'PULL', ccForce: 1, visualHitEffect: 'FX_HIT_RED_SHADOW' },
    { id: 'tr_b5', role: Role.TANK, team: Team.RED, tag: 'BASIC', name: '鮮血護盾', desc: '治療自身', range: 0, cast: 1.0, cd: 1.5, cost: 0, gain: 40, type: 'SINGLE', power: -50, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, visualHitEffect: 'FX_HIT_RED_BLOOD' },

    // ==========================================
    // ⚔️ RED WARRIOR (Berserker / Executioner)
    // ==========================================
    { id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '狂暴揮擊', desc: '高傷普攻', range: 1, cast: 0.5, cd: 0.6, cost: 0, gain: 30, type: 'SINGLE', power: 75, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0, visualHitEffect: 'FX_HIT_RED_HEAVY' },
    { id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '順劈斬', desc: '前方AOE', range: 1, cast: 0.8, cd: 0.9, cost: 0, gain: 35, type: 'AOE', aoeRadius: 1, power: 55, color: '#fca5a5', visual: 'SLASH', projectileSpeed: 0, visualHitEffect: 'FX_HIT_RED_HEAVY' },
    { id: 'wr_b3', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '投擲飛斧', desc: '中程攻擊', range: 3, cast: 0.5, cd: 0.6, cost: 0, gain: 25, type: 'SINGLE', power: 50, color: '#78350f', visual: 'BOLT', projectileSpeed: 700, visualHitEffect: 'FX_IMPACT_PHYSICAL', visualProjectileEffect: 'PROJ_RED_AXE' },
    { id: 'wr_b4', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '致殘打擊', desc: '緩速對手', range: 1, cast: 0.7, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 60, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, ccType: 'KNOCKBACK', ccForce: 1, visualHitEffect: 'FX_HIT_RED_HEAVY' },
    { id: 'wr_b5', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', name: '嗜血斬', desc: '帶有吸血', range: 1, cast: 0.6, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 50, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.3, visualHitEffect: 'FX_HIT_RED_BLOOD' },

    // ==========================================
    // 🏹 RED RANGER (Gunner / Shadow Hunter)
    // ==========================================
    { id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '黑火藥射擊', desc: '高爆發', range: 5, cast: 1.0, cd: 1.2, cost: 0, gain: 45, type: 'SINGLE', power: 95, color: '#450a0a', visual: 'BOLT', projectileSpeed: 1200, visualHitEffect: 'FX_IMPACT_FIRE', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT' },
    { id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '霰彈轟炸', desc: '近距AOE', range: 3, cast: 0.7, cd: 0.9, cost: 0, gain: 30, type: 'AOE', aoeRadius: 1, power: 60, color: '#b91c1c', visual: 'BOLT', projectileSpeed: 800, visualHitEffect: 'FX_HIT_RED_HEAVY', visualProjectileEffect: 'BOLT' },
    { id: 'rr_b3', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '劇毒吹箭', desc: '持續中毒', range: 5, cast: 0.5, cd: 0.6, cost: 0, gain: 20, type: 'SINGLE', power: 35, color: '#4ade80', visual: 'ARROW', projectileSpeed: 900, ccType: 'DOT', ccForce: 12, ccDur: 3, visualHitEffect: 'FX_HIT_RED_FEL' },
    { id: 'rr_b4', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '燃燒彈', desc: '持續燃燒', range: 6, cast: 0.8, cd: 1.0, cost: 0, gain: 35, type: 'SINGLE', power: 50, color: '#f97316', visual: 'FIREBALL', projectileSpeed: 700, ccType: 'DOT', ccForce: 10, ccDur: 3, visualHitEffect: 'FX_HIT_RED_MAGMA' },
    { id: 'rr_b5', role: Role.RANGER, team: Team.RED, tag: 'BASIC', name: '重砲', desc: '遠程擊退', range: 7, cast: 1.5, cd: 2.0, cost: 0, gain: 60, type: 'SINGLE', power: 110, color: '#1c1917', visual: 'BOLT', projectileSpeed: 1000, ccType: 'KNOCKBACK', ccForce: 2, visualHitEffect: 'FX_HIT_RED_HEAVY', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT' },

    // ==========================================
    // 🔮 RED MAGE (Warlock / Pyromancer)
    // ==========================================
    { id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '火球術', desc: '高傷法術', range: 5, cast: 0.8, cd: 0.9, cost: 0, gain: 40, type: 'SINGLE', power: 75, color: '#ef4444', visual: 'FIREBALL', projectileSpeed: 600, visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'FIREBALL' },
    { id: 'mr_b2', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '獻祭', desc: '燃燒DoT', range: 5, cast: 0.6, cd: 0.7, cost: 0, gain: 30, type: 'SINGLE', power: 30, color: '#f97316', visual: 'BOLT', projectileSpeed: 700, ccType: 'DOT', ccForce: 25, ccDur: 4, visualHitEffect: 'FX_HIT_RED_MAGMA' },
    { id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '生命虹吸', desc: '吸血光束', range: 4, cast: 0.9, cd: 1.0, cost: 0, gain: 35, type: 'SINGLE', power: 50, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, effectType: 'VAMP', effectVal: 0.6, visualHitEffect: 'FX_HIT_RED_BLOOD' },
    { id: 'mr_b4', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '暗影箭', desc: '快速暗傷', range: 6, cast: 0.5, cd: 0.6, cost: 0, gain: 25, type: 'SINGLE', power: 45, color: '#581c87', visual: 'BOLT', projectileSpeed: 800, visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW' },
    { id: 'mr_b5', role: Role.MAGE, team: Team.RED, tag: 'BASIC', name: '混沌爆裂', desc: '隨機高傷', range: 5, cast: 1.0, cd: 1.2, cost: 0, gain: 50, type: 'SINGLE', power: 100, color: '#a855f7', visual: 'BOMB', projectileSpeed: 500, visualHitEffect: 'FX_IMPACT_ARCANE', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB' },

    // ==========================================
    // ⚕️ RED SUPPORT (Shaman / Witch Doctor)
    // ==========================================
    { id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '閃電箭', desc: '傷害支援', range: 5, cast: 0.8, cd: 0.9, cost: 0, gain: 35, type: 'SINGLE', power: 55, color: '#facc15', visual: 'BOLT', projectileSpeed: 800, visualHitEffect: 'FX_IMPACT_LIGHTNING' },
    { id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '厄運詛咒', desc: '燒魔', range: 5, cast: 0.7, cd: 0.8, cost: 0, gain: 35, type: 'SINGLE', power: 30, color: '#581c87', visual: 'BOLT', projectileSpeed: 450, effectType: 'MANA_BURN', effectVal: 40, visualHitEffect: 'FX_HIT_RED_SHADOW' },
    { id: 'sr_b3', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '醫療波', desc: '彈跳治療', range: 5, cast: 0.9, cd: 1.0, cost: 0, gain: 40, type: 'AOE', aoeRadius: 1, power: -45, color: '#fbbf24', visual: 'BEAM', projectileSpeed: 0, visualHitEffect: 'FX_IMPACT_LIGHTNING' },
    { id: 'sr_b4', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '虛弱詛咒', desc: '擊退敵人', range: 4, cast: 0.6, cd: 0.8, cost: 0, gain: 30, type: 'SINGLE', power: 20, color: '#a3e635', visual: 'BOLT', projectileSpeed: 600, ccType: 'KNOCKBACK', ccForce: 2, visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB' },
    { id: 'sr_b5', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', name: '靈魂收割', desc: '斬殺回魔', range: 4, cast: 0.8, cd: 1.0, cost: 0, gain: 50, type: 'SINGLE', power: 40, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, effectType: 'EXECUTE', effectVal: 1.5, visualHitEffect: 'FX_HIT_RED_BLOOD' },
];
