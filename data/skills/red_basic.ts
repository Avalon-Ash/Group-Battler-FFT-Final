
import { Role, Skill, Team } from '../../types';

// 🔴 RED BASIC: High MP, Vamp/DoT Theme
export const RED_BASIC: Skill[] = [
    // --- TANK ---
    { 
        id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '碎骨 (Bash)', desc: '吸血打擊', 
        range: 1, cast: 0.6, cd: 1.0, cost: 0, gain: 25,
        type: 'SINGLE', power: 55, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.3, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '肉鉤 (Hook)', desc: '微量牽引', 
        range: 2, cast: 0.5, cd: 1.2, cost: 0, gain: 30,
        type: 'SINGLE', power: 40, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 1, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'tr_b3', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '尖刺 (Spike)', desc: '反傷準備', 
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 20,
        type: 'SINGLE', power: 45, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 15,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'tr_b4', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '頭槌 (Butt)', desc: '微暈', 
        range: 1, cast: 0.3, cd: 1.5, cost: 0, gain: 25,
        type: 'SINGLE', power: 50, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 0.1,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'tr_b5', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '撕咬 (Gore)', desc: '流血', 
        range: 1, cast: 0.5, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 40, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 5, ccDur: 3.0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },

    // --- WARRIOR ---
    { 
        id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '撕裂 (Rend)', desc: '流血效果', 
        range: 1, cast: 0.4, cd: 0.8, cost: 0, gain: 20, 
        type: 'SINGLE', power: 60, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 3.0, ccForce: 15, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '飛斧 (Axe)', desc: '中程攻擊', 
        range: 3, cast: 0.5, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 55, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 1200, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', visualProjectileEffect: 'PROJ_RED_AXE', element: 'PHYSICAL'
    },
    { 
        id: 'wr_b3', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '橫掃 (Slash)', desc: '範圍傷害', 
        range: 1, cast: 0.5, cd: 1.2, cost: 0, gain: 30, 
        type: 'AOE', aoeRadius: 1, power: 45, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wr_b4', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '拳擊 (Pummel)', desc: '打斷', 
        range: 1, cast: 0.2, cd: 1.0, cost: 0, gain: 20, 
        type: 'SINGLE', power: 40, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 0.5,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'wr_b5', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '狂怒 (Enrage)', desc: '低血高傷', 
        range: 1, cast: 0.4, cd: 0.8, cost: 0, gain: 35, 
        type: 'SINGLE', power: 70, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 1.2,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },

    // --- RANGER ---
    { 
        id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '弩箭 (Bolt)', desc: '重型射擊', 
        range: 5, cast: 0.8, cd: 1.2, cost: 0, gain: 35, 
        type: 'SINGLE', power: 75, color: '#ea580c', visual: 'BOMB', projectileSpeed: 1200, 
        ccType: 'KNOCKBACK', ccForce: 1,
        visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT', element: 'FIRE'
    },
    { 
        id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '連發 (Auto)', desc: '快速低傷', 
        range: 5, cast: 0.2, cd: 0.6, cost: 0, gain: 15, 
        type: 'SINGLE', power: 30, color: '#f87171', visual: 'BOLT', projectileSpeed: 1800, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'rr_b3', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '毒矢 (Poison)', desc: '中毒', 
        range: 6, cast: 0.5, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 40, color: '#a3e635', visual: 'ARROW', projectileSpeed: 1500, 
        ccType: 'DOT', ccForce: 8, ccDur: 3.0,
        visualHitEffect: 'FX_HIT_RED_FEL', element: 'POISON'
    },
    { 
        id: 'rr_b4', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '火箭 (Fire)', desc: '燃燒', 
        range: 6, cast: 0.6, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 50, color: '#f97316', visual: 'FIREBALL', projectileSpeed: 1200, 
        ccType: 'DOT', ccForce: 10, ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_MAGMA', element: 'FIRE'
    },
    { 
        id: 'rr_b5', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '陷阱 (Trap)', desc: '定身', 
        range: 5, cast: 0.7, cd: 1.5, cost: 0, gain: 35, 
        type: 'SINGLE', power: 40, color: '#7c3aed', visual: 'BOMB', projectileSpeed: 1000, 
        ccType: 'ROOT', ccDur: 1.0,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },

    // --- MAGE ---
    { 
        id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '混沌 (Chaos)', desc: '隨機傷害', 
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 65, color: '#16a34a', visual: 'BOLT', projectileSpeed: 700, 
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB', element: 'POISON'
    },
    { 
        id: 'mr_b2', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '虹吸 (Drain)', desc: '吸血連結', 
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 50, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.5, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '餘燼 (Ember)', desc: '燃燒傷害', 
        range: 5, cast: 0.4, cd: 0.8, cost: 0, gain: 20, 
        type: 'SINGLE', power: 45, color: '#fca5a5', visual: 'FIREBALL', projectileSpeed: 1000, 
        ccType: 'DOT', ccForce: 5, ccDur: 3.0,
        visualHitEffect: 'FX_HIT_RED_MAGMA', element: 'FIRE'
    },
    { 
        id: 'mr_b4', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '詛咒 (Curse)', desc: '虛弱', 
        range: 6, cast: 0.6, cd: 1.2, cost: 0, gain: 35, 
        type: 'SINGLE', power: 30, color: '#581c87', visual: 'BOLT', projectileSpeed: 1200, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'mr_b5', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '暗影 (Shadow)', desc: '穿透', 
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 55, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 1000, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },

    // --- SUPPORT ---
    { 
        id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '祭儀 (Rite)', desc: '吸血光束', 
        range: 4, cast: 0.6, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 45, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.6, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '虛弱 (Weak)', desc: '燃魔普攻', 
        range: 5, cast: 0.4, cd: 0.9, cost: 0, gain: 25, 
        type: 'SINGLE', power: 30, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 900, 
        effectType: 'MANA_BURN', effectVal: 15, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'sr_b3', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '妖術 (Hex)', desc: '隨機負面', 
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 40, color: '#a3e635', visual: 'BOLT', projectileSpeed: 800, 
        ccType: 'DOT', ccForce: 10, ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_FEL', element: 'POISON'
    },
    { 
        id: 'sr_b4', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '血療 (Mend)', desc: '耗血補人', 
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 20, 
        type: 'SINGLE', power: -60, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_b5', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '巫毒 (Voodoo)', desc: '持續傷害', 
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 35, color: '#84cc16', visual: 'BOLT', projectileSpeed: 1000, 
        ccType: 'DOT', ccForce: 8, ccDur: 4.0,
        visualHitEffect: 'FX_HIT_RED_FEL', element: 'POISON'
    }
];
