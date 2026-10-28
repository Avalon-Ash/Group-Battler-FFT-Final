// ╔══════════════════════════════════════════════════════════╗
// ║  constants/geometry.ts — 地圖幾何、尺寸、投影與錨點常數 SSOT  ║
// ║  職責：定義六角網格尺寸、地塊高度、單位縮放與視覺錨點      ║
// ╚══════════════════════════════════════════════════════════╝

import { HexLayout, ZoneConfig } from '../types';

export const DEFAULT_HEX_LAYOUT: HexLayout = 'FLAT';
export const DEFAULT_ZONE_CONFIG: ZoneConfig = {
    enabled: true,
    initialRadius: 12,
    shrinkInterval: 10,
    minRadius: 1
};
export const HEX_SIZE = 48;
export const BLOCK_HEIGHT = 24;
export const MAX_TERRAIN_TIER = 6;
export const ISO_SCALE_Y = 0.5;
export const UNIT_BODY_OFFSET = 36;
export const UNIT_HOVER_OFFSET = 6;
export const UNIT_SCALE = 0.65;

/** 單位模型視覺中心距地板的 Z 偏移（像素）。
 *  對應 Sprite 高度的約 50%。依美術 Sprite 尺寸調整。 */
export const AGENT_MODEL_CENTER_Z = 64;

/** 沒有單位目標的特效（地面目標點）的身體高度：地面 + CENTER_OFFSET（EventVFXMapper） */
export const VISUAL_ANCHORS = {
    CENTER_OFFSET: 30
};

export const MAX_ARC_HEIGHT = 150;

/**
 * 漂浮地形（虛空／熔岩）的繪製時浮動 SSOT。只影響畫面，不影響模擬與排序鍵。
 * 唯一實作：VisualMath.floatBobAt；地塊（GridRenderStrategy）與「繪製用地面高度」（RenderPipeline）共用，
 * 所以站在地塊上的單位、屍體、狀態、HUD、貼地特效跟地塊一起浮動。見 RenderSpec「漂浮位移」。
 */
export const FLOAT_BOB = {
    BIOMES: ['VOID', 'MAGMA'] as readonly string[],
    AMPLITUDE: 4,
    SPEED: 1.5,
    /** 相位隨世界座標變化（x + y）的比例，讓相鄰島塊錯開 */
    PHASE_PER_PX: 0.01,
    /** 投射物發射格的漂浮位移在飛行進度 t 到這個值時淡出為 0（發射點與漂浮的施法者對齊，之後走原軌跡） */
    LAUNCH_FADE_T: 0.5,
} as const;

/** 縮圈計時與塌陷格掉落參數。 */
export const ZONE = {
    /** 尚未初始化縮圈時的安全層數。 */
    INITIAL_SAFE_RADIUS: 999,
    /** 計時跨秒與塌陷判定的浮點容差（秒）。 */
    TIME_EPSILON: 0.001,
    /** 倒數每隔幾秒記錄一次；最後同樣秒數內每秒記錄。 */
    WARNING_LOG_INTERVAL: 5,
    /** 塌陷格低於此 Z 座標時移除（像素）。 */
    COLLAPSE_DESPAWN_Z: -2000,
} as const;

export const MAP_GENERATION = {
    /** 平頂地圖隨機欄數下限（格）。 */
    FLAT_MIN_COLS: 8,
    /** 尖頂地圖隨機欄數下限（格）。 */
    POINTY_MIN_COLS: 7,
    /** 尖頂地圖隨機列數下限（格）。 */
    POINTY_MIN_ROWS: 12,
    /** 高度場三角函數的座標頻率（弧度／格）。 */
    HEIGHT_NOISE_FREQUENCY: 0.45,
    /** 高度場三角函數加總的振幅倍率（層）。 */
    HEIGHT_NOISE_AMPLITUDE: 3.5,
    /** 每格離心距離的高度增量（層／格）。 */
    RADIAL_HEIGHT_GAIN: 0.8,
    /** 前景深度換算除數相對 HEX_SIZE 的倍率。 */
    VISUAL_DEPTH_SCALE: 0.8,
    /** 每單位前景深度的高度扣減（層）。 */
    FOREGROUND_HEIGHT_REDUCTION: 0.8,
    /** 外圈前景每格距離的高度扣減（層／格）。 */
    OUTER_FOREGROUND_REDUCTION: 0.3,
    /** 強制平坦中心區域的半徑（格）。 */
    FLAT_CENTER_RADIUS: 1.5,
    /** 一般場景障礙物生成機率。 */
    DEFAULT_DECORATION_DENSITY: 0.3,
    /** 一般場景障礙物噪聲門檻（無單位）。 */
    DEFAULT_DECORATION_NOISE_THRESHOLD: 0.4,
    /** 森林障礙物生成機率。 */
    FOREST_DECORATION_DENSITY: 0.45,
    /** 森林障礙物噪聲門檻（無單位）。 */
    FOREST_DECORATION_NOISE_THRESHOLD: 0.2,
    /** 沙漠障礙物生成機率。 */
    DESERT_DECORATION_DENSITY: 0.4,
    /** 沙漠障礙物噪聲門檻（無單位）。 */
    DESERT_DECORATION_NOISE_THRESHOLD: 0.3,
    /** 不生成障礙物的中心半徑（格）。 */
    CLEAR_CENTER_RADIUS: 2.5,
    /** 障礙物噪聲座標頻率（弧度／格）。 */
    DECORATION_NOISE_FREQUENCY: 0.8,
} as const;

export const GRID_SPATIAL = {
    /** 世界座標選格的高度搜尋上限（像素）。 */
    PICK_MAX_HEIGHT: 300,
    /** 世界座標選格的初始候選高度（像素）。 */
    PICK_INITIAL_HEIGHT: -999,
    /** 選格水平半寬相對 HEX_SIZE 的倍率。 */
    PICK_HALF_WIDTH_FACTOR: 0.9,
    /** 選格垂直半高相對 HEX_SIZE 的倍率。 */
    PICK_HALF_HEIGHT_FACTOR: 0.6,
    /** 障礙物遮擋單位的垂直距離上限（像素）。 */
    OBSTACLE_OCCLUSION_Y_RANGE: 120,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const VISUAL_MATH_PARAM = {
    /** 地平線垂直位置（畫面高度比例） */
    HORIZON_Y_PCT: 0.62,
    /** 投射物命中容許距離平方（px²） */
    PROJECTILE_HIT_TOLERANCE_SQ: 900,
    /** 地面覆蓋層抬升（px） */
    LAYER_OVERLAY: 5,
    /** 陰影層抬升（px） */
    LAYER_SHADOW: 8,
    /** 光環層抬升（px） */
    LAYER_AURA: 1.5,
    /** 轉場徑向距離基準（px） */
    TRANSITION_MAX_DIST: 1000,
    /** 轉場垂直位移（px） */
    TRANSITION_OFFSET: 1500,
    /** 退場徑向延遲係數（進度） */
    OUT_RADIAL_DELAY: 0.3,
    /** 退場局部進度速率（倍） */
    OUT_RATE: 1.8,
    /** 退場曲線三次項係數（倍） */
    OUT_CURVE_GAIN: 1.5,
    /** 退場曲線二次項係數（倍） */
    OUT_CURVE_OFFSET: 0.5,
    /** 進場徑向延遲係數（進度） */
    IN_RADIAL_DELAY: 0.2,
    /** 進場局部進度速率（倍） */
    IN_RATE: 1.5,
    /** 進場緩動曲線指數（無單位） */
    IN_CURVE_POWER: 4,
    /** 陰影尺寸下限（倍） */
    SHADOW_MIN_SCALE: 0.4,
    /** 陰影尺寸衰減高度（px） */
    SHADOW_SCALE_HEIGHT: 500,
    /** 陰影不透明度下限（比例） */
    SHADOW_MIN_ALPHA: 0.05,
    /** 地面陰影不透明度（比例） */
    SHADOW_BASE_ALPHA: 0.35,
    /** 陰影不透明度衰減高度（px） */
    SHADOW_ALPHA_HEIGHT: 300,
    /** 缺失目標深度絕對值（px） */
    MISSING_TARGET_DEPTH: 9999,
    /** 地面目標字串前綴長度（字元） */
    GROUND_PREFIX_LENGTH: 7,
    /** 地面目標點抬升（px） */
    GROUND_TARGET_LIFT: 2,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const TRAJECTORY_PARAM = {
    /** 近距離弧高下限相對基準高度（比例） */
    MIN_ARC_RATIO: 0.15,
    /** 弧高基準水平距離（px） */
    ARC_REFERENCE_PX: 300,
    /** 懸浮軌跡預設下沉高度（px） */
    DEFAULT_DIP_PX: 20,
    /** 下沉曲線結束進度（比例） */
    DIP_END_T: 0.4,
    /** 弧形軌跡預設高度（px） */
    DEFAULT_ARC_PX: 150,
    /** 擺動軌跡預設振幅（px） */
    DEFAULT_WOBBLE_PX: 15,
    /** 擺動軌跡每段預設週期數（次） */
    DEFAULT_WOBBLE_FREQ: 2,
    /** 擺動垂直振幅比例（倍） */
    WOBBLE_Z_RATIO: 0.5,
} as const;
