
import { Role, Skill, Team } from '../../types';

export const RED_ACTIVE: Skill[] = [
    // =================================================================
    // 🛡️ TANK
    // =================================================================
    { 
        id: 'tr_a1', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '鮮血之鉤', desc: '將敵人拉至身前', 
        range: 5, cast: 0.6, cd: 12.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 80, color: '#7f1d1d', visual: 'BEAM', projectileSpeed: 1200,
        ccType: 'PULL', ccForce: 5, visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'tr_a2', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '恐懼怒吼', desc: '範圍恐懼', 
        range: 0, cast: 0.4, cd: 15.0, cost: 50, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 40, color: '#7c3aed', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 3.0, visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
    { 
        id: 'tr_a3', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '挑釁', desc: '強制嘲諷敵人', 
        range: 3, cast: 0.3, cd: 10.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 20, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'TAUNT', ccDur: 4.0, visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },
    { 
        id: 'tr_a4', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '血肉壁壘', desc: '大量回血與護盾', 
        range: 0, cast: 0.5, cd: 18.0, cost: 50, gain: 0, 
        type: 'SINGLE', power: -200, color: '#ef4444', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 200,
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'tr_a5', role: Role.TANK, team: Team.RED, tag: 'ACTIVE', 
        name: '戰爭踐踏', desc: '範圍暈眩', 
        range: 0, cast: 0.8, cd: 16.0, cost: 55, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 100, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.5, visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },

    // =================================================================
    // ⚔️ WARRIOR
    // =================================================================
    { 
        id: 'wr_a1', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '劍刃風暴', desc: '周圍持續傷害', 
        range: 0, cast: 0.5, cd: 10.0, cost: 50, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 120, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },
    { 
        id: 'wr_a2', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '魯莽衝鋒', desc: '突進並擊退', 
        range: 4, cast: 0.3, cd: 8.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 100, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 3, visualHitEffect: 'FX_HIT_RED_PHYSICAL' 
    },
    { 
        id: 'wr_a3', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '嗜血打擊', desc: '高吸血單體', 
        range: 1, cast: 0.5, cd: 12.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 120, color: '#be123c', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.0, visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'wr_a4', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '旋風斬', desc: '瞬發AOE', 
        range: 0, cast: 0.2, cd: 6.0, cost: 35, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 80, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL' 
    },
    { 
        id: 'wr_a5', role: Role.WARRIOR, team: Team.RED, tag: 'ACTIVE', 
        name: '斷筋', desc: '強力斬殺與禁錮', 
        range: 1, cast: 0.6, cd: 10.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 180, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 2.0, ccType: 'ROOT', ccDur: 2.0,
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },

    // =================================================================
    // 🏹 RANGER
    // =================================================================
    { 
        id: 'rr_a1', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '燒夷彈', desc: '範圍燃燒', 
        range: 6, cast: 1.0, cd: 14.0, cost: 55, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 90, color: '#f97316', visual: 'BOMB', projectileSpeed: 700,
        ccType: 'DOT', ccForce: 30, ccDur: 5.0, element: 'FIRE', visualHitEffect: 'FX_HIT_RED_MAGMA' 
    },
    { 
        id: 'rr_a2', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '霰彈轟炸', desc: '近身擊退', 
        range: 3, cast: 0.4, cd: 10.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 150, color: '#ea580c', visual: 'SMASH', projectileSpeed: 1500, 
        ccType: 'KNOCKBACK', ccForce: 5, visualHitEffect: 'FX_HIT_RED_HEAVY' 
    },
    { 
        id: 'rr_a3', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '毒氣陷阱', desc: '範圍中毒與禁錮', 
        range: 5, cast: 0.8, cd: 12.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 50, color: '#65a30d', visual: 'BOMB', projectileSpeed: 600, 
        ccType: 'DOT', ccForce: 50, ccDur: 8.0, ccType2: 'ROOT', ccDur2: 2.0,
        visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'rr_a4', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '高爆炸藥', desc: '單體重傷', 
        range: 6, cast: 1.5, cd: 15.0, cost: 60, gain: 0, 
        type: 'SINGLE', power: 250, color: '#7f1d1d', visual: 'BOMB', projectileSpeed: 500, 
        visualHitEffect: 'FX_HIT_RED_MAGMA' 
    },
    { 
        id: 'rr_a5', role: Role.RANGER, team: Team.RED, tag: 'ACTIVE', 
        name: '煙霧彈', desc: '範圍致盲', 
        range: 0, cast: 0.2, cd: 20.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 0, color: '#52525b', visual: 'BOMB', projectileSpeed: 0, 
        ccType: 'BLIND', ccDur: 5.0, visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },

    // =================================================================
    // 🔮 MAGE
    // =================================================================
    { 
        id: 'mr_a1', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '靈魂腐化', desc: '持續傷害與沉默', 
        range: 5, cast: 0.8, cd: 12.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 60, color: '#a3e635', visual: 'BOLT', projectileSpeed: 500,
        ccType: 'DOT', ccForce: 40, ccDur: 6.0, ccType2: 'SILENCE', ccDur2: 3.0, visualHitEffect: 'FX_HIT_RED_FEL' 
    },
    { 
        id: 'mr_a2', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '生命虹吸', desc: '持續吸血連結', 
        range: 5, cast: 2.0, cd: 10.0, cost: 50, gain: 0, 
        type: 'SINGLE', power: 150, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.0, visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'mr_a3', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '暗影之怒', desc: '範圍恐懼', 
        range: 6, cast: 1.2, cd: 14.0, cost: 60, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 120, color: '#581c87', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 2.5,
        visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
    { 
        id: 'mr_a4', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '烈焰風暴', desc: '範圍火海', 
        range: 6, cast: 1.5, cd: 14.0, cost: 70, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 100, color: '#ea580c', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 5.0, ccForce: 40, element: 'FIRE', visualHitEffect: 'FX_HIT_RED_MAGMA' 
    },
    { 
        id: 'mr_a5', role: Role.MAGE, team: Team.RED, tag: 'ACTIVE', 
        name: '混亂箭', desc: '高傷隨機暈眩', 
        range: 6, cast: 1.5, cd: 12.0, cost: 55, gain: 0, 
        type: 'SINGLE', power: 200, color: '#22c55e', visual: 'BOLT', projectileSpeed: 700, 
        ccType: 'STUN', ccDur: 1.5, visualHitEffect: 'FX_HIT_RED_FEL' 
    },

    // =================================================================
    // ⚕️ SUPPORT
    // =================================================================
    { 
        id: 'sr_a1', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '鮮血圖騰', desc: '犧牲生命治療隊友', 
        range: 5, cast: 1.0, cd: 10.0, cost: 0, gain: 50, 
        type: 'SINGLE', power: -300, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD' 
    },
    { 
        id: 'sr_a2', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '痛苦轉移', desc: '給予敵人DoT', 
        range: 6, cast: 0.5, cd: 8.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 50, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 600, 
        ccType: 'DOT', ccForce: 30, ccDur: 5.0, visualHitEffect: 'FX_HIT_RED_SHADOW' 
    },
    { 
        id: 'sr_a3', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '狂熱', desc: '燃燒隊友生命換魔力', 
        range: 5, cast: 0.5, cd: 12.0, cost: 0, gain: 0, 
        type: 'SINGLE', power: 0, color: '#ea580c', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'MANA_RESTORE', effectVal: 80, visualHitEffect: 'FX_HIT_RED_MAGMA' 
    },
    { 
        id: 'sr_a4', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '邪能護盾', desc: '給予隊友護盾', 
        range: 5, cast: 0.8, cd: 10.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 0, color: '#a3e635', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 150, visualHitEffect: 'FX_HIT_RED_FEL'
    },
    { 
        id: 'sr_a5', role: Role.SUPPORT, team: Team.RED, tag: 'ACTIVE', 
        name: '精神控制', desc: '強力單體恐懼', 
        range: 5, cast: 1.0, cd: 18.0, cost: 60, gain: 0, 
        type: 'SINGLE', power: 20, color: '#000', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'FEAR', ccDur: 3.5, visualHitEffect: 'FX_HIT_RED_SHADOW' 
    }
];
