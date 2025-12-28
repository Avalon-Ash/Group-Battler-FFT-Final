
import { Role, Skill, Team } from '../../types';

// 🔵 BLUE ULT: Cost 100, CD 5s (Gate is MP), High Frequency
export const BLUE_ULT: Skill[] = [
    // --- TANK ---
    { 
        id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '聖域 (Sanctuary)', desc: '範圍暈眩', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 250, color: '#f59e0b', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.5, 
        visualHitEffect: 'FX_ULT_BLUE_SANCTUARY_IMPACT' 
    },
    { 
        id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '王者 (Kings)', desc: '全場嘲諷與護盾', 
        range: 0, cast: 0.3, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 0, color: '#fbbf24', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'TAUNT', ccDur: 2.5, ccType2: 'SHIELD', ccForce2: 600, 
        visualHitEffect: 'FX_HIT_BLUE_TECH'
    },
    { 
        id: 'tb_u3', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '神盾 (Aegis)', desc: '天降神盾', 
        range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 400, color: '#3b82f6', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 3,
        visualHitEffect: 'FX_GRID_IMPACT_BLUE'
    },
    { 
        id: 'tb_u4', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '泰坦 (Titan)', desc: '巨型重擊', 
        range: 1, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 800, color: '#fcd34d', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 2.0,
        visualHitEffect: 'FX_HIT_BLUE_HOLY'
    },
    { 
        id: 'tb_u5', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '防線 (Defense)', desc: '全隊護盾', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 0, color: '#60a5fa', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 400,
        visualHitEffect: 'FX_HIT_BLUE_TECH'
    },

    // --- WARRIOR ---
    { 
        id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '雷霆 (Thunder)', desc: '跳躍轟炸', 
        range: 6, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 450, color: '#3b82f6', 
        visual: 'SMASH', projectileSpeed: 1200, 
        ccType: 'STUN', ccDur: 1.0, 
        visualHitEffect: 'FX_ULT_BLUE_THUNDER_SLAM' 
    },
    { 
        id: 'wb_u2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '破曉 (Dawn)', desc: '範圍高傷', 
        range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 500, color: '#f59e0b', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY'
    },
    { 
        id: 'wb_u3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '王劍 (Excalibur)', desc: '單體斬殺', 
        range: 2, cast: 0.6, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 900, color: '#facc15', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 3.0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'wb_u4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '劍刃 (Storm)', desc: '連續劍舞', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 600, color: '#60a5fa', 
        visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL'
    },
    { 
        id: 'wb_u5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '光速 (Light)', desc: '瞬移斬擊', 
        range: 8, cast: 0.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 700, color: '#e0f2fe', 
        visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.0,
        visualHitEffect: 'FX_HIT_BLUE_TECH'
    },

    // --- RANGER ---
    { 
        id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '冰河 (Ice Age)', desc: '全場凍結', 
        range: 12, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 300, color: '#60a5fa', 
        visual: 'ARROW', projectileSpeed: 1800, 
        ccType: 'STUN', ccDur: 1.8, element: 'ICE',
        visualHitEffect: 'FX_ULT_BLUE_GLACIAL_BURST', 
        visualProjectileEffect: 'PROJ_BLUE_ICE_ARROW' 
    },
    { 
        id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '星隕 (Starfall)', desc: '隨機箭雨', 
        range: 0, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 400, color: '#fcd34d', 
        visual: 'ARROW', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY'
    },
    { 
        id: 'rb_u3', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '軌道 (Orbital)', desc: '單體毀滅', 
        range: 15, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1000, color: '#22d3ee', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_BLUE_ORBITAL_BEAM' 
    },
    { 
        id: 'rb_u4', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '封鎖 (Lockdown)', desc: '區域禁錮', 
        range: 8, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 300, color: '#8b5cf6', 
        visual: 'BOMB', projectileSpeed: 1000, 
        ccType: 'ROOT', ccDur: 3.0,
        visualHitEffect: 'FX_GRID_IMPACT_BLUE'
    },
    { 
        id: 'rb_u5', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '超載 (Overload)', desc: '極速連射', 
        range: 8, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 800, color: '#fff', 
        visual: 'BOLT', projectileSpeed: 2500, 
        visualHitEffect: 'FX_HIT_BLUE_TECH'
    },

    // --- MAGE ---
    { 
        id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '黑洞 (Hole)', desc: '牽引AOE', 
        range: 6, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 400, color: '#0f172a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 3, ccDur: 1.5, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },
    { 
        id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '零度 (Zero)', desc: '大範圍凍結', 
        range: 8, cast: 1.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 350, color: '#bfdbfe', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.5, element: 'ICE',
        visualHitEffect: 'FX_ULT_BLUE_GLACIAL_BURST'
    },
    { 
        id: 'mb_u3', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '時停 (Stop)', desc: '全場靜止', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 0, color: '#fef08a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 2.5,
        visualHitEffect: 'FX_CAST_BREAK'
    },
    { 
        id: 'mb_u4', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '洪流 (Torrent)', desc: '奧術彈幕', 
        range: 8, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 600, color: '#a855f7', 
        visual: 'BOLT', projectileSpeed: 1000, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE'
    },
    { 
        id: 'mb_u5', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '聚焦 (Focus)', desc: '單體光束', 
        range: 10, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 900, color: '#60a5fa', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },

    // --- SUPPORT ---
    { 
        id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '干涉 (Save)', desc: '單體無敵', 
        range: 6, cast: 0.1, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: -600, color: '#fef08a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 2.5, specialVisualStatus: 'STASIS',
        visualHitEffect: 'FX_HIT_BLUE_HOLY'
    },
    { 
        id: 'sb_u2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '復活 (Revive)', desc: '大範圍治療', 
        range: 0, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: -800, color: '#86efac', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_BLUE_RESURRECTION'
    },
    { 
        id: 'sb_u3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '讚美 (Hymn)', desc: '全隊Buff', 
        range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: -200, color: '#3b82f6', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 300,
        visualHitEffect: 'FX_HIT_BLUE_TECH'
    },
    { 
        id: 'sb_u4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '天譴 (Wrath)', desc: '範圍轟炸', 
        range: 0, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 350, color: '#fcd34d', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'sb_u5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '恩雨 (Rain)', desc: '持續治療', 
        range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: -400, color: '#86efac', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 100, ccDur: 5.0,
        visualHitEffect: 'FX_HIT_BLUE_HOLY'
    }
];
