
import { Role, Skill, Team } from '../../types';

export const BLUE_ULT: Skill[] = [
    // =================================================================
    // 🛡️ TANK (Imperial Defender)
    // Concept: Global Mitigation, Mass CC, Invulnerability
    // =================================================================
    { 
        id: 'tb_u1', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '絕對領域 (Sanctuary)', desc: '創造光之領域，暈眩範圍敵人', 
        range: 0, cast: 1.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 4, power: 300, color: '#f59e0b', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 3.5, 
        visualHitEffect: 'FX_ULT_BLUE_SANCTUARY_IMPACT' 
    },
    { 
        id: 'tb_u2', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '泰坦協議 (Titan)', desc: '巨大化並嘲諷全場', 
        range: 0, cast: 0.5, cd: 45.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 0, color: '#fbbf24', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'TAUNT', ccDur: 6.0, ccType2: 'SHIELD', ccForce2: 800, 
        visualHitEffect: 'FX_HIT_BLUE_TECH'
    },
    { 
        id: 'tb_u3', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '神盾空降 (Aegis)', desc: '擊退周圍並給予友軍護盾', 
        range: 0, cast: 0.8, cd: 35.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 200, color: '#3b82f6', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 6, ccType2: 'SHIELD', ccForce2: 400,
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'tb_u4', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '靜滯力場 (Stasis)', desc: '單體長時間放逐', 
        range: 4, cast: 1.2, cd: 50.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 50, color: '#fcd34d', 
        visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 8.0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY', specialVisualStatus: 'STASIS'
    },
    { 
        id: 'tb_u5', role: Role.TANK, team: Team.BLUE, tag: 'ULT', 
        name: '最終防線 (Final Stand)', desc: '範圍持續回血與減傷', 
        range: 0, cast: 0.5, cd: 60.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 6, power: -100, color: '#60a5fa', 
        visual: 'BEAM', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 150, ccDur: 10.0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },

    // =================================================================
    // ⚔️ WARRIOR (Imperial Knight)
    // Concept: Mobility Burst, Shockwaves, Execution
    // =================================================================
    { 
        id: 'wb_u1', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '雷霆墜落 (Thunderfall)', desc: '遠程跳躍轟炸', 
        range: 8, cast: 1.5, cd: 30.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: 500, color: '#3b82f6', 
        visual: 'SMASH', projectileSpeed: 1200, 
        ccType: 'STUN', ccDur: 2.5, 
        visualHitEffect: 'FX_ULT_BLUE_THUNDER_SLAM' 
    },
    { 
        id: 'wb_u2', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '破曉 (Daybreak)', desc: '全場致盲閃光', 
        range: 0, cast: 1.2, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 10, power: 300, color: '#fffbeb', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BLIND', ccDur: 8.0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'wb_u3', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '王者之劍 (Excalibur)', desc: '直線超高傷斬擊', 
        range: 2, cast: 1.0, cd: 25.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 900, color: '#facc15', 
        visual: 'SLASH', projectileSpeed: 0, 
        effectType: 'EXECUTE', effectVal: 3.0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'wb_u4', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '極限超載 (Overclock)', desc: '短時間爆發攻速(模擬為DoT輸出)', 
        range: 1, cast: 0.2, cd: 30.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 150, color: '#60a5fa', 
        visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'DOT', ccForce: 150, ccDur: 5.0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL' 
    },
    { 
        id: 'wb_u5', role: Role.WARRIOR, team: Team.BLUE, tag: 'ULT', 
        name: '光速衝擊 (Lightspeed)', desc: '全圖衝鋒暈眩', 
        range: 12, cast: 0.8, cd: 35.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 400, color: '#e0f2fe', 
        visual: 'BEAM', projectileSpeed: 3000, 
        ccType: 'STUN', ccDur: 3.0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH', 
        visualProjectileEffect: 'PROJ_BLUE_SNIPER' 
    },

    // =================================================================
    // 🏹 RANGER (Imperial Sniper)
    // Concept: Global Snipes, Orbital Strikes, Ice Age
    // =================================================================
    { 
        id: 'rb_u1', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '冰河世紀 (Ice Age)', desc: '全圖凍結', 
        range: 12, cast: 2.0, cd: 60.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 300, color: '#60a5fa', 
        visual: 'ARROW', projectileSpeed: 1500, 
        ccType: 'STUN', ccDur: 4.5, element: 'ICE',
        visualHitEffect: 'FX_ULT_BLUE_GLACIAL_BURST', 
        visualProjectileEffect: 'PROJ_BLUE_ICE_ARROW' 
    },
    { 
        id: 'rb_u2', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '星隕 (Starfall)', desc: '範圍隨機轟炸', 
        range: 8, cast: 1.5, cd: 35.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 450, color: '#fcd34d', 
        visual: 'ARROW', projectileSpeed: 600, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'rb_u3', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '離子砲 (Ion Cannon)', desc: '單體毀滅打擊', 
        range: 15, cast: 3.0, cd: 50.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1500, color: '#22d3ee', 
        visual: 'BEAM', projectileSpeed: 3500, 
        visualHitEffect: 'FX_ULT_BLUE_ORBITAL_BEAM' 
    },
    { 
        id: 'rb_u4', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '電磁脈衝 (EMP)', desc: '大範圍沉默與燒魔', 
        range: 8, cast: 1.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 200, color: '#8b5cf6', 
        visual: 'BOMB', projectileSpeed: 800, 
        ccType: 'SILENCE', ccDur: 8.0, effectType: 'MANA_BURN', effectVal: 100,
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },
    { 
        id: 'rb_u5', role: Role.RANGER, team: Team.BLUE, tag: 'ULT', 
        name: '飽和射擊 (Barrage)', desc: '對單體極速連射', 
        range: 7, cast: 2.5, cd: 30.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 150, color: '#fff', 
        visual: 'ARROW', projectileSpeed: 1800, 
        ccType: 'DOT', ccForce: 150, ccDur: 3.0, 
        visualHitEffect: 'FX_HIT_BLUE_PHYSICAL', 
        visualProjectileEffect: 'PROJ_BLUE_SNIPER' 
    },

    // =================================================================
    // 🔮 MAGE (Imperial Arcanist)
    // Concept: Black Holes, Time manipulation, Arcane Torrents
    // =================================================================
    { 
        id: 'mb_u1', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '奇異點 (Singularity)', desc: '強力黑洞牽引', 
        range: 7, cast: 2.0, cd: 50.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 6, power: 400, color: '#0f172a', 
        visual: 'SMASH', projectileSpeed: 200, 
        ccType: 'PULL', ccForce: 10, ccDur: 5.0, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },
    { 
        id: 'mb_u2', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '絕對零度 (Zero)', desc: '範圍冰封', 
        range: 6, cast: 1.5, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 5, power: 250, color: '#e0f2fe', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 5.0, element: 'ICE',
        visualHitEffect: 'FX_ULT_BLUE_GLACIAL_BURST' 
    },
    { 
        id: 'mb_u3', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '時空裂隙 (Rift)', desc: '全場凝滯 (除了自己)', 
        range: 0, cast: 1.0, cd: 60.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 15, power: 100, color: '#fcd34d', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 5.0, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE', specialVisualStatus: 'STASIS'
    },
    { 
        id: 'mb_u4', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '奧術洪流 (Torrent)', desc: '全場沉默', 
        range: 0, cast: 1.0, cd: 35.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 8, power: 300, color: '#a855f7', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'SILENCE', ccDur: 8.0, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },
    { 
        id: 'mb_u5', role: Role.MAGE, team: Team.BLUE, tag: 'ULT', 
        name: '稜鏡雷射 (Prism)', desc: '單體持續毀滅光束', 
        range: 8, cast: 3.0, cd: 30.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: 1200, color: '#60a5fa', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_BLUE_TECH' 
    },

    // =================================================================
    // ⚕️ SUPPORT (Imperial Medic)
    // Concept: Mass Resurrect, Invulnerability, Global Mana
    // =================================================================
    { 
        id: 'sb_u1', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '神聖干涉 (Intervention)', desc: '單體無敵並治療', 
        range: 6, cast: 0.2, cd: 50.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 3, power: -500, color: '#fef08a', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'BANISH', ccDur: 4.0, ccType2: 'HOT', ccDur2: 6.0, ccForce2: 100,
        visualHitEffect: 'FX_HIT_BLUE_HOLY', specialVisualStatus: 'STASIS'
    },
    { 
        id: 'sb_u2', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '瓦爾基里 (Valkyrie)', desc: '復活陣亡隊友(模擬為大補)', 
        range: 8, cast: 3.0, cd: 60.0, cost: 100, gain: 0, 
        type: 'SINGLE', power: -2500, color: '#4ade80', 
        visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_ULT_BLUE_RESURRECTION' 
    },
    { 
        id: 'sb_u3', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '智慧之光 (Wisdom)', desc: '全體大量回魔', 
        range: 0, cast: 2.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 15, power: 0, color: '#3b82f6', 
        visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'MANA_RESTORE', effectVal: 300, 
        visualHitEffect: 'FX_HIT_BLUE_ARCANE' 
    },
    { 
        id: 'sb_u4', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '天譴 (Wrath)', desc: '神聖閃電轟炸', 
        range: 0, cast: 1.0, cd: 40.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 6, power: 400, color: '#fcd34d', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 2.0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    },
    { 
        id: 'sb_u5', role: Role.SUPPORT, team: Team.BLUE, tag: 'ULT', 
        name: '寧靜 (Tranquility)', desc: '全場持續治療雨', 
        range: 0, cast: 2.0, cd: 45.0, cost: 100, gain: 0, 
        type: 'AOE', aoeRadius: 20, power: -200, color: '#86efac', 
        visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'HOT', ccForce: 80, ccDur: 10.0, 
        visualHitEffect: 'FX_HIT_BLUE_HOLY' 
    }
];
