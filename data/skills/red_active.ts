
import { Role, Skill, Team } from '../../types';

// 🔴 RED ACTIVE: DoT, Fear, Pull, Lifesteal
export const RED_ACTIVE: Skill[] = [
    // --- TANK ---
    { 
        id: 'tr_a1', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '血鉤 (Pull)', desc: '強力牽引', 
        range: 5, cast: 0.5, cd: 8.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 80, color: '#7f1d1d', visual: 'BEAM', projectileSpeed: 1500,
        ccType: 'PULL', ccForce: 3, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'tr_a2', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '怒吼 (Roar)', desc: '範圍恐懼', 
        range: 0, cast: 0.3, cd: 10.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 40, color: '#7c3aed', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 1.5, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'tr_a3', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '踐踏 (Stomp)', desc: '周圍暈眩', 
        range: 0, cast: 0.4, cd: 9.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 100, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.0,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'tr_a4', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '血盾 (Blood)', desc: '生命護盾', 
        range: 0, cast: 0.2, cd: 12.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 0, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 250,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'tr_a5', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '吞噬 (Devour)', desc: '近身吸血', 
        range: 1, cast: 0.5, cd: 8.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 120, color: '#be123c', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },

    // --- WARRIOR ---
    { 
        id: 'wr_a1', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '旋風 (Whirl)', desc: '吸血AOE', 
        range: 0, cast: 0.2, cd: 6.0, cost: 35, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 100, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.5,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'wr_a2', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '斷筋 (Slow)', desc: '重擊定身', 
        range: 1, cast: 0.5, cd: 8.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 120, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'ROOT', ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'PHYSICAL'
    },
    { 
        id: 'wr_a3', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '跳斬 (Leap)', desc: '突進範圍傷', 
        range: 4, cast: 0.6, cd: 10.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 150, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'wr_a4', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '處決 (Cut)', desc: '斬殺傷害', 
        range: 1, cast: 0.4, cd: 8.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 200, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 2.0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'wr_a5', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '嗜血 (Lust)', desc: '攻速吸血', 
        range: 0, cast: 0.2, cd: 12.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 0, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 30, ccDur: 5.0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },

    // --- RANGER ---
    { 
        id: 'rr_a1', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '燃燒 (Burn)', desc: '範圍DoT', 
        range: 6, cast: 0.8, cd: 9.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 60, color: '#f97316', visual: 'BOMB', projectileSpeed: 800,
        ccType: 'DOT', ccForce: 30, ccDur: 4.0, element: 'FIRE', 
        visualHitEffect: 'FX_HIT_RED_MAGMA'
    },
    { 
        id: 'rr_a2', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '散彈 (Blast)', desc: '近身擊退', 
        range: 3, cast: 0.3, cd: 8.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 140, color: '#ea580c', visual: 'SMASH', projectileSpeed: 1500, 
        ccType: 'KNOCKBACK', ccForce: 3, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'rr_a3', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '網箭 (Net)', desc: '定身射擊', 
        range: 6, cast: 0.5, cd: 10.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 80, color: '#78350f', visual: 'BOLT', projectileSpeed: 1200, 
        ccType: 'ROOT', ccDur: 2.5,
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'rr_a4', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '箭雨 (Volley)', desc: '範圍傷害', 
        range: 7, cast: 1.0, cd: 10.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 100, color: '#f87171', visual: 'ARROW', projectileSpeed: 1500, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'rr_a5', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '狙擊 (Snipe)', desc: '超遠傷害', 
        range: 10, cast: 1.5, cd: 12.0, cost: 50, gain: 0, 
        type: 'SINGLE', power: 300, color: '#000', visual: 'BOLT', projectileSpeed: 3000, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },

    // --- MAGE ---
    { 
        id: 'mr_a1', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '腐化 (Rot)', desc: '強力DoT', 
        range: 5, cast: 0.6, cd: 8.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 50, color: '#a3e635', visual: 'BOLT', projectileSpeed: 600,
        ccType: 'DOT', ccForce: 50, ccDur: 5.0, 
        visualHitEffect: 'FX_HIT_RED_FEL', element: 'POISON'
    },
    { 
        id: 'mr_a2', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '暗怒 (Fury)', desc: '範圍恐懼', 
        range: 6, cast: 1.0, cd: 12.0, cost: 50, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 80, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 1.2,
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'mr_a3', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '流星 (Mini)', desc: '小範圍火球', 
        range: 7, cast: 0.8, cd: 8.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 150, color: '#ea580c', visual: 'FIREBALL', projectileSpeed: 800, 
        visualHitEffect: 'FX_HIT_RED_MAGMA', element: 'FIRE'
    },
    { 
        id: 'mr_a4', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '夢魘 (Circle)', desc: '單體恐懼', 
        range: 5, cast: 0.5, cd: 10.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 60, color: '#7c3aed', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 1.5,
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'mr_a5', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '分流 (Tap)', desc: '回魔傷害', 
        range: 5, cast: 0.4, cd: 8.0, cost: 0, gain: 50, 
        type: 'SINGLE', power: 80, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },

    // --- SUPPORT ---
    { 
        id: 'sr_a1', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '轉移 (Swap)', desc: '損血補隊友', 
        range: 5, cast: 0.5, cd: 5.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: -250, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_a2', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '護盾 (Fel)', desc: '單體護盾', 
        range: 5, cast: 0.6, cd: 8.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 0, color: '#a3e635', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 180, 
        visualHitEffect: 'FX_HIT_RED_FEL', element: 'POISON'
    },
    { 
        id: 'sr_a3', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '圖騰 (Totem)', desc: '範圍回血', 
        range: 0, cast: 0.8, cd: 10.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: -100, color: '#84cc16', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 30, ccDur: 5.0,
        visualHitEffect: 'FX_HIT_RED_FEL', element: 'POISON'
    },
    { 
        id: 'sr_a4', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '詛咒 (Zone)', desc: '範圍虛弱', 
        range: 6, cast: 0.8, cd: 12.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 50, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'MANA_BURN', effectVal: 30,
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'sr_a5', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '犧牲 (Sacrifice)', desc: '自殘大補', 
        range: 6, cast: 0.5, cd: 10.0, cost: 0, gain: 40, 
        type: 'SINGLE', power: -400, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    }
];
