// ╔══════════════════════════════════════════════════════════╗
// ║  constants/terrain.ts — 地形、覆蓋層、背景與障礙物常數 SSOT  ║
// ║  職責：定義戰術疊層色、地格覆蓋、背景特效、地形皮膚與障礙物 ║
// ╚══════════════════════════════════════════════════════════╝

import { HEX_SIZE, BLOCK_HEIGHT } from './geometry';

// SSOT: Tactical and Debug Overlay Colors
export const TACTICAL_COLORS = {
    TRAJECTORY: '#ffffff',
    TARGET_ENEMY: '#ef4444',
    TARGET_ALLY: '#4ade80',
    TARGET_FADE: 'rgba(0, 0, 0, 0)',
    DIRECTOR_FRAME: 'rgba(6, 182, 212, 0.4)',
    DIRECTOR_REC: '#ef4444',
    DIRECTOR_TEXT: 'rgba(255, 255, 255, 0.8)',
    DEBUG_FPS: 'rgba(255, 255, 255, 0.5)',
    SUDDEN_DEATH_ALERT: 'rgba(239, 68, 68, 0.8)',
    SUDDEN_DEATH_SUB: 'rgba(255, 255, 255, 0.6)'
};

/**
 * 地格疊層（GridOverlays，逐格向量六角）：RADIUS 是 HEX_SIZE 的倍率，LIFT 是在 OVERLAY 層偏移之上再往上的 px，
 * FREQ 是 rad/s，脈動值 pulse ∈ [0, 1]，ALPHA＝BASE＋pulse×PULSE。
 */
export const GRID_OVERLAY = {
    LAST_STAND: { LIFT: 2, FREQ: 15, RADIUS: 0.98, FILL: '#c084fc', FILL_ALPHA: 0.2, FILL_PULSE: 0.3, STROKE: '#f0abfc', LINE_W: 1.5, LINE_PULSE: 1.5, STROKE_ALPHA: 0.4, STROKE_PULSE: 0.4 },
    /** 地格狀態底色（STATUS_VISUALS.floorColor）缺不透明度時的預設 */
    STATUS_FLOOR_ALPHA: 0.4,
    ZONE_LIFT: 1,
    /** 地格光源（lightColor）：screen 疊加，不透明度＝min(MAX_ALPHA, intensity × GAIN) */
    LIGHT: { MAX_ALPHA: 0.5, GAIN: 0.4 },
    /** 預警／射程／滑過的疊層再往上 LIFT px */
    MARK_LIFT: 2,
    /**
     * 預警／射程／滑過（2026-10-19 改成預烘焙的柔光格：半透明底＋模糊內緣光＋淡細芯線）。
     * 舊版逐格描 1.5～2 px 實線，AOE 範圍內相鄰格的雙邊排成密集網格，是畫面「毛刺、髒」的主因。
     * FILL_ALPHA＝底色、EDGE_ALPHA＝內緣光、CORE_ALPHA＝細芯線；預警整格不透明度在 ALPHA_MIN～＋ALPHA_PULSE 間以 FREQ 律動。
     */
    WARNING: { FREQ: 5, ALPHA_MIN: 0.65, ALPHA_PULSE: 0.35, FILL: '#ff2a1f', EDGE: '#ffb0a6', FILL_ALPHA: 0.75, EDGE_ALPHA: 0.8, CORE_ALPHA: 0.45 },
    RANGE: { FILL_ALPHA: 0.1, EDGE_ALPHA: 0.55, CORE_ALPHA: 0.3 },
    HOVER: { STROKE: '#ffffff', FILL_ALPHA: 0, EDGE_ALPHA: 0.6, CORE_ALPHA: 0.55 },
    /** 柔光格烘焙：倍率、底色與內緣半徑（格半徑比例）、內緣光線寬與模糊（px）、芯線寬、畫布邊距（px） */
    TILE: { BAKE_SCALE: 2, FILL_RADIUS: 0.95, EDGE_RADIUS: 0.86, EDGE_W: 3, EDGE_BLUR: 2.5, CORE_W: 0.8, PAD: 6 },
} as const;

/**
 * 地格區域效果（ZoneRenderer，GridOverlays 呼叫）：波紋從中心擴張到 zoneRadius＋WAVE_OVERSHOOT 格，
 * 寬 WAVE_WIDTH 格；敵方區域固定用 ENEMY_COLOR。2026-10-19 波紋與邊界改成柔光格（SoftTile，GRID_OVERLAY.TILE），
 * 不再逐格描實線雙環與虛線：波紋＝內緣光 WAVE_EDGE_ALPHA＋芯線 WAVE_CORE_ALPHA，整格不透明度＝波紋強度、放大 1＋強度×WAVE_SCALE_GROW。
 */
export const ZONE_RENDER = {
    WAVE_OVERSHOOT: 0.5,
    WAVE_WIDTH: 1.5,
    MIN_WAVE: 0.05,
    ENEMY_COLOR: '#ef4444',
    ENEMY_ALPHA: 0.2,
    INSIDE_ALPHA: 0.12,
    FILL_RADIUS: 0.95,
    WAVE_EDGE_ALPHA: 0.6,
    WAVE_CORE_ALPHA: 0.25,
    WAVE_SCALE_GROW: 0.08,
    /** 距邊界不到 BORDER_BAND 格算邊界格；邊界格的內緣光（敵方較亮以便辨識）與芯線 */
    BORDER_BAND: 0.5,
    BORDER_EDGE_ALPHA: 0.35,
    ENEMY_BORDER_EDGE_ALPHA: 0.5,
    BORDER_CORE_ALPHA: 0.2,
} as const;

// SSOT: Background Renderer Colors
export const BACKGROUND_COLORS = {
    VIGNETTE_START: 'rgba(0, 0, 0, 0)',
    VIGNETTE_END: 'rgba(0, 0, 0, 0.8)',
    STAR_WHITE: '#ffffff',
    SKY_RIVER_PRIMARY: 'rgba(124, 58, 237, 0.25)',
    SKY_RIVER_SECONDARY: 'rgba(79, 70, 229, 0.15)',
    AURORA_COLOR: 'hsla(170, 80%, 60%, 0.15)',
    CANOPY_RAY: 'rgba(255, 255, 255, 0.1)',
    TRANSPARENT: 'rgba(0, 0, 0, 0)'
};

/** 背景動態特效與幾何參數 SSOT */
export const BACKGROUND_FX = {
    /** 靜態背景快取參數（底色、星空、地平線接縫、暗角、山脈、沙丘、天河） */
    STATIC: {
        /** 基礎背景漸層色標位置（頂部 0 為 scene.background） */
        BG_GRAD_FOG_STOP: 0.4,
        BG_GRAD_HORIZON_STOP: 1.0,

        /** 星星總數（一般場景 150，虛空星河 200） */
        STARS_COUNT_DEFAULT: 150,
        STARS_COUNT_SKY_RIVER: 200,
        STARS_SEED: 123,
        STARS_HEIGHT_PCT: 0.7,
        STARS_MAX_SIZE: 1.8,
        STARS_MIN_ALPHA: 0.2,
        STARS_ALPHA_RANGE: 0.6,

        /** 透視網格線 */
        GRID_ALPHA: 0.15,
        GRID_LINE_WIDTH: 1,
        GRID_STEP_X: 100,
        GRID_CONVERGE_RATIO: 0.1,
        GRID_DECAY_RATE: 0.1,
        GRID_STEP_MIN: 2,
        GRID_MIN_DIST: 0.2,
        GRID_DIST_POW: 0.5,

        /** 地平線接縫過渡高度與色標偏移 */
        SEAM_HEIGHT: 350,
        SEAM_TOP_OFFSET_RATIO: 0.6,
        SEAM_BOTTOM_OFFSET_RATIO: 0.4,
        SEAM_STOPS: [0, 0.3, 0.5, 0.7, 1.0] as readonly number[],
        SEAM_ALPHAS: [0, 0.8, 1.0, 0.8, 0] as readonly number[],

        /** 暗角徑向漸層半徑比例 */
        VIGNETTE_INNER_RATIO: 0.4,
        VIGNETTE_OUTER_RATIO: 0.9,

        /** 山脈靜態層參數 */
        MOUNTAINS_STEP: 20,
        MOUNTAINS_FREQ_A: 0.01,
        MOUNTAINS_FREQ_B: 0.03,
        MOUNTAINS_FAR: { yOffset: 0, roughness: 60, seedOffset: 0, alpha: 0.3 },
        MOUNTAINS_NEAR: { yOffset: 60, roughness: 40, seedOffset: 100, alpha: 0.5 },

        /** 沙丘靜態層參數 */
        DUNES_STEP: 30,
        DUNES_FAR: { yOffset: 50, amp: 30, freq: 0.005, offset: 0, alpha: 0.4 },
        DUNES_NEAR: { yOffset: 150, amp: 40, freq: 0.003, offset: 2, alpha: 0.6 },

        /** 虛空星河靜態形狀 */
        SKY_RIVER: {
            HEIGHT_RATIO: 0.8,
            P0_Y_RATIO: 0.2,
            CP0_X_RATIO: 0.5,
            CP0_Y_RATIO: 0.5,
            P1_X_RATIO: 1.0,
            P1_Y_RATIO: 0.4,
            P2_X_RATIO: 1.0,
            P2_Y_RATIO: 0.7,
            CP1_X_RATIO: 0.5,
            CP1_Y_RATIO: 0.8,
            P3_X_RATIO: 0.0,
            P3_Y_RATIO: 0.5,
        },
    },

    /** 環境光點（螢火蟲／孢子／火星）動態參數 */
    MOTES: {
        COUNT: 50,
        SPEED_MOD: 5,
        SPEED_BASE: 1,
        SPEED_MULT: 10,
        Y_SEED: 53,
        X_SEED: 97,
        X_SWING: 50,
        SIZE_FREQ: 2,
        SIZE_BASE: 2,
        ALPHA_MULT: 0.6,
    },

    /** 地平線脈動光暈參數 */
    HORIZON_GLOW: {
        Y_OFFSET: 50,
        PULSE_BASE: 1.0,
        PULSE_FREQ: 0.5,
        PULSE_AMP: 0.1,
        INNER_RADIUS_RATIO: 0.2,
        OUTER_RADIUS_RATIO: 0.8,
        ALPHA: 0.3,
        FILL_Y_RATIO: 0.5,
        FILL_H_RATIO: 0.5,
    },

    /** 極光（ICE）參數 */
    AURORA: {
        /** 極光改在此比例的離屏畫布繪製再放大貼回：全解析度的大面積 screen 填充是 ICE 地圖 p99 尖峰（GPU 端）的來源；極光本身柔和，低解析度看不出差異 */
        RESOLUTION_SCALE: 0.25,
        BANDS: 3,
        /** 極光帶底緣佔畫面高度比例 */
        BASE_HEIGHT_PCT: 0.4,
        /** 輪廓取樣間距（px） */
        SAMPLE_STEP: 50,
        /** 兩組正弦波：振幅（px）、空間頻率、時間係數 */
        WAVE_A: { amp: 50, freq: 0.005 },
        WAVE_B: { amp: 20, freq: 0.02 },
        TIME_SPEED: 0.2,
    },

    /** 秘境古樹光柱（FOREST CANOPY）參數 */
    CANOPY: {
        RAYS_COUNT: 4,
        SWAY_FREQ: 0.2,
        SWAY_AMP: 0.1,
        BASE_ANGLE: 0.6,
        X_START_RATIO: 0.2,
        X_STEP_RATIO: 0.2,
        X_SWAY_FREQ: 0.1,
        X_SWAY_AMP: 50,
        Y_OFFSET: -100,
        ALPHA_BASE: 0.15,
        ALPHA_FREQ: 0.5,
        ALPHA_AMP: 0.05,
        WIDTH: 100,
        HEIGHT_MULT: 1.5,
        DRAW_OFFSET_X: -50,
    },

    /** 地核熱浪（MAGMA HEAT_WAVE）參數 */
    HEAT_HAZE: {
        ALPHA_BASE: 0.2,
        ALPHA_FREQ: 2,
        ALPHA_AMP: 0.05,
        BANDS_ALPHA: 0.05,
        BANDS_COUNT: 5,
        SPEED: 50,
        SPACING: 100,
        RANGE_RATIO: 0.4,
        BAND_HEIGHT: 10,
    },

    /** 環境霧層（FOG）參數 */
    FOG: {
        LAYERS_COUNT: 4,
        SPEED: 25,
        WRAP_PAD: 400,
        WRAP_OFFSET: 200,
        SWAY_FREQ: 0.2,
        SWAY_AMP: 50,
        ALPHA: 0.08,
        DRAW_OFFSET_X: -200,
        DRAW_OFFSET_Y: -100,
        WIDTH: 400,
        HEIGHT: 200,
    },

    /** 沙塵暴（DESERT SANDSTORM）參數 */
    SANDSTORM: {
        WIND_SPEED: 300,
        OVERLAY_ALPHA: 0.2,
        FOG_COUNT: 6,
        FOG_WRAP_PAD: 600,
        FOG_WRAP_OFFSET: 300,
        FOG_HASH: 132,
        FOG_ALPHA: 0.12,
        FOG_WIDTH: 500,
        FOG_HEIGHT: 150,
        MIST_HEIGHT: 200,
        MIST_ALPHA_BASE: 0.4,
        MIST_ALPHA_FREQ: 3,
        MIST_ALPHA_AMP: 0.1,
        STREAKS_COUNT: 30,
        STREAKS_ALPHA: 0.08,
        STREAKS_SPEED_MULT: 2.5,
        STREAKS_SPACING: 153,
        STREAKS_WRAP_PAD: 200,
        STREAKS_WRAP_OFFSET: 100,
        STREAKS_HASH: 21,
        STREAKS_HEIGHT_RATIO: 0.8,
        STREAKS_BASE_RATIO: 0.2,
        STREAKS_DX: 150,
        STREAKS_DY: 5,
    },

    /** 品質階層數量縮減比例（Tier 0, 1, 2, 3） */
    TIERS: {
        MOTES_SCALE: [1.0, 1.0, 0.5, 0.0] as const,
        FOG_SCALE: [1.0, 1.0, 0.5, 0.0] as const,
    },
} as const;

export const ENV_SPRITE = {
  CANVAS_W: 128,          // 障礙物 Sprite canvas 寬度（px）
  CANVAS_H: 160,          // 障礙物 Sprite canvas 高度（px）
  ANCHOR_X: 64,           // 繪圖錨點 X（= CANVAS_W / 2）
  ANCHOR_Y: 140,          // 繪圖錨點 Y（視覺對齊手調值，不等於 CANVAS_H / 2）
  WALL_HEIGHT_MULT: 3.0,  // 牆（WALL）的 BLOCK_HEIGHT 乘數
  PILLAR_HEIGHT_MULT: 4.5,// 柱（OBSIDIAN_PILLAR）的 BLOCK_HEIGHT 乘數
  CRYSTAL_HEIGHT_MULT: 2.5,// 晶體（ICE_CRYSTAL）的 BLOCK_HEIGHT 乘数
  TREE_LAYER_HEIGHT_MULT: 2.0, // 樹葉層高度乘數
  HEX_RADIUS_FULL: 0.9,   // 一般物件使用的 HEX_SIZE 比例
  HEX_RADIUS_PILLAR: 0.7, // 柱體使用的 HEX_SIZE 比例（更細）
  TREE_BASE_RATIO: 0.6,   // 樹冠底部寬度佔 baseWidth 比例
  TREE_RATIO_RANGE: 0.4,  // 樹冠寬度動態範圍
  TREE_LAYER_OVERLAP: 0.7, // 樹葉層縱向疊壓比例
} as const;

/**
 * 障礙物預渲染精靈（VISUAL_ROADMAP O1／O2）：tools/assets/blender/render_obstacle.py → pack_obstacles.py。
 * 錨點與尺寸讀 manifest；圖集未載入時退回 EnvironmentFactory 程序化外觀（ENV_SPRITE）。
 */
export const OBSTACLE_SPRITE = {
  dir: 'assets/obstacles',
  manifestPath: 'assets/obstacles/manifest.json',
  /** 合成畫布像素密度（每 canvas 單位幾 px）；與圖集 pxPerHex／HEX_SIZE 相同，不重取樣 */
  BAKE_SCALE: 2,
  /** 足跡陰影外擴（canvas 單位，含 blur 半徑） */
  SHADOW_PAD: 6,
  /** 循環影格排成一張圖的最大寬度（px） */
  SHEET_MAX_W: 2048,
  /**
   * 障礙物動態（VISUAL_ROADMAP O3）：烘成循環影格表，執行期仍只有一次 drawImage；每格相位依 q,r 雜湊錯開。
   *  - sway：以底部為軸斜切，頂端位移 amp（canvas 單位）
   *  - glint：一顆星芒沿最高晶柱往上滑，週期前 visible 比例可見（靜態本體＋星芒疊層，執行期只改位置與 alpha）
   *  - glow：從精靈取出發光部位（GLOW_KEYS[key]：熔岩橘／虛空紫），加法疊上並帶模糊光暈，亮度 0..amp 脈動（靜態本體＋發光疊層）
   *  只有 sway 烘成整張影格表；glint／glow 若也烘成影格表，熔岩圖 p99 實測多 3～5 ms（每根柱子各取一張大圖）。
   */
  ANIM: {
    TREE: { kind: 'sway', frames: 12, period: 4.5, amp: 3 },
    ICE_CRYSTAL: { kind: 'glint', frames: 16, period: 4, amp: 0.9, visible: 0.4, radius: 6 },
    OBSIDIAN_PILLAR: { kind: 'glow', frames: 12, period: 3, amp: 0.75, blurPx: 3, key: 'EMBER' },
    WALL: { kind: 'glow', frames: 12, period: 4, amp: 0.7, blurPx: 3, key: 'VIOLET' },
  } as Readonly<Record<string, ObstacleAnimConfig>>,
  /**
   * glow 取色：主通道（r 或 b）≥ min、主通道 ≥ g × ratio、另一個通道（b 或 r）≤ maxOther 的像素算發光部位。
   * EMBER＝黑曜柱岩漿裂縫（render_obstacle.py OBSIDIAN_GLOW），VIOLET＝虛空石碑脈絡與符文環（VOID_GLOW）。
   */
  GLOW_KEYS: {
    EMBER: { main: 'r', min: 170, ratio: 1.25, maxOther: 120 },
    VIOLET: { main: 'b', min: 200, ratio: 1.3, maxOther: 255 },
  } as Readonly<Record<'EMBER' | 'VIOLET', { main: 'r' | 'b'; min: number; ratio: number; maxOther: number }>>,
} as const;

export type ObstacleAnimConfig =
  | { kind: 'sway'; frames: number; period: number; amp: number }
  | { kind: 'glint'; frames: number; period: number; amp: number; visible: number; radius: number }
  | { kind: 'glow'; frames: number; period: number; amp: number; blurPx: number; key: 'EMBER' | 'VIOLET' };

export interface TerrainTheme { top: string; sideLight: string; sideDark: string; detail: string; rim: string }

export const TERRAIN_THEMES: Record<string, TerrainTheme> = {
    'VOID':   { top: '#1e293b', sideLight: '#334155', sideDark: '#0f172a', detail: '#6366f1', rim: '#818cf8' }, // Indigo tints
    'FOREST': { top: '#14532d', sideLight: '#166534', sideDark: '#052e16', detail: '#4ade80', rim: '#86efac' }, // Deep Jungle
    'ICE':    { top: '#3b82f6', sideLight: '#2563eb', sideDark: '#1e3a8a', detail: '#bae6fd', rim: '#e0f2fe' }, // Glacial
    'MAGMA':  { top: '#7f1d1d', sideLight: '#991b1b', sideDark: '#450a0a', detail: '#fca5a5', rim: '#f87171' }, // Obsidian/Lava
    'DESERT': { top: '#b45309', sideLight: '#d97706', sideDark: '#78350f', detail: '#fde047', rim: '#fcd34d' }  // Sandstone
};

interface TerrainSkinThemePaths {
    top: string;
    side: string;
}

/** 貼圖細節疊加層：先以光照漸層全強度填底色，再以 blend 混合貼圖（光照決定明暗，貼圖只提供細節） */
interface TerrainDetailLayer {
    blend: 'soft-light' | 'overlay' | 'multiply';
    alpha: number;
}

/** 鄰格高度遮罩（R1 / T2）：崖邊亮邊、接觸陰影、輪廓線 alpha */
interface TerrainEdgeConfig {
    /** 高度差至少達到此值（與 BLOCK_HEIGHT 同單位）才算有落差 */
    minStep: number;
    /** 前側崖邊亮邊：線寬（世界單位）與 alpha，顏色取 theme.rim */
    lip: { width: number; alpha: number };
    /** 背側接觸陰影：寬度＝（邊中點到中心距離）× widthRatio，起點強度 strength，顏色取 sideShadeFloor */
    ao: { widthRatio: number; strength: number };
    /** 平接邊（遮罩 bit = 0）的頂面輪廓線 alpha */
    flatRimAlpha: number;
    /** 有落差邊（遮罩 bit = 1）的頂面輪廓線 alpha */
    cliffRimAlpha: number;
}

/** 島嶼底座輪廓（依地形 type）：外露格的側面往下延伸到此深度（世界單位，自地面基準 y 起算） */
interface TerrainFoundationProfile {
    /** 外露格延伸後的最淺／最深底端深度；實際深度不小於舊基座深度 */
    minDepth: number;
    maxDepth: number;
    /** true = 每個前側面底端中點下垂成尖角（漂浮島鐘乳岩）；false = 平底土台 */
    tips: boolean;
    /** 尖角時，面兩端頂點的延伸比例（0 = 停在舊基座、1 = 與尖角同深） */
    shoulder: number;
    /** 延伸段底端加暗的 alpha（顏色 sideShadeFloor；漸層只在烘焙時建立） */
    bottomShade: number;
}

/** 島嶼底座：只加深「前側有邊外露（鄰格不存在）」的格，其餘格維持舊基座，烘進既有地形 sprite */
interface TerrainFoundationConfig {
    /** 深度量化級數：GridCache 對外露格寫 1..levels，0 = 非外露格（舊基座）；sprite 快取鍵只有 4 bit，上限 15 */
    levels: number;
    /** 中央深、兩端淺的鐘形：bell = (1 - t²)^bellPower，t = 格中心離島中心的水平距離 ÷ 半寬 */
    bellPower: number;
    /** 半寬外加的餘裕（世界單位），讓最外側外露格仍保留少許深度 */
    halfWidthMargin: number;
    /** 每格固定雜訊在深度比例中的占比（0～1），打散底緣成不規則岩塊 */
    jitter: number;
    /** 雜訊種子（與材質變體的種子錯開，避免深度與貼圖變體同步） */
    noiseSeed: number;
    /** 尖角深度倍率表：第 i 個前側面取 tipScales[(i + variant) % length]，讓同一欄的尖角長短不一 */
    tipScales: readonly number[];
    /** 依地形 type 的輪廓；未列出的 type 用 defaultProfile */
    profiles: Record<string, TerrainFoundationProfile>;
    defaultProfile: TerrainFoundationProfile;
}

export interface TerrainSkinConfig {
    texturePxPerHex: number;
    sideTexturePxPerUnit: number;
    /** @deprecated R1 起不再影響畫面（光照改為全強度、貼圖改為 topDetail／sideDetail 混合）。 */
    tintStrength: number;
    /** 頂面貼圖細節層 */
    topDetail: TerrainDetailLayer;
    /** 側面貼圖細節層 */
    sideDetail: TerrainDetailLayer;
    /** 暗側面漸層的底端色（亮側面底端取 theme.sideDark） */
    sideShadeFloor: string;
    /** 鄰格高度遮罩的烘焙參數 */
    edge: TerrainEdgeConfig;
    /** 島嶼底座（外露格的不規則底緣） */
    foundation: TerrainFoundationConfig;
    variantOffsets: readonly { x: number; y: number }[];
    themes: Record<string, TerrainSkinThemePaths>;
    /**
     * 群系曝光（地形 T0 亮度預算，docs/VISUAL_ROADMAP.md §C）：整塊地塊（頂面＋側面）在烘焙最後乘上這個增益，
     * 側面與頂面的明暗比例不變。目標是讓每張地圖頂面中心平均亮度（Rec.709 luma，0～255）落在 lumaBudget 內：
     * 太亮（ICE、DESERT）時 lighter 疊加的特效會飽和成白；太暗（VOID）時畫面只剩網格線在撐。
     * 量測與驗收：node tools/ui-e2e/terrain-contrast.mjs（acceptance 會檢查 lumaBudget）。未列的群系為 1。
     */
    exposure: Readonly<Record<string, number>>;
    lumaBudget: { readonly min: number; readonly max: number };
}

export const TERRAIN_SKIN: TerrainSkinConfig = {
    texturePxPerHex: 96,
    sideTexturePxPerUnit: 1.0,
    tintStrength: 0.35,
    topDetail: { blend: 'overlay', alpha: 0.5 },
    sideDetail: { blend: 'overlay', alpha: 0.5 },
    sideShadeFloor: '#020617',
    edge: {
        minStep: BLOCK_HEIGHT,
        // 2026-10-19 T3：落差邊描邊降低對比（原 lip 0.85／cliffRim 0.7，螢光描邊太搶眼）；選取／射程／預警另有高對比樣式
        lip: { width: 1.5, alpha: 0.6 },
        ao: { widthRatio: 0.35, strength: 0.55 },
        flatRimAlpha: 0.22,
        cliffRimAlpha: 0.45,
    },
    // 2026-10-18 量測（貼圖路徑頂面中心 luma）：VOID 29、FOREST 53、MAGMA 46、ICE 128、DESERT 104
    exposure: { VOID: 1.65, FOREST: 1.18, MAGMA: 1.12, ICE: 0.67, DESERT: 0.81 },
    lumaBudget: { min: 45, max: 90 },
    foundation: {
        levels: 15,
        bellPower: 1,
        halfWidthMargin: HEX_SIZE,
        jitter: 0.05,
        noiseSeed: 7919,
        tipScales: [1, 0.78, 0.9, 0.66] as const,
        profiles: {
            VOID: { minDepth: 60, maxDepth: 120, tips: false, shoulder: 1, bottomShade: 0.55 },
            MAGMA: { minDepth: 60, maxDepth: 120, tips: false, shoulder: 1, bottomShade: 0.45 },
        },
        defaultProfile: { minDepth: 55, maxDepth: 100, tips: false, shoulder: 1, bottomShade: 0.5 },
    },
    variantOffsets: [
        { x: 0, y: 0 },
        { x: 128, y: 64 },
        { x: 256, y: 128 },
        { x: 384, y: 192 },
    ] as const,
    themes: {
        VOID: { top: 'assets/terrain/void_top.webp', side: 'assets/terrain/void_side.webp' },
        FOREST: { top: 'assets/terrain/forest_top.webp', side: 'assets/terrain/forest_side.webp' },
        ICE: { top: 'assets/terrain/ice_top.webp', side: 'assets/terrain/ice_side.webp' },
        MAGMA: { top: 'assets/terrain/magma_top.webp', side: 'assets/terrain/magma_side.webp' },
        DESERT: { top: 'assets/terrain/desert_top.webp', side: 'assets/terrain/desert_side.webp' },
    },
};

export interface ObstacleStyle { main: string; light: string; dark: string; detail: string; highlight: string; sideLight?: string; sideDark?: string }

export const OBSTACLE_STYLES: Record<string, ObstacleStyle> = {
    'WALL': { main: '#475569', light: '#64748b', dark: '#334155', detail: '#94a3b8', highlight: '#cbd5e1' },
    'TREE': { main: '#3f6212', light: '#4d7c0f', dark: '#1a2e05', detail: '#84cc16', highlight: '#bef264' },
    'ICE_CRYSTAL': { main: '#7dd3fc', light: '#bae6fd', dark: '#0ea5e9', detail: '#e0f2fe', highlight: '#ffffff' },
    'OBSIDIAN_PILLAR': { main: '#18181b', light: '#27272a', dark: '#09090b', detail: '#ef4444', highlight: '#fca5a5' },
    'SANDSTONE': { main: '#b45309', light: '#d97706', dark: '#92400e', detail: '#f59e0b', highlight: '#fde047' }
};
