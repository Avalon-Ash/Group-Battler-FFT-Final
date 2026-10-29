// ╔══════════════════════════════════════════════════════════╗
// ║  constants/ui.ts — UI 視窗、層級、設定與釘選工具列常數 SSOT ║
// ║  職責：定義畫面預設尺寸、視窗佈局、Z 軸層級、調諧範圍與釘選 ║
// ╚══════════════════════════════════════════════════════════╝

export const SCREEN_CONSTANTS = {
    DEFAULT_WIDTH: 1200,
    DEFAULT_HEIGHT: 675,
    DEFAULT_ASPECT: 1.77
};

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
    /** 展示模式標題卡與背景：在視窗層之下，展示模式開的設定／音訊等視窗才不會被標題卡蓋住 */
    SHOWCASE: 35,
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
    /** 2026-10-28：手動倍率與導播子範圍、輸入步幅共用 SSOT。100px 或一格滾輪 = 1.15 倍。 */
    CAMERA_ZOOM: {"min":0.4,"max":3,"directorMin":0.45,"directorMax":1.6,"wheelFactor":1.15,"wheelPixels":100,"linePixels":16,"pagePixels":800,"manualStiffness":18,"doubleTapMs":300,"tapMaxMs":250,"tapDistance":24},
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
    /** 地圖編輯工具列離畫面頂端（與左右）的邊距；手機尺寸要讓開右上角的系統選單鈕（top-3＋48px＋間隔） */
    TOOLBAR_MARGIN: 40,
    TOOLBAR_MARGIN_COMPACT: 68,
    FALLBACK_VIEWPORT: { w: 1920, h: 1080 },
    FALLBACK_SIZE: { w: 200, h: 60 },
    STORAGE_KEYS: {
        mapEditor: 'tactical_toolbar_map_editor',
        playback: 'tactical_toolbar_playback',
    },
} as const;

/** 具名參數：保持原值與運算次序。 */
export const GAME_APP_PARAM = {
    /** 編輯器預設生命（HP） */
    DEFAULT_HP: 600,
    /** 編輯器預設地圖寬（格） */
    DEFAULT_MAP_W: 12,
    /** 編輯器預設地圖高（格） */
    DEFAULT_MAP_H: 8,
    /** 自動配置每隊人數（人） */
    TEAM_SIZE: 5,
    /** 自動配置生命下限（HP） */
    SPAWN_HP_MIN: 600,
    /** 自動配置生命隨機幅度（HP） */
    SPAWN_HP_RANGE: 400,
    /** 展示地圖寬下限（格） */
    SHOWCASE_MIN_W: 10,
    /** 展示地圖高下限（格） */
    SHOWCASE_MIN_H: 8,
    /** 展示地圖尺寸隨機幅度（格） */
    SHOWCASE_SIZE_RANGE: 4,
    /** 展示進場時間（毫秒） */
    TRANSITION_IN_MS: 1500,
    /**
     * 進場提前定格的毫秒數：轉場進度 T 在 TRANSITION_IN_MS − 此值就走到 1（暗角、色差、落地位移同時歸零），
     * 之後到 React 計時器切 IDLE 之間畫面不再變動，所以邊界那一幀沒有色階跳變（RenderPipeline.update）。
     */
    TRANSITION_IN_SETTLE_MS: 150,
    /** 展示退場時間（毫秒） */
    TRANSITION_OUT_MS: 1200,
    /** 退場時轉場進度 T 每秒前進量（退場在 T 走完前就被計時器切走，這是退場畫面的節奏） */
    TRANSITION_OUT_SPEED: 0.5,
    /** 進場後換隊：切 IDLE 之後至少再等幾個畫面才生成單位（避開邊界幀） */
    SPAWN_AFTER_IDLE_FRAMES: 3,
    /** 進場後換隊：等新陣容圖集載好的最長毫秒數，逾時照樣生成（圖集會邊載邊出現） */
    SPAWN_ATLAS_WAIT_MAX_MS: 2500,
    /** 展示結算停留時間（毫秒） */
    RESULT_HOLD_MS: 2000,
    /** 單位數更新間隔（毫秒） */
    UNIT_POLL_MS: 500,
    /** 陣營警告顯示時間（毫秒） */
    WARNING_MS: 2500,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const MATRIX_RAIN_PARAM = {
    /** 離畫面邊界的清除餘量（px） */
    END_MARGIN_PX: 100,
    /** 生成點離邊界字高數（字高） */
    SPAWN_MARGIN_FONTS: 5,
    /** 允許生成時每幀生成機率（比例） */
    SPAWN_PROBABILITY: 0.1,
    /** 深度不透明度下限（比例） */
    MIN_DEPTH_ALPHA: 0.2,
    /** 深度不透明度偏移（比例） */
    DEPTH_ALPHA_OFFSET: 0.2,
    /** 頭字啟用光暈深度門檻（比值） */
    GLOW_DEPTH: 0.8,
    /** 頭字光暈模糊基準（px） */
    GLOW_BLUR_PX: 5,
    /** 幀節流容差（毫秒） */
    FRAME_SLACK_MS: 4,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const BT_VIEW_PARAM = {
    /** 行為樹初始縮放（倍） */
    DEFAULT_SCALE: 0.9,
    /** 自動縮放可用寬度（比例） */
    FIT_WIDTH: 0.92,
    /** 自動縮放可用高度（比例） */
    FIT_HEIGHT: 0.88,
    /** 自動縮放上限（倍） */
    FIT_MAX_SCALE: 1.2,
    /** 每次滾輪縮放步幅（倍） */
    WHEEL_STEP: 0.05,
    /** 手動縮放下限（倍） */
    MIN_SCALE: 0.2,
    /** 手動縮放上限（倍） */
    MAX_SCALE: 2,
    /** 彈出視窗寬度（px） */
    POPUP_W: 680,
    /** 彈出視窗高度（px） */
    POPUP_H: 520,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const DIRECTOR_HUD_PARAM = {
    /** 裝飾音量條數（條） */
    BARS: 20,
    /** 裝飾音量條最低高度（百分比） */
    BAR_MIN_PERCENT: 20,
    /** 裝飾音量條高度序列步幅（百分點） */
    BAR_HEIGHT_STEP: 17,
    /** 裝飾音量條高度序列範圍（百分點） */
    BAR_HEIGHT_RANGE: 80,
    /** 裝飾音量條動畫延遲步幅（秒） */
    BAR_DELAY_S: 0.1,
} as const;
