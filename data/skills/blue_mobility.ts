import { Role, Skill, SkillActivation, Team } from '../../types';

const gapBeyond: SkillActivation = { targetBeyond: 1 };
const enemyWithin1: SkillActivation = { enemyWithin: 1 };
const enemyWithin2: SkillActivation = { enemyWithin: 2 };

// 🔵 BLUE MOBILITY: 秩序/科技風格 (Tech/Holy)
export const BLUE_MOBILITY: Skill[] = [
    // --- TANK ---
    {
        id: 'tb_m1', role: Role.TANK, team: Team.BLUE, tag: 'MOBILITY',
        name: '聖鎖牽引', desc: '遠距鎖鏈將敵人拉向自身並嘲諷',
        range: 5, cast: 0.5, cd: 8.0, cost: 0, gain: 10,
        type: 'SINGLE', power: 90, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 2000,
        visualHitEffect: 'FX_ACTIVE_BLUE_RADIANT_BURST', visualProjectileEffect: 'PROJ_BLUE_CHAIN_HOOK', element: 'LIGHTNING',
        onHit: [{ action: 'STATUS', status: 'PULL', force: 4 }, { action: 'STATUS', status: 'TAUNT', duration: 1.5 }],
        intents: ['HOOK'],
        activation: gapBeyond,
    },
    {
        id: 'tb_m2', role: Role.TANK, team: Team.BLUE, tag: 'MOBILITY',
        name: '聖盾猛推', desc: '重盾撞擊擊退周圍敵人',
        range: 0, cast: 0.3, cd: 7.5, cost: 0, gain: 10,
        type: 'AOE', aoeRadius: 1, power: 80, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_AEGIS_WARD', element: 'LIGHTNING',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }],
        intents: ['PEEL'],
        activation: enemyWithin1,
    },

    // --- WARRIOR ---
    {
        id: 'wb_m1', role: Role.WARRIOR, team: Team.BLUE, tag: 'MOBILITY',
        name: '疾光突襲', desc: '衝鋒突進並短暫緩速目標',
        range: 5, cast: 0.2, cd: 6.5, cost: 0, gain: 10,
        type: 'SINGLE', power: 110, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL',
        onCast: [{ action: 'DASH' }],
        onHit: [{ action: 'STATUS', status: 'SLOW', duration: 1.5, force: 0.4 }],
        intents: ['GAP_CLOSE'],
        activation: gapBeyond,
    },
    {
        id: 'wb_m2', role: Role.WARRIOR, team: Team.BLUE, tag: 'MOBILITY',
        name: '裁決飛爪', desc: '拋出聖光鎖鏈將敵人拉向自身',
        range: 4, cast: 0.3, cd: 7.5, cost: 0, gain: 10,
        type: 'SINGLE', power: 90, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 1800,
        visualHitEffect: 'FX_HIT_BLUE_HOLY', visualProjectileEffect: 'PROJ_BLUE_CHAIN_HOOK', element: 'HOLY',
        onHit: [{ action: 'STATUS', status: 'PULL', force: 3 }],
        intents: ['HOOK'],
        activation: gapBeyond,
    },

    // --- RANGER ---
    {
        id: 'rb_m1', role: Role.RANGER, team: Team.BLUE, tag: 'MOBILITY',
        name: '疾影後躍', desc: '對近身威脅射擊致盲並向後翻滾逃逸',
        range: 4, cast: 0.2, cd: 7.5, cost: 0, gain: 10,
        type: 'SINGLE', power: 100, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 2500,
        visualHitEffect: 'FX_HIT_BLUE_LIGHTNING', visualProjectileEffect: 'PROJ_BLUE_LIGHT_ARROW', element: 'LIGHTNING',
        onCast: [{ action: 'RETREAT', tiles: 3 }],
        onHit: [{ action: 'STATUS', status: 'BLIND', duration: 1.8 }],
        intents: ['ESCAPE'],
        activation: enemyWithin2,
    },
    {
        id: 'rb_m2', role: Role.RANGER, team: Team.BLUE, tag: 'MOBILITY',
        name: '斥力爆射', desc: '近距發射高壓氣流箭將敵人擊退',
        range: 4, cast: 0.2, cd: 7.0, cost: 0, gain: 10,
        type: 'SINGLE', power: 120, color: '#38bdf8', visual: 'BOLT', projectileSpeed: 2200,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', visualProjectileEffect: 'PROJ_BLUE_LIGHT_ARROW', element: 'PHYSICAL',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }],
        intents: ['PEEL'],
        activation: enemyWithin2,
    },

    // --- MAGE ---
    {
        id: 'mb_m1', role: Role.MAGE, team: Team.BLUE, tag: 'MOBILITY',
        name: '奧術閃現', desc: '釋放冰環緩速近敵並向後瞬移逃逸',
        range: 3, cast: 0.2, cd: 8.5, cost: 0, gain: 10,
        type: 'SINGLE', power: 80, color: '#8b5cf6', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_TELEPORT', element: 'ARCANE',
        onCast: [{ action: 'RETREAT', tiles: 3 }],
        onHit: [{ action: 'STATUS', status: 'SLOW', duration: 1.5, force: 0.5 }],
        intents: ['ESCAPE'],
        activation: enemyWithin2,
    },
    {
        id: 'mb_m2', role: Role.MAGE, team: Team.BLUE, tag: 'MOBILITY',
        name: '斥力新星', desc: '引爆奧術斥力將周圍近身敵人擊退',
        range: 0, cast: 0.2, cd: 8.0, cost: 0, gain: 10,
        type: 'AOE', aoeRadius: 1, power: 90, color: '#a855f7', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_ARCANE_RIPPLE', element: 'ARCANE',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }, { action: 'STATUS', status: 'SLOW', duration: 2, force: 0.5 }],
        intents: ['PEEL'],
        activation: enemyWithin1,
    },

    // --- SUPPORT ---
    {
        id: 'sb_m1', role: Role.SUPPORT, team: Team.BLUE, tag: 'MOBILITY',
        name: '聖風障壁', desc: '呼喚神聖疾風擊退近身敵人並加速自身',
        range: 0, cast: 0.2, cd: 8.5, cost: 0, gain: 10,
        type: 'AOE', aoeRadius: 1, power: 60, color: '#86efac', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_RADIANT_BURST', element: 'HOLY',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }],
        onEnd: [{ action: 'STATUS', status: 'HASTE', duration: 3, force: 35 }],
        intents: ['PEEL'],
        activation: enemyWithin1,
    },
    {
        id: 'sb_m2', role: Role.SUPPORT, team: Team.BLUE, tag: 'MOBILITY',
        name: '羽翼後撤', desc: '賦予自身護盾並向後輕盈躍開',
        range: 3, cast: 0.2, cd: 8.5, cost: 0, gain: 10,
        type: 'SINGLE', power: 50, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_AEGIS_WARD', element: 'LIGHTNING',
        onCast: [{ action: 'RETREAT', tiles: 2 }],
        onEnd: [{ action: 'STATUS', status: 'SHIELD', force: 180 }],
        intents: ['ESCAPE'],
        activation: enemyWithin2,
    },
];
