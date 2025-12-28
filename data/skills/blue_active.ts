
import { Role, Skill, Team } from '../../types';

export const BLUE_ACTIVE: Skill[] = [
    // =================================================================
    // 🛡️ TANK (Imperial Defender)
    // Concept: Shields, Stuns, Self-Sustain, Tech
    // =================================================================
    { 
        id: 'tb_a1', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '力場產生器 (Forcefield)', desc: '給予自身強力護盾並擊退', 
        range: 0, cast: 0.4, cd: 12.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 0, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 200, ccType2: 'KNOCKBACK', ccForce2: 4, 
        visualHitEffect: 'FX_GRID_IMPACT_BLUE', element: 'LIGHTNING'
    },
    { 
        id: 'tb_a2', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '神聖震擊 (Holy Shock)', desc: '單體暈眩與傷害', 
        range: 2, cast: 0.2, cd: 10.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 80, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.5, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'tb_a3', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '守護者誓約 (Oath)', desc: '大量自我治療', 
        range: 0, cast: 1.0, cd: 15.0, cost: 50, gain: 0, 
        type: 'SINGLE', power: -350, color: '#bef264', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'tb_a4', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '稜鏡屏障 (Prism)', desc: '反彈護盾與持續回血', 
        range: 0, cast: 0.5, cd: 20.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 0, color: '#e0f2fe', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 250, ccType2: 'HOT', ccDur2: 5.0, ccForce2: 25, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'ARCANE'
    },
    { 
        id: 'tb_a5', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '拘束力場 (Lockdown)', desc: '遠程單體禁錮', 
        range: 4, cast: 0.8, cd: 14.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 60, color: '#3b82f6', visual: 'BOLT', projectileSpeed: 900,
        ccType: 'ROOT', ccDur: 3.5, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },

    // =================================================================
    // ⚔️ WARRIOR (Imperial Knight)
    // Concept: Mobility, Burst, Holy Cleave
    // =================================================================
    { 
        id: 'wb_a1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '音速突襲 (Sonic Dash)', desc: '突進並暈眩目標', 
        range: 4, cast: 0.1, cd: 10.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 120, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.2, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wb_a2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '旋光斬 (Light Spin)', desc: '瞬發周圍AOE', 
        range: 0, cast: 0.4, cd: 8.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 130, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'wb_a3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '弱點識破 (Exploit)', desc: '強力斬殺', 
        range: 1, cast: 0.6, cd: 12.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 160, color: '#facc15', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 2.2, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'wb_a4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '相位劍 (Phase Shift)', desc: '無視距離打擊', 
        range: 5, cast: 0.2, cd: 6.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 90, color: '#93c5fd', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'ARCANE'
    },
    { 
        id: 'wb_a5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '十字審判 (Cross)', desc: '前方扇形AOE', 
        range: 2, cast: 0.7, cd: 9.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 150, color: '#fcd34d', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },

    // =================================================================
    // 🏹 RANGER (Imperial Sniper)
    // Concept: Ice Control, Precision Sniping, Tech Grenades
    // =================================================================
    { 
        id: 'rb_a1', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '冷凍手雷 (Cryo Nade)', desc: '範圍凍結暈眩', 
        range: 6, cast: 0.8, cd: 15.0, cost: 50, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 70, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 700,
        ccType: 'STUN', ccDur: 2.0, element: 'ICE', 
        visualHitEffect: 'FX_HIT_BLUE_ICE'
    },
    { 
        id: 'rb_a2', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '閃光彈 (Flashbang)', desc: '範圍致盲', 
        range: 5, cast: 0.5, cd: 12.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 40, color: '#fff', visual: 'BOMB', projectileSpeed: 900,
        ccType: 'BLIND', ccDur: 4.5, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'rb_a3', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '穿甲彈 (AP Round)', desc: '極高傷狙擊', 
        range: 9, cast: 1.5, cd: 10.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 220, color: '#38bdf8', visual: 'BOLT', projectileSpeed: 2500, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', visualProjectileEffect: 'PROJ_BLUE_SNIPER', element: 'PHYSICAL'
    },
    { 
        id: 'rb_a4', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '箭雨 (Volley)', desc: '範圍壓制(DoT)', 
        range: 7, cast: 1.0, cd: 14.0, cost: 55, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 120, color: '#94a3b8', visual: 'ARROW', projectileSpeed: 800, 
        ccType: 'DOT', ccForce: 25, ccDur: 4.0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'rb_a5', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '弱點鎖定 (Lock On)', desc: '超遠斬殺', 
        range: 12, cast: 2.2, cd: 18.0, cost: 60, gain: 0, 
        type: 'SINGLE', power: 280, color: '#2563eb', visual: 'BOLT', projectileSpeed: 3000, 
        effectType: 'EXECUTE', effectVal: 2.0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', visualProjectileEffect: 'PROJ_BLUE_SNIPER', element: 'LIGHTNING'
    },

    // =================================================================
    // 🔮 MAGE (Imperial Arcanist)
    // Concept: Gravity, Time, Ice, Arcane
    // =================================================================
    { 
        id: 'mb_a1', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '重力井 (Gravity Well)', desc: '牽引並傷害敵人', 
        range: 7, cast: 1.0, cd: 14.0, cost: 60, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 90, color: '#8b5cf6', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 4, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'VOID'
    },
    { 
        id: 'mb_a2', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '冰河路徑 (Ice Path)', desc: '直線禁錮', 
        range: 6, cast: 0.8, cd: 12.0, cost: 50, gain: 0, 
        type: 'SINGLE', power: 110, color: '#e0f2fe', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'ROOT', ccDur: 3.5, element: 'ICE', 
        visualHitEffect: 'FX_HIT_BLUE_ICE'
    },
    { 
        id: 'mb_a3', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '奧術爆破 (Blast)', desc: '純粹範圍傷害', 
        range: 6, cast: 1.2, cd: 10.0, cost: 55, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 180, color: '#a855f7', visual: 'BOLT', projectileSpeed: 600,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', visualProjectileEffect: 'PROJ_BLUE_ORB', element: 'ARCANE'
    },
    { 
        id: 'mb_a4', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '暴風雪 (Blizzard)', desc: '大範圍持續緩速與傷害', 
        range: 7, cast: 1.5, cd: 16.0, cost: 70, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 100, color: '#bfdbfe', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 35, ccDur: 6.0, element: 'ICE', 
        visualHitEffect: 'FX_HIT_BLUE_ICE'
    },
    { 
        id: 'mb_a5', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '超魔導飛彈 (Barrage)', desc: '連發高傷', 
        range: 6, cast: 1.0, cd: 8.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 200, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 1000,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'ARCANE'
    },

    // =================================================================
    // ⚕️ SUPPORT (Imperial Medic)
    // Concept: Tech Heals, Mana Restore, Shields
    // =================================================================
    { 
        id: 'sb_a1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '奈米修復 (Nano Heal)', desc: '單體強力治療', 
        range: 6, cast: 1.0, cd: 8.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: -280, color: '#86efac', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'sb_a2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '能量屏障 (Barrier)', desc: '給予隊友護盾', 
        range: 6, cast: 0.5, cd: 10.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 0, color: '#fff', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'SHIELD', ccForce: 220, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_a3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '法力灌注 (Infuse)', desc: '回復隊友魔力', 
        range: 6, cast: 1.5, cd: 15.0, cost: 0, gain: 20, 
        type: 'SINGLE', power: 0, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'MANA_RESTORE', effectVal: 60, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'ARCANE'
    },
    { 
        id: 'sb_a4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '治癒之泉 (Spring)', desc: '持續回血圖騰', 
        range: 0, cast: 1.0, cd: 20.0, cost: 60, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: -120, color: '#86efac', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 45, ccDur: 10.0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_a5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '能量超載 (Overload)', desc: '瞬間大幅回魔', 
        range: 5, cast: 1.0, cd: 18.0, cost: 0, gain: 0, 
        type: 'SINGLE', power: 0, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'MANA_RESTORE', effectVal: 100, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    }
];
