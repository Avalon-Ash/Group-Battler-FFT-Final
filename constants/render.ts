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
    /** 奧義施法分（分） */
    ULT_SCORE: 50,
    /** 主動技施法分（分） */
    ACTIVE_SCORE: 20,
    /** 普攻施法分（分） */
    BASIC_SCORE: 5,
    /** 受擊加分（分） */
    HIT_SCORE: 8,
    /** 移動加分（分） */
    MOVING_SCORE: 5,
    /** 逃生加分（分） */
    EVADE_SCORE: 10,
    /** 動作結束後分數每秒衰減（分／秒） */
    SCORE_DECAY_PER_S: 10,
    /** 挑戰者要比主角多這麼多分才換人（分） */
    STICKY_SCORE: 10,
    /** 主角最短維持時間（秒）；主角失效不受此限 */
    MIN_HOLD_S: 5,
    /** 別處有人放奧義時，主角至少看滿這麼久就可以被搶（秒）；其餘動作要等 MIN_HOLD_S */
    ULT_CUT_HOLD_S: 3,
    /** 不能上鏡的墜落深度（px） */
    FALL_DEPTH: 50,
    /** 主角取景權重 */
    ANCHOR_WEIGHT: 1,
    /** 主角的目標取景權重 */
    RELATED_WEIGHT: 0.85,
    /** 空場中央鏡頭縮放（倍） */
    EMPTY_ZOOM: 0.7,
    /** 主角的目標離主角超過這個距離就不框（px，約 8.5 格） */
    FIGHT_RADIUS_PX: 720,
    /** 主角還在走路時，目標要在這個距離內才框（px，約 3.5 格）：走過去的路上不拉全景 */
    WALK_TARGET_RADIUS_PX: 290,
    /** 舊目標不再是目標後多留的時間（秒）；死者立刻離開 */
    MEMBER_LINGER_S: 0.8,
    /** 每個成員四周要留的邊（px，單位身體加血條） */
    UNIT_MARGIN_PX: 70,
    /** 取景留白（倍） */
    FRAME_PADDING: 1.15,
    /** 三種景別：畫面短邊的一半看得到多少世界距離（px）；縮放還要再夾 directorMin～directorMax */
    SHOT_RADIUS_PX: { CLOSE: 170, MID: 290, WIDE: 435 },
    /** 目前景別要差到剛好框住的這個比例才算放不下（倍）：留白不足但人還在畫面內時不動 */
    SHOT_OUT_MARGIN: 0.8,
    /** 要換到更緊的景別，範圍要比剛好框住再小這個比例（倍），避免在邊界來回跳 */
    SHOT_IN_MARGIN: 1.15,
    /** 換過景別後至少這麼久不再拉近（秒）；拉遠不受限，主角和目標不能出畫面 */
    SHOT_MIN_HOLD_S: 4,
    /** 更緊的景別要持續放得下這麼久才拉近（秒） */
    SHOT_IN_HOLD_S: 0.5,
    /** 目前景別放不下持續這麼久才拉遠（秒） */
    SHOT_OUT_HOLD_S: 0.2,
    /** 拉近一次的緩進緩出時間（秒） */
    SHOT_IN_BLEND_S: 1,
    /** 拉遠一次的緩進緩出時間（秒） */
    SHOT_OUT_BLEND_S: 1,
    /** 全景時縮放跟隨範圍的速度上限（對數／秒） */
    WIDE_ZOOM_RATE_PER_S: 0.5,
    /** 換主角時焦點從舊位置移到新位置的時間（秒） */
    SWITCH_BLEND_S: 0.8,
    /** 鏡頭視窗的半寬（畫面短邊的比例）：焦點在框內鏡頭不動 */
    WINDOW_X: 0.12,
    /** 鏡頭視窗的半高（畫面短邊的比例）：比半寬大，跳躍、擊飛時鏡頭不點頭 */
    WINDOW_Y: 0.2,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const CAMERA_PARAM = {
    /** 震動衰減速率（每秒） */
    SHAKE_DECAY_RATE: 8.0,
    /** 最大震動幅度（px，乘上目前縮放） */
    MAX_SHAKE_PX: 30,
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

/** 具名參數：保持原值與運算次序。 */
export const GRID_TRANSITION_PARAM = {
    /** 退場轉場進度超過此值就不再畫地塊（比例） */
    OUT_SKIP_T: 0.95,
    /** 轉場位移超過此值的地塊不畫（px） */
    CULL_OFFSET_PX: 800,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const RENDER_DISPATCH_PARAM = {
    /** 掉落深度淡出距離：z 為負時透明度＝1 − |z| ÷ 此值（px） */
    Z_FADE_DIST_PX: 800,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const RENDER_PIPELINE_PARAM = {
    /** 第一幀之前的預設幀時間（秒） */
    INITIAL_DT_S: 0.016,
    /** 每幀清除畫布的底色 */
    CLEAR_COLOR: '#020617',
} as const;

/**
 * 震動導演（engine/presentation/ShakeDirector.ts）：同一個 tick 的衝擊取最大值、不累加；
 * MINOR 種類打在「不是導演焦點」的單位上乘 OFF_FOCUS_SCALE；輸出不超過 MAX_TRAUMA。
 */
export const SHAKE_DIRECTOR_PARAM = {
    /** 整體強度倍率預設值（設定面板可調，0＝不震） */
    DEFAULT_STRENGTH: 1,
    /** 單次輸出的 trauma 上限（舊版累加可到 1.0） */
    MAX_TRAUMA: 0.7,
    /** MINOR 衝擊打在非焦點單位時的倍率 */
    OFF_FOCUS_SCALE: 0.4,
    /** 會被打折的種類；其餘（MASSIVE、ULT、CAST_BREAK_ULT、KILL_STREAK、FALL）不打折 */
    MINOR_KINDS: ['HIT', 'CRIT', 'PROJECTILE', 'AOE', 'SACRIFICE', 'DEATH', 'KNOCKBACK', 'CAST_BREAK', 'DASH'] as const,
    /** 低於此值的輸出不發 CAMERA_SHAKE */
    MIN_OUTPUT: 0.01,
} as const;

/** 鏡頭抖動波形：兩軸各一條正弦（rad/s），取代每幀 Math.random() 的亂跳 */
export const CAMERA_SHAKE_PARAM = {
    FREQ_X: 41,
    FREQ_Y: 53,
    /** Y 軸相位偏移（rad），讓兩軸不同步 */
    PHASE_Y: 1.3,
} as const;

/**
 * 遮擋剪影的裁切（engine/renderers/units/SilhouetteMask.ts，RenderSpec §13）：剪影只畫在擋住單位的東西上。
 * 地塊＝頂面六角（半徑 HEX_SIZE）往下延伸 COLUMN_DEPTH 的凸包；障礙物＝該障礙物圖的不透明像素。
 */
export const SILHOUETTE_MASK = {
    /** 地塊柱往下延伸的深度（px），要大於任何單位的螢幕高度 */
    COLUMN_DEPTH: 400,
} as const;
