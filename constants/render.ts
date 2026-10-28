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
    /**
     * 全畫面後處理濾鏡（轉場色差、戰鬥結束的模糊＋灰階）只在這個品質階層以下套用。
     * 每次都要複製整張畫布再套 filter；手機模擬（CPU 4 倍）profile 佔約 4～5%，2026-10-28 改成階層 2／3 跳過，
     * 戰鬥結束只留壓暗。
     */
    POST_FX_MAX_TIER: 1,
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

/** 程序繪製參數：保留原始數值與運算次序。 */
export const TERRAIN_CACHE_KEY = {
    /** 縮放級距比較容差（倍） */
    SCALE_EPSILON: 1e-4,
    /** 快取縮放索引匹配容差（倍） */
    SCALE_MATCH_EPSILON: 0.01,
    /** 快取高度欄位遮罩（位元） */
    HEIGHT_MASK: 511,
    /** 快取高度欄位左移位數（bit） */
    HEIGHT_SHIFT: 13,
    /** 快取變體欄位遮罩（位元） */
    VARIANT_MASK: 15,
} as const;

/** 程序繪製參數：保留原始數值與運算次序。 */
export const BACKGROUND_DRAW = {
    /** 星星垂直分布頻率倍率（倍） */
    STAR_Y_FREQUENCY: 1.5,
    /** 星星尺寸取樣種子（整數） */
    STAR_SIZE_SEED: 1013,
    /** 星星透明度取樣種子（整數） */
    STAR_ALPHA_SEED: 2017,
    /** 星河第一段次色漸層位置（比例） */
    RIVER_FIRST_STOP: 0.3,
    /** 星河第二段次色漸層位置（比例） */
    RIVER_SECOND_STOP: 0.7,
    /** 沙塵霧主色漸層位置（比例） */
    MIST_COLOR_STOP: 0.4,
} as const;

/** 程序繪製參數：保留原始數值與運算次序。 */
export const POST_PROCESS = {
    /** 色差處理啟用門檻（比例） */
    ABERRATION_MIN: 0.01,
    /** 色差分離啟用門檻（比例） */
    ABERRATION_SPLIT_MIN: 0.05,
    /** 色差分離最大水平位移（px） */
    ABERRATION_OFFSET: 15.0,
    /** 結束畫面最大灰階（百分比） */
    FINISH_GRAYSCALE: 50,
    /** 結束畫面最大壓暗不透明度（比例） */
    FINISH_DIM_ALPHA: 0.6,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const DIRECTOR_PARAM = {
    /** 奧義鏡頭基準縮放（倍） */
    ULT_ZOOM: 1.45,
    /** 擊殺強制聚焦時間（秒） */
    KILL_FOCUS_S: 2.5,
    /** 奧義強制聚焦時間（秒） */
    ULT_FOCUS_S: 3.5,
    /** 預設強制聚焦時間（秒） */
    DEFAULT_FOCUS_S: 2,
    /** 缺少螢幕資訊時的寬高比（比值） */
    DEFAULT_ASPECT: 1.77,
    /** 寬高比重算門檻（比值） */
    ASPECT_EPSILON: 0.1,
    /** 超寬螢幕寬高比門檻（比值） */
    ULTRAWIDE_ASPECT: 2,
    /** 超寬螢幕縮放修正（倍） */
    ULTRAWIDE_ZOOM: 0.85,
    /** 直向螢幕縮放修正（倍） */
    PORTRAIT_ZOOM: 0.65,
    /** 較窄螢幕寬高比門檻（比值） */
    NARROW_ASPECT: 1.4,
    /** 較窄螢幕縮放修正（倍） */
    NARROW_ZOOM: 0.8,
    /** 施法候選焦點維持時間（秒） */
    ACTION_FOCUS_S: 4,
    /** 一般候選焦點維持時間（秒） */
    IDLE_FOCUS_S: 2.5,
    /** 候選施法者排除墜落深度（px） */
    FALL_DEPTH: 50,
    /** 奧義候選分數（分） */
    ULT_SCORE: 50,
    /** 主動技候選分數（分） */
    ACTIVE_SCORE: 20,
    /** 普攻候選分數（分） */
    BASIC_SCORE: 5,
    /** 受擊候選加分（分） */
    HIT_SCORE: 15,
    /** 移動候選加分（分） */
    MOVING_SCORE: 5,
    /** 奧義施法者取景權重（倍） */
    ULT_WEIGHT: 1.2,
    /** 奧義施法者取景半徑（px） */
    ULT_RADIUS: 120,
    /** 奧義範圍中心取景權重（倍） */
    AOE_WEIGHT: 0.6,
    /** 普攻施法者取景權重（倍） */
    BASIC_WEIGHT: 0.6,
    /** 一般施法者取景半徑（px） */
    CAST_RADIUS: 80,
    /** 施法目標取景權重倍率（倍） */
    TARGET_WEIGHT_MULT: 0.7,
    /** 目標與逃生單位取景半徑（px） */
    TARGET_RADIUS: 80,
    /** 鄰近敵方取景權重（倍） */
    NEARBY_WEIGHT: 0.3,
    /** 鄰近敵方取景半徑（px） */
    NEARBY_RADIUS: 60,
    /** 逃生目的地取景權重（倍） */
    DEST_WEIGHT: 0.4,
    /** 逃生目的地取景半徑（px） */
    DEST_RADIUS: 40,
    /** 全景排除墜落深度（px） */
    PANORAMA_FALL_DEPTH: 100,
    /** 全景單位取景半徑（px） */
    PANORAMA_RADIUS: 50,
    /** 空場中央鏡頭縮放（倍） */
    EMPTY_ZOOM: 0.7,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const RENDER_LIST_PARAM = {
    /** 預配置繪製操作數（個） */
    INITIAL_CAPACITY: 8000,
    /** 操作池每次擴充數（個） */
    GROWTH_CAPACITY: 1000,
    /** 排序座標正值偏移（px） */
    SORT_Y_OFFSET: 10000,
    /** 排序座標整數化倍率（鍵／px） */
    SORT_Y_SCALE: 100,
    /** 單位排序雜湊截取長度（字元） */
    ID_SUFFIX_LENGTH: 4,
    /** 單位排序雜湊解析基數（進位） */
    ID_RADIX: 36,
    /** 單位排序雜湊桶數（個） */
    ID_BUCKETS: 100,
    /** 單位同鍵排序微調（鍵／桶） */
    ID_TIEBREAK: 0.00001,
    /** 永遠置頂的高度門檻（px） */
    TOP_Z_THRESHOLD: 600,
    /** 永遠置頂的排序偏移（鍵） */
    TOP_SORT_BIAS: 100000000,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const ANIMATION_PARAM = {
    /** 視覺偏移線性衰減率（每秒） */
    OFFSET_DAMPING: 15,
    /** 視覺偏移歸零門檻（px） */
    OFFSET_SNAP_PX: 0.1,
    /** 受擊動畫切入計時門檻（秒） */
    HIT_THRESHOLD_S: 0.05,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const RENDER_STATS_PARAM = {
    /** 計算幀率的幀時間下限（毫秒） */
    MIN_FRAME_MS: 0.1,
    /** 保留的統計影格數（幀） */
    HISTORY_FRAMES: 240,
    /** 最慢影格平均的取樣比例（比例） */
    LOW_FPS_FRACTION: 0.01,
} as const;
