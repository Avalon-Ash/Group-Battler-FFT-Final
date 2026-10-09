
import { Skill, Role, Team } from '../../types';

// 🔵 BLUE BASIC: 25 VARIATIONS
// Balance Rule: Max Range = 5 to prevent High Ground OP
export const BLUE_BASIC: Skill[] = [
    // --- TANK ---
    { 
        id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '鎮壓打擊', desc: '盾擊擊退', 
        range: 1, cast: 0.5, cd: 1.0, cost: 0, gain: 25,
        type: 'SINGLE', power: 70, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 2,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '電擊警棍', desc: '機率微暈', 
        range: 1, cast: 0.4, cd: 1.2, cost: 0, gain: 20,
        type: 'SINGLE', power: 65, color: '#93c5fd', visual: 'SMASH', projectileSpeed: 0,
        ccType: 'STUN', ccDur: 0.5, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '能量衝擊', desc: '回魔打擊', 
        range: 1, cast: 0.6, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 60, color: '#1e3a8a', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'PHYSICAL'
    },
    { 
        id: 'tb_b4', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '沉默盾擊', desc: '打斷詠唱', 
        range: 1, cast: 0.3, cd: 1.5, cost: 0, gain: 25,
        type: 'SINGLE', power: 75, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 1.0,
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'PHYSICAL'
    },
    { 
        id: 'tb_b5', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '震地猛擊', desc: 'AOE普攻', 
        range: 1, cast: 0.8, cd: 1.5, cost: 0, gain: 35,
        type: 'AOE', aoeRadius: 1, power: 50, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },

    // --- WARRIOR ---
    { 
        id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '光子劍刃', desc: '快速連擊', 
        range: 1, cast: 0.3, cd: 0.7, cost: 0, gain: 25,
        type: 'SINGLE', power: 85, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'PHYSICAL'
    },
    { 
        id: 'wb_b2', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '弱點刺擊', desc: '穿透攻擊', 
        range: 2, cast: 0.4, cd: 1.0, cost: 0, gain: 25, // Reach 2 for Spear feel
        type: 'SINGLE', power: 80, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '弧光斬', desc: '順劈斬', 
        range: 1, cast: 0.5, cd: 1.2, cost: 0, gain: 25, 
        type: 'AOE', aoeRadius: 1, power: 70, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'LIGHTNING'
    },
    { 
        id: 'wb_b4', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '戰術柄擊', desc: '微暈', 
        range: 1, cast: 0.2, cd: 1.0, cost: 0, gain: 20, 
        type: 'SINGLE', power: 60, color: '#94a3b8', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 0.5,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wb_b5', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '絕對招架', desc: '防禦反擊', 
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 75, color: '#fbbf24', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 40, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },

    // --- RANGER (Nerfed Ranges 7/8 -> 5) ---
    { 
        id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '精準射擊', desc: '標準遠程', 
        range: 5, cast: 0.5, cd: 0.9, cost: 0, gain: 25, // Nerf Range 6->5
        type: 'SINGLE', power: 80, color: '#38bdf8', visual: 'BOLT', projectileSpeed: 2000, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', visualProjectileEffect: 'PROJ_BLUE_SNIPER', element: 'PHYSICAL'
    },
    { 
        id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '寒冰箭', desc: '微量緩速', 
        range: 5, cast: 0.6, cd: 1.2, cost: 0, gain: 30, // Nerf Range 6->5
        type: 'SINGLE', power: 75, color: '#e0f2fe', visual: 'ARROW', projectileSpeed: 1100, 
        visualHitEffect: 'FX_HIT_BLUE_ICE', visualProjectileEffect: 'PROJ_BLUE_ICE_ARROW', element: 'ICE'
    },
    { 
        id: 'rb_b3', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '雷射標記', desc: '必中', 
        range: 5, cast: 0.3, cd: 0.8, cost: 0, gain: 20, // Nerf Range 6->5
        type: 'SINGLE', power: 60, color: '#ef4444', visual: 'BOLT', projectileSpeed: 0, // Instant
        visualHitEffect: 'FX_HIT_BLUE_TECH', visualProjectileEffect: 'BOLT', element: 'PHYSICAL'
    },
    { 
        id: 'rb_b4', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '震盪彈', desc: '擊退射擊', 
        range: 4, cast: 0.8, cd: 1.5, cost: 0, gain: 35, // Nerf Range 5->4
        type: 'SINGLE', power: 70, color: '#fbbf24', visual: 'BOLT', projectileSpeed: 1300, 
        ccType: 'KNOCKBACK', ccForce: 2,
        visualHitEffect: 'FX_HIT_BLUE_TECH', visualProjectileEffect: 'PROJ_BLUE_SNIPER', element: 'LIGHTNING'
    },
    { 
        id: 'rb_b5', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '虛無射擊', desc: '燃魔射擊', 
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 25, // Nerf Range 6->5
        type: 'SINGLE', power: 65, color: '#8b5cf6', visual: 'ARROW', projectileSpeed: 1600, 
        effectType: 'MANA_BURN', effectVal: 20,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', visualProjectileEffect: 'PROJ_BLUE_SNIPER', element: 'VOID'
    },

    // --- MAGE (Nerfed Ranges -> 4) ---
    { 
        id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '追蹤導彈', desc: '追蹤魔法', 
        range: 5, cast: 0.5, cd: 0.9, cost: 0, gain: 30, // Range 5->4
        type: 'SINGLE', power: 85, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 700, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', visualProjectileEffect: 'PROJ_BLUE_ORB', element: 'ARCANE'
    },
    { 
        id: 'mb_b2', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '閃電束', desc: '瞬發光束', 
        range: 5, cast: 0.3, cd: 0.8, cost: 0, gain: 20, 
        type: 'SINGLE', power: 65, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '霜噬術', desc: '減速傷害', 
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 25, // Range 5->4
        type: 'SINGLE', power: 75, color: '#bae6fd', visual: 'BOLT', projectileSpeed: 1000, 
        ccType: 'ROOT', ccDur: 0.5,
        visualHitEffect: 'FX_HIT_BLUE_ICE', visualProjectileEffect: 'PROJ_BLUE_FROST_BOLT', element: 'ICE'
    },
    { 
        id: 'mb_b4', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '奧術彈射', desc: '小範圍彈跳', 
        range: 5, cast: 0.5, cd: 1.2, cost: 0, gain: 30, 
        type: 'AOE', aoeRadius: 1, power: 40, color: '#d8b4fe', visual: 'BOLT', projectileSpeed: 900, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', visualProjectileEffect: 'PROJ_BLUE_ORB', element: 'ARCANE'
    },
    { 
        id: 'mb_b5', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '魔力虹吸', desc: '吸取魔力', 
        range: 5, cast: 0.4, cd: 0.8, cost: 0, gain: 40, 
        type: 'SINGLE', power: 50, color: '#818cf8', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'MANA_BURN', effectVal: 30,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'ARCANE'
    },

    // --- SUPPORT (Range 4) ---
    { 
        id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '神聖懲戒', desc: '神聖傷害', 
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 70, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '超頻充能', desc: '極速回魔', 
        range: 5, cast: 0.4, cd: 0.8, cost: 0, gain: 45, // Range 5->4
        type: 'SINGLE', power: 50, color: '#bfdbfe', visual: 'BOLT', projectileSpeed: 1000, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', visualProjectileEffect: 'BOLT', element: 'LIGHTNING'
    },
    { 
        id: 'sb_b3', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '護盾投射', desc: '給予護盾', 
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 0, color: '#e0f2fe', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 50,
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'sb_b4', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '淨化之光', desc: '驅散效果', 
        range: 5, cast: 0.5, cd: 1.2, cost: 0, gain: 30, // Range 5->4
        type: 'SINGLE', power: 40, color: '#a7f3d0', visual: 'BOLT', projectileSpeed: 1500, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', visualProjectileEffect: 'BOLT', element: 'HOLY'
    },
    { 
        id: 'sb_b5', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '預言術', desc: '遠程光束', 
        range: 5, cast: 0.8, cd: 1.0, cost: 0, gain: 35, // Range 6->5
        type: 'SINGLE', power: 65, color: '#fcd34d', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    }
];
