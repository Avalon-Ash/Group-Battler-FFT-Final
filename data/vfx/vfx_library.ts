
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
        { key: 'AUTO_FACTION', name: '陣營自動渲染管線', desc: '根據單位陣營屬性自動切換 150+ 個技能的粒子色澤與音效權重。', visuals: ['Theming', 'Registry'] },
        { key: 'DYNAMIC_HEIGHT_BINDING', name: '動態高度綁定', desc: '攔截塌陷網格的空間資訊，確保粒子與碎石貼合下墜地形，防止穿模。', visuals: ['Z-Axis', 'Intercept'] },
        { key: 'MOTION_BLUR_TRAIL', name: '動態模糊與物理尾跡', desc: '根據投射物物理速度自適應拉伸變形 (Stretch/Squish) 以及依據空間距離的精準採樣技術。', visuals: ['Velocity', 'Adaptive Step'] }
    ] as VFXEntry[],

    PROCEDURAL_GEOMETRY: [
        { key: 'MAGIC_CIRCLE', name: '向量魔法陣', desc: '多層旋轉向量幾何，無貼圖依賴，無限解析度。', visuals: ['Vector', 'Runes'] },
        { key: 'VOLUMETRIC_PILLAR', name: '體積光柱', desc: '模擬光線散射的垂直柱狀體，具備掃描線效果。', visuals: ['Gradient', 'Scanline'] },
        { key: 'DYNAMIC_GRID', name: '戰術網格場', desc: '貼合地形起伏的動態網格掃描效果，支持液態流動。', visuals: ['Topology', 'Pulse'] },
        { key: 'HEX_FIELD', name: '六邊形力場', desc: '用於護盾與區域控制的幾何邊界渲染。', visuals: ['Hex', 'Shield'] },
        { key: 'EASING_SHOCKWAVE', name: '彈性緩動衝擊波', desc: '採用四次方曲線 (Quartic) 的幾何爆發，增強低 FPS 下的打擊感與閃光過曝。', visuals: ['Cubic', 'Flash', 'Stroke'] }
    ] as VFXEntry[],

    COSMIC_ANOMALY: [
        { key: 'MATH_BLACK_HOLE', name: '史瓦西黑洞', desc: '基於吸積盤數學模型的動態黑洞，包含事件視界與光子層。', visuals: ['Shader', 'Distortion'] },
        { key: 'VOID_GATE', name: '虛空傳送門', desc: '負空間渲染技術，模擬空間撕裂效果。', visuals: ['Darkness', 'Rift'] },
        { key: 'GRAVITY_WELL', name: '重力井', desc: '扭曲周圍粒子的引力場視覺化。', visuals: ['Physics', 'Pull'] }
    ] as VFXEntry[],

    ACTION_VERBS: [
        { key: 'HEAVEN_FALL', name: '天降物理件', desc: '模擬從 1200px 高度墜落的物體，支持重力係數與落地衝擊波。', visuals: ['Gravity', 'Impact'] },
        { key: 'BEAM_PROJ', name: '光束投影', desc: '高精度向量雷射，支持螺旋軌跡 (Helix) 與粒子採樣。', visuals: ['Helix', 'Laser'] },
        { key: 'GRID_RIFLE', name: '網格脈衝', desc: '直接修改底層網格材質屬性的渲染指令。', visuals: ['Shader', 'Flow'] },
        { key: 'FX_CAST_BREAK', name: '詠唱崩解', desc: '能量崩解粒子：具備物理重力感的碎裂。', visuals: ['Gravity', 'Shatter'] }
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
    ] as VFXEntry[],

    STATUS_EFFECTS: [
        { key: 'FX_STATUS_BURN_LOOP', name: '燃燒狀態', desc: '持續性火焰燃燒粒子效果。', visuals: ['Fire', 'Loop'] },
        { key: 'FX_STATUS_POISON_LOOP', name: '中毒狀態', desc: '持續性毒液滴落與毒氣粒子。', visuals: ['Poison', 'Loop'] },
        { key: 'FX_STATUS_STUN_LOOP', name: '暈眩狀態', desc: '頭部環繞的暈眩星芒粒子。', visuals: ['Stars', 'Loop'] },
        { key: 'FX_STATUS_SILENCE_LOOP', name: '沉默狀態', desc: '封印符文與暗色粒子環繞。', visuals: ['Rune', 'Loop'] }
    ] as VFXEntry[],

    BATTLE_ROYALE: [
        { key: 'ZONE_WARNING', name: '縮圈預警', desc: '高頻閃爍的紅色六邊形邊界，指示即將塌陷的地形。', visuals: ['HexGeometry', 'Pulse', 'Warning'] },
        { key: 'TILE_COLLAPSE', name: '地形塌陷', desc: '地塊失去支撐向虛空墜落的物理動畫，遵循重力公式。', visuals: ['Gravity', 'Physics', 'Void'] },
        { key: 'ZONE_SHRINK', name: '安全區縮小', desc: '全場廣播事件，觸發地圖數據重建與 AI 逃生邏輯。', visuals: ['MapRebuild', 'EventBus'] },
        { key: 'LAST_STAND_AURA', name: '背水一戰光環', desc: '當 AI 無路可逃觸發背水一戰時，腳下顯示的決死戰鬥光環。', visuals: ['Aura', 'Intensity'] }
    ] as VFXEntry[],

    MAP_TOPOLOGY: [
        { key: 'GIANT_HEX_ISLAND', name: '全對稱六面浮島', desc: '利用 Radial 擴張取代方陣的生成演算法，形成結構最完美的戰棋浮島。', visuals: ['Radial', 'Symmetry'] },
        { key: 'STEPPED_HEIGHT_FIELD', name: '劇院景深地形', desc: '外緣隆起、前排下潛的碗狀高度場，防止相機遮擋並增強立體感。', visuals: ['Depth', 'Elevation'] },
        { key: 'FOOTPRINT_Z_SORT', name: '占地深度排序', desc: '基於地面點 Y 軸 (Base Y) 進行的渲染覆蓋排序，完全適配套疊透視。', visuals: ['Z-Sort', 'Overlap'] }
    ] as VFXEntry[]
};