import { Role, Skill, Team } from '../../types';

// 🔴 RED ACTIVE: 鮮血/混沌風格 (Blood/Chaos)
export const RED_ACTIVE: Skill[] = [
    // --- TANK ---
    { 
        id: 'tr_a1', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '奪命血鉤', desc: '強力牽引', 
        range: 6, cast: 0.5, cd: 7.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 110, color: '#7f1d1d', visual: 'BEAM', projectileSpeed: 1600,
        ccType: 'PULL', ccForce: 3,
        visualHitEffect: 'FX_HIT_RED_BLOOD', visualProjectileEffect: 'PROJ_RED_BLOOD_HOOK', element: 'BLOOD'
    },
    { 
        id: 'tr_a2', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '血腥挑釁', desc: '強迫周圍敵人攻擊自己',
        range: 0, cast: 0.2, cd: 7.5, cost: 35, gain: 0,
        type: 'AOE', aoeRadius: 2, power: 70, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0,
        ccType: 'TAUNT', ccDur: 2.5,
        ccType2: 'SHIELD', ccForce2: 200, ccSelf2: true,
        visualHitEffect: 'FX_ACTIVE_RED_WAR_STOMP', element: 'PHYSICAL'
    },
    { 
        id: 'tr_a3', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '戰爭踐踏', desc: '周圍暈眩', 
        range: 0, cast: 0.4, cd: 8.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 130, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.2,
        visualHitEffect: 'FX_ACTIVE_RED_WAR_STOMP', element: 'PHYSICAL'
    },
    { 
        id: 'tr_a4', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '鮮血護盾', desc: '生命護盾', 
        range: 0, cast: 0.3, cd: 10.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 0, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 350, ccSelf: true,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'tr_a5', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '靈魂吞噬', desc: '近身吸血', 
        range: 1, cast: 0.4, cd: 7.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 150, color: '#be123c', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.0,
        visualHitEffect: 'FX_ACTIVE_RED_BLOOD_RAGE', element: 'BLOOD'
    },

    // --- WARRIOR (Enhanced Gap Closers) ---
    { 
        id: 'wr_a1', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '旋風斬', desc: '吸血AOE', 
        range: 0, cast: 0.4, cd: 5.5, cost: 35, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 130, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.6,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'wr_a2', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '斷筋打擊', desc: '重擊定身', 
        range: 1, cast: 0.4, cd: 7.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 150, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'ROOT', ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'PHYSICAL'
    },
    { 
        id: 'wr_a3', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '毀滅跳斬', desc: '突進範圍傷', 
        range: 6, cast: 0.4, cd: 8.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 180, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'DASH',
        visualHitEffect: 'FX_ACTIVE_RED_WAR_STOMP', element: 'PHYSICAL'
    },
    { 
        id: 'wr_a4', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '殘忍處決', desc: '斬殺傷害', 
        range: 1, cast: 0.4, cd: 7.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 250, color: '#7f1d1d', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 2.2,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'wr_a5', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '嗜血狂熱', desc: '攻速吸血', 
        range: 0, cast: 0.2, cd: 10.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 0, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HASTE', ccDur: 5, ccForce: 40, ccSelf: true,
        ccType2: 'LIFESTEAL', ccDur2: 5, ccForce2: 40, ccSelf2: true,
        visualHitEffect: 'FX_ACTIVE_RED_BLOOD_RAGE', element: 'BLOOD'
    },

    // --- RANGER ---
    { 
        id: 'rr_a1', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '燃燒爆彈', desc: '範圍DoT', 
        range: 7, cast: 0.7, cd: 8.5, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 75, color: '#f97316', visual: 'BOMB', projectileSpeed: 900,
        ccType: 'DOT', ccForce: 35, ccDur: 4.0, element: 'FIRE', 
        visualHitEffect: 'FX_ACTIVE_RED_MAGMA_ERUPTION', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT'
    },
    { 
        id: 'rr_a2', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '爆裂散射', desc: '近身擊退', 
        range: 4, cast: 0.3, cd: 7.5, cost: 35, gain: 0, 
        type: 'SINGLE', power: 180, color: '#ea580c', visual: 'SMASH', projectileSpeed: 1600, 
        ccType: 'KNOCKBACK', ccForce: 3,
        visualHitEffect: 'FX_HIT_RED_HEAVY', visualProjectileEffect: 'PROJ_RED_SCATTER_SHOT', element: 'PHYSICAL'
    },
    { 
        id: 'rr_a3', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '捕獵網箭', desc: '定身射擊', 
        range: 7, cast: 0.5, cd: 9.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 110, color: '#78350f', visual: 'BOLT', projectileSpeed: 1300, 
        ccType: 'ROOT', ccDur: 2.5,
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'rr_a4', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '毒煙暗箭', desc: '致盲目標', 
        range: 7, cast: 0.5, cd: 8.5, cost: 35, gain: 0, 
        type: 'SINGLE', power: 110, color: '#a3e635', visual: 'ARROW', projectileSpeed: 1300, 
        ccType: 'BLIND', ccDur: 3.0,
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'ARROW', element: 'POISON'
    },
    { 
        id: 'rr_a5', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '遠程狙殺', desc: '超遠傷害', 
        range: 9, cast: 1.2, cd: 11.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 380, color: '#000000', visual: 'BOLT', projectileSpeed: 3000, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT', element: 'PHYSICAL'
    },

    // --- MAGE ---
    { 
        id: 'mr_a1', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '靈魂腐化', desc: '強力DoT', 
        range: 6, cast: 0.5, cd: 7.5, cost: 35, gain: 0, 
        type: 'SINGLE', power: 70, color: '#a3e635', visual: 'BOLT', projectileSpeed: 900, 
        ccType: 'DOT', ccForce: 65, ccDur: 5.0, 
        visualHitEffect: 'FX_ACTIVE_RED_FEL_SPLASH', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB', element: 'POISON'
    },
    { 
        id: 'mr_a2', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '暗影之怒', desc: '範圍恐懼', 
        range: 6, cast: 0.7, cd: 10.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 110, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 1.5,
        visualHitEffect: 'FX_ACTIVE_RED_SHADOW_SCREAM', element: 'VOID'
    },
    { 
        id: 'mr_a3', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '邪能變形', desc: '將目標變為羊形，無法行動',
        range: 6, cast: 0.7, cd: 12.0, cost: 45, gain: 0,
        type: 'SINGLE', power: 45, color: '#fbcfe8', visual: 'BEAM', projectileSpeed: 0,
        ccType: 'POLYMORPH', ccDur: 3.0,
        specialVisualStatus: 'POLYMORPH',
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'mr_a4', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '裂甲詛咒', desc: '使目標進入虛弱狀態',
        range: 6, cast: 0.5, cd: 8.5, cost: 35, gain: 0,
        type: 'SINGLE', power: 60, color: '#ef4444', visual: 'BOLT', projectileSpeed: 900,
        ccType: 'VULNERABLE', ccDur: 4.0,
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'mr_a5', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '鮮血分流', desc: '回魔傷害', 
        range: 6, cast: 0.4, cd: 8.5, cost: 0, gain: 35, 
        type: 'SINGLE', power: 80, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_ACTIVE_RED_BLOOD_RAGE', element: 'BLOOD'
    },

    // --- SUPPORT ---
    { 
        id: 'sr_a1', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '生命轉移', desc: '損血補隊友', 
        range: 6, cast: 0.5, cd: 5.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: -350, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'SELF_DAMAGE', effectVal: 70,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_a2', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '邪能護盾', desc: '單體護盾', 
        range: 6, cast: 0.5, cd: 7.5, cost: 30, gain: 0, 
        type: 'SINGLE', power: 0, color: '#a3e635', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 260, ccDur: 4.0,
        visualHitEffect: 'FX_ACTIVE_RED_FEL_SPLASH', element: 'POISON'
    },
    { 
        id: 'sr_a3', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '治療圖騰', desc: '範圍回血', 
        range: 0, cast: 0.7, cd: 9.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: -140, color: '#84cc16', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 40, ccDur: 5.0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_a4', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '衰朽詛咒', desc: '範圍虛弱', 
        range: 6, cast: 0.7, cd: 11.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 50, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'MANA_BURN', effectVal: 18,
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'sr_a5', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '黑暗犧牲', desc: '自殘大補', 
        range: 6, cast: 0.5, cd: 9.0, cost: 0, gain: 40, 
        type: 'SINGLE', power: -500, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'SELF_DAMAGE', effectVal: 140,
        ccForce: 10, ccDur: 2.5,
        visualHitEffect: 'FX_ACTIVE_RED_BLOOD_RAGE', element: 'BLOOD'
    }
];
