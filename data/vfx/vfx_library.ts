
export interface VFXEntry {
    key: string;
    name: string;
    desc: string;
    visuals: string[];
}

export const VFX_LIBRARY = {
    CORE_SEQUENCES: [
        { key: 'SSOT_DATA_DRIVEN', name: 'v9.2 核心序列引擎', desc: '基於 VisualMath 的單一真理來源投影架構。實現邏輯座標與視覺座標的絕對同步，支持多層級 Z-Layer 排序。', visuals: ['VisualMath', 'Z-Layer Bias', 'Sequence Logic'] },
        { key: 'AUTO_FLAVOR_V2', name: '動態陣營映射', desc: '自動化 150+ 技能序列生成。根據職業屬性（坦克/遊俠/法師）與陣營顏色（藍軍/紅軍）自動配置粒子與光束。', visuals: ['Role Aware', 'Faction Shaders'] }
    ] as VFXEntry[],

    ACTION_VERBS: [
        { key: 'PARTICLE_EMITTER', name: '粒子發射組件', desc: '觸發 Registry 中的複雜發射器。自動計算地表高度並解決與地形的穿插(Z-fighting)問題。', visuals: ['Emitters', 'Ground Bias'] },
        { key: 'BEAM_PROJECTION', name: '光束投射組件', desc: '連接來源與目標的程序化雷射。支持 3D 錨點解算與螺旋式幾何形狀。', visuals: ['Vector Beams', 'Helix Shape'] },
        { key: 'SHAKE_IMPULSE', name: '震動衝量', desc: '直接向 CameraSystem 注入創傷值(Trauma)。模擬物理撞擊感。', visuals: ['Screen Shake', 'Trauma Decay'] },
        { key: 'HEAVEN_FALL_PHYSICS', name: '天降物理件', desc: '從高空掉落的物理碰撞體（如隕石、地磚）。包含解析解重力模擬。', visuals: ['Gravity Logic', 'Impact Sorting'] }
    ] as VFXEntry[],

    GENERIC_HITS: [
        { key: 'FX_HIT_GENERIC', name: '標準物理命中', desc: '通用的物理打擊特效，包含衝擊波與石屑。', visuals: ['Shockwave', 'Rubble'] },
        { key: 'FX_TELEPORT', name: '相位傳送', desc: '單位部署或閃現時的相位轉移效果。', visuals: ['Pillar', 'Spike'] }
    ] as VFXEntry[],

    IMPERIAL_FLAVOR: [
        { key: 'FX_HIT_BLUE_TANK', name: '藍軍盾擊', desc: '高科技秩序感的能量衝擊。', visuals: ['Cyan Glow', 'Grid Pulse'] },
        { key: 'FX_ULT_BLUE_IMPACT', name: '藍軍聖裁', desc: '藍軍奧義級別的幾何爆發效果。', visuals: ['Giant Hex', 'Holy Light'] }
    ] as VFXEntry[],

    COVENANT_FLAVOR: [
        { key: 'FX_HIT_RED_TANK', name: '紅軍碾壓', desc: '沉重且具備破碎感的鮮血衝擊。', visuals: ['Blood', 'Dark Rubble'] },
        { key: 'FX_ULT_RED_IMPACT', name: '紅軍末日', desc: '紅軍奧義級別的混沌爆裂效果。', visuals: ['Meteor Burst', 'Fire Storm'] }
    ] as VFXEntry[]
};
