
import { Role, Skill, Team } from '../../types';

// 🔵 BLUE ACTIVE: 秩序/科技風格 (Tech/Holy)
export const BLUE_ACTIVE: Skill[] = [
    // --- TANK ---
    {
        id: 'tb_a1', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE',
        name: '六稜壁障', desc: '自身護盾與擊退',
        range: 0, cast: 0.4, cd: 9.0, cost: 40, gain: 0,
        type: 'AOE', aoeRadius: 1, power: 80, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_AEGIS_WARD', element: 'LIGHTNING',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }],
        onEnd: [{ action: 'STATUS', status: 'SHIELD', force: 400 }],
        intents: ['PEEL'],
    },
    {
        id: 'tb_a2', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE',
        name: '制裁震擊', desc: '單體暈眩',
        range: 2, cast: 0.2, cd: 7.0, cost: 30, gain: 0,
        type: 'SINGLE', power: 150, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_HOLY_SMITE', element: 'HOLY',
        onHit: [{ action: 'STATUS', status: 'STUN', duration: 1.5 }],
    },
    {
        id: 'tb_a3', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE',
        name: '磐石禁錮', desc: '範圍禁錮',
        range: 0, cast: 0.5, cd: 10.0, cost: 45, gain: 0,
        type: 'AOE', aoeRadius: 2, power: 100, color: '#1e3a8a', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_GRID_IMPACT_BLUE', element: 'PHYSICAL',
        onHit: [{ action: 'STATUS', status: 'ROOT', duration: 3 }],
    },
    {
        id: 'tb_a4', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE',
        name: '聖鎖牽引', desc: '單體牽引',
        range: 5, cast: 0.6, cd: 7.0, cost: 35, gain: 0,
        type: 'SINGLE', power: 110, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 2000,
        visualHitEffect: 'FX_ACTIVE_BLUE_RADIANT_BURST', visualProjectileEffect: 'PROJ_BLUE_CHAIN_HOOK', element: 'LIGHTNING',
        onHit: [{ action: 'STATUS', status: 'PULL', force: 3 }, { action: 'STATUS', status: 'TAUNT', duration: 2 }],
        intents: ['HOOK'],
    },
    {
        id: 'tb_a5', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE',
        name: '稜鏡反射', desc: '反傷護盾',
        range: 0, cast: 0.3, cd: 10.0, cost: 40, gain: 0,
        type: 'SINGLE', power: 0, color: '#ffffff', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_PRISM_REFLECT', element: 'LIGHTNING',
        onEnd: [{ action: 'STATUS', status: 'SHIELD', force: 300 }, { action: 'STATUS', status: 'REFLECT', duration: 4, force: 30 }],
    },

    // --- WARRIOR (Enhanced Gap Closers) ---
    {
        id: 'wb_a1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE',
        name: '旋光劍舞', desc: '周圍AOE',
        range: 0, cast: 0.3, cd: 5.0, cost: 35, gain: 0,
        type: 'AOE', aoeRadius: 1, power: 160, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_RADIANT_BURST', element: 'LIGHTNING'
    },
    {
        id: 'wb_a2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE',
        name: '疾光突襲', desc: '突進並暈眩',
        range: 6, cast: 0.2, cd: 7.0, cost: 30, gain: 0, // Buff Range 4->6, CD 9->8, Cast 0.1->0.2
        type: 'SINGLE', power: 140, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL',
        onCast: [{ action: 'DASH' }],
        onHit: [{ action: 'STATUS', status: 'STUN', duration: 1.2 }],
        intents: ['GAP_CLOSE'],
    },
    {
        id: 'wb_a3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE',
        name: '聖言禁語', desc: '範圍沉默',
        range: 0, cast: 0.5, cd: 9.0, cost: 40, gain: 0,
        type: 'AOE', aoeRadius: 2, power: 120, color: '#3b82f6', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_RADIANT_BURST', element: 'LIGHTNING',
        onHit: [{ action: 'STATUS', status: 'SILENCE', duration: 2 }],
    },
    {
        id: 'wb_a4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE',
        name: '破甲聖劍', desc: '高傷破盾',
        range: 1, cast: 0.6, cd: 7.0, cost: 35, gain: 0,
        type: 'SINGLE', power: 240, color: '#f59e0b', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_HOLY_SMITE', element: 'PHYSICAL',
        onHit: [{ action: 'EXECUTE', value: 1.5 }, { action: 'PIERCE', value: 1 }, { action: 'BREAK_SHIELD' }],
    },
    {
        id: 'wb_a5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE',
        name: '斷罪一擊', desc: '擊退斬擊',
        range: 1, cast: 0.4, cd: 6.0, cost: 30, gain: 0,
        type: 'SINGLE', power: 180, color: '#93c5fd', visual: 'SLASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_JUDGMENT_SLASH', element: 'PHYSICAL',
        onHit: [{ action: 'STATUS', status: 'KNOCKBACK', force: 3 }],
        intents: ['PEEL'],
    },

    // --- RANGER ---
    {
        id: 'rb_a1', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE',
        name: '霜寒法球', desc: '小範圍緩速凍結',
        range: 7, cast: 0.6, cd: 9.0, cost: 40, gain: 0,
        type: 'AOE', aoeRadius: 1, power: 120, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 900,
        element: 'ICE',
        visualHitEffect: 'FX_ACTIVE_BLUE_FROST_SNAP', visualProjectileEffect: 'PROJ_BLUE_ICE_ARROW',
        onImpact: [{ action: 'HAZARD', kind: 'ICE', duration: 1.5 }],
        onHit: [{ action: 'STATUS', status: 'STUN', duration: 1.5 }],
    },
    {
        id: 'rb_a2', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE',
        name: '穿雲貫甲', desc: '直線貫穿',
        range: 9, cast: 1, cd: 7.0, cost: 45, gain: 0,
        type: 'SINGLE', power: 350, color: '#38bdf8', visual: 'BOLT', projectileSpeed: 3000,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', visualProjectileEffect: 'PROJ_BLUE_LIGHT_ARROW', element: 'PHYSICAL'
    },
    {
        id: 'rb_a3', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE',
        name: '疾影射擊', desc: '位移射擊',
        range: 7, cast: 0.2, cd: 7.0, cost: 35, gain: 0,
        type: 'SINGLE', power: 160, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 2500,
        visualHitEffect: 'FX_HIT_BLUE_LIGHTNING', visualProjectileEffect: 'PROJ_BLUE_LIGHT_ARROW', element: 'LIGHTNING',
        onHit: [{ action: 'STATUS', status: 'BLIND', duration: 2.5 }],
    },
    {
        id: 'rb_a4', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE',
        name: '冰霜陷阱', desc: '定身陷阱',
        range: 7, cast: 0.5, cd: 10.0, cost: 40, gain: 0,
        type: 'AOE', aoeRadius: 1, power: 90, color: '#bfdbfe', visual: 'BOMB', projectileSpeed: 1000,
        visualHitEffect: 'FX_ACTIVE_BLUE_FROST_SNAP', element: 'ICE',
        onImpact: [{ action: 'HAZARD', kind: 'ICE', duration: 4 }],
        onHit: [{ action: 'STATUS', status: 'ROOT', duration: 4 }],
    },
    {
        id: 'rb_a5', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE',
        name: '矢雨壓制', desc: '範圍壓制',
        range: 8, cast: 1.0, cd: 9.0, cost: 50, gain: 0,
        type: 'AOE', aoeRadius: 2, power: 150, color: '#93c5fd', visual: 'ARROW', projectileSpeed: 1200,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', visualProjectileEffect: 'PROJ_BLUE_LIGHT_ARROW', element: 'PHYSICAL',
        onImpact: [{ action: 'HAZARD', kind: 'POISON', duration: 3 }],
        onHit: [{ action: 'STATUS', status: 'DOT', duration: 3, force: 30 }],
    },

    // --- MAGE ---
    {
        id: 'mb_a1', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE',
        name: '奧術爆破', desc: '標準AOE',
        range: 7, cast: 1.0, cd: 7.5, cost: 40, gain: 0,
        type: 'AOE', aoeRadius: 1, power: 210, color: '#a855f7', visual: 'BOLT', projectileSpeed: 800,
        visualHitEffect: 'FX_ACTIVE_BLUE_ARCANE_RIPPLE', visualProjectileEffect: 'PROJ_BLUE_ORB', element: 'ARCANE'
    },
    {
        id: 'mb_a2', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE',
        name: '冰封禁錮', desc: '單體定身',
        range: 6, cast: 0.5, cd: 8.0, cost: 35, gain: 0,
        type: 'SINGLE', power: 160, color: '#e0f2fe', visual: 'BOLT', projectileSpeed: 1600,
        element: 'ICE',
        visualHitEffect: 'FX_ACTIVE_BLUE_FROST_SNAP', visualProjectileEffect: 'PROJ_BLUE_FROST_BOLT',
        onHit: [{ action: 'STATUS', status: 'ROOT', duration: 3 }],
    },
    {
        id: 'mb_a3', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE',
        name: '易位術', desc: '位置交換',
        range: 5, cast: 0.5, cd: 7.5, cost: 15, gain: 25,
        type: 'SINGLE', power: 110, color: '#8b5cf6', visual: 'BEAM', projectileSpeed: 0,
        visualHitEffect: 'FX_TELEPORT', element: 'ARCANE',
        onCast: [{ action: 'DASH' }],
        intents: ['GAP_CLOSE'],
    },
    {
        id: 'mb_a4', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE',
        name: '晶體折射', desc: '折射傷害',
        range: 6, cast: 0.8, cd: 7.0, cost: 45, gain: 0,
        type: 'AOE', aoeRadius: 1, power: 135, color: '#bae6fd', visual: 'BEAM', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_BLUE_ICE', element: 'ICE',
        onImpact: [{ action: 'HAZARD', kind: 'ICE', duration: 5 }],
    },
    {
        id: 'mb_a5', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE',
        name: '心靈恐懼', desc: '令目標陷入恐懼逃跑',
        range: 6, cast: 0.5, cd: 11.0, cost: 45, gain: 0,
        type: 'SINGLE', power: 60, color: '#a855f7', visual: 'BEAM', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'ARCANE',
        onHit: [{ action: 'STATUS', status: 'FEAR', duration: 2 }],
    },

    // --- SUPPORT ---
    {
        id: 'sb_a1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE',
        name: '神聖癒合', desc: '單體補血',
        range: 6, cast: 0.8, cd: 5.0, cost: 35, gain: 0,
        type: 'SINGLE', power: -400, color: '#86efac', visual: 'BEAM', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_HOLY_SMITE', element: 'HOLY'
    },
    {
        id: 'sb_a2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE',
        name: '聖輝屏障', desc: '隊友護盾',
        range: 7, cast: 0.4, cd: 7.0, cost: 30, gain: 0,
        type: 'SINGLE', power: 0, color: '#ffffff', visual: 'BEAM', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_AEGIS_WARD', element: 'LIGHTNING',
        onHit: [{ action: 'STATUS', status: 'SHIELD', force: 300 }],
    },
    {
        id: 'sb_a3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE',
        name: '天使祝福', desc: '持續回血',
        range: 6, cast: 0.5, cd: 8.0, cost: 40, gain: 0,
        type: 'SINGLE', power: -150, color: '#fde047', visual: 'BEAM', projectileSpeed: 0,
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY',
        onHit: [{ action: 'STATUS', status: 'HOT', duration: 5, force: 80 }],
    },
    {
        id: 'sb_a4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE',
        name: '不滅聖印', desc: '賦予目標短暫無敵',
        range: 6, cast: 0.4, cd: 11.0, cost: 35, gain: 0,
        type: 'SINGLE', power: -120, color: '#fde68a', visual: 'SMASH', projectileSpeed: 0,
        specialVisualStatus: 'INVINCIBLE',
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY',
        onHit: [{ action: 'STATUS', status: 'INVINCIBLE', duration: 2 }],
    },
    {
        id: 'sb_a5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE',
        name: '疾風祝禱', desc: '群體加速',
        range: 0, cast: 0.5, cd: 12.0, cost: 50, gain: 0,
        type: 'AOE', aoeRadius: 5, power: -60, color: '#bae6fd', visual: 'SMASH', projectileSpeed: 0,
        visualHitEffect: 'FX_ACTIVE_BLUE_RADIANT_BURST', element: 'LIGHTNING',
        onHit: [{ action: 'STATUS', status: 'SHIELD', force: 80 }, { action: 'STATUS', status: 'HASTE', duration: 4, force: 30 }],
    }
];
