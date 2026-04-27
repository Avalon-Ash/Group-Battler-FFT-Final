
import { Role, Skill, Team } from '../../types';

// 🔵 BLUE ULT: Cost 100, CD 5s
export const BLUE_ULT: Skill[] = [
    // --- TANK ---
    { 
        id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '聖光結界', desc: '範圍暈眩', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 300, color: '#f59e0b', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 2.0, 
        visualHitEffect: 'FX_ULT_BLUE_SANCTUARY_IMPACT' 
    },
    { 
        id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '王者之風', desc: '全場嘲諷與護盾', 
        range: 0, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 0, color: '#fbbf24', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'TAUNT', ccDur: 3.5, ccType2: 'SHIELD', ccForce2: 800, 
        visualHitEffect: 'FX_ULT_BLUE_KINGS_BLESSING'
    },
    { 
        id: 'tb_u3', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '絕對防禦', desc: '天降神盾', 
        range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 500, color: '#3b82f6', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 4,
        visualHitEffect: 'FX_ULT_BLUE_AEGIS_IMPACT'
    },
    { 
        id: 'tb_u4', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '泰坦降臨', desc: '巨型重擊', 
        range: 1, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1000, color: '#fcd34d', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 2.5,
        visualHitEffect: 'FX_ULT_BLUE_TITAN_SMASH'
    },
    { 
        id: 'tb_u5', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '鋼鐵長城', desc: '全隊護盾', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 0, color: '#60a5fa', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 600,
        visualHitEffect: 'FX_ULT_BLUE_FINAL_DEFENSE'
    },

    // --- WARRIOR ---
    { 
        id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '雷霆之怒', desc: '跳躍轟炸', 
        range: 7, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 550, color: '#3b82f6', 
        visual: 'SMASH', projectileSpeed: 1200, 
        ccType: 'STUN', ccDur: 1.5, 
        visualHitEffect: 'FX_ULT_BLUE_THUNDER_SLAM' 
    },
    { 
        id: 'wb_u2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '破曉聖擊', desc: '範圍高傷', 
        range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 650, color: '#f59e0b', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_BLUE_DAYBREAK'
    },
    { 
        id: 'wb_u3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '誓約勝利', desc: '單體斬殺', 
        range: 3, cast: 0.6, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 600, color: '#facc15', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 2.5, 
        visualHitEffect: 'FX_ULT_BLUE_EXCALIBUR'
    },
    { 
        id: 'wb_u4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '劍刃風暴', desc: '連續劍舞', 
        range: 0, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 750, color: '#60a5fa', 
        visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_BLUE_BLADESTORM'
    },
    { 
        id: 'wb_u5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '光速斬擊', desc: '瞬移斬擊', 
        range: 9, cast: 0.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 900, color: '#e0f2fe', 
        visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.5,
        visualHitEffect: 'FX_ULT_BLUE_LIGHTSPEED'
    },

    // --- RANGER ---
    { 
        id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '極地冰河', desc: '全場凍結', 
        range: 15, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 450, color: '#60a5fa', 
        visual: 'ARROW', projectileSpeed: 1800, 
        ccType: 'STUN', ccDur: 2.5, element: 'ICE',
        visualHitEffect: 'FX_ULT_BLUE_GLACIAL_BURST', 
        visualProjectileEffect: 'PROJ_BLUE_ICE_ARROW' 
    },
    { 
        id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '星辰墜落', desc: '隨機箭雨', 
        range: 0, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 550, color: '#fcd34d', 
        visual: 'ARROW', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_BLUE_STARFALL'
    },
    { 
        id: 'rb_u3', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '軌道轟炸', desc: '單體毀滅', 
        range: 20, cast: 2.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1200, color: '#22d3ee', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_BLUE_ORBITAL_BEAM' 
    },
    { 
        id: 'rb_u4', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '絕對封鎖', desc: '區域禁錮', 
        range: 10, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 450, color: '#8b5cf6', 
        visual: 'BOMB', projectileSpeed: 1000, 
        ccType: 'ROOT', ccDur: 4.0,
        visualHitEffect: 'FX_ULT_BLUE_LOCKDOWN'
    },
    { 
        id: 'rb_u5', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '系統超載', desc: '極速連射', 
        range: 10, cast: 0.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1000, color: '#fff', 
        visual: 'BOLT', projectileSpeed: 2500, 
        visualHitEffect: 'FX_ULT_BLUE_OVERLOAD'
    },

    // --- MAGE ---
    { 
        id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '事件視界', desc: '牽引AOE', 
        range: 8, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 550, color: '#0f172a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 4, ccDur: 2.0, 
        visualHitEffect: 'FX_ULT_BLUE_BLACKHOLE'
    },
    { 
        id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '絕對零度', desc: '大範圍凍結', 
        range: 10, cast: 1.2, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 450, color: '#bfdbfe', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 2.0, element: 'ICE',
        visualHitEffect: 'FX_ULT_BLUE_GLACIAL_BURST'
    },
    { 
        id: 'mb_u3', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '時間停止', desc: '全場靜止', 
        range: 0, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 0, color: '#fef08a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 2.5,
        visualHitEffect: 'FX_ULT_BLUE_TIMESTOP'
    },
    { 
        id: 'mb_u4', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '奧術洪流', desc: '奧術彈幕', 
        range: 10, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 750, color: '#a855f7', 
        visual: 'BOLT', projectileSpeed: 1000, 
        visualHitEffect: 'FX_ULT_BLUE_TORRENT'
    },
    { 
        id: 'mb_u5', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '聚能光束', desc: '單體光束', 
        range: 12, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1200, color: '#60a5fa', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_BLUE_FOCUS_BEAM'
    },

    // --- SUPPORT ---
    { 
        id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '神聖干涉', desc: '單體無敵', 
        range: 8, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: -800, color: '#fef08a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 3.5, specialVisualStatus: 'STASIS',
        visualHitEffect: 'FX_ULT_BLUE_INTERVENTION'
    },
    { 
        id: 'sb_u2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '復活之光', desc: '大範圍治療', 
        range: 0, cast: 1.5, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 6, power: -1000, color: '#86efac', 
        visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_BLUE_RESURRECTION'
    },
    { 
        id: 'sb_u3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '英勇讚美', desc: '全隊Buff', 
        range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: -300, color: '#3b82f6', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 500,
        visualHitEffect: 'FX_ULT_BLUE_HYMN'
    },
    { 
        id: 'sb_u4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '神之怒火', desc: '範圍轟炸', 
        range: 0, cast: 0.8, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 500, color: '#fcd34d', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.5, 
        visualHitEffect: 'FX_ULT_BLUE_WRATH'
    },
    { 
        id: 'sb_u5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '寧靜之雨', desc: '持續治療', 
        range: 0, cast: 1.0, cd: 5.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: -600, color: '#86efac', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 150, ccDur: 6.0,
        visualHitEffect: 'FX_ULT_BLUE_RAIN'
    }
];
