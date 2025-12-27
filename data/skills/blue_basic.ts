
import { Role, Skill, Team } from '../../types';

export const BLUE_BASIC: Skill[] = [
    // =================================================================
    // 🛡️ TANK: Crowd Control / Defense
    // =================================================================
    { 
        id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '鎮壓打擊', desc: '回復魔力', 
        range: 1, cast: 0.5, cd: 1.0, cost: 0, gain: 40,
        type: 'SINGLE', power: 40, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '衝擊盾擊', desc: '低傷但擊退', 
        range: 1, cast: 0.4, cd: 1.2, cost: 0, gain: 30,
        type: 'SINGLE', power: 25, color: '#93c5fd', visual: 'SMASH', projectileSpeed: 0,
        ccType: 'KNOCKBACK', ccForce: 2,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },
    { 
        id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '能量汲取', desc: '燃燒敵人魔力', 
        range: 2, cast: 0.6, cd: 1.0, cost: 0, gain: 20,
        type: 'SINGLE', power: 30, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0,
        effectType: 'MANA_BURN', effectVal: 15,
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'tb_b4', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '電擊警棍', desc: '機率暈眩', 
        range: 1, cast: 0.3, cd: 1.5, cost: 0, gain: 25,
        type: 'SINGLE', power: 35, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0,
        ccType: 'STUN', ccDur: 0.5,
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'tb_b5', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '引力拳', desc: '極短牽引', 
        range: 2, cast: 0.5, cd: 1.2, cost: 0, gain: 30,
        type: 'SINGLE', power: 40, color: '#2563eb', visual: 'SMASH', projectileSpeed: 0,
        ccType: 'PULL', ccForce: 1,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },

    // =================================================================
    // ⚔️ WARRIOR: Sustained DPS
    // =================================================================
    { 
        id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '光刃斬', desc: '標準連擊', 
        range: 1, cast: 0.3, cd: 0.6, cost: 0, gain: 25, 
        type: 'SINGLE', power: 45, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },
    { 
        id: 'wb_b2', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '突刺', desc: '較長距離普攻', 
        range: 2, cast: 0.4, cd: 0.8, cost: 0, gain: 30, 
        type: 'SINGLE', power: 40, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },
    { 
        id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '充能重擊', desc: '高傷慢速', 
        range: 1, cast: 0.8, cd: 1.5, cost: 0, gain: 50, 
        type: 'SINGLE', power: 70, color: '#facc15', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'wb_b4', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '相位劍', desc: '無視部分防禦(高傷)', 
        range: 1, cast: 0.4, cd: 0.8, cost: 0, gain: 25, 
        type: 'SINGLE', power: 55, color: '#bfdbfe', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },
    { 
        id: 'wb_b5', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '劍柄猛擊', desc: '短暫沉默', 
        range: 1, cast: 0.3, cd: 2.0, cost: 0, gain: 40, 
        type: 'SINGLE', power: 30, color: '#93c5fd', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 1.0,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },

    // =================================================================
    // 🏹 RANGER: Poke / Kiting
    // =================================================================
    { 
        id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '磁軌射擊', desc: '極高彈速', 
        range: 7, cast: 0.8, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 55, color: '#38bdf8', visual: 'BOLT', projectileSpeed: 1500, // Reduced from 2500
        visualHitEffect: 'FX_HIT_BLUE_TECH', visualProjectileEffect: 'PROJ_BLUE_SNIPER' 
    },
    { 
        id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '冰霜箭', desc: '緩速(視覺)', 
        range: 6, cast: 0.6, cd: 1.2, cost: 0, gain: 30, 
        type: 'SINGLE', power: 45, color: '#e0f2fe', visual: 'ARROW', projectileSpeed: 1000, // Reduced from 1200
        visualHitEffect: 'FX_HIT_BLUE_ICE', visualProjectileEffect: 'PROJ_BLUE_ICE_ARROW'
    },
    { 
        id: 'rb_b3', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '雙重射擊', desc: '快速低傷', 
        range: 5, cast: 0.2, cd: 0.4, cost: 0, gain: 15, 
        type: 'SINGLE', power: 25, color: '#7dd3fc', visual: 'ARROW', projectileSpeed: 1100, // Reduced from 1500
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },
    { 
        id: 'rb_b4', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '追蹤彈', desc: '必定命中', 
        range: 8, cast: 1.0, cd: 1.5, cost: 0, gain: 40, 
        type: 'SINGLE', power: 50, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 700, // Reduced from 800
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'rb_b5', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '衝擊彈', desc: '輕微擊退', 
        range: 5, cast: 0.5, cd: 1.5, cost: 0, gain: 20, 
        type: 'SINGLE', power: 35, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 900, // Reduced from 1200
        ccType: 'KNOCKBACK', ccForce: 1,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },

    // =================================================================
    // 🔮 MAGE: Burst / Control
    // =================================================================
    { 
        id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '奧術飛彈', desc: '追蹤飛彈', 
        range: 6, cast: 0.6, cd: 0.8, cost: 0, gain: 40, 
        type: 'SINGLE', power: 50, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 600, // Reduced from 800
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', visualProjectileEffect: 'PROJ_BLUE_ORB' 
    },
    { 
        id: 'mb_b2', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '寒冰錐', desc: '機率凍結', 
        range: 5, cast: 0.8, cd: 1.2, cost: 0, gain: 35, 
        type: 'SINGLE', power: 45, color: '#c084fc', visual: 'BOLT', projectileSpeed: 800, // Reduced from 1000
        visualHitEffect: 'FX_HIT_BLUE_ICE', visualProjectileEffect: 'PROJ_BLUE_FROST_BOLT'
    },
    { 
        id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '充能雷射', desc: '即時命中', 
        range: 5, cast: 1.0, cd: 1.5, cost: 0, gain: 60, 
        type: 'SINGLE', power: 65, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'mb_b4', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '電擊', desc: '快速打斷', 
        range: 4, cast: 0.2, cd: 0.5, cost: 0, gain: 15, 
        type: 'SINGLE', power: 20, color: '#fcd34d', visual: 'BOLT', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'mb_b5', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '虛空法球', desc: '緩慢高傷', 
        range: 5, cast: 1.2, cd: 2.0, cost: 0, gain: 50, 
        type: 'SINGLE', power: 80, color: '#4c1d95', visual: 'FIREBALL', projectileSpeed: 300, // Reduced from 400
        visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },

    // =================================================================
    // ⚕️ SUPPORT: Utility / Holy
    // =================================================================
    { 
        id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '懲戒', desc: '神聖傷害', 
        range: 5, cast: 0.7, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 40, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '干擾光束', desc: '極低傷但回魔快', 
        range: 6, cast: 0.3, cd: 0.5, cost: 0, gain: 20, 
        type: 'SINGLE', power: 15, color: '#bfdbfe', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'sb_b3', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '戰術指令', desc: '回復自身魔力', 
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 50, 
        type: 'SINGLE', power: 30, color: '#22d3ee', visual: 'BOLT', projectileSpeed: 800, // Reduced from 1000
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'sb_b4', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '淨化之光', desc: '對敵傷害', 
        range: 5, cast: 0.8, cd: 1.2, cost: 0, gain: 40, 
        type: 'SINGLE', power: 45, color: '#ffffff', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'sb_b5', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '掃描', desc: '揭示弱點(易傷)', 
        range: 8, cast: 0.2, cd: 2.0, cost: 0, gain: 10, 
        type: 'SINGLE', power: 10, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    }
];
