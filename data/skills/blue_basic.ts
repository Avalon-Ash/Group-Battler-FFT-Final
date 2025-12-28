
import { Role, Skill, Team } from '../../types';

// 🔵 BLUE BASIC: High MP Gain (20-35), Tech/Holy Theme, Micro-CC
export const BLUE_BASIC: Skill[] = [
    // --- TANK ---
    { 
        id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '鎮壓 (Suppress)', desc: '基礎回魔, 微量擊退', 
        range: 1, cast: 0.5, cd: 1.0, cost: 0, gain: 25,
        type: 'SINGLE', power: 50, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 1,
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'PHYSICAL'
    },
    { 
        id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '警棍 (Baton)', desc: '機率微暈', 
        range: 1, cast: 0.4, cd: 1.2, cost: 0, gain: 20,
        type: 'SINGLE', power: 45, color: '#93c5fd', visual: 'SMASH', projectileSpeed: 0,
        ccType: 'STUN', ccDur: 0.1, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '方陣 (Phalanx)', desc: '防禦姿態回魔', 
        range: 1, cast: 0.6, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 40, color: '#1e3a8a', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 20,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'tb_b4', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '盾擊 (Bash)', desc: '打斷詠唱', 
        range: 1, cast: 0.3, cd: 1.5, cost: 0, gain: 25,
        type: 'SINGLE', power: 55, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 0.5,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'tb_b5', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '動能 (Kinetic)', desc: '充能打擊', 
        range: 1, cast: 0.5, cd: 1.0, cost: 0, gain: 35,
        type: 'SINGLE', power: 60, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },

    // --- WARRIOR ---
    { 
        id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '光刃 (Blade)', desc: '快速連擊', 
        range: 1, cast: 0.3, cd: 0.8, cost: 0, gain: 20, 
        type: 'SINGLE', power: 65, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wb_b2', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '刺擊 (Thrust)', desc: '穿透攻擊', 
        range: 2, cast: 0.4, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 60, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '弧光 (Arc)', desc: '順劈斬', 
        range: 1, cast: 0.5, cd: 1.2, cost: 0, gain: 25, 
        type: 'AOE', aoeRadius: 1, power: 50, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'wb_b4', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '柄擊 (Pommel)', desc: '微暈', 
        range: 1, cast: 0.2, cd: 1.0, cost: 0, gain: 20, 
        type: 'SINGLE', power: 40, color: '#94a3b8', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 0.1,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wb_b5', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '招架 (Parry)', desc: '防禦反擊', 
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 55, color: '#fbbf24', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 15,
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },

    // --- RANGER ---
    { 
        id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '射擊 (Shot)', desc: '標準遠程', 
        range: 6, cast: 0.6, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 60, color: '#38bdf8', visual: 'BOLT', projectileSpeed: 2000, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', visualProjectileEffect: 'PROJ_BLUE_SNIPER', element: 'PHYSICAL'
    },
    { 
        id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '冰箭 (Ice)', desc: '微量緩速', 
        range: 5, cast: 0.7, cd: 1.2, cost: 0, gain: 30, 
        type: 'SINGLE', power: 55, color: '#e0f2fe', visual: 'ARROW', projectileSpeed: 1500,
        visualHitEffect: 'FX_HIT_BLUE_ICE', visualProjectileEffect: 'PROJ_BLUE_ICE_ARROW', element: 'ICE'
    },
    { 
        id: 'rb_b3', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '標記 (Tracer)', desc: '增加爆擊', 
        range: 7, cast: 0.4, cd: 0.8, cost: 0, gain: 20, 
        type: 'SINGLE', power: 40, color: '#ef4444', visual: 'BOLT', projectileSpeed: 3000, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'PHYSICAL'
    },
    { 
        id: 'rb_b4', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '震盪 (Shock)', desc: '擊退射擊', 
        range: 4, cast: 0.8, cd: 1.5, cost: 0, gain: 35, 
        type: 'SINGLE', power: 50, color: '#fbbf24', visual: 'BOLT', projectileSpeed: 1800, 
        ccType: 'KNOCKBACK', ccForce: 1,
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'rb_b5', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '虛無 (Null)', desc: '燃魔射擊', 
        range: 6, cast: 0.6, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 45, color: '#8b5cf6', visual: 'ARROW', projectileSpeed: 2000, 
        effectType: 'MANA_BURN', effectVal: 10,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'VOID'
    },

    // --- MAGE ---
    { 
        id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '飛彈 (Missile)', desc: '追蹤魔法', 
        range: 5, cast: 0.5, cd: 0.9, cost: 0, gain: 30, 
        type: 'SINGLE', power: 70, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 800, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', visualProjectileEffect: 'PROJ_BLUE_ORB', element: 'ARCANE'
    },
    { 
        id: 'mb_b2', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '雷擊 (Zap)', desc: '瞬發光束', 
        range: 4, cast: 0.3, cd: 0.8, cost: 0, gain: 20, 
        type: 'SINGLE', power: 50, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '霜噬 (Frost)', desc: '減速傷害', 
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 60, color: '#bae6fd', visual: 'BOLT', projectileSpeed: 1000, 
        visualHitEffect: 'FX_HIT_BLUE_ICE', visualProjectileEffect: 'PROJ_BLUE_FROST_BOLT', element: 'ICE'
    },
    { 
        id: 'mb_b4', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '奧流 (Flow)', desc: '彈跳傷害', 
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 55, color: '#d8b4fe', visual: 'BOLT', projectileSpeed: 900, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'ARCANE'
    },
    { 
        id: 'mb_b5', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '虹吸 (Siphon)', desc: '吸取魔力', 
        range: 4, cast: 0.4, cd: 0.8, cost: 0, gain: 40, 
        type: 'SINGLE', power: 30, color: '#818cf8', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'MANA_BURN', effectVal: 15,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'ARCANE'
    },

    // --- SUPPORT ---
    { 
        id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '懲戒 (Smite)', desc: '神聖傷害', 
        range: 4, cast: 0.6, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 50, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '充能 (Charge)', desc: '極速回魔', 
        range: 5, cast: 0.4, cd: 0.8, cost: 0, gain: 45, 
        type: 'SINGLE', power: 30, color: '#bfdbfe', visual: 'BOLT', projectileSpeed: 1000, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'sb_b3', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '屏障 (Barrier)', desc: '給予護盾', 
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 0, color: '#e0f2fe', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 30,
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'sb_b4', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '淨化 (Cleanse)', desc: '驅散效果', 
        range: 5, cast: 0.5, cd: 1.2, cost: 0, gain: 30, 
        type: 'SINGLE', power: 20, color: '#a7f3d0', visual: 'BOLT', projectileSpeed: 1500, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_b5', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '預言 (Oracle)', desc: '遠程光束', 
        range: 6, cast: 0.8, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 45, color: '#fcd34d', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    }
];
