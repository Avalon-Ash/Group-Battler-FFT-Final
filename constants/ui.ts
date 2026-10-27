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
