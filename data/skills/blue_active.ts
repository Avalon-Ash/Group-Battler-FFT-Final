
import { Role, Skill, Team } from '../../types';

export const BLUE_ACTIVE: Skill[] = [
    // =================================================================
    // 🛡️ TANK
    // =================================================================
    { 
        id: 'tb_a1', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '立場產生器', desc: '自身護盾與擊退', 
        range: 0, cast: 0.4, cd: 12.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 50, color: '#60a5fa', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 4, visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'tb_a2', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '神聖震擊', desc: '單體暈眩', 
        range: 2, cast: 0.2, cd: 10.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 80, color: '#fcd34d', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.5, visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'tb_a3', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '守護者誓約', desc: '自我大量回血', 
        range: 0, cast: 1.0, cd: 15.0, cost: 50, gain: 0, 
        type: 'SINGLE', power: -300, color: '#bef264', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'tb_a4', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '稜鏡護盾', desc: '短時間反彈(暫為高防)', 
        range: 0, cast: 0.5, cd: 20.0, cost: 40, gain: 0, 
        type: 'SINGLE', power: 0, color: '#e0f2fe', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 50, ccDur: 3.0, // Mock "Shield" with regen
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'tb_a5', role: Role.TANK, team: Team.BLUE, tag: 'ACTIVE', 
        name: '拘束力場', desc: '單體定身', 
        range: 3, cast: 0.8, cd: 14.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 60, color: '#3b82f6', visual: 'BOLT', projectileSpeed: 800, 
        ccType: 'STUN', ccDur: 2.0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },

    // =================================================================
    // ⚔️ WARRIOR
    // =================================================================
    { 
        id: 'wb_a1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '音速突襲', desc: '突進並暈眩', 
        range: 4, cast: 0.2, cd: 10.0, cost: 35, gain: 0, 
        type: 'SINGLE', power: 100, color: '#e0f2fe', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.5, visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },
    { 
        id: 'wb_a2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '旋光斬', desc: '小範圍AOE', 
        range: 0, cast: 0.5, cd: 8.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 120, color: '#60a5fa', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'wb_a3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '弱點識破', desc: '斬殺效果', 
        range: 1, cast: 0.5, cd: 12.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 150, color: '#facc15', visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 2.0, visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'wb_a4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '瞬步斬', desc: '快速位移斬擊', 
        range: 3, cast: 0.1, cd: 6.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: 80, color: '#93c5fd', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },
    { 
        id: 'wb_a5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ACTIVE', 
        name: '十字順劈', desc: '前方扇形AOE', 
        range: 2, cast: 0.6, cd: 9.0, cost: 45, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 140, color: '#fcd34d', visual: 'SLASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },

    // =================================================================
    // 🏹 RANGER
    // =================================================================
    { 
        id: 'rb_a1', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '冷凍手雷', desc: '範圍凍結', 
        range: 6, cast: 0.8, cd: 15.0, cost: 50, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 60, color: '#bae6fd', visual: 'BOMB', projectileSpeed: 800, 
        ccType: 'STUN', ccDur: 2.0, element: 'ICE', visualHitEffect: 'FX_HIT_BLUE_ICE' 
    },
    { 
        id: 'rb_a2', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '閃光彈', desc: '範圍沉默', 
        range: 5, cast: 0.5, cd: 12.0, cost: 40, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 40, color: '#fff', visual: 'BOMB', projectileSpeed: 1000, 
        ccType: 'SILENCE', ccDur: 3.0, visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'rb_a3', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '穿甲彈', desc: '直線高傷', 
        range: 8, cast: 1.5, cd: 10.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 180, color: '#38bdf8', visual: 'BOLT', projectileSpeed: 3000, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', visualProjectileEffect: 'PROJ_BLUE_SNIPER' 
    },
    { 
        id: 'rb_a4', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '箭雨', desc: '範圍物理壓制', 
        range: 6, cast: 1.2, cd: 14.0, cost: 55, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 100, color: '#94a3b8', visual: 'ARROW', projectileSpeed: 800, 
        ccType: 'DOT', ccForce: 20, ccDur: 4.0, visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },
    { 
        id: 'rb_a5', role: Role.RANGER, team: Team.BLUE, tag: 'ACTIVE', 
        name: '精準狙擊', desc: '超遠斬殺', 
        range: 10, cast: 2.0, cd: 18.0, cost: 60, gain: 0, 
        type: 'SINGLE', power: 250, color: '#2563eb', visual: 'BOLT', projectileSpeed: 4000, 
        effectType: 'EXECUTE', effectVal: 2.0, visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },

    // =================================================================
    // 🔮 MAGE
    // =================================================================
    { 
        id: 'mb_a1', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '重力井', desc: '牽引敵人', 
        range: 6, cast: 1.0, cd: 14.0, cost: 60, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 80, color: '#8b5cf6', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 4, visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },
    { 
        id: 'mb_a2', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '冰河路徑', desc: '凍結路徑', 
        range: 6, cast: 0.8, cd: 12.0, cost: 50, gain: 0, 
        type: 'SINGLE', power: 100, color: '#e0f2fe', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 2.0, element: 'ICE', visualHitEffect: 'FX_HIT_BLUE_ICE' 
    },
    { 
        id: 'mb_a3', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '奧術爆破', desc: '純粹範圍傷害', 
        range: 6, cast: 1.2, cd: 10.0, cost: 55, gain: 0, 
        type: 'AOE', aoeRadius: 2, power: 150, color: '#a855f7', visual: 'BOLT', projectileSpeed: 600, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },
    { 
        id: 'mb_a4', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '暴風雪', desc: '大範圍持續緩速(DOT)', 
        range: 7, cast: 1.5, cd: 16.0, cost: 70, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 80, color: '#bfdbfe', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 30, ccDur: 6.0, element: 'ICE', visualHitEffect: 'FX_HIT_BLUE_ICE' 
    },
    { 
        id: 'mb_a5', role: Role.MAGE, team: Team.BLUE, tag: 'ACTIVE', 
        name: '超魔導飛彈', desc: '連發高傷', 
        range: 6, cast: 1.0, cd: 8.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: 180, color: '#60a5fa', visual: 'BOLT', projectileSpeed: 1200, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },

    // =================================================================
    // ⚕️ SUPPORT
    // =================================================================
    { 
        id: 'sb_a1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '奈米修復', desc: '單體大補', 
        range: 6, cast: 1.0, cd: 8.0, cost: 45, gain: 0, 
        type: 'SINGLE', power: -250, color: '#86efac', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'sb_a2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '驅散', desc: '解除控制(未實裝)', 
        range: 6, cast: 0.5, cd: 10.0, cost: 30, gain: 0, 
        type: 'SINGLE', power: -50, color: '#fff', visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'HOT', ccDur: 3.0, ccForce: 30, visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'sb_a3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '法力灌注', desc: '回復隊友魔力', 
        range: 6, cast: 1.5, cd: 15.0, cost: 0, gain: 20, 
        type: 'SINGLE', power: 0, color: '#3b82f6', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'MANA_RESTORE', effectVal: 50, visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },
    { 
        id: 'sb_a4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '治癒之泉', desc: '持續回血圖騰', 
        range: 0, cast: 1.0, cd: 20.0, cost: 60, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: -100, color: '#86efac', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 40, ccDur: 10.0, visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'sb_a5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ACTIVE', 
        name: '能量超載', desc: '大幅回魔', 
        range: 5, cast: 1.0, cd: 18.0, cost: 0, gain: 0, 
        type: 'SINGLE', power: 0, color: '#60a5fa', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'MANA_RESTORE', effectVal: 80, visualHitEffect: 'FX_HIT_BLUE_TECH' 
    }
];
