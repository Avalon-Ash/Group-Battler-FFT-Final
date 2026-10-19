import { Role, Skill, Team } from '../../types';

// 🔴 RED ULT: Cost 100, CD 5s
export const RED_ULT: Skill[] = [
    // --- TANK ---
    { 
        id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '處決斷頭台', desc: '近身斬殺', 
        range: 2, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 650, color: '#7f1d1d', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 2.6, 
        visualHitEffect: 'FX_ULT_RED_GUILLOTINE_IMPACT', element: 'BLOOD'
    },
    { 
        id: 'tr_u2', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '亡靈瘟疫', desc: '周圍持續腐化', 
        range: 0, cast: 0.7, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 200, color: '#a3e635', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 140, ccDur: 6, 
        visualHitEffect: 'FX_ULT_RED_PLAGUE', element: 'POISON'
    },
    { 
        id: 'tr_u3', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '不朽屍王', desc: '巨量護盾', 
        range: 0, cast: 0.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 0, color: '#16a34a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 1000, ccSelf: true,
        visualHitEffect: 'FX_ULT_RED_UNDYING', element: 'POISON'
    },
    { 
        id: 'tr_u4', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '永恆夢魘', desc: '全場恐懼', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 0, color: '#581c87', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 2.5,
        visualHitEffect: 'FX_ULT_RED_NIGHTMARE', element: 'VOID'
    },
    { 
        id: 'tr_u5', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '鮮血之牆', desc: '群體護盾', 
        range: 0, cast: 0.4, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 0, color: '#991b1b', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 450,
        visualHitEffect: 'FX_ULT_RED_BLOOD_WALL', element: 'BLOOD'
    },

    // --- WARRIOR ---
    { 
        id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '諸神黃昏', desc: '近身爆發', 
        range: 2, cast: 0.7, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1000, color: '#ea580c', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_RED_RAGNAROK_ERUPTION', element: 'FIRE'
    },
    { 
        id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '血腥旋風', desc: '移動吸血AOE', 
        range: 0, cast: 0.4, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 480, color: '#dc2626', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.0, 
        visualHitEffect: 'FX_ULT_RED_BLOODSTORM', element: 'BLOOD'
    },
    { 
        id: 'wr_u3', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '惡魔降臨', desc: '單體攻速吸血', 
        range: 0, cast: 0.1, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 0, color: '#b91c1c', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HASTE', ccDur: 7.0, ccForce: 50, ccSelf: true,
        ccType2: 'LIFESTEAL', ccDur2: 7.0, ccForce2: 50, ccSelf2: true,
        visualHitEffect: 'FX_ULT_RED_DEMON_FORM', element: 'BLOOD'
    },
    { 
        id: 'wr_u4', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '千刃魔相', desc: '變身恐懼', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 520, color: '#000000', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 1.8,
        visualHitEffect: 'FX_ULT_RED_UNLIMITED_BLADE', element: 'VOID'
    },
    { 
        id: 'wr_u5', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '毀滅重擊', desc: '範圍擊退', 
        range: 0, cast: 0.7, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 650, color: '#450a0a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 3,
        visualHitEffect: 'FX_ULT_RED_DEVASTATE', element: 'PHYSICAL'
    },

    // --- RANGER ---
    { 
        id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '灰燼穿心', desc: '貫穿斬殺', 
        range: 10, cast: 1.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1000, color: '#000000', 
        visual: 'BOLT', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 2.2, 
        visualHitEffect: 'FX_ULT_RED_RAILGUN', element: 'FIRE'
    },
    { 
        id: 'rr_u2', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '焦土衝擊', desc: '大範圍擊退', 
        range: 7, cast: 1.4, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 750, color: '#ef4444', 
        visual: 'BOMB', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 5, 
        visualHitEffect: 'FX_ULT_RED_NUKE_FLASH', element: 'FIRE'
    },
    { 
        id: 'rr_u3', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '煉獄火雨', desc: '全場火雨', 
        range: 0, cast: 1.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 400, color: '#ea580c', 
        visual: 'ARROW', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 70, ccDur: 5.0, element: 'FIRE',
        visualHitEffect: 'FX_ULT_RED_INFERNO'
    },
    { 
        id: 'rr_u4', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '血腥獵殺', desc: '鎖定秒殺', 
        range: 12, cast: 1.6, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1350, color: '#7f1d1d', 
        visual: 'BOLT', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_RED_HEADHUNTER', element: 'BLOOD'
    },
    { 
        id: 'rr_u5', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '末日審判', desc: '範圍恐懼', 
        range: 8, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 450, color: '#581c87', 
        visual: 'BOMB', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 1.6,
        visualHitEffect: 'FX_ULT_RED_DOOM', element: 'VOID'
    },

    // --- MAGE ---
    { 
        id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '毀滅隕石', desc: '延遲高傷', 
        range: 8, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 1200, color: '#f97316', 
        visual: 'FIREBALL', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.5, element: 'FIRE', 
        visualHitEffect: 'FX_ULT_RED_METEOR_IMPACT' 
    },
    { 
        id: 'mr_u2', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '死亡宣告', desc: '單體秒殺技', 
        range: 8, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1350, color: '#be123c', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_RED_DEATH_FINGER', element: 'BLOOD'
    },
    { 
        id: 'mr_u3', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '時間凝結', desc: '將目標凝滯於時間中',
        range: 7, cast: 0.8, cd: 5.0, cost: 100, gain: 0,
        type: 'SINGLE', power: 300, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0,
        ccType: 'BANISH', ccDur: 3.5,
        specialVisualStatus: 'STASIS',
        visualHitEffect: 'FX_ULT_RED_VOID_PORTAL', element: 'VOID'
    },
    { 
        id: 'mr_u4', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '末世毒雨', desc: '全場毒雨', 
        range: 0, cast: 1.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 280, color: '#a3e635', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 45, ccDur: 8.0,
        visualHitEffect: 'FX_ULT_RED_POISON_RAIN', element: 'POISON'
    },
    { 
        id: 'mr_u5', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '靈魂爆燃', desc: '連鎖爆炸', 
        range: 8, cast: 1.3, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 630, color: '#dc2626', 
        visual: 'FIREBALL', projectileSpeed: 0, element: 'FIRE',
        visualHitEffect: 'FX_ULT_RED_SOUL_BURN'
    },

    // --- SUPPORT ---
    { 
        id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '靈魂連結', desc: '群體禁錮', 
        range: 0, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 280, color: '#581c87', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'ROOT', ccDur: 2.5, ccType2: 'SILENCE', ccDur2: 2.0,
        visualHitEffect: 'FX_ULT_RED_SOUL_WEB', element: 'VOID'
    },
    { 
        id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '鮮血契約', desc: '範圍大補', 
        range: 0, cast: 0.6, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: -1100, color: '#dc2626', 
        visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'SELF_DAMAGE', effectVal: 220,
        visualHitEffect: 'FX_ULT_RED_BLOOD_PACT', element: 'BLOOD'
    },
    { 
        id: 'sr_u3', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '靈魂放逐', desc: '將目標逐出戰場短暫消失',
        range: 8, cast: 0.8, cd: 5.0, cost: 100, gain: 0,
        type: 'SINGLE', power: 0, color: '#c084fc', visual: 'BEAM', projectileSpeed: 0,
        ccType: 'BANISH', ccDur: 4.5,
        visualHitEffect: 'FX_ULT_RED_VOID_PORTAL', element: 'VOID'
    },
    { 
        id: 'sr_u4', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '猩紅血月', desc: '全隊吸血', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 0, color: '#be123c', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'LIFESTEAL', ccDur: 7.0, ccForce: 40,
        ccType2: 'HOT', ccDur2: 7.0, ccForce2: 140,
        visualHitEffect: 'FX_ULT_RED_BLOOD_MOON', element: 'BLOOD'
    },
    { 
        id: 'sr_u5', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '惡靈附身', desc: '單體強化', 
        range: 7, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: -700, color: '#7f1d1d', 
        visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 450,
        visualHitEffect: 'FX_ULT_RED_POSSESSION', element: 'BLOOD'
    }
];
