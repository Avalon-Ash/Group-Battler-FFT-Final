
import { Role, Skill, Team } from '../../types';

export const RED_BASIC: Skill[] = [
    // =================================================================
    // 🛡️ TANK (Covenant Reaver)
    // Concept: Lifesteal, Brutality, Pulls, DoTs
    // =================================================================
    { 
        id: 'tr_b1', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '碎骨擊 (Bonebreaker)', desc: '吸血重擊', 
        range: 1, cast: 0.8, cd: 1.3, cost: 0, gain: 50,
        type: 'SINGLE', power: 65, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.4, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'tr_b2', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '肉鉤 (Meat Hook)', desc: '近距離牽引', 
        range: 2, cast: 0.6, cd: 1.1, cost: 0, gain: 30,
        type: 'SINGLE', power: 45, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'PULL', ccForce: 2, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'tr_b3', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '腐蝕吐息 (Rot)', desc: '持續傷害', 
        range: 1, cast: 0.5, cd: 0.9, cost: 0, gain: 25,
        type: 'SINGLE', power: 35, color: '#3f6212', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 3.0, ccForce: 15, 
        visualHitEffect: 'FX_HIT_RED_FEL', element: 'POISON'
    },
    { 
        id: 'tr_b4', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '鏽蝕打擊 (Rust)', desc: '破甲腐蝕', 
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 30,
        type: 'SINGLE', power: 40, color: '#78350f', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 4.0, ccForce: 10, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'tr_b5', role: Role.TANK, team: Team.RED, tag: 'BASIC', 
        name: '蠻力衝撞 (Battering Ram)', desc: '擊退', 
        range: 1, cast: 0.7, cd: 1.6, cost: 0, gain: 45,
        type: 'SINGLE', power: 55, color: '#450a0a', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'KNOCKBACK', ccForce: 3, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },

    // =================================================================
    // ⚔️ WARRIOR (Covenant Berserker)
    // Concept: Bleed, Execution, Reckless
    // =================================================================
    { 
        id: 'wr_b1', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '撕裂斬 (Rend)', desc: '造成流血', 
        range: 1, cast: 0.5, cd: 0.8, cost: 0, gain: 30, 
        type: 'SINGLE', power: 55, color: '#dc2626', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 3.0, ccForce: 15, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'wr_b2', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '處決 (Execute)', desc: '高傷慢速', 
        range: 1, cast: 0.9, cd: 1.2, cost: 0, gain: 45, 
        type: 'SINGLE', power: 85, color: '#7f1d1d', visual: 'SMASH', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },
    { 
        id: 'wr_b3', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '飛斧 (Throw Axe)', desc: '中程投擲', 
        range: 3, cast: 0.6, cd: 1.4, cost: 0, gain: 35, 
        type: 'SINGLE', power: 55, color: '#b91c1c', visual: 'SMASH', projectileSpeed: 1000, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', visualProjectileEffect: 'PROJ_RED_AXE', element: 'PHYSICAL'
    },
    { 
        id: 'wr_b4', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '血腥切割 (Bloodbath)', desc: '高流血', 
        range: 1, cast: 0.4, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 45, color: '#991b1b', visual: 'SLASH', projectileSpeed: 0, 
        ccType: 'DOT', ccDur: 5.0, ccForce: 25, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'wr_b5', role: Role.WARRIOR, team: Team.RED, tag: 'BASIC', 
        name: '致殘打擊 (Maim)', desc: '短暫暈眩', 
        range: 1, cast: 0.8, cd: 2.2, cost: 0, gain: 50, 
        type: 'SINGLE', power: 65, color: '#000', visual: 'SMASH', projectileSpeed: 0, 
        ccType: 'STUN', ccDur: 1.0, 
        visualHitEffect: 'FX_HIT_RED_HEAVY', element: 'PHYSICAL'
    },

    // =================================================================
    // 🏹 RANGER (Covenant Grenadier)
    // Concept: Explosives, Fire, Chaos, Slow Projectiles
    // =================================================================
    { 
        id: 'rr_b1', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '重型弩箭 (Heavy Bolt)', desc: '低速高傷擊退', 
        range: 6, cast: 1.2, cd: 1.6, cost: 0, gain: 55, 
        type: 'SINGLE', power: 85, color: '#ea580c', visual: 'BOMB', projectileSpeed: 900, 
        ccType: 'KNOCKBACK', ccForce: 2,
        visualHitEffect: 'FX_HIT_RED_MAGMA', visualProjectileEffect: 'PROJ_RED_HEAVY_BOLT', element: 'FIRE'
    },
    { 
        id: 'rr_b2', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '連發手槍 (Autogun)', desc: '快速低傷', 
        range: 5, cast: 0.3, cd: 0.6, cost: 0, gain: 20, 
        type: 'SINGLE', power: 30, color: '#f87171', visual: 'BOLT', projectileSpeed: 1500, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },
    { 
        id: 'rr_b3', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '毒鏢 (Poison Dart)', desc: '中毒效果', 
        range: 5, cast: 0.5, cd: 1.0, cost: 0, gain: 30, 
        type: 'SINGLE', power: 25, color: '#65a30d', visual: 'ARROW', projectileSpeed: 1200, 
        ccType: 'DOT', ccDur: 5.0, ccForce: 20, 
        visualHitEffect: 'FX_HIT_RED_FEL', element: 'POISON'
    },
    { 
        id: 'rr_b4', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '燃燒彈 (Incendiary)', desc: '點燃目標', 
        range: 6, cast: 0.9, cd: 1.4, cost: 0, gain: 40, 
        type: 'SINGLE', power: 45, color: '#f97316', visual: 'BOMB', projectileSpeed: 800, 
        ccType: 'DOT', ccDur: 4.0, ccForce: 30, 
        element: 'FIRE', visualHitEffect: 'FX_HIT_RED_MAGMA' 
    },
    { 
        id: 'rr_b5', role: Role.RANGER, team: Team.RED, tag: 'BASIC', 
        name: '捕捉網 (Net)', desc: '定身效果', 
        range: 4, cast: 0.6, cd: 3.5, cost: 0, gain: 35, 
        type: 'SINGLE', power: 15, color: '#78350f', visual: 'BOMB', projectileSpeed: 700, 
        ccType: 'ROOT', ccDur: 2.0, 
        visualHitEffect: 'FX_HIT_RED_PHYSICAL', element: 'PHYSICAL'
    },

    // =================================================================
    // 🔮 MAGE (Covenant Warlock)
    // Concept: Chaos, Shadow, Drain, DoT
    // =================================================================
    { 
        id: 'mr_b1', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '混沌箭 (Chaos Bolt)', desc: '不穩定傷害', 
        range: 5, cast: 1.0, cd: 1.2, cost: 0, gain: 50, 
        type: 'SINGLE', power: 80, color: '#16a34a', visual: 'BOLT', projectileSpeed: 600, 
        visualHitEffect: 'FX_HIT_RED_FEL', visualProjectileEffect: 'PROJ_RED_CHAOS_ORB', element: 'POISON'
    },
    { 
        id: 'mr_b2', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '吸血鬼之觸 (Vampiric)', desc: '吸血傷害', 
        range: 4, cast: 0.8, cd: 1.3, cost: 0, gain: 40, 
        type: 'SINGLE', power: 55, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.6, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'mr_b3', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '暗影波 (Shadow Wave)', desc: '暗影傷害', 
        range: 5, cast: 0.7, cd: 1.0, cost: 0, gain: 35, 
        type: 'SINGLE', power: 60, color: '#581c87', visual: 'BOLT', projectileSpeed: 800, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', visualProjectileEffect: 'PROJ_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'mr_b4', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '凋零 (Decay)', desc: '強力腐蝕DoT', 
        range: 5, cast: 0.6, cd: 1.1, cost: 0, gain: 30, 
        type: 'SINGLE', power: 30, color: '#450a0a', visual: 'BOLT', projectileSpeed: 600, 
        ccType: 'DOT', ccDur: 6.0, ccForce: 20, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'mr_b5', role: Role.MAGE, team: Team.RED, tag: 'BASIC', 
        name: '餘燼 (Ember)', desc: '火焰彈', 
        range: 5, cast: 0.7, cd: 0.9, cost: 0, gain: 30, 
        type: 'SINGLE', power: 50, color: '#ea580c', visual: 'FIREBALL', projectileSpeed: 700, 
        visualHitEffect: 'FX_HIT_RED_MAGMA', element: 'FIRE'
    },

    // =================================================================
    // ⚕️ SUPPORT (Covenant Cultist)
    // Concept: Sacrifice, Curse, Drain
    // =================================================================
    { 
        id: 'sr_b1', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '鮮血祭儀 (Blood Rite)', desc: '吸血光束', 
        range: 4, cast: 0.9, cd: 1.2, cost: 0, gain: 45, 
        type: 'SINGLE', power: 50, color: '#be123c', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 0.6, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_b2', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '衰弱詛咒 (Weakness)', desc: '燃燒魔力', 
        range: 5, cast: 0.6, cd: 1.1, cost: 0, gain: 35, 
        type: 'SINGLE', power: 20, color: '#7c3aed', visual: 'BOLT', projectileSpeed: 800, 
        effectType: 'MANA_BURN', effectVal: 30, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    },
    { 
        id: 'sr_b3', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '生命轉移 (Transfusion)', desc: '治療友軍(自損)', 
        range: 4, cast: 0.5, cd: 0.6, cost: 0, gain: 25, 
        type: 'SINGLE', power: -70, color: '#dc2626', visual: 'BEAM', projectileSpeed: 0, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_b4', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '吸星大法 (Drain Life)', desc: '純吸血', 
        range: 4, cast: 1.1, cd: 1.6, cost: 0, gain: 55, 
        type: 'SINGLE', power: 60, color: '#991b1b', visual: 'BEAM', projectileSpeed: 0, 
        effectType: 'VAMP', effectVal: 1.2, 
        visualHitEffect: 'FX_HIT_RED_BLOOD', element: 'BLOOD'
    },
    { 
        id: 'sr_b5', role: Role.SUPPORT, team: Team.RED, tag: 'BASIC', 
        name: '痛苦咒語 (Agony)', desc: '持續燃魔', 
        range: 6, cast: 0.6, cd: 2.2, cost: 0, gain: 45, 
        type: 'SINGLE', power: 25, color: '#581c87', visual: 'BOLT', projectileSpeed: 600, 
        effectType: 'MANA_BURN', effectVal: 40, 
        visualHitEffect: 'FX_HIT_RED_SHADOW', element: 'VOID'
    }
];
