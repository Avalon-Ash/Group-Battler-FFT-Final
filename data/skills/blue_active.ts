
import { Role, Skill, Team } from '../../types';

// 🔵 BLUE ACTIVE: Cost ~30-40, CD ~8-12s, Tactical CC/Shields
export const BLUE_ACTIVE: Skill[] = [
    // --- TANK ---
    { 
        id: 'tb_a1', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '立場 (Field)', desc: '自身護盾與擊退', 
        range: 0, cast: 0.4, cd: 10.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 50, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 300, ccType2: 'KNOCKBACK', ccForce2: 3, 
        visualHitEffect: 'FX_GRID_IMPACT_BLUE', element: 'LIGHTNING'
    },
    { 
        id: 'tb_a2', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '震擊 (Shock)', desc: '單體暈眩', 
        range: 2, cast: 0.2, cd: 8.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 100, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.2, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'tb_a3', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '定錨 (Anchor)', desc: '範圍禁錮', 
        range: 0, cast: 0.5, cd: 12.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 60, color: '#1e3a8a', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'ROOT', ccDur: 2.5,
        visualHitEffect: 'FX_GRID_IMPACT_BLUE', element: 'PHYSICAL'
    },
    { 
        id: 'tb_a4', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '磁引 (Mag-Pull)', desc: '單體牽引', 
        range: 4, cast: 0.6, cd: 9.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 40, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 2, ccType2: 'TAUNT', ccDur2: 1.0,
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'tb_a5', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '反射 (Reflect)', desc: '反傷護盾', 
        range: 0, cast: 0.3, cd: 12.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 0, color: '#fff', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 200, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },

    // --- WARRIOR ---
    { 
        id: 'wb_a1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '旋光 (Spin)', desc: '周圍AOE', 
        range: 0, cast: 0.3, cd: 6.0, cost: 35, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 120, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'wb_a2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '突襲 (Dash)', desc: '突進並暈眩', 
        range: 4, cast: 0.1, cd: 9.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 100, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 0.8, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wb_a3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '放電 (Discharge)', desc: '範圍沉默', 
        range: 0, cast: 0.5, cd: 10.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 80, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 1.5,
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'wb_a4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '破甲 (Vorpal)', desc: '高傷破盾', 
        range: 1, cast: 0.6, cd: 8.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 180, color: '#f59e0b', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 1.5,
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'PHYSICAL'
    },
    { 
        id: 'wb_a5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '斷罪 (Breaker)', desc: '擊退斬擊', 
        range: 1, cast: 0.4, cd: 7.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 140, color: '#93c5fd', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 2,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },

    // --- RANGER ---
    { 
        id: 'rb_a1', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '冰雷 (Nade)', desc: '小範圍緩速凍結', 
        range: 6, cast: 0.6, cd: 10.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 80, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 900,
        ccType: 'STUN', ccDur: 1.0, element: 'ICE', 
        visualHitEffect: 'FX_HIT_BLUE_ICE'
    },
    { 
        id: 'rb_a2', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '穿甲 (AP)', desc: '直線貫穿', 
        range: 8, cast: 1.2, cd: 8.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 250, color: '#38bdf8', visual: 'BOLT', projectileSpeed: 3000, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', visualProjectileEffect: 'PROJ_BLUE_SNIPER', element: 'PHYSICAL'
    },
    { 
        id: 'rb_a3', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '閃擊 (Blink-S)', desc: '位移射擊', 
        range: 6, cast: 0.2, cd: 8.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 120, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 2500, 
        ccType: 'BLIND', ccDur: 2.0,
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'rb_a4', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '冰陷 (Trap)', desc: '定身陷阱', 
        range: 6, cast: 0.5, cd: 12.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 60, color: '#bfdbfe', visual: 'BOMB', projectileSpeed: 1000, 
        ccType: 'ROOT', ccDur: 3.0,
        visualHitEffect: 'FX_HIT_BLUE_ICE', element: 'ICE'
    },
    { 
        id: 'rb_a5', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '箭雨 (Rain)', desc: '範圍壓制', 
        range: 7, cast: 1.0, cd: 10.0, cost: 50, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 100, color: '#93c5fd', visual: 'ARROW', projectileSpeed: 1200, 
        ccType: 'DOT', ccForce: 20, ccDur: 3.0,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },

    // --- MAGE ---
    { 
        id: 'mb_a1', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '爆破 (Blast)', desc: '標準AOE', 
        range: 6, cast: 1.0, cd: 8.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 1, power: 180, color: '#a855f7', visual: 'BOLT', projectileSpeed: 800,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', visualProjectileEffect: 'PROJ_BLUE_ORB', element: 'ARCANE'
    },
    { 
        id: 'mb_a2', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '禁錮 (Bind)', desc: '單體定身', 
        range: 5, cast: 0.5, cd: 12.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 90, color: '#e0f2fe', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'ROOT', ccDur: 2.0, element: 'ICE', 
        visualHitEffect: 'FX_HIT_BLUE_ICE'
    },
    { 
        id: 'mb_a3', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '傳送 (Teleport)', desc: '位置交換', 
        range: 6, cast: 0.1, cd: 12.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 0, color: '#8b5cf6', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 100, // Self shield
        visualHitEffect: 'FX_TELEPORT', element: 'ARCANE'
    },
    { 
        id: 'mb_a4', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '稜鏡 (Prism)', desc: '折射傷害', 
        range: 5, cast: 0.8, cd: 8.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 120, color: '#bae6fd', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_ICE', element: 'ICE'
    },
    { 
        id: 'mb_a5', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '魔牆 (Wall)', desc: '阻擋力場', 
        range: 0, cast: 0.5, cd: 15.0, cost: 50, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 50, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 3,
        visualHitEffect: 'FX_GRID_IMPACT_BLUE', element: 'LIGHTNING'
    },

    // --- SUPPORT ---
    { 
        id: 'sb_a1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '治療 (Heal)', desc: '單體補血', 
        range: 5, cast: 0.8, cd: 6.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: -300, color: '#86efac', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_a2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '屏障 (Shield)', desc: '隊友護盾', 
        range: 6, cast: 0.4, cd: 8.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 0, color: '#fff', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 200, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'sb_a3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '祝福 (Bless)', desc: '持續回血', 
        range: 5, cast: 0.5, cd: 10.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: -100, color: '#fde047', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 50, ccDur: 5.0,
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_a4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '淨化 (Purify)', desc: '群體解除', 
        range: 0, cast: 0.5, cd: 12.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: -50, color: '#a7f3d0', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_a5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '加速 (Haste)', desc: '群體加速', 
        range: 0, cast: 0.5, cd: 15.0, cost: 50, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 0, color: '#bae6fd', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    }
];
