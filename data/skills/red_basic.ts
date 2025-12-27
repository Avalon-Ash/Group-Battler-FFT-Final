
import { Role, Skill, Team } from '../../types';

export const RED_BASIC: Skill[] = [
    // =================================================================
    // 🛡️ TANK: Brutal / Sustain
    // =================================================================
    { 
        id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '碎骨擊', desc: '吸血重擊', 
        range: 1, cast: 0.8, cd: 1.2, cost: 0, gain: 45,
        type: 'SINGLE', power: 60, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.3, visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },
    { 
        id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '倒鉤', desc: '輕微牽引', 
        range: 2, cast: 0.6, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 40, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 2, visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'tr_b3', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '腐蝕吐息', desc: '近距離持續傷', 
        range: 1, cast: 0.5, cd: 0.8, cost: 0, gain: 25,
        type: 'SINGLE', power: 30, color: '#3f6212', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 3.0, ccForce: 10, visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'tr_b4', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '鏽蝕打擊', desc: '破甲(DOT)', 
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 35, color: '#78350f', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 5.0, ccForce: 15, visualHitEffect: 'FX_HIT_RED_PHYSICAL' 
    },
    { 
        id: 'tr_b5', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '蠻力衝撞', desc: '擊退', 
        range: 1, cast: 0.6, cd: 1.5, cost: 0, gain: 40,
        type: 'SINGLE', power: 50, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 2, visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },

    // =================================================================
    // ⚔️ WARRIOR: Bleed / Aggression
    // =================================================================
    { 
        id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '撕裂斬', desc: '造成流血', 
        range: 1, cast: 0.5, cd: 0.8, cost: 0, gain: 30, 
        type: 'SINGLE', power: 55, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 3.0, ccForce: 10, visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '雙手斧', desc: '高傷無特效', 
        range: 1, cast: 0.7, cd: 1.0, cost: 0, gain: 40, 
        type: 'SINGLE', power: 80, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },
    { 
        id: 'wr_b3', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '飛斧', desc: '遠程普攻', 
        range: 3, cast: 0.6, cd: 1.2, cost: 0, gain: 35, 
        type: 'SINGLE', power: 50, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 900, // Reduced from 1200
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', visualProjectileEffect: 'PROJ_RED_AXE' 
    },
    { 
        id: 'wr_b4', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '血腥切割', desc: '高流血', 
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 45, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 4.0, ccForce: 20, visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'wr_b5', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '致殘打擊', desc: '短暫暈眩', 
        range: 1, cast: 0.8, cd: 2.0, cost: 0, gain: 50, 
        type: 'SINGLE', power: 60, color: '#000', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 0.8, visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },

    // =================================================================
    // 🏹 RANGER: Explosive / Fire
    // =================================================================
    { 
        id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '爆裂彈', desc: '低速高傷', 
        range: 6, cast: 1.2, cd: 1.5, cost: 0, gain: 50, 
        type: 'SINGLE', power: 80, color: '#ea580c', visual: 'BOMB', projectileSpeed: 1000, // Reduced from 1200
        visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT' 
    },
    { 
        id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '連發手槍', desc: '快速低傷', 
        range: 5, cast: 0.3, cd: 0.5, cost: 0, gain: 15, 
        type: 'SINGLE', power: 30, color: '#f87171', visual: 'BOLT', projectileSpeed: 1400, // Reduced from 2000
        visualHitEffect: 'FX_HIT_RED_PHYSICAL' 
    },
    { 
        id: 'rr_b3', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '毒鏢', desc: '中毒', 
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 20, color: '#65a30d', visual: 'ARROW', projectileSpeed: 1100, // Reduced from 1500
        ccType: 'DOT', ccDur: 5.0, ccForce: 15, visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'rr_b4', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '燃燒彈', desc: '點燃', 
        range: 6, cast: 0.8, cd: 1.2, cost: 0, gain: 35, 
        type: 'SINGLE', power: 40, color: '#f97316', visual: 'BOMB', projectileSpeed: 800, // Reduced from 1000
        ccType: 'DOT', ccDur: 3.0, ccForce: 20, element: 'FIRE', visualHitEffect: 'FX_HIT_RED_MAGMA' 
    },
    { 
        id: 'rr_b5', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '捕捉網', desc: '定身(暈眩)', 
        range: 4, cast: 0.5, cd: 3.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 10, color: '#78350f', visual: 'BOMB', projectileSpeed: 700, // Reduced from 800
        ccType: 'STUN', ccDur: 1.5, visualHitEffect: 'FX_HIT_RED_PHYSICAL' 
    },

    // =================================================================
    // 🔮 MAGE: Chaos / Shadow
    // =================================================================
    { 
        id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '混沌箭', desc: '隨機傷害', 
        range: 5, cast: 0.9, cd: 1.0, cost: 0, gain: 45, 
        type: 'SINGLE', power: 70, color: '#16a34a', visual: 'BOLT', projectileSpeed: 500, // Reduced from 700 (Very slow chaos orb)
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB' 
    },
    { 
        id: 'mr_b2', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '吸血鬼之觸', desc: '吸血傷害', 
        range: 4, cast: 0.8, cd: 1.2, cost: 0, gain: 40, 
        type: 'SINGLE', power: 50, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.5, visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '暗影波', desc: '穿透直線(假)', 
        range: 5, cast: 0.7, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 55, color: '#581c87', visual: 'BOLT', projectileSpeed: 700, // Reduced from 900
        visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW' 
    },
    { 
        id: 'mr_b4', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '凋零', desc: '持續腐蝕', 
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 30, color: '#450a0a', visual: 'BOLT', projectileSpeed: 500, // Reduced from 600
        ccType: 'DOT', ccDur: 6.0, ccForce: 15, visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
    { 
        id: 'mr_b5', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '餘燼', desc: '火焰傷害', 
        range: 5, cast: 0.6, cd: 0.8, cost: 0, gain: 25, 
        type: 'SINGLE', power: 45, color: '#ea580c', visual: 'FIREBALL', projectileSpeed: 600, // Reduced from 800
        visualHitEffect: 'FX_HIT_RED_MAGMA' 
    },

    // =================================================================
    // ⚕️ SUPPORT: Sacrifice / Curse
    // =================================================================
    { 
        id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '鮮血祭儀', desc: '吸血光束', 
        range: 4, cast: 0.8, cd: 1.0, cost: 0, gain: 40, 
        type: 'SINGLE', power: 45, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.5, visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '衰弱詛咒', desc: '無傷但燃魔', 
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 10, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 700, // Reduced from 800
        effectType: 'MANA_BURN', effectVal: 20, visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
    { 
        id: 'sr_b3', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '生命轉移', desc: '治療友軍(自損)', 
        range: 4, cast: 0.5, cd: 0.5, cost: 0, gain: 20, 
        type: 'SINGLE', power: -60, color: '#dc2626', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'sr_b4', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '吸星大法', desc: '高額吸血', 
        range: 4, cast: 1.0, cd: 1.5, cost: 0, gain: 50, 
        type: 'SINGLE', power: 50, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.0, visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'sr_b5', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '痛苦咒語', desc: '持續燃魔', 
        range: 6, cast: 0.5, cd: 2.0, cost: 0, gain: 40, 
        type: 'SINGLE', power: 20, color: '#581c87', visual: 'BOLT', projectileSpeed: 500, // Reduced from 600
        effectType: 'MANA_BURN', effectVal: 30, visualHitEffect: 'FX_HIT_RED_SHADOW' 
    }
];
