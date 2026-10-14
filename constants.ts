
import { Team, HexLayout, ZoneConfig } from './types';

export const DEFAULT_HEX_LAYOUT: HexLayout = 'FLAT';
export const DEFAULT_ZONE_CONFIG: ZoneConfig = {
    enabled: true,
    initialRadius: 12,
    shrinkInterval: 10,
    minRadius: 1
};
export const HEX_SIZE = 48;
export const BLOCK_HEIGHT = 24;
export const BASE_HEIGHT = 4;
export const MAX_TERRAIN_TIER = 6;
export const ISO_SCALE_Y = 0.5;
export const ISO_ANGLE = 0;
export const TERRAIN_SORT_SCALE = 0.7;
export const UNIT_VISUAL_HEIGHT = 100;
export const UNIT_BODY_OFFSET = 36;
export const UNIT_HOVER_OFFSET = 6;
export const UNIT_SCALE = 0.65;

/** 單位模型視覺中心距地板的 Z 偏移（像素）。
 *  對應 Sprite 高度的約 50%。依美術 Sprite 尺寸調整。 */
export const AGENT_MODEL_CENTER_Z = 64;

export const VISUAL_ANCHORS = {
    HEAD_OFFSET_Y: 50,
    ENGINE_OFFSET_Y: 15,
    HITBOX_RADIUS: 18,
    HEAD_OFFSET: 60,
    CENTER_OFFSET: 30
};

export const HUD_PADDING = 10;
export const STATUS_ICON_OFFSET = 120;
export const HUD_BAR_OFFSET = 150;
export const HUD_TEXT_OFFSET = HUD_BAR_OFFSET + 30;

export const MAX_ARC_HEIGHT = 150;

// SSOT: Element Colors for DoT and Effects
export const DOT_COLORS: Record<string, string> = {
    FIRE: '#f97316',
    POISON: '#10b981',
    VOID: '#a855f7',
    ICE: '#3b82f6',
    COVENANT: '#ef4444',
    IMPERIAL: '#3b82f6'
};

// SSOT: Floating Combat Text Colors
export const DAMAGE_TEXT_COLORS = {
    DASH: '#60a5fa',
    MISS: '#9ca3af',
    BLOCK: '#fb923c',
    ABSORB: '#bae6fd',
    HEAL: '#86efac',
    CRIT: '#ef4444',
    VAMP: '#be123c',
    MANA_BURN: '#8b5cf6',
    MANA_RESTORE: '#60a5fa',
    RECOIL: '#ef4444'
};

// SSOT: HUD Layout Constants
export const HUD_LAYOUT = {
    CAST_BAR_X_OFFSET: 55,
    CAST_BAR_Y_OFFSET_NORMAL: 10,
    CAST_BAR_Y_OFFSET_ULT: 30,
    DAMAGE_TEXT_SCATTER: 10,
    STATUS_TEXT_OFFSET_X: -45
};

// SSOT: HUD and Bar Visual Colors
export const HUD_COLORS = {
    CONTAINER_BG: 'rgba(2, 6, 23, 0.85)',
    CONTAINER_BORDER: 'rgba(255, 255, 255, 0.2)',
    SLOT_BG: '#1e293b',
    HP: {
        [Team.BLUE]: {
            top: '#22d3ee',
            bottom: '#0284c7',
            glow: 'rgba(6, 182, 212, 0.5)',
            border: '#3b82f6'
        },
        [Team.RED]: {
            top: '#f87171',
            bottom: '#dc2626',
            glow: 'rgba(220, 38, 38, 0.5)',
            border: '#ef4444'
        }
    },
    SHIELD: {
        top: '#ffffff',
        bottom: '#cbd5e1',
        glow: '#ffffff',
        seam: 'rgba(0, 0, 0, 0.5)',
        outline: '#ffffff'
    },
    MP: {
        top: '#a78bfa',
        bottom: '#7c3aed',
        glow: 'rgba(139, 92, 246, 0.4)'
    },
    CAST: {
        bg: 'rgba(0, 0, 0, 0.5)',
        border: 'rgba(255, 255, 255, 0.3)',
        defaultColor: '#ffffff'
    },
    CC_BAR: {
        bg: 'rgba(0, 0, 0, 0.6)',
        border: 'rgba(255, 255, 255, 0.2)',
        text: '#ffffff'
    },
    GLOSS_HIGHLIGHT: 'rgba(255, 255, 255, 0.3)'
};

// SSOT: Floating Text Effect Colors
export const TEXT_PAINTER_COLORS = {
    STROKE_SHADOW: 'rgba(0, 0, 0, 0.8)',
    KILL_STREAK_STROKE: '#000000',
    WHITE: '#ffffff',
    GLITCH_RED: '#ff0000',
    GLITCH_CYAN: '#00ffff',
    GLITCH_FRAME: '#ef4444',
    TECH_BG: 'rgba(15, 23, 42, 0.4)',
    GRAD_TRANSPARENT: 'rgba(255, 255, 255, 0)'
};

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

export const KILL_STREAK_WINDOW = 5.0;

export const PHYSICS = {
    GRAVITY: 3500,
    SAFE_FALL_VELOCITY: 1000,
    FATAL_FALL_VELOCITY: 3000,
    FALL_DAMAGE_MIN: 200,
    STIFFNESS_ALIVE: 150,
    DAMPING_ALIVE: 25,
    DRIFT_SPEED: 25.0, 
    TERMINAL_VELOCITY_IMPULSE: 400,
    DEFAULT_DRAG: 0.94,
    VISUAL_JUMP_DASH: 250,
    VISUAL_JUMP_KNOCKBACK: 200,
};

export const VFX_RENDER = {
    GROUND_SORT_BIAS:   15,  // ground-locked 粒子的 Y 軸排序偏移
    GROUND_Z_BIAS:       5,  // ground-locked 粒子的 Z 軸偏移
    GROUND_VISUAL_BIAS:  2,  // 防 Z-fighting 的視覺偏移
    PARTICLE_SIZE_BIAS: 0.5, // 碰地計算的粒子半徑比例
    TRAIL_STEP_DIST:    20,  // Trail 採樣的目標點間距（螢幕像素）
};

// SSOT: VFX Thresholds
export const VFX_PARAM = {
    SPEED_TRAIL_THRESHOLD_SQ: 1000,
    SPEED_TILT_THRESHOLD: 300,
    SPEED_MAX_TILT_REF: 800,
    SHAKE_INTENSITY_DASH: 0.4,
    SHAKE_INTENSITY_KNOCKBACK: 0.35,
    FX_KNOCKBACK_DUST_THRESHOLD_SQ: 80000,

    // ── Particle Budget ──────────────────────────────────────────
    /** 全域粒子硬上限。超過時 VFXPlayer 直接 skip spawn。*/
    MAX_PARTICLES: 450,
    /** Pool 回收上限。超過直接丟棄，避免 pool 無限膨脹。*/
    MAX_POOL_SIZE: 350,
    /** 每格 Hazard Field 最多存活的 locked 粒子數量。*/
    HAZARD_FIELD_MAX_PER_CELL: 2,
    /** Idle VFX cull 距離平方（300px²）。超出不生成 idle 粒子。*/
    IDLE_VFX_CULL_DIST_SQ: 90000,
    /** Idle VFX 剔除中心 = 地圖寬/高（格數）× 此值。原程式讀取不存在的 engine.camera，恆走此 fallback；刻意保留以維持行為。*/
    IDLE_VFX_CULL_CENTER_PER_TILE: 40,
};

/**
 * 特效預算與自適應 LOD 降級治理器參數 SSOT
 */
export const VFX_BUDGET = {
    /** 總開關：關閉時行為與改動前 100% 逐像素一致 */
    enabled: true,
    /** 全域粒子軟預算上限：超過此數量時開始對非關鍵特效啟動降級 */
    SOFT_PARTICLE_BUDGET: 240,
    /** 全域粒子硬上限：超過此數量時阻止非關鍵特效生成 */
    HARD_PARTICLE_BUDGET: 380,
    /** 各品質階層粒子發射係數 [Tier 0, Tier 1, Tier 2, Tier 3] */
    TIER_EMISSION_RATIOS: [1.0, 0.75, 0.5, 0.35] as const,
    /** 次要粒子類型集合（高負載或低階品質時優先縮減/跳過發射） */
    SECONDARY_TYPES: ['DUST', 'SMOKE', 'SPARK', 'SPEED_LINE', 'GENERIC_DEBUG'] as const,
    /** 關鍵回饋粒子類型集合（傷害/死亡/終極技能，全額優先保留） */
    CRITICAL_TYPES: ['BLAST', 'DEATH_RAY', 'BEAM', 'HEX_BEAM', 'PILLAR', 'SHOCKWAVE'] as const,
    /** UnitShatter 金屬碎屑數量（一般戰鬥 12；高負載或降階時縮減為 4） */
    SHATTER_SHARDS_NORMAL: 12,
    SHATTER_SHARDS_REDUCED: 4,
    /** UnitShatter 碎片存活時間秒數（一般戰鬥 4.0~5.0s；高負載或降階時收緊為 2.0s） */
    SHATTER_LIFETIME_NORMAL: 4.5,
    SHATTER_LIFETIME_REDUCED: 2.0,
    /** 聖約陣營死亡血噴粒子數（一般 / 高負載） */
    SHATTER_BLOOD_NORMAL: 18,
    SHATTER_BLOOD_REDUCED: 6,
} as const;

export const THEME_IMPERIAL = {
    primary: '#3b82f6',
    secondary: '#fde047',
    armorLight: '#f1f5f9',
    armorDark: '#1e3a8a',
    energy: '#60a5fa',
    cape: 'rgba(30, 58, 138, 0.9)'
};

export const THEME_COVENANT = {
    primary: '#ef4444',
    secondary: '#fb923c',
    armorDark: '#09090b',
    armorBase: '#27272a',
    accent: '#7f1d1d',
    spike: '#18181b'
};

export const TEAM_COLORS = {
    [Team.BLUE]: {
        primary: THEME_IMPERIAL.primary,
        secondary: THEME_IMPERIAL.secondary,
        glow: 'rgba(59, 130, 246, 0.6)',
        armorLight: THEME_IMPERIAL.armorLight,
        borderRadius: '1rem',
    },
    [Team.RED]: {
        primary: THEME_COVENANT.primary,
        secondary: THEME_COVENANT.secondary,
        glow: 'rgba(239, 68, 68, 0.6)',
        armorLight: '#fca5a5',
        borderRadius: '0.25rem',
    },
} as const;

export const LOG_COLORS = {
    MOVE: '#38bdf8',
    CAST: '#fbbf24',
    HIT: '#f87171',
    HEAL: '#4ade80',
    DECISION: '#c084fc',
    DEATH: '#94a3b8',
    CC: '#facc15',
    SYSTEM: '#64748b',
    HAZARD: '#fb923c'
};

export const PALETTE = {
    UI_BG: '#020617',
    UI_BORDER: '#1e293b',
    SHADOW: 'rgba(0, 0, 0, 0.6)',
    TEAMS: {
        [Team.BLUE]: { main: '#2563eb', dark: '#1e3a8a', light: '#fbbf24', glow: 'rgba(59, 130, 246, 0.8)', accent: '#f8fafc' },
        [Team.RED]: { main: '#dc2626', dark: '#450a0a', light: '#fca5a5', glow: 'rgba(220, 38, 38, 0.8)', accent: '#2d0a0a' }
    },
    DAMAGE: '#ffffff',
    HEAL: '#10b981',
    CRIT: '#ef4444',
    MAGIC: '#8b5cf6'
};

export const COMBAT_Param = { // Deprecated alias, keeping for compatibility if needed, but prefer COMBAT_PARAM below
    HIT_IMPULSE_MAX: 600
};

export const COMBAT_PARAM = {
    HIT_IMPULSE_MAX: 600,
    HIT_IMPULSE_MIN: 150,
    HIT_MEDIUM_THRESHOLD: 150,
    HIT_HEAVY_THRESHOLD: 400,
    DR_RESET_TIME: 10.0,
    /** 硬控基礎韌性（0 = 無減免）。尚無資料來源（單位/裝備皆未定義），日後接 UNIT_DB 時由此擴充。*/
    BASE_CC_RESILIENCE: 0,
    EXECUTE_THRESHOLD: 0.25,
    BASE_EXECUTE_MULTIPLIER: 2.0,
    BASE_VAMP_PCT: 0.35,
    MANA_BURN_DEFAULT: 25,
    MANA_RESTORE_DEFAULT: 25,
    GRAVITY_PULL_FORCE: 150,
    GRAVITY_MIN_DIST: 5,
    GRAVITY_SPEED_REDUCTION: 0.3,
    ICE_SPEED_REDUCTION: 0.5,
    HIT_FLASH_DURATION: 0.1,
    AI_CD_TOLERANCE: 0.01,
    AI_PERCEPTION_BONUS_ULT: 5,
    AI_PERCEPTION_BONUS_NORMAL: 2,
    MOVE_SPEED_ULT: 1.3,
    MOVE_SPEED_NORMAL: 1.0,
    CHASE_SPEED_ULT: 1.4,
    CHASE_SPEED_NORMAL: 1.1,
    HIT_FX_OFFSET: 8
};

export const SCREEN_CONSTANTS = {
    DEFAULT_WIDTH: 1200,
    DEFAULT_HEIGHT: 675,
    DEFAULT_ASPECT: 1.77
};

export const AGENT_CONSTANTS = {
    DEFAULT_AI_UPDATE_INTERVAL: 0.08,
    AI_UPDATE_INTERVAL_JITTER: 0.02,
    DEATH_ANIM_DURATION: 5.5,
    AI_IDLE_WATCHDOG_SEC: 6.0,
    /** RagdollBone.color 佔位色。UnitDeathPainter 渲染時以 appearance profile.primaryColor 覆蓋（SSOT），此值僅滿足型別。*/
    RAGDOLL_BONE_PLACEHOLDER_COLOR: '#ffffff',
    AI_UPDATE_INTERVAL_BY_ROLE: {
        TANK: 0.08,
        WARRIOR: 0.06,
        RANGER: 0.07,
        MAGE: 0.08,
        SUPPORT: 0.10
    }
};


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

export interface TerrainTheme { top: string; sideLight: string; sideDark: string; detail: string; rim: string }

export const TERRAIN_THEMES: Record<string, TerrainTheme> = {
    'VOID':   { top: '#1e293b', sideLight: '#334155', sideDark: '#0f172a', detail: '#6366f1', rim: '#818cf8' }, // Indigo tints
    'FOREST': { top: '#14532d', sideLight: '#166534', sideDark: '#052e16', detail: '#4ade80', rim: '#86efac' }, // Deep Jungle
    'ICE':    { top: '#3b82f6', sideLight: '#2563eb', sideDark: '#1e3a8a', detail: '#bae6fd', rim: '#e0f2fe' }, // Glacial
    'MAGMA':  { top: '#7f1d1d', sideLight: '#991b1b', sideDark: '#450a0a', detail: '#fca5a5', rim: '#f87171' }, // Obsidian/Lava
    'DESERT': { top: '#b45309', sideLight: '#d97706', sideDark: '#78350f', detail: '#fde047', rim: '#fcd34d' }  // Sandstone
};

export interface TerrainSkinThemePaths {
    top: string;
    side: string;
}

export interface TerrainSkinConfig {
    texturePxPerHex: number;
    sideTexturePxPerUnit: number;
    tintStrength: number;
    variantOffsets: readonly { x: number; y: number }[];
    themes: Record<string, TerrainSkinThemePaths>;
}

export const TERRAIN_SKIN: TerrainSkinConfig = {
    texturePxPerHex: 96,
    sideTexturePxPerUnit: 1.0,
    tintStrength: 0.35,
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

// ══════════════════════════════════════════════════════════════
// 2.5D Unit Sprite & Fantasy HD Art Configuration (SSOT)
// ══════════════════════════════════════════════════════════════

/** 護盾稜柱：height 為圖集未就緒時的預設高度；實際高度＝角色頭頂高度＋headMargin（見 ShieldPainter） */
export const SHIELD_VISUAL = {
    height: 80,
    radius: 38,
    headMargin: 8,
} as const;

export const UNIT_SPRITE = {
    targetHeightCanvasUnits: 59,
    referenceHeightPx: 158.3,
    footOffsetLocal: (UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET) / UNIT_SCALE,
    facingHysteresisMs: 120,
    hitFlashDuration: 0.15,
    deathFadeDuration: 1.2,
    deathSinkDistance: 12,
    mipLevels: [1.0, 0.5, 0.25] as const,
    silhouetteAlpha: 0.25,
    shadowScale: 1.0,
    idleFps: 6,
    walkFps: 10,
    attackFps: 12,
    castFps: 10,
    hitFps: 12,
    deathFps: 8,
    manifestPath: 'assets/units/manifest.json',
} as const;

// ══════════════════════════════════════════════════════════════
// VFX Particle Sprites (SSOT)
// ══════════════════════════════════════════════════════════════

export interface VfxSpritesConfig {
    tintSizes: readonly number[];
    colorQuantBits: number;
    maxTintCache: number;
    textures: {
        light: string;
        spark: string;
        smoke: string;
        magic: string;
        star: string;
    };
}

export const VFX_SPRITES: VfxSpritesConfig = {
    tintSizes: [32, 64, 128, 256] as const,
    colorQuantBits: 4,
    maxTintCache: 128,
    textures: {
        light: 'assets/vfx/light_01.png',
        spark: 'assets/vfx/spark_01.png',
        smoke: 'assets/vfx/smoke_01.png',
        magic: 'assets/vfx/magic_01.png',
        star: 'assets/vfx/star_01.png',
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

export const VFX_GROUND_TYPES = new Set([
    'SHOCKWAVE', 'RING', 'BLAST', 'CRACKS', 'GRID_FIELD',
    'MAGIC_CIRCLE', 'HEX_GLOW', 'PILLAR', 'DOMAIN', 'BLACK_HOLE',
    'GIANT_HEX', 'HEX_BEAM'
]);

// ══════════════════════════════════════════════════════════════
// UI Window & Layout Constants (SSOT)
// ══════════════════════════════════════════════════════════════

export const UI_WINDOW = {
    STORAGE_KEY: 'tacticalWindowsV1',
    SAVE_DEBOUNCE_MS: 300,
    HANDLE_PX: 8,
    HANDLE_PX_COARSE: 44,
    TOUCH_TARGET_MIN_PX: 44,
    MAXIMIZE_MARGIN: 12,
    MIN_WIDTH: 260,
    MIN_HEIGHT: 160,
    BOTTOM_SHEET_MAX_HEIGHT_VH: 72,
    MOBILE_BREAKPOINT: 900,
    SHEET_BREAKPOINT: 900,
    SHEET_MAX_VH: 72,
    /** Corner handle edge length = edge thickness * this factor. */
    HANDLE_CORNER_FACTOR: 2,
    /** Resize handles sit above window content (z-order inside the window's own stacking context). */
    HANDLE_Z_INDEX: 100,
    /** Used only when a window has neither saved state nor a registered definition. */
    FALLBACK_RECT: { x: 100, y: 100, width: 400, height: 300 },
    /** Used only when `window` is unavailable (SSR / tests). */
    FALLBACK_VIEWPORT: { width: 1200, height: 800 },
} as const;

export const UI_Z = {
    INSPECTOR: 30,
    WINDOW_BASE: 40,
    OVERLAY: 50,
    MENU_BACKDROP: 55,
    MENU: 60,
    OVERLAY_CONTROLS: 60,
    WINDOW_MAX: 80,
    TOP_OVERLAY: 90,
} as const;

/**
 * UI ??Engine tunable ranges (SSOT). Shared by UICommandSystem (clamping),
 * the renderer (camera tuning) and the settings schema / sliders.
 */
export const UI_SETTINGS = {
    SNAPSHOT_HZ: 10,
    ZONE_INITIAL_RADIUS: { min: 3, max: 20, default: 8, step: 1 },
    ZONE_SHRINK_INTERVAL: { min: 1, max: 60, default: 15, step: 1 },
    ZONE_MIN_RADIUS: { min: 0, max: 10, default: 1, step: 1 },
    CAMERA_STIFFNESS: { min: 0.1, max: 20, followDefault: 0.25, zoomDefault: 0.2, step: 0.1, sliderMax: 5.0 },
    TIME_SCALE: { min: 0.1, max: 5.0, default: 1.0, step: 0.1 },
    MATRIX_SPEED: { min: 0.1, max: 5.0, step: 0.1 },
    MATRIX_GAP: { min: 0, max: 1.0, step: 0.05 },
    MAP_WIDTH: { min: 6, max: 24, default: 12, step: 1 },
    MAP_HEIGHT: { min: 6, max: 24, default: 8, step: 1 },
} as const;

/**
 * Pinned toolbar parameters and storage keys (SSOT).
 */
export const UI_PIN = {
    FALLBACK_VIEWPORT: { w: 1920, h: 1080 },
    FALLBACK_SIZE: { w: 200, h: 60 },
    STORAGE_KEYS: {
        mapEditor: 'tactical_toolbar_map_editor',
        playback: 'tactical_toolbar_playback',
    },
} as const;

/**
 * 渲染效能診斷與量測參數 SSOT。
 */
export const RENDER_PERF = {
    QUERY_KEY: 'perf',
    OPS_QUERY_KEY: 'perfops',
    EMA_ALPHA: 0.1,
    HISTORY_FRAMES: 60,
    HISTORY_WINDOW_MS: 2000,
    SPIKE_THRESHOLD_MS: 16.7,
    SPIKE_RING_SIZE: 64,
    PHASES: ['background', 'world', 'post', 'overlay+hud'] as const,
} as const;

/**
 * 地形 Sprite 快取與量化參數 SSOT。
 */
export const RENDER_CACHE = {
    SCALE_STEPS: [1, 1.5, 2, 3, 4] as const,
    MAX_TERRAIN_SPRITES: 2048,
    FLOAT_STEP: 0.5,
    HEIGHT_KEY_SCALE: 2,
    SPRITE_PADDING: 4,
    LIQUID_TIME_STEP: 0.05,
    LIQUID_CACHE_SLOTS: 8,
    /** 地形 sprite 烘焙預算：每個時間窗內累計烘焙超過此毫秒數，其餘未命中改借用相鄰縮放級距的 sprite */
    BAKE_BUDGET_MS: 4,
    BAKE_WINDOW_MS: 16,
} as const;

/**
 * 渲染解析度與自適應品質調度參數 SSOT。
 */
export const RENDER_QUALITY = {
    MAX_DPR: 2,
    DEFAULT_DPR: 1,
    IGNORE_FRAME_MS: 250,
    /** 降階門檻：幀間隔平均 > 14ms（約 < 70 FPS）持續 DOWN_HOLD_S 才降階；一般 100+ FPS 遊玩不得降畫質（僅應付真正的瞬間掉幀） */
    DOWN_MS: 14,
    DOWN_HOLD_S: 2,
    /** 升階門檻：主執行緒耗時 < 9ms（與 vsync 無關的工作時間） */
    UP_MS: 9,
    UP_HOLD_S: 12,
    COOLDOWN_S: 15,
    /** Frames during the first seconds are ignored (JIT warm-up, sprite baking). */
    STARTUP_GRACE_S: 5,
    /** Max exponent of the upgrade-cooldown doubling after an upgrade is immediately undone. */
    MAX_UP_BACKOFF: 4,
    WINDOW_FRAMES: 60,
    TIER_SCALES: [1.0, 1.0, 0.75, 0.5] as const,
    QUERY_KEY: 'quality',
    MATRIX_RAIN_TIER_0_SCALE: 1.0,
    MATRIX_RAIN_TIER_1_SCALE: 1.0,
    MATRIX_RAIN_TIER_0_HZ: 60,
    MATRIX_RAIN_TIER_1_HZ: 30,
    GLOW_SPRITES: true,
    GLOW_QUERY_KEY: 'glow',
} as const;

/**
 * 光暈 Sprite 快取與量化參數 SSOT
 */
export const RENDER_GLOW = {
    MAX_GLOW_SPRITES: 256,
    RADIUS_STEPS: [4, 8, 12, 16, 24, 32, 48, 64] as const,
    BLUR_STEPS: [2, 4, 8, 12, 16, 24, 32] as const,
    RECT_WIDTH_STEPS: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
        31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 52, 56,
        64, 80, 96, 128, 180, 240
    ] as const,
    RECT_HEIGHT_STEPS: [4, 8, 12, 16, 24] as const,
} as const;

/**
 * 音訊系統參數 SSOT
 */
export const AUDIO = {
    MAX_VOICES: 24,
    CUE_THROTTLE_MS: 50,
    DEFAULT_MASTER_VOLUME: 0.8,
    DEFAULT_MUSIC_VOLUME: 0.6,
    DEFAULT_SFX_VOLUME: 0.8,
    DEFAULT_UI_VOLUME: 0.7,
    PAN_RANGE: 0.8,
    PITCH_JITTER: 0.08,
    VOLUME_JITTER: 0.05,
    PRNG_SEED: 133742,
    BGM_CROSSFADE_SEC: 1.5,
    PRELOAD_BATCH_SIZE: 8,
    SHOWCASE_SFX_GAIN: 0.2,
    STORAGE_KEY: 'tactical_audio_settings',
    QUERY_MUTE_KEY: 'mute',
    VOLUME_CURVE_EXPONENT: 2,
    SAMPLE_RATE: 44100
} as const;




