import { Role, Skill, Team } from '../../types';

// 🔴 RED MOBILITY: 鮮血/混沌風格 (Blood/Chaos)
export const RED_MOBILITY: Skill[] = [
    // --- TANK ---
    {
        id: 'tr_m1', role: Role.TANK, team: Team.RED, tag: 'MOBILITY',
        name: '奪命血鉤', desc: '拋出鮮血長鉤強行拉回遠處敵人',
        range: 6, cast: 0.5, cd: 8.0, cost: 0, gain: 10,
        type: 'SINGLE', power: 100, color: '#7f1d1d', visual: 'BEAM', projectileSpeed: 1600,
        visualHitEffect: 'FX_HIT_RED_BLOOD', visualProjectileEffect: 'PROJ_RED_BLOOD_HOOK', element: 'BLOOD',
        onHit: [{ action: 'STATUS', status: 'PULL', force: 4 }],
        intents: ['HOOK'],
        activation: { targetBeyond: 1 },
    },
    {
        id: 'tr_m2', role: Role.TANK, team: Team.RED, tag: 'MOBILITY',
        name: '蠻力震退', desc: '踐踏地面將周圍敵人擊退',
        range: 0, cast: 0.3, cd: 7.5, cost: 0, gain: 10,
        type: 'AOE', aoeRadius: 1, power: 80, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_RED_WAR_STOMP', element: 'PHYSICAL',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }],
        intents: ['PEEL'],
        activation: { enemyWithin: 1 },
    },

    // --- WARRIOR ---
    {
        id: 'wr_m1', role: Role.WARRIOR, team: Team.RED, tag: 'MOBILITY',
        name: '毀滅跳斬', desc: '突進至目標位置造成小範圍震擊',
        range: 5, cast: 0.3, cd: 7.0, cost: 0, gain: 10,
        type: 'AOE', aoeRadius: 1, power: 120, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_RED_WAR_STOMP', element: 'PHYSICAL',
        onCast: [{ action: 'DASH' }],
        intents: ['GAP_CLOSE'],
        activation: { targetBeyond: 1 },
    },
    {
        id: 'wr_m2', role: Role.WARRIOR, team: Team.RED, tag: 'MOBILITY',
        name: '奪魂戰鉤', desc: '揮出鎖鏈將中距敵人強行拉近',
        range: 4, cast: 0.3, cd: 7.5, cost: 0, gain: 10,
        type: 'SINGLE', power: 90, color: '#7f1d1d', visual: 'BOLT', projectileSpeed: 1800,
        visualHitEffect: 'FX_HIT_RED_BLOOD', visualProjectileEffect: 'PROJ_RED_BLOOD_HOOK', element: 'BLOOD',
        onHit: [{ action: 'STATUS', status: 'PULL', force: 3 }],
        intents: ['HOOK'],
        activation: { targetBeyond: 1 },
    },

    // --- RANGER ---
    {
        id: 'rr_m1', role: Role.RANGER, team: Team.RED, tag: 'MOBILITY',
        name: '獵網後躍', desc: '拋出獵網緩速近敵並向後跳開',
        range: 4, cast: 0.2, cd: 7.5, cost: 0, gain: 10,
        type: 'SINGLE', power: 90, color: '#78350f', visual: 'BOLT', projectileSpeed: 1600,
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', visualProjectileEffect: 'ARROW', element: 'PHYSICAL',
        onCast: [{ action: 'RETREAT', tiles: 3 }],
        onHit: [{ action: 'STATUS', status: 'SLOW', duration: 1.8, force: 0.4 }],
        intents: ['ESCAPE'],
        activation: { enemyWithin: 2 },
    },
    {
        id: 'rr_m2', role: Role.RANGER, team: Team.RED, tag: 'MOBILITY',
        name: '爆裂散射', desc: '近身霰彈轟擊將敵人強力擊退',
        range: 4, cast: 0.2, cd: 7.0, cost: 0, gain: 10,
        type: 'SINGLE', power: 120, color: '#ea580c', visual: 'SMASH', projectileSpeed: 1600,
        visualHitEffect: 'FX_HIT_RED_HEAVY', visualProjectileEffect: 'PROJ_RED_SCATTER_SHOT', element: 'PHYSICAL',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }],
        intents: ['PEEL'],
        activation: { enemyWithin: 2 },
    },

    // --- MAGE ---
    {
        id: 'mr_m1', role: Role.MAGE, team: Team.RED, tag: 'MOBILITY',
        name: '暗影遁形', desc: '緩速近身威脅並向後化影瞬移',
        range: 3, cast: 0.2, cd: 8.5, cost: 0, gain: 10,
        type: 'SINGLE', power: 80, color: '#581c87', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_RED_SHADOW_SCREAM', element: 'VOID',
        onCast: [{ action: 'RETREAT', tiles: 3 }],
        onHit: [{ action: 'STATUS', status: 'SLOW', duration: 1.5, force: 0.5 }],
        intents: ['ESCAPE'],
        activation: { enemyWithin: 2 },
    },
    {
        id: 'mr_m2', role: Role.MAGE, team: Team.RED, tag: 'MOBILITY',
        name: '混沌衝擊', desc: '爆發邪能氣浪將周圍敵人擊退',
        range: 0, cast: 0.2, cd: 8.0, cost: 0, gain: 10,
        type: 'AOE', aoeRadius: 1, power: 90, color: '#a3e635', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_RED_FEL_SPLASH', element: 'POISON',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }, { action: 'STATUS', status: 'SLOW', duration: 2, force: 0.5 }],
        intents: ['PEEL'],
        activation: { enemyWithin: 1 },
    },

    // --- SUPPORT ---
    {
        id: 'sr_m1', role: Role.SUPPORT, team: Team.RED, tag: 'MOBILITY',
        name: '怨靈震波', desc: '釋放怨靈尖嘯擊退周圍敵人並加速自身',
        range: 0, cast: 0.2, cd: 8.5, cost: 0, gain: 10,
        type: 'AOE', aoeRadius: 1, power: 60, color: '#581c87', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_RED_SHADOW_SCREAM', element: 'VOID',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }],
        onEnd: [{ action: 'STATUS', status: 'HASTE', duration: 3, force: 35 }],
        intents: ['PEEL'],
        activation: { enemyWithin: 1 },
    },
    {
        id: 'sr_m2', role: Role.SUPPORT, team: Team.RED, tag: 'MOBILITY',
        name: '血霧後撤', desc: '汲取生命護盾並向後化霧退開',
        range: 3, cast: 0.2, cd: 8.5, cost: 0, gain: 10,
        type: 'SINGLE', power: 50, color: '#be123c', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_RED_BLOOD_BARRIER', element: 'BLOOD',
        onCast: [{ action: 'RETREAT', tiles: 2 }],
        onEnd: [{ action: 'STATUS', status: 'SHIELD', force: 180 }],
        intents: ['ESCAPE'],
        activation: { enemyWithin: 2 },
    },
];
