
import { Role, Skill, Team } from '../../types';

export const RED_ULT: Skill[] = [
    // =================================================================
    // 🛡️ TANK (Covenant Reaver)
    // Concept: Execution, Undying, Mass Fear, Rot
    // =================================================================
    { 
        id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '斷頭台 (Guillotine)', desc: '處刑巨刃斬殺', 
        range: 1, cast: 0.8, cd: 30.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1200, color: '#7f1d1d', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 4.0, 
        visualHitEffect: 'FX_ULT_RED_GUILLOTINE_IMPACT' 
    },
    { 
        id: 'tr_u2', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '亡者大軍 (Army)', desc: '召喚墓碑腐化並恐懼', 
        range: 0, cast: 1.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 300, color: '#a3e635', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 120, ccDur: 12, 
        ccType2: 'FEAR', ccDur2: 3.0, 
        visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'tr_u3', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '血魔之擁 (Embrace)', desc: '全場牽引+吸血', 
        range: 0, cast: 1.5, cd: 45.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 400, color: '#be123c', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 8, effectType: 'VAMP', effectVal: 2.0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'tr_u4', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '不朽屍王 (Undying)', desc: '暫時無敵並大量回血', 
        range: 0, cast: 0.2, cd: 60.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 0, color: '#16a34a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 6.0, ccType2: 'HOT', ccDur2: 6.0, ccForce2: 400,
        visualHitEffect: 'FX_HIT_RED_FEL'
    },
    { 
        id: 'tr_u5', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '瘟疫爆發 (Outbreak)', desc: '自爆範圍極高傷', 
        range: 0, cast: 2.5, cd: 35.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 6, power: 1000, color: '#3f6212', 
        visual: 'BOMB', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 150, ccDur: 8, 
        visualHitEffect: 'FX_HIT_RED_FEL' 
    },

    // =================================================================
    // ⚔️ WARRIOR (Covenant Berserker)
    // Concept: Ragnarok, Blood Storm, Demon Form
    // =================================================================
    { 
        id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '諸神黃昏 (Ragnarok)', desc: '熔岩地裂爆發', 
        range: 1, cast: 1.0, cd: 35.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1500, color: '#ea580c', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_RED_RAGNAROK_ERUPTION' 
    },
    { 
        id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '鮮血風暴 (Bloodstorm)', desc: '移動的吸血龍捲', 
        range: 0, cast: 0.5, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 600, color: '#dc2626', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.5, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'wr_u3', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '惡魔變身 (Demon)', desc: '恐懼周圍敵人並強化', 
        range: 0, cast: 0.5, cd: 50.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 6, power: 200, color: '#7f1d1d', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 5.0, ccType2: 'SHIELD', ccForce2: 500,
        visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
    { 
        id: 'wr_u4', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '無限劍制 (Unlimited)', desc: '隨機多目標斬殺', 
        range: 6, cast: 2.0, cd: 30.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 6, power: 600, color: '#ef4444', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 2.0 
    },
    { 
        id: 'wr_u5', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '碎脊者 (Spinebreak)', desc: '單體暈眩與重傷', 
        range: 1, cast: 0.8, cd: 25.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 900, color: '#000', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 5.0, 
        visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },

    // =================================================================
    // 🏹 RANGER (Covenant Grenadier)
    // Concept: Nukes, Railguns, Fire
    // =================================================================
    { 
        id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '毀滅者 (Destroyer)', desc: '磁軌砲貫穿射擊', 
        range: 10, cast: 2.5, cd: 40.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1600, color: '#000000', 
        visual: 'BOLT', projectileSpeed: 2000, 
        effectType: 'EXECUTE', effectVal: 3.0, 
        visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },
    { 
        id: 'rr_u2', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '戰術核彈 (Nuke)', desc: '蕈狀雲毀滅打擊', 
        range: 7, cast: 3.0, cd: 60.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 6, power: 1200, color: '#ef4444', 
        visual: 'BOMB', projectileSpeed: 300, 
        ccType: 'KNOCKBACK', ccForce: 12, 
        visualHitEffect: 'FX_ULT_RED_NUKE_FLASH' 
    },
    { 
        id: 'rr_u3', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '彈幕時間 (Bullet Time)', desc: '全圖隨機射擊', 
        range: 12, cast: 2.5, cd: 35.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 15, power: 300, color: '#f87171', 
        visual: 'ARROW', projectileSpeed: 900, 
        ccType: 'DOT', ccForce: 50, ccDur: 5 
    },
    { 
        id: 'rr_u4', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '煉獄火海 (Inferno)', desc: '大範圍持續燃燒', 
        range: 7, cast: 1.5, cd: 30.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 500, color: '#ea580c', 
        visual: 'BOMB', projectileSpeed: 600, 
        ccType: 'DOT', ccForce: 200, ccDur: 8, 
        visualHitEffect: 'FX_HIT_RED_MAGMA' 
    },
    { 
        id: 'rr_u5', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '獵頭者 (Headhunter)', desc: '超遠距離斬殺', 
        range: 18, cast: 2.0, cd: 45.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1800, color: '#7f1d1d', 
        visual: 'BOLT', projectileSpeed: 2500, 
        effectType: 'EXECUTE', effectVal: 4.0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },

    // =================================================================
    // 🔮 MAGE (Covenant Warlock)
    // Concept: Chaos Meteors, Void Portals, Soul Burns
    // =================================================================
    { 
        id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '毀滅隕石 (Meteor)', desc: '巨型隕石撞擊', 
        range: 8, cast: 3.0, cd: 50.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 1600, color: '#f97316', 
        visual: 'FIREBALL', projectileSpeed: 100, 
        ccType: 'STUN', ccDur: 3.0, 
        visualHitEffect: 'FX_ULT_RED_METEOR_IMPACT' 
    },
    { 
        id: 'mr_u2', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '死亡一指 (Finger)', desc: '紅色閃電秒殺', 
        range: 7, cast: 2.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 2200, color: '#be123c', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'mr_u3', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '混亂之雨 (Chaos)', desc: '魔能轟炸致盲', 
        range: 0, cast: 1.5, cd: 35.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 600, color: '#22c55e', 
        visual: 'BOMB', projectileSpeed: 300, 
        ccType: 'STUN', ccDur: 1.0, ccType2: 'BLIND', ccDur2: 6.0,
        visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'mr_u4', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '虛空傳送門 (Portal)', desc: '大範圍持續吸入', 
        range: 6, cast: 2.0, cd: 50.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 7, power: 400, color: '#581c87', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 8, ccDur: 8.0, 
        visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
    { 
        id: 'mr_u5', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '靈魂燃燒 (Soul Burn)', desc: '燃燒魔力並沉默', 
        range: 0, cast: 1.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 20, power: 200, color: '#9333ea', 
        visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'MANA_BURN', effectVal: 200, ccType: 'SILENCE', ccDur: 6.0, 
        visualHitEffect: 'FX_IMPACT_ARCANE' 
    },

    // =================================================================
    // ⚕️ SUPPORT (Covenant Cultist)
    // Concept: Sacrifice, Mass Curse, Voodoo
    // =================================================================
    { 
        id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '靈魂連結 (Soul Link)', desc: '虛空鎖鏈全體禁錮', 
        range: 0, cast: 1.5, cd: 50.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 15, power: 300, color: '#581c87', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 8.0, ccType2: 'ROOT', ccDur2: 5.0,
        visualHitEffect: 'FX_ULT_RED_SOUL_WEB' 
    },
    { 
        id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '先祖召喚 (Ancestors)', desc: '圖騰之力復活隊友', 
        range: 0, cast: 2.5, cd: 60.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: -1000, color: '#bef264', 
        visual: 'BEAM', projectileSpeed: 0 
    },
    { 
        id: 'sr_u3', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '巫毒詛咒 (Voodoo)', desc: '全體變形', 
        range: 0, cast: 1.0, cd: 50.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 100, color: '#84cc16', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 6.0, 
        visualHitEffect: 'FX_HIT_RED_FEL', specialVisualStatus: 'POLYMORPH'
    },
    { 
        id: 'sr_u4', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '鮮血契約 (Blood Pact)', desc: '犧牲自身治療全隊', 
        range: 0, cast: 1.0, cd: 60.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 30, power: -1500, color: '#dc2626', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'sr_u5', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '夢魘降臨 (Nightmare)', desc: '全場恐懼', 
        range: 0, cast: 1.5, cd: 55.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 30, power: 200, color: '#4c1d95', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 6.0,
        visualHitEffect: 'FX_HIT_RED_SHADOW' 
    }
];
