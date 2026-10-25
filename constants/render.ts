// ╔══════════════════════════════════════════════════════════╗
// ║  constants/render.ts — 渲染效能、快取、品質與光暈常數 SSOT ║
// ║  職責：定義渲染效能診斷、地塊快取、自適應品質與光暈快取     ║
// ╚══════════════════════════════════════════════════════════╝

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
    /** 縮放級距遲滯比例：超出目前級距 5% 才升級（容許最多 5% 的放大模糊）；降級立即生效 */
    SCALE_HYSTERESIS: 0.05,
    MAX_TERRAIN_SPRITES: 2048,
    FLOAT_STEP: 0.5,
    HEIGHT_KEY_SCALE: 2,
    SPRITE_PADDING: 4,
    /**
     * 地形 sprite 烘焙預算：每幀（TerrainRenderer.beginFrame 重置）累計烘焙超過此毫秒數，其餘未命中改借用
     * 相鄰縮放級距或同一格上一次的 sprite。2026-10-19 前是「每 16 ms 時間窗」：單塊 4～9 ms，一幀內烘到一半
     * 時間窗就過期重置，長幀永遠擋不住（戰鬥結束 300 ms、換圖 660 ms）。
     */
    BAKE_BUDGET_MS: 4,
    /**
     * 轉場（換圖 IN／OUT）期間的烘焙預算：新地圖沒有任何可借用的 sprite，超過預算的地塊延後到下一幀才畫
     * （地塊正從畫面外落入，晚幾幀看不出來）。2560×1440 一塊約 4～9 ms，IN 約 1.5 秒內要烘完整張圖。
     */
    TRANSITION_BAKE_BUDGET_MS: 12,
    /** 液面循環影格（TerrainLoopAtlas）同時快取的組數上限（顏色 x layout x 量化強度）；每組約 2 MB，LRU 淘汰 */
    LOOP_LIQUID_SLOTS: 16,
    /** 液面循環影格排成一張圖的最大寬度（px）；超過就換行 */
    LOOP_SHEET_MAX_W: 2048,
} as const;

/**
 * 渲染解析度與自適應品質調度參數 SSOT。
 */
export const RENDER_QUALITY = {
    /**
     * 每幀繪製（主畫布、貼地鋪設離屏）的 drawImage 取樣品質。必須是 'low'：
     * 來源多是離屏畫布，'medium'／'high' 每次 drawImage 都要重算 mipmap／雙三次濾波，
     * 2560×1440 展示戰鬥幀間隔中位數 4.3 → 8.3 ms、p99 16.8 → 25～50 ms（2026-10-19 A/B，tools/ui-e2e/out 探針）。
     * 一次性烘焙（engine/graphics/CanvasUtils.createCanvas、SpriteAtlasStore 縮圖）仍用 'high'，不受此值影響。
     */
    IMAGE_SMOOTHING: 'low' as ImageSmoothingQuality,
    MAX_DPR: 2,
    DEFAULT_DPR: 1,
    IGNORE_FRAME_MS: 250,
    /** 降階門檻：幀間隔平均 > 14ms（約 < 70 FPS）持續 DOWN_HOLD_S 才降階；一般 100+ FPS 遊玩不得降畫質（僅應付真正的瞬間掉幀） */
    DOWN_MS: 14,
    /**
     * 降到解析度階層（2／3，畫面變糊）的門檻：幀間隔平均 > 22ms（約 < 45 FPS）。0→1 只關色調分級，用 DOWN_MS。
     * 2026-10-19「放著不動越跑越糊」：以前所有階層共用 14ms，偶發重場面就把解析度降下去。
     */
    DOWN_RES_MS: 22,
    /**
     * 降階門檻至少是「螢幕刷新週期 × DOWN_REFRESH_RATIO」：幀間隔被 vsync 鎖在刷新週期，60 Hz 螢幕永遠 ≥ 16.7ms，
     * 以前一律被判成掉幀而降到最低階。刷新週期＝最短幀間隔（衰減最小值，每幀往上回彈 REFRESH_DECAY），
     * ×REFRESH_TOL 後對齊到 DISPLAY_PERIODS_MS 中不超過它的最大值（找不到更大的就用 60 Hz）。
     */
    DOWN_REFRESH_RATIO: 1.4,
    REFRESH_DECAY: 0.002,
    REFRESH_TOL: 1.1,
    DISPLAY_PERIODS_MS: [4.17, 6.06, 6.94, 8.33, 11.11, 13.33, 16.67] as readonly number[],
    /** 升階冷卻加倍（upBackoff）每 BACKOFF_DECAY_S 秒沒有再降階就減一級；以前只增不減，降過幾次就永久卡在低畫質 */
    BACKOFF_DECAY_S: 60,
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
 * 效能五：每幀熱點去除用的快取參數 SSOT
 * （單位漸層快取、預烘焙光暈文字）
 */
export const RENDER_HOTSPOT_CACHE = {
    MAX_UNIT_GRADIENTS: 128,
    MAX_GLOW_TEXT_SPRITES: 192,
    /** 光暈文字烘焙縮放的量化級距（裝置像素 / 使用者單位） */
    GLOW_SCALE_STEP: 0.125,
    GLOW_SCALE_MIN: 0.25,
    GLOW_SCALE_MAX: 4,
    /** shadowBlur 擴散範圍約為 blur 值；四周保留 blur × 此倍率的裝置像素 */
    GLOW_PAD_PER_BLUR: 1.5,
    /** 文字盒四周額外留白（以字級 em 計，涵蓋斜體外伸與上下緣） */
    GLOW_TEXT_MARGIN_EM: 0.5,
} as const;

/** 技能呼喊（SHOUT）光暈參數：原 TextPainter 內 shadowBlur 字面值 */
export const SHOUT_GLOW = {
    CAST_BLUR: 10,
    ULT_BLUR: 20,
    SCAN_BLUR: 15,
    SCAN_WIDTH: 3,
    SUCCESS_BLUR: 15,
    /** SUCCESS 昇華光暈隨壽命遞減，模糊量以此級距量化以重用 sprite */
    SUCCESS_BLUR_STEP: 3,
} as const;
