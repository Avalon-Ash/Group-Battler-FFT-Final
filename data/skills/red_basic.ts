
import { Role, Skill, Team } from '../../types';

// 🔴 RED BASIC: 25 VARIATIONS
// Balance Rule: Max Range = 5
export const RED_BASIC: Skill[] = [
    // --- TANK ---
    { 
        id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '碎骨重擊', desc: '吸血打擊', 
        range: 1, cast: 0.6, cd: 1.0, cost: 0, gain: 25,
        type: 'SINGLE', power: 55, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.3, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '血腥肉鉤', desc: '微量牽引', 
        range: 2, cast: 0.5, cd: 1.2, cost: 0, gain: 30, // Reach 2
        type: 'SINGLE', power: 40, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 1, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'tr_b3', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '尖刺防禦', desc: '反傷準備', 
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 20,
        type: 'SINGLE', power: 45, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 15,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'tr_b4', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '野蠻頭槌', desc: '微暈', 
        range: 1, cast: 0.3, cd: 1.5, cost: 0, gain: 25,
        type: 'SINGLE', power: 50, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 0.1,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'tr_b5', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '兇殘撕咬', desc: '流血', 
        range: 1, cast: 0.5, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 40, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 5, ccDur: 3.0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },

    // --- WARRIOR ---
    { 
        id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '裂傷斬擊', desc: '流血效果', 
        range: 1, cast: 0.4, cd: 0.8, cost: 0, gain: 25, 
        type: 'SINGLE', power: 60, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 3.0, ccForce: 15, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '飛斧投擲', desc: '中程攻擊', 
        range: 3, cast: 0.5, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 55, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 900, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', visualProjectileEffect: 'PROJ_RED_AXE', element: 'PHYSICAL'
    },
    { 
        id: 'wr_b3', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '橫掃千軍', desc: '範圍傷害', 
        range: 1, cast: 0.5, cd: 1.2, cost: 0, gain: 30, 
        type: 'AOE', aoeRadius: 1, power: 45, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wr_b4', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '重拳猛擊', desc: '打斷', 
        range: 1, cast: 0.2, cd: 1.0, cost: 0, gain: 20, 
        type: 'SINGLE', power: 40, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 0.5,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'wr_b5', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '狂怒連斬', desc: '低血高傷', 
        range: 1, cast: 0.4, cd: 0.8, cost: 0, gain: 35, 
        type: 'SINGLE', power: 70, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 1.2,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },

    // --- RANGER (Nerfed Ranges) ---
    { 
        id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '破城重弩', desc: '重型射擊', 
        range: 5, cast: 0.8, cd: 1.2, cost: 0, gain: 35, // Range 6->5
        type: 'SINGLE', power: 75, color: '#ea580c', visual: 'BOMB', projectileSpeed: 1000, 
        ccType: 'KNOCKBACK', ccForce: 1,
        visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT', element: 'FIRE'
    },
    { 
        id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '急速連射', desc: '快速低傷', 
        range: 5, cast: 0.2, cd: 0.6, cost: 0, gain: 15, // Range 6->5
        type: 'SINGLE', power: 30, color: '#f87171', visual: 'BOLT', projectileSpeed: 1800, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', visualProjectileEffect: 'BOLT', element: 'PHYSICAL'
    },
    { 
        id: 'rr_b3', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '劇毒矢', desc: '中毒', 
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 25, // Range 7->5
        type: 'SINGLE', power: 40, color: '#a3e635', visual: 'ARROW', projectileSpeed: 1200, 
        ccType: 'DOT', ccForce: 8, ccDur: 3.0,
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'ARROW', element: 'POISON'
    },
    { 
        id: 'rr_b4', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '燃燒箭', desc: '燃燒', 
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 30, // Range 7->5
        type: 'SINGLE', power: 50, color: '#f97316', visual: 'FIREBALL', projectileSpeed: 1100, 
        ccType: 'DOT', ccForce: 10, ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'FIREBALL', element: 'FIRE'
    },
    { 
        id: 'rr_b5', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '狩獵陷阱', desc: '定身', 
        range: 4, cast: 0.7, cd: 1.5, cost: 0, gain: 35, // Range 6->4
        type: 'SINGLE', power: 40, color: '#7c3aed', visual: 'BOMB', projectileSpeed: 900, 
        ccType: 'ROOT', ccDur: 1.0,
        visualHitEffect: 'FX_HIT_RED_HEAVY', visualProjectileEffect: 'BOMB', element: 'PHYSICAL'
    },

    // --- MAGE (Nerfed Ranges) ---
    { 
        id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '混沌之球', desc: '隨機傷害', 
        range: 4, cast: 0.6, cd: 1.0, cost: 0, gain: 30, // Range 5->4
        type: 'SINGLE', power: 60, color: '#16a34a', visual: 'BOLT', projectileSpeed: 600, 
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB', element: 'POISON'
    },
    { 
        id: 'mr_b2', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '生命虹吸', desc: '吸血連結', 
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 45, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.5, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '燃燒餘燼', desc: '燃燒傷害', 
        range: 4, cast: 0.4, cd: 0.8, cost: 0, gain: 20, // Range 5->4
        type: 'SINGLE', power: 40, color: '#fca5a5', visual: 'FIREBALL', projectileSpeed: 800, 
        ccType: 'DOT', ccForce: 5, ccDur: 3.0,
        visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'FIREBALL', element: 'FIRE'
    },
    { 
        id: 'mr_b4', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '虛弱詛咒', desc: '虛弱', 
        range: 5, cast: 0.6, cd: 1.2, cost: 0, gain: 35, // Range 6->5
        type: 'SINGLE', power: 25, color: '#581c87', visual: 'BOLT', projectileSpeed: 1000, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'mr_b5', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '暗影箭', desc: '穿透', 
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 30, // Range 5->4
        type: 'SINGLE', power: 50, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 1000, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW', element: 'VOID'
    },

    // --- SUPPORT (Range 4/5) ---
    { 
        id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '血之祭儀', desc: '吸血光束', 
        range: 4, cast: 0.6, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 45, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.6, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '靈魂虛弱', desc: '燃魔普攻', 
        range: 4, cast: 0.4, cd: 0.9, cost: 0, gain: 25, // Range 5->4
        type: 'SINGLE', power: 30, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 900, 
        effectType: 'MANA_BURN', effectVal: 15, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'sr_b3', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '痛苦妖術', desc: '隨機負面', 
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 35, // Range 5->4
        type: 'SINGLE', power: 40, color: '#a3e635', visual: 'BOLT', projectileSpeed: 800, 
        ccType: 'DOT', ccForce: 10, ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB', element: 'POISON'
    },
    { 
        id: 'sr_b4', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '鮮血治癒', desc: '耗血補人', 
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 20, 
        type: 'SINGLE', power: -60, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'SELF_DAMAGE', effectVal: 30,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_b5', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '巫毒射擊', desc: '持續傷害', 
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 35, color: '#84cc16', visual: 'BOLT', projectileSpeed: 1000, 
        ccType: 'DOT', ccForce: 8, ccDur: 4.0,
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'BOLT', element: 'POISON'
    }
];
