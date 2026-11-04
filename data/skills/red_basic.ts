import { Role, Skill, Team } from '../../types';

// 🔴 RED BASIC: 25 VARIATIONS
// Balance Rule: Max Range = 6
export const RED_BASIC: Skill[] = [
    // --- TANK ---
    {
        id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC',
        name: '碎骨重擊', desc: '吸血打擊',
        range: 1, cast: 0.6, cd: 1.0, cost: 0, gain: 25,
        type: 'SINGLE', power: 88, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL',
        onHit: [{ action: 'VAMP', value: 0.4 }],
    },
    {
        id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC',
        name: '血鏈抽擊', desc: '中距緩速',
        range: 2, cast: 0.5, cd: 1.7, cost: 0, gain: 15,
        type: 'SINGLE', power: 75, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD',
        onHit: [{ action: 'STATUS', status: 'SLOW', duration: 1.5, force: 0.35 }],
    },
    {
        id: 'tr_b3', role: Role.TANK, team: Team.RED, tag: 'BASIC',
        name: '尖刺防禦', desc: '反傷準備',
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 20,
        type: 'SINGLE', power: 69, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL',
        onEnd: [{ action: 'STATUS', status: 'SHIELD', force: 25 }, { action: 'STATUS', status: 'REFLECT', duration: 3, force: 25 }],
    },
    {
        id: 'tr_b4', role: Role.TANK, team: Team.RED, tag: 'BASIC',
        name: '野蠻頭槌', desc: '微暈',
        range: 1, cast: 0.3, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 94, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL',
        onHit: [{ action: 'STATUS', status: 'STUN', duration: 0.5 }],
    },
    {
        id: 'tr_b5', role: Role.TANK, team: Team.RED, tag: 'BASIC',
        name: '兇殘撕咬', desc: '流血',
        range: 1, cast: 0.5, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 69, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD',
        onHit: [{ action: 'STATUS', status: 'DOT', duration: 3, force: 8 }],
    },

    // --- WARRIOR ---
    {
        id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC',
        name: '裂傷斬擊', desc: '流血效果',
        range: 1, cast: 0.4, cd: 0.8, cost: 0, gain: 25,
        type: 'SINGLE', power: 94, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD',
        onHit: [{ action: 'STATUS', status: 'DOT', duration: 3, force: 20 }],
    },
    {
        id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC',
        name: '飛斧投擲', desc: '中程攻擊',
        range: 4, cast: 0.5, cd: 1.0, cost: 0, gain: 25,
        type: 'SINGLE', power: 88, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 1000,
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', visualProjectileEffect: 'PROJ_RED_AXE', element: 'PHYSICAL'
    },
    {
        id: 'wr_b3', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC',
        name: '橫掃千軍', desc: '範圍傷害',
        range: 1, cast: 0.5, cd: 1.2, cost: 0, gain: 30,
        type: 'AOE', aoeRadius: 1, power: 75, color: '#ef4444', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },
    {
        id: 'wr_b4', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC',
        name: '重拳猛擊', desc: '打斷',
        range: 1, cast: 0.2, cd: 1.0, cost: 0, gain: 20,
        type: 'SINGLE', power: 69, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL',
        onHit: [{ action: 'STATUS', status: 'SILENCE', duration: 0.7 }],
    },
    {
        id: 'wr_b5', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC',
        name: '狂怒連斬', desc: '低血高傷',
        range: 1, cast: 0.4, cd: 0.9, cost: 0, gain: 25,
        type: 'SINGLE', power: 94, color: '#b91c1c', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD',
        onHit: [{ action: 'RAGE', value: 1 }],
    },

    // --- RANGER ---
    {
        id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC',
        name: '破城重弩', desc: '破甲重弩',
        range: 6, cast: 0.8, cd: 1.2, cost: 0, gain: 35,
        type: 'SINGLE', power: 90, color: '#ea580c', visual: 'BOMB', projectileSpeed: 1100,
        visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT', element: 'FIRE',
        onHit: [{ action: 'STATUS', status: 'VULNERABLE', duration: 1.5 }],
    },
    {
        id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC',
        name: '急速連射', desc: '快速低傷',
        range: 6, cast: 0.2, cd: 0.6, cost: 0, gain: 10,
        type: 'SINGLE', power: 40, color: '#f87171', visual: 'BOLT', projectileSpeed: 1800,
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', visualProjectileEffect: 'BOLT', element: 'PHYSICAL'
    },
    {
        id: 'rr_b3', role: Role.RANGER, team: Team.RED, tag: 'BASIC',
        name: '劇毒矢', desc: '中毒',
        range: 6, cast: 0.5, cd: 1.0, cost: 0, gain: 25,
        type: 'SINGLE', power: 55, color: '#a3e635', visual: 'ARROW', projectileSpeed: 1300,
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'ARROW', element: 'POISON',
        onHit: [{ action: 'STATUS', status: 'DOT', duration: 3, force: 12 }],
    },
    {
        id: 'rr_b4', role: Role.RANGER, team: Team.RED, tag: 'BASIC',
        name: '燃燒箭', desc: '燃燒',
        range: 6, cast: 0.6, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 65, color: '#f97316', visual: 'FIREBALL', projectileSpeed: 1200,
        visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'FIREBALL', element: 'FIRE',
        onHit: [{ action: 'STATUS', status: 'DOT', duration: 2.5, force: 14 }],
    },
    {
        id: 'rr_b5', role: Role.RANGER, team: Team.RED, tag: 'BASIC',
        name: '狩獵陷阱', desc: '定身',
        range: 5, cast: 0.7, cd: 1.5, cost: 0, gain: 35,
        type: 'SINGLE', power: 55, color: '#7c3aed', visual: 'BOMB', projectileSpeed: 1000,
        visualHitEffect: 'FX_HIT_RED_HEAVY', visualProjectileEffect: 'BOMB', element: 'PHYSICAL',
        onHit: [{ action: 'STATUS', status: 'ROOT', duration: 1.2 }],
    },

    // --- MAGE ---
    {
        id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC',
        name: '混沌之球', desc: '隨機傷害',
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 105, color: '#16a34a', visual: 'BOLT', projectileSpeed: 900,
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB', element: 'POISON',
        onHit: [{ action: 'RANDOM_POWER', min: 0.5, max: 1.5 }],
    },
    {
        id: 'mr_b2', role: Role.MAGE, team: Team.RED, tag: 'BASIC',
        name: '生命虹吸', desc: '吸血連結',
        range: 5, cast: 0.5, cd: 0.9, cost: 0, gain: 25,
        type: 'SINGLE', power: 82, color: '#991b1b', visual: 'BOLT', projectileSpeed: 1000,
        visualHitEffect: 'FX_HIT_RED_BLOOD', visualProjectileEffect: 'PROJ_RED_BLOOD_ORB', element: 'BLOOD',
        onHit: [{ action: 'VAMP', value: 0.6 }],
    },
    {
        id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC',
        name: '燃燒餘燼', desc: '燃燒傷害',
        range: 5, cast: 0.4, cd: 0.8, cost: 0, gain: 20,
        type: 'SINGLE', power: 75, color: '#fca5a5', visual: 'FIREBALL', projectileSpeed: 900,
        visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'FIREBALL', element: 'FIRE',
        onHit: [{ action: 'STATUS', status: 'DOT', duration: 3, force: 12 }],
    },
    {
        id: 'mr_b4', role: Role.MAGE, team: Team.RED, tag: 'BASIC',
        name: '虛弱詛咒', desc: '虛弱',
        range: 6, cast: 0.6, cd: 1.2, cost: 0, gain: 35,
        type: 'SINGLE', power: 75, color: '#581c87', visual: 'BOLT', projectileSpeed: 1100,
        visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW', element: 'VOID',
        onHit: [{ action: 'STATUS', status: 'VULNERABLE', duration: 1.5 }],
    },
    {
        id: 'mr_b5', role: Role.MAGE, team: Team.RED, tag: 'BASIC',
        name: '暗影箭', desc: '穿透',
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 95, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 1100,
        visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW', element: 'VOID',
        onHit: [{ action: 'PIERCE', value: 0.5 }],
    },

    // --- SUPPORT ---
    {
        id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC',
        name: '血之祭儀', desc: '吸血光束',
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 60, color: '#be123c', visual: 'BOLT', projectileSpeed: 1100,
        visualHitEffect: 'FX_HIT_RED_BLOOD', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT', element: 'BLOOD',
        onHit: [{ action: 'VAMP', value: 0.6 }],
    },
    {
        id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC',
        name: '靈魂虛弱', desc: '燃魔普攻',
        range: 5, cast: 0.4, cd: 0.9, cost: 0, gain: 25,
        type: 'SINGLE', power: 45, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 1000,
        visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW', element: 'VOID',
        onHit: [{ action: 'MANA_BURN', value: 20 }],
    },
    {
        id: 'sr_b3', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC',
        name: '痛苦妖術', desc: '隨機負面',
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 35,
        type: 'SINGLE', power: 55, color: '#a3e635', visual: 'BOLT', projectileSpeed: 900,
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB', element: 'POISON',
        onHit: [{ action: 'RANDOM_OF', options: [{ action: 'STATUS', status: 'DOT', duration: 2.5, force: 14 }, { action: 'STATUS', status: 'SLOW', duration: 2, force: 0.3 }, { action: 'STATUS', status: 'BLIND', duration: 1.5 }, { action: 'STATUS', status: 'VULNERABLE', duration: 2 }] }],
    },
    {
        id: 'sr_b4', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC',
        name: '鮮血治癒', desc: '耗血補人',
        range: 5, cast: 0.5, cd: 0.85, cost: 0, gain: 30,
        type: 'SINGLE', power: -120, color: '#991b1b', visual: 'BOLT', projectileSpeed: 950,
        visualHitEffect: 'FX_HIT_RED_BLOOD', visualProjectileEffect: 'PROJ_RED_BLOOD_MOTE', element: 'BLOOD',
        onHit: [{ action: 'SELF_DAMAGE', value: 30 }],
    },
    {
        id: 'sr_b5', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC',
        name: '巫毒射擊', desc: '持續傷害',
        range: 5, cast: 0.6, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 50, color: '#84cc16', visual: 'BOLT', projectileSpeed: 1100,
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'BOLT', element: 'POISON',
        onHit: [{ action: 'STATUS', status: 'DOT', duration: 4, force: 11 }],
    }
];
