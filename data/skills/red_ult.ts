
import { Role, Skill, Team } from '../../types';

// NOTE: 'visual' field is kept for projectile fallback or icon generation.
// The new system relies on 'id' matching inside CovenantUltDirector.

export const RED_ULT: Skill[] = [
    // 🛡️ TANK: Execute / Chaos
    { 
        id: 'tr_u1', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '斷頭台', desc: '處刑巨刃斬殺', 
        range: 1, cast: 0.8, cd: 20.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 800, color: '#7f1d1d', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 3.0, 
        visualHitEffect: 'FX_ULT_RED_GUILLOTINE_IMPACT' 
    },
    { 
        id: 'tr_u2', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '亡靈大軍', desc: '召喚墓碑腐化大地', 
        range: 0, cast: 1.0, cd: 30.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 150, color: '#a3e635', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 80, ccDur: 8, 
        visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'tr_u3', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '血魔之擁', desc: '全場牽引+吸血', 
        range: 0, cast: 1.5, cd: 35.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 200, color: '#be123c', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 8, effectType: 'VAMP', effectVal: 1.0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'tr_u4', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '不朽屍王', desc: '超長無敵+回血', 
        range: 0, cast: 0.5, cd: 40.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 0, color: '#16a34a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 5.0, ccType2: 'HOT', ccDur2: 5.0, ccForce2: 200 
    },
    { 
        id: 'tr_u5', role: Role.TANK, team: Team.RED, tag: 'ULT', 
        name: '腐爛爆發', desc: '自爆範圍高傷', 
        range: 0, cast: 2.0, cd: 30.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 600, color: '#3f6212', 
        visual: 'BOMB', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 50, ccDur: 5, 
        visualHitEffect: 'FX_HIT_RED_FEL' 
    },

    // ⚔️ WARRIOR: Burst / Lifesteal
    { 
        id: 'wr_u1', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '諸神黃昏', desc: '熔岩地裂爆發', 
        range: 1, cast: 1.0, cd: 25.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 900, color: '#ea580c', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_RED_RAGNAROK_ERUPTION' 
    },
    { 
        id: 'wr_u2', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '血腥旋風', desc: '鮮血龍捲風', 
        range: 0, cast: 1.5, cd: 30.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 350, color: '#dc2626', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'wr_u3', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '惡魔變身', desc: '範圍恐懼(放逐)', 
        range: 0, cast: 0.5, cd: 35.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 100, color: '#7f1d1d', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 3.0, 
        visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
    { 
        id: 'wr_u4', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '無限劍制', desc: '隨機多目標斬殺', 
        range: 5, cast: 2.0, cd: 25.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 400, color: '#ef4444', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 1.5 
    },
    { 
        id: 'wr_u5', role: Role.WARRIOR, team: Team.RED, tag: 'ULT', 
        name: '毀滅重擊', desc: '單體超長暈眩', 
        range: 1, cast: 1.0, cd: 20.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 600, color: '#000', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 4.0, 
        visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },

    // 🏹 RANGER: Nuke / Execute
    { 
        id: 'rr_u1', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '終極爆破', desc: '磁軌砲貫穿', 
        range: 8, cast: 2.0, cd: 30.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1000, color: '#000000', 
        visual: 'BOLT', projectileSpeed: 1500, 
        effectType: 'EXECUTE', effectVal: 2.5, 
        visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },
    { 
        id: 'rr_u2', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '戰術核彈', desc: '蕈狀雲毀滅打擊', 
        range: 6, cast: 2.5, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 700, color: '#ef4444', 
        visual: 'BOMB', projectileSpeed: 400, 
        ccType: 'KNOCKBACK', ccForce: 6, 
        visualHitEffect: 'FX_ULT_RED_NUKE_FLASH' 
    },
    { 
        id: 'rr_u3', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '彈幕時間', desc: '全圖隨機射擊', 
        range: 10, cast: 3.0, cd: 30.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 150, color: '#f87171', 
        visual: 'ARROW', projectileSpeed: 800, 
        ccType: 'DOT', ccForce: 30, ccDur: 3 
    },
    { 
        id: 'rr_u4', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '煉獄手雷', desc: '大範圍持續火海', 
        range: 6, cast: 1.5, cd: 25.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 300, color: '#ea580c', 
        visual: 'BOMB', projectileSpeed: 600, 
        ccType: 'DOT', ccForce: 100, ccDur: 5, 
        visualHitEffect: 'FX_HIT_RED_MAGMA' 
    },
    { 
        id: 'rr_u5', role: Role.RANGER, team: Team.RED, tag: 'ULT', 
        name: '獵頭者', desc: '無視距離斬殺', 
        range: 12, cast: 2.0, cd: 35.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1200, color: '#7f1d1d', 
        visual: 'BOLT', projectileSpeed: 2000, 
        effectType: 'EXECUTE', effectVal: 3.0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },

    // 🔮 MAGE: Chaos / Meteor
    { 
        id: 'mr_u1', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '毀滅隕石', desc: '召喚隕石撞擊', 
        range: 6, cast: 2.5, cd: 35.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 1000, color: '#f97316', 
        visual: 'FIREBALL', projectileSpeed: 150, 
        ccType: 'STUN', ccDur: 2.0, 
        visualHitEffect: 'FX_ULT_RED_METEOR_IMPACT' 
    },
    { 
        id: 'mr_u2', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '死亡一指', desc: '紅色死亡射線', 
        range: 6, cast: 2.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1500, color: '#be123c', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'mr_u3', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '混亂之雨', desc: '綠色魔能轟炸', 
        range: 0, cast: 1.5, cd: 30.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 6, power: 400, color: '#22c55e', 
        visual: 'BOMB', projectileSpeed: 300, 
        ccType: 'STUN', ccDur: 1.0, 
        visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'mr_u4', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '虛空傳送門', desc: '大範圍持續吸入', 
        range: 5, cast: 2.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 200, color: '#581c87', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 5, ccDur: 5.0, 
        visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
    { 
        id: 'mr_u5', role: Role.MAGE, team: Team.RED, tag: 'ULT', 
        name: '靈魂燃燒', desc: '燃燒所有敵人魔力', 
        range: 0, cast: 1.0, cd: 30.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 20, power: 100, color: '#9333ea', 
        visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'MANA_BURN', effectVal: 100, ccType: 'SILENCE', ccDur: 3.0, 
        visualHitEffect: 'FX_IMPACT_ARCANE' 
    },

    // ⚕️ SUPPORT: Mass Curse / Revive
    { 
        id: 'sr_u1', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '靈魂連結', desc: '虛空鎖鏈沉默', 
        range: 0, cast: 1.5, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 15, power: 150, color: '#581c87', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 6.0, 
        visualHitEffect: 'FX_ULT_RED_SOUL_WEB' 
    },
    { 
        id: 'sr_u2', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '先祖之魂', desc: '圖騰之火復活', 
        range: 0, cast: 2.0, cd: 45.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: -600, color: '#bef264', 
        visual: 'BEAM', projectileSpeed: 0 
    },
    { 
        id: 'sr_u3', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '巫毒大陣', desc: '範圍變羊', 
        range: 0, cast: 1.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 50, color: '#84cc16', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 4.0, 
        visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'sr_u4', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '鮮血契約', desc: '犧牲自身治療全隊', 
        range: 0, cast: 1.0, cd: 60.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 20, power: -800, color: '#dc2626', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'sr_u5', role: Role.SUPPORT, team: Team.RED, tag: 'ULT', 
        name: '夢魘降臨', desc: '恐懼全場', 
        range: 0, cast: 1.5, cd: 45.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 20, power: 100, color: '#4c1d95', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 3.0, 
        visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
];
