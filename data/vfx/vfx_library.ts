
export interface VFXEntry {
    key: string;
    name: string;
    desc: string;
    visuals: string[];
}

export const VFX_LIBRARY = {
    CORE_SEQUENCES: [
        { key: 'NUKE_CLUSTER', name: '核彈連鎖序列', desc: '包含天降衝擊、強光閃爍與蘑菇雲升空的複合演出序列。', visuals: ['Flash', 'Cloud', 'Shockwave'] },
        { key: 'SSOT_PROJECTOR', name: 'SSOT 座標投影器', desc: '核心投影矩陣，確保 3D 邏輯座標與 2D 視覺座標 1:1 映射。', visuals: ['VisualMath', 'Z-Layers'] },
        { key: 'AUTO_FACTION', name: '陣營自動渲染管線', desc: '根據單位陣營屬性自動切換 150+ 個技能的粒子色澤與音效權重。', visuals: ['Theming', 'Registry'] }
    ] as VFXEntry[],

    PROCEDURAL_GEOMETRY: [
        { key: 'MATH_BLACK_HOLE', name: '史瓦西半徑模擬', desc: '基於吸積盤數學模型的動態黑洞渲染 (ProceduralPainter)。', visuals: ['Shader', 'Distortion'] },
        { key: 'MAGIC_CIRCLE', name: '向量魔法陣', desc: '多層旋轉向量幾何，無貼圖依賴，無限解析度。', visuals: ['Vector', 'Runes'] },
        { key: 'VOLUMETRIC_PILLAR', name: '體積光柱', desc: '模擬光線散射的垂直柱狀體，具備掃描線效果。', visuals: ['Gradient', 'Scanline'] },
        { key: 'DYNAMIC_GRID', name: '戰術網格場', desc: '貼合地形起伏的動態網格掃描效果。', visuals: ['Topology', 'Pulse'] }
    ] as VFXEntry[],

    ACTION_VERBS: [
        { key: 'HEAVEN_FALL', name: '天降物理件', desc: '模擬從 1200px 高度墜落的物體，支持重力係數與落地衝擊波。', visuals: ['Gravity', 'Impact'] },
        { key: 'BEAM_PROJ', name: '光束投影', desc: '高精度向量雷射，支持螺旋軌跡與粒子採樣。', visuals: ['Helix', 'Laser'] },
        { key: 'GRID_RIFLE', name: '網格脈衝', desc: '直接修改底層網格材質屬性的渲染指令。', visuals: ['Shader', 'Flow'] }
    ] as VFXEntry[],

    GENERIC_HITS: [
        { key: 'FX_HIT_GENERIC', name: '物理打擊', desc: '標準受擊效果。', visuals: ['Sparks', 'Rubble'] },
        { key: 'FX_CAST_BREAK', name: '能量崩解', desc: '詠唱被打斷時發生的魔力反噬碎裂效果。', visuals: ['Shards', 'Puff'] }
    ] as VFXEntry[],

    IMPERIAL_FLAVOR: [
        { key: 'FX_ULT_BLUE_AEGIS', name: '帝國神盾', desc: '藍軍防禦類奧義的標誌性幾何展開效果。', visuals: ['Cyan', 'Hexagon'] },
        { key: 'FX_HIT_BLUE_TECH', name: '科技衝擊', desc: '帶有電磁感的藍軍打擊特效。', visuals: ['Electric', 'Pulse'] },
        { key: 'PROJ_BLUE_SNIPER', name: '動能狙擊', desc: '高速線性彈道，帶有馬赫環視覺效果。', visuals: ['Railgun', 'Mach'] }
    ] as VFXEntry[],

    COVENANT_FLAVOR: [
        { key: 'FX_ULT_RED_NUKE', name: '末日審判', desc: '紅軍毀滅性打擊的極致視覺體現。', visuals: ['Crimson', 'Nuke'] },
        { key: 'FX_HIT_RED_BLOOD', name: '鮮血撕裂', desc: '紅軍特有的有機物質噴濺特效。', visuals: ['Gore', 'Dark'] },
        { key: 'PROJ_RED_CHAOS_ORB', name: '混沌法球', desc: '不穩定的螺旋軌跡與脈衝核心。', visuals: ['Chaos', 'Wobble'] }
    ] as VFXEntry[]
};
