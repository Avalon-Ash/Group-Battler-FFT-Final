
import { Role, Skill, Team } from '../../types';

export const BLUE_BASIC: Skill[] = [
    // =================================================================
    // 🛡️ TANK (Imperial Defender)
    // Concept: High Sustain, Mana Gen, CC, Tech/Shields
    // =================================================================
    { 
        id: 'tb_b1', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '鎮壓打擊 (Suppress)', desc: '基礎回魔攻擊', 
        range: 1, cast: 0.5, cd: 1.0, cost: 0, gain: 45,
        type: 'SINGLE', power: 45, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'PHYSICAL'
    },
    { 
        id: 'tb_b2', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '衝擊盾 (Shield Bash)', desc: '擊退敵人', 
        range: 1, cast: 0.4, cd: 1.5, cost: 0, gain: 30,
        type: 'SINGLE', power: 30, color: '#93c5fd', visual: 'SMASH', projectileSpeed: 0,
        ccType: 'KNOCKBACK', ccForce: 2,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'tb_b3', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '能量虹吸 (Siphon)', desc: '燃燒魔力並回復自身', 
        range: 2, cast: 0.6, cd: 1.2, cost: 0, gain: 20,
        type: 'SINGLE', power: 25, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0,
        effectType: 'MANA_BURN', effectVal: 20, effectType2: 'MANA_RESTORE', effectVal2: 20,
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'ARCANE'
    },
    { 
        id: 'tb_b4', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '電擊警棍 (Stun Baton)', desc: '機率暈眩', 
        range: 1, cast: 0.3, cd: 2.0, cost: 0, gain: 35,
        type: 'SINGLE', power: 35, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0,
        ccType: 'STUN', ccDur: 0.8,
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'tb_b5', role: Role.TANK, team: Team.BLUE, tag: 'BASIC', 
        name: '引力拳 (Grav Punch)', desc: '牽引遠處敵人', 
        range: 2, cast: 0.5, cd: 1.5, cost: 0, gain: 30,
        type: 'SINGLE', power: 40, color: '#2563eb', visual: 'SMASH', projectileSpeed: 0,
        ccType: 'PULL', ccForce: 1,
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'VOID'
    },

    // =================================================================
    // ⚔️ WARRIOR (Imperial Knight)
    // Concept: Consistent DPS, Mobility, Holy/Light
    // =================================================================
    { 
        id: 'wb_b1', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '光刃斬 (Light Slash)', desc: '標準快速連擊', 
        range: 1, cast: 0.3, cd: 0.7, cost: 0, gain: 25, 
        type: 'SINGLE', power: 50, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wb_b2', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '突刺 (Thrust)', desc: '中距離物理傷害', 
        range: 2, cast: 0.4, cd: 0.9, cost: 0, gain: 30, 
        type: 'SINGLE', power: 45, color: '#bae6fd', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'wb_b3', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '裁決 (Verdict)', desc: '神聖屬性重擊', 
        range: 1, cast: 0.8, cd: 1.8, cost: 0, gain: 50, 
        type: 'SINGLE', power: 80, color: '#facc15', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'wb_b4', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '相位劍 (Phase Blade)', desc: '無視護盾(模擬)', 
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 25, 
        type: 'SINGLE', power: 60, color: '#bfdbfe', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', element: 'ARCANE'
    },
    { 
        id: 'wb_b5', role: Role.WARRIOR, team: Team.BLUE, tag: 'BASIC', 
        name: '致殘打擊 (Hamstring)', desc: '短暫禁錮', 
        range: 1, cast: 0.3, cd: 2.2, cost: 0, gain: 40, 
        type: 'SINGLE', power: 35, color: '#93c5fd', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'ROOT', ccDur: 1.5,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },

    // =================================================================
    // 🏹 RANGER (Imperial Sniper)
    // Concept: High Range, High Speed Projectiles, Ice/Tech
    // =================================================================
    { 
        id: 'rb_b1', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '磁軌射擊 (Railgun)', desc: '極高彈速狙擊', 
        range: 7, cast: 1.0, cd: 1.2, cost: 0, gain: 40, 
        type: 'SINGLE', power: 60, color: '#38bdf8', visual: 'BOLT', projectileSpeed: 1800, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', visualProjectileEffect: 'PROJ_BLUE_SNIPER', element: 'PHYSICAL'
    },
    { 
        id: 'rb_b2', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '冰霜箭 (Frost Arrow)', desc: '緩速/冰凍效果', 
        range: 6, cast: 0.7, cd: 1.3, cost: 0, gain: 30, 
        type: 'SINGLE', power: 50, color: '#e0f2fe', visual: 'ARROW', projectileSpeed: 1100,
        visualHitEffect: 'FX_HIT_BLUE_ICE', visualProjectileEffect: 'PROJ_BLUE_ICE_ARROW', element: 'ICE'
    },
    { 
        id: 'rb_b3', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '雙重射擊 (Double Tap)', desc: '快速低傷', 
        range: 5, cast: 0.2, cd: 0.5, cost: 0, gain: 15, 
        type: 'SINGLE', power: 25, color: '#7dd3fc', visual: 'ARROW', projectileSpeed: 1300, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'rb_b4', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '追蹤飛彈 (Homing)', desc: '必定命中且無視障礙', 
        range: 8, cast: 1.2, cd: 1.8, cost: 0, gain: 45, 
        type: 'SINGLE', power: 55, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 700, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'FIRE'
    },
    { 
        id: 'rb_b5', role: Role.RANGER, team: Team.BLUE, tag: 'BASIC', 
        name: '震盪彈 (Concussive)', desc: '擊退目標', 
        range: 5, cast: 0.6, cd: 1.5, cost: 0, gain: 25, 
        type: 'SINGLE', power: 35, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 1000, 
        ccType: 'KNOCKBACK', ccForce: 2,
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', element: 'PHYSICAL'
    },

    // =================================================================
    // 🔮 MAGE (Imperial Arcanist)
    // Concept: Burst, Arcane/Ice, Control
    // =================================================================
    { 
        id: 'mb_b1', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '奧術飛彈 (Arcane Bolt)', desc: '標準魔法傷害', 
        range: 6, cast: 0.6, cd: 0.9, cost: 0, gain: 40, 
        type: 'SINGLE', power: 55, color: '#8b5cf6', visual: 'BOLT', projectileSpeed: 700, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', visualProjectileEffect: 'PROJ_BLUE_ORB', element: 'ARCANE'
    },
    { 
        id: 'mb_b2', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '寒冰錐 (Ice Lance)', desc: '高彈速冰傷', 
        range: 5, cast: 0.8, cd: 1.1, cost: 0, gain: 35, 
        type: 'SINGLE', power: 50, color: '#c084fc', visual: 'BOLT', projectileSpeed: 1400, 
        visualHitEffect: 'FX_HIT_BLUE_ICE', visualProjectileEffect: 'PROJ_BLUE_FROST_BOLT', element: 'ICE'
    },
    { 
        id: 'mb_b3', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '充能雷射 (Laser)', desc: '即時光束', 
        range: 5, cast: 1.2, cd: 1.6, cost: 0, gain: 60, 
        type: 'SINGLE', power: 70, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'mb_b4', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '靜電場 (Static)', desc: '極快打斷施法', 
        range: 4, cast: 0.2, cd: 0.6, cost: 0, gain: 15, 
        type: 'SINGLE', power: 25, color: '#fcd34d', visual: 'BOLT', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'mb_b5', role: Role.MAGE, team: Team.BLUE, tag: 'BASIC', 
        name: '虛空法球 (Void Orb)', desc: '緩慢高傷飛行物', 
        range: 5, cast: 1.5, cd: 2.2, cost: 0, gain: 50, 
        type: 'SINGLE', power: 90, color: '#4c1d95', visual: 'FIREBALL', projectileSpeed: 300, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', visualProjectileEffect: 'PROJ_BLUE_ORB', element: 'VOID'
    },

    // =================================================================
    // ⚕️ SUPPORT (Imperial Medic)
    // Concept: Low Dmg, High Utility, Holy/Tech
    // =================================================================
    { 
        id: 'sb_b1', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '懲戒 (Smite)', desc: '神聖傷害', 
        range: 5, cast: 0.7, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 45, color: '#fef08a', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_b2', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '干擾光束 (Disrupt)', desc: '低傷但回魔快', 
        range: 6, cast: 0.3, cd: 0.6, cost: 0, gain: 25, 
        type: 'SINGLE', power: 20, color: '#bfdbfe', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'sb_b3', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '戰術指令 (Command)', desc: '回復自身大量魔力', 
        range: 4, cast: 0.5, cd: 1.2, cost: 0, gain: 60, 
        type: 'SINGLE', power: 30, color: '#22d3ee', visual: 'BOLT', projectileSpeed: 900, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    },
    { 
        id: 'sb_b4', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '淨化之光 (Purge)', desc: '對敵傷害', 
        range: 5, cast: 0.9, cd: 1.3, cost: 0, gain: 40, 
        type: 'SINGLE', power: 50, color: '#ffffff', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', element: 'HOLY'
    },
    { 
        id: 'sb_b5', role: Role.SUPPORT, team: Team.BLUE, tag: 'BASIC', 
        name: '弱點掃描 (Scan)', desc: '揭示弱點(極低傷)', 
        range: 8, cast: 0.2, cd: 1.5, cost: 0, gain: 20, 
        type: 'SINGLE', power: 10, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', element: 'LIGHTNING'
    }
];
