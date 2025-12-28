
import { Role, Skill, Team } from '../../types';

// 🔴 RED ULT: High Impact, Frequent, DoT/Execution Focused
export const RED_ULT: Skill[] = [
    // --- TANK ---
    { 
        id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '斷頭 (Execute)', desc: '近身斬殺', 
        range: 1, cast: 0.6, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 900, color: '#7f1d1d', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 3.5, 
        visualHitEffect: 'FX_ULT_RED_GUILLOTINE_IMPACT' 
    },
    { 
        id: 'tr_u2', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '瘟疫 (Plague)', desc: '周圍持續腐化', 
        range: 0, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 150, color: '#a3e635', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 100, ccDur: 6, 
        visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'tr_u3', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '不朽 (Undying)', desc: '巨量護盾', 
        range: 0, cast: 0.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 0, color: '#16a34a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 800,
        visualHitEffect: 'FX_HIT_RED_FEL'
    },
    { 
        id: 'tr_u4', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '夢魘 (Nightmare)', desc: '全場恐懼', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 0, color: '#581c87', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_SHADOW'
    },
    { 
        id: 'tr_u5', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '血牆 (Wall)', desc: '群體護盾', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 0, color: '#991b1b', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 300,
        visualHitEffect: 'FX_HIT_RED_BLOOD'
    },

    // --- WARRIOR ---
    { 
        id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '諸神 (Ragnarok)', desc: '範圍爆發', 
        range: 1, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 800, color: '#ea580c', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_RED_RAGNAROK_ERUPTION' 
    },
    { 
        id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '血風 (Storm)', desc: '移動吸血AOE', 
        range: 0, cast: 0.4, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 400, color: '#dc2626', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'wr_u3', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '狂戰 (Berserk)', desc: '單體攻速吸血', 
        range: 0, cast: 0.1, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 0, color: '#b91c1c', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 100, ccDur: 5.0, // Regeneration simulate Lifesteal buff
        visualHitEffect: 'FX_HIT_RED_BLOOD'
    },
    { 
        id: 'wr_u4', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '惡魔 (Demon)', desc: '變身恐懼', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 300, color: '#000', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 1.5,
        visualHitEffect: 'FX_HIT_RED_SHADOW'
    },
    { 
        id: 'wr_u5', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '碎地 (Shatter)', desc: '範圍擊退', 
        range: 0, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 500, color: '#450a0a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 3,
        visualHitEffect: 'FX_HIT_RED_HEAVY'
    },

    // --- RANGER ---
    { 
        id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '毀滅 (Destroy)', desc: '貫穿斬殺', 
        range: 10, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 800, color: '#000000', 
        visual: 'BOLT', projectileSpeed: 2000, 
        effectType: 'EXECUTE', effectVal: 3.0, 
        visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },
    { 
        id: 'rr_u2', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '核彈 (Nuke)', desc: '大範圍擊退', 
        range: 7, cast: 2.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 600, color: '#ef4444', 
        visual: 'BOMB', projectileSpeed: 400, 
        ccType: 'KNOCKBACK', ccForce: 5, 
        visualHitEffect: 'FX_ULT_RED_NUKE_FLASH' 
    },
    { 
        id: 'rr_u3', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '煉獄 (Hellfire)', desc: '全場火雨', 
        range: 0, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 300, color: '#ea580c', 
        visual: 'ARROW', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 50, ccDur: 5.0, element: 'FIRE',
        visualHitEffect: 'FX_HIT_RED_MAGMA'
    },
    { 
        id: 'rr_u4', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '獵頭 (Headhunt)', desc: '鎖定秒殺', 
        range: 12, cast: 2.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1200, color: '#7f1d1d', 
        visual: 'BOLT', projectileSpeed: 4000, 
        visualHitEffect: 'FX_HIT_RED_BLOOD'
    },
    { 
        id: 'rr_u5', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '末日 (Doom)', desc: '範圍恐懼', 
        range: 8, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 400, color: '#581c87', 
        visual: 'BOMB', projectileSpeed: 800, 
        ccType: 'FEAR', ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_SHADOW'
    },

    // --- MAGE ---
    { 
        id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '隕石 (Meteor)', desc: '延遲高傷', 
        range: 8, cast: 2.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 1000, color: '#f97316', 
        visual: 'FIREBALL', projectileSpeed: 150, 
        ccType: 'STUN', ccDur: 1.5, 
        visualHitEffect: 'FX_ULT_RED_METEOR_IMPACT' 
    },
    { 
        id: 'mr_u2', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '死指 (Finger)', desc: '單體秒殺技', 
        range: 7, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1200, color: '#be123c', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'mr_u3', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '虛空 (Void)', desc: '召喚傳送門', 
        range: 6, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 500, color: '#581c87', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 3.0,
        visualHitEffect: 'FX_HIT_RED_SHADOW'
    },
    { 
        id: 'mr_u4', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '末世 (Arma)', desc: '全場毒雨', 
        range: 0, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 200, color: '#a3e635', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 30, ccDur: 8.0,
        visualHitEffect: 'FX_HIT_RED_FEL'
    },
    { 
        id: 'mr_u5', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '爆燃 (Pyro)', desc: '連鎖爆炸', 
        range: 8, cast: 1.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 700, color: '#dc2626', 
        visual: 'FIREBALL', projectileSpeed: 600, 
        visualHitEffect: 'FX_HIT_RED_MAGMA'
    },

    // --- SUPPORT ---
    { 
        id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '連結 (Link)', desc: '群體禁錮', 
        range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 200, color: '#581c87', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'ROOT', ccDur: 2.5, ccType2: 'SILENCE', ccDur2: 2.0,
        visualHitEffect: 'FX_ULT_RED_SOUL_WEB' 
    },
    { 
        id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '血契 (Pact)', desc: '範圍大補', 
        range: 0, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: -800, color: '#dc2626', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'sr_u3', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '恐慌 (Fear)', desc: '全場群控', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 100, color: '#4c1d95', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_SHADOW'
    },
    { 
        id: 'sr_u4', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '血月 (Moon)', desc: '全隊吸血', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 0, color: '#be123c', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 100, ccDur: 6.0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD'
    },
    { 
        id: 'sr_u5', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '附身 (Possess)', desc: '單體強化', 
        range: 6, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: -500, color: '#7f1d1d', 
        visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 300,
        visualHitEffect: 'FX_HIT_RED_BLOOD'
    }
];
