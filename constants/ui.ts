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

/**
 * 畫面層級（由低到高）：展示背景 < HUD < 一般視窗 < 選單 < 最大化視窗 < 全域提示 < 彈出層。
 * 這些元素都排在同一個 stacking context：WindowLayer 不得再建立 stacking context，否則視窗的層級出不去。
 */
export const UI_Z = {
    /** 展示模式標題卡與背景：在視窗層之下，展示模式開的設定／音訊等視窗才不會被標題卡蓋住 */
    SHOWCASE: 20,
    /** 展示主卡：在展示背景之上、HUD 之下 */
    SHOWCASE_CARD: 21,
    /** 工具列、播放 HUD：一般視窗會蓋過它們 */
    HUD: 30,
    /** 一般視窗的層級範圍；超過 WINDOW_MAX 時 windowStore 會重新編號 */
    WINDOW_BASE: 40,
    WINDOW_MAX: 89,
    MENU_BACKDROP: 90,
    /** 系統選單永遠蓋過一般視窗，只有最大化視窗例外 */
    MENU: 91,
    /** 最大化視窗：蓋過選單鈕。內部相對順序沿用視窗原本的層級 */
    WINDOW_MAXIMIZED: 100,
    /** 全域提示（部署錯誤等）：最大化時也要看得到 */
    OVERLAY: 200,
    /** 下拉面板、提示框等 portal 到 body 的彈出層 */
    POPOVER: 210,
} as const;

/**
 * UI ??Engine tunable ranges (SSOT). Shared by UICommandSystem (clamping),
 * the renderer (camera tuning) and the settings schema / sliders.
 */
export const UI_SETTINGS = {
    SNAPSHOT_HZ: 10,
    /** 2026-10-28：手動倍率與導播子範圍、輸入步幅共用 SSOT。100px 或一格滾輪 = 1.15 倍。 */
    CAMERA_ZOOM: {"min":0.4,"max":3,"directorMin":0.45,"directorMax":2.2,"wheelFactor":1.15,"wheelPixels":100,"linePixels":16,"pagePixels":800,"manualStiffness":18,"doubleTapMs":300,"tapMaxMs":250,"tapDistance":24},
    ZONE_INITIAL_RADIUS: { min: 3, max: 20, default: 8, step: 1 },
    ZONE_SHRINK_INTERVAL: { min: 1, max: 60, default: 15, step: 1 },
    ZONE_MIN_RADIUS: { min: 0, max: 10, default: 1, step: 1 },
    /** 開局陣營數（個）；實際上限另受總池限制（selectBattleSetupView.maxFactions） */
    BATTLE_FACTIONS: { min: 2, max: 40, default: 2, step: 1 },
    /** 每陣營人數（人）；1＝大逃殺；實際上限另受總池限制 */
    BATTLE_UNITS_PER_FACTION: { min: 1, max: 40, default: 5, step: 1 },
    /** 開局總人數硬上限（人，效能）；總池＝min(本張地圖可出生格數 − 1, 這個值) */
    BATTLE_MAX_UNITS: 40,
    CAMERA_STIFFNESS: { min: 0.1, max: 20, followDefault: 3, zoomDefault: 4, step: 0.1, sliderMax: 5.0 },
    /** 鏡頭震動滑桿範圍（預設值在 SHAKE_DIRECTOR_PARAM） */
    SHAKE_STRENGTH: { min: 0, max: 1.5, step: 0.05 },
    SHAKE_OFF_FOCUS: { min: 0, max: 1, step: 0.05 },
    SHAKE_MAX: { min: 0.1, max: 1, step: 0.05 },
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
    /** 展示地圖寬下限（格） */
    SHOWCASE_MIN_W: 10,
    /** 展示地圖高下限（格） */
    SHOWCASE_MIN_H: 8,
    /** 展示地圖尺寸隨機幅度（格） */
    SHOWCASE_SIZE_RANGE: 4,
    /** 展示模式每局隨機的陣營×人數：雙陣營的機率與每邊最少人數（5＝五個職業全部露出）、總人數範圍（人）、大逃殺最少幾個陣營。 */
    SHOWCASE_SETUP: {
        TEAMS_CHANCE: 0.5,
        TEAMS_MIN_PER_SIDE: 5,
        MIN_UNITS: 8,
        MAX_UNITS: 20,
        ROYALE_MIN_FACTIONS: 3,
    },
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
    /** 檢視器顯示最近幾筆模式轉換。 */
    MODE_TRACE_SHOWN: 5,
    /** 節點結果在檢視器留多久才消失（毫秒） */
    FADE_OUT_MS: 1000,
    /** 結果開始變淡的時間（毫秒） */
    FADE_MID_MS: 200,
    /** 結果轉成弱化色的時間（毫秒） */
    FADE_OLD_MS: 500,
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

/** 具名參數：保持原值與運算次序。 */
export const GAME_CANVAS_PARAM = {
    /** 拖曳物件懸浮高度（px） */
    DRAG_LIFT_PX: 40,
    /** 拖曳物件陰影模糊（px） */
    DRAG_SHADOW_BLUR: 30,
    /** 拖曳物件陰影垂直偏移（px） */
    DRAG_SHADOW_OFFSET_Y: 30,
    /** 拖曳物件不透明度（比例） */
    DRAG_ALPHA: 0.9,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const INSPECTOR_PARAM = {
    /** 滾動摩擦係數（比例） */
    SCROLL_FRICTION: 0.95,
    /** 日誌自動滾動距離門檻（px） */
    LOG_AUTO_SCROLL_PX: 200,
    /** 特效地圖邊界留白（px） */
    VFX_MAP_PAD: 6,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const UI_PANEL_PARAM = {
    /** 播放控制列邊距（px） */
    PLAYBACK_HUD_MARGIN: 30,
    /** 可拖曳面板預設邊距（px） */
    DRAGGABLE_MARGIN: 20,
    /** 展示背景最低不透明度（比例） */
    SHOWCASE_BG_MIN_OPACITY: 0.1,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const GAME_INPUT_PARAM = {
    /** 觸控拖曳判定漂移門檻（px） */
    DRAG_DRIFT_TOUCH_PX: 18,
    /** 滑鼠拖曳判定漂移門檻（px） */
    DRAG_DRIFT_MOUSE_PX: 8,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const GAME_LOOP_PARAM = {
    /** 視窗縮放防抖延遲（毫秒） */
    RESIZE_DEBOUNCE_MS: 50,
    /** 遊戲迴圈最大累加器時間（毫秒） */
    MAX_ACCUMULATOR_MS: 250,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const GAME_CAMERA_FIT = {
    /** 平頂六角對齊地塊偏移（格高） */
    FLAT_OFFSET_BLOCKS: 1.5,
    /** 尖頂六角對齊地塊偏移（格高） */
    POINTY_OFFSET_BLOCKS: 0.5,
    /** 鏡頭適配縮放下限（倍） */
    MIN_ZOOM: 0.7,
    /** 鏡頭適配縮放上限（倍） */
    MAX_ZOOM: 1.3,
} as const;
