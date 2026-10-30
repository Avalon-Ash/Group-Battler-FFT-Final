// ╔══════════════════════════════════════════════════════════╗
// ║  constants/hud.ts — HUD、血條、浮動文字與量表常數 SSOT       ║
// ║  職責：定義血條尺寸、量表半徑、戰鬥浮字動畫與橫幅外觀       ║
// ╚══════════════════════════════════════════════════════════╝

import { Team } from '../types';

/**
 * 血條／浮動文字的錨點高度（離腳下地面）＝投影頭頂高度＋下列間距，
 * 公式在 data/units/appearance/projection.ts（hudBarHeight／hudTextHeight）。
 * barHeadMargin：血條錨點（血條上緣再往上 5px，容器高約 17px）離頭頂的距離，足以清開法師帽尖等較高的職業。
 * textGap：浮動文字（傷害數字、詠唱字、KILL_STREAK）基準線在血條錨點之上的距離。
 * overheadBelowBar：頭頂狀態圖示（暈眩星等）中心在血條錨點之下的距離（＝落在頭頂上方）。
 */
export const HUD_ANCHOR = {
    barHeadMargin: 24,
    textGap: 30,
    overheadBelowBar: 6,
} as const;

/** 戰鬥浮字的字級與版面（EventHUDMapper）；顏色在 DAMAGE_TEXT_COLORS */
export const FLOATING_TEXT = {
    DEFAULT_COLOR: '#ffffff',
    /** STATUS_VISUALS.POISON 缺色時的後備 */
    DOT_FALLBACK_COLOR: '#a3e635',
    SIZE: { DAMAGE: 16, CRIT: 24, CC: 14, INTERRUPT: 16, KILL_STREAK_BASE: 32, KILL_STREAK_PER: 4 },
    /** 連殺文字比一般浮字再高多少（px） */
    KILL_STREAK_LIFT: 40,
    KILL_STREAK_TRAUMA: { BASE: 0.2, PER: 0.1 },
} as const;

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

/**
 * 單位頭頂血條（BarPainter）：尺寸 px（canvas 單位）。填色條是預烘焙 sprite（漸層＋光暈＋高光），
 * 寬度含護盾可超出空槽的 SHIELD_OVERFLOW。選取時以陣營色加一圈寬 SELECT_GLOW_WIDTH 的半透明描邊代替 shadowBlur。
 */
export const HUD_BAR = {
    WIDTH: 44,
    HP_HEIGHT: 6,
    MP_HEIGHT: 3,
    GAP: 2,
    PADDING: 3,
    /** 外框頂端相對錨點（UnitFrame.hudAnchorY）往上的距離 */
    TOP_OFFSET: 5,
    CORNER: 6,
    FILL_CORNER: 1,
    GLOSS_RATIO: 0.4,
    FILL_GLOW_BLUR: 6,
    SELECT_GLOW_WIDTH: 4,
    SELECT_GLOW_ALPHA: 0.35,
    /** 比例低於此值不畫填色；護盾寬度低於 MIN_SHIELD_W px 不畫 */
    MIN_PCT: 0.01,
    MIN_SHIELD_W: 0.5,
    SHIELD_OVERFLOW: 0.3,
    /** 護盾超過最大血量的此比例時加白框 */
    OVERSHIELD_RATIO: 0.5,
    CAST: { GAP: 2, HEIGHT: 4 },
    /** 控制條：位在外框上方 OFFSET，沒有記錄最大值的控制以 DEFAULT_MAX 秒為滿條 */
    CC: { OFFSET: 12, HEIGHT: 6, LABEL_GAP: 2, FONT: 'bold 9px Arial', DEFAULT_MAX: 5 },
} as const;

/** 單位頭頂圓形量表（GaugePainter）：詠唱進度（控制與增益的剩餘時間改由 HUD_STATUS_STRIP 圖示列顯示） */
export const HUD_GAUGE = {
    RADIUS: 14,
    /** 圓心相對錨點往上的距離 */
    LIFT: 24,
    BG: 'rgba(2, 6, 23, 0.8)',
    ICON_ALPHA: 0.8,
    RIM: 'rgba(255, 255, 255, 0.1)',
    RIM_WIDTH: 2,
    ARC_WIDTH: 3,
    /** 進度弧的光暈：多描一道寬 ARC_WIDTH＋GLOW_WIDTH 的半透明弧（代替 shadowBlur） */
    GLOW_WIDTH: 4,
    GLOW_ALPHA: 0.35,
    DEFAULT_SKILL_VISUAL: 'BOLT',
} as const;

/**
 * 狀態圖示列（StatusStripPainter）：血條上方一排小圖示，列出全部增減益（減益在左、增益在右），
 * 每個圖示有剩餘時間的扇形遮罩。尺寸 px（canvas 單位，隨相機縮放）；縮小到 MIN_SCREEN_PX 以下時依縮放放大（上限 MAX_SCALE），
 * 手機寬度的縮放下才看得出中了什麼。位置掛在 UnitFrame.hudAnchorY（HUD_ANCHOR）：圖示底緣在血條外框頂端之上 ABOVE_BAR。
 */
export const HUD_STATUS_STRIP = {
    ICON: 20,
    GAP: 2,
    /** 減益組與增益組之間的間距 */
    GROUP_GAP: 5,
    /** 圖示底緣離血條外框頂端的距離 */
    ABOVE_BAR: 3,
    /** 圖示在螢幕上至少要有這麼大（CSS px），不夠時放大 */
    MIN_SCREEN_PX: 20,
    MAX_SCALE: 2.2,
    /** 每個單位最多列出幾個圖示，依品質階層 [0..3]（階層 3 減到最少） */
    MAX_BY_TIER: [8, 6, 4, 2] as const,
    /** 品質階層高於此值時不畫剩餘時間的扇形遮罩 */
    SWEEP_MAX_TIER: 2,
    /** 圖示烘焙解析度倍率（畫布像素 / canvas 單位） */
    BAKE_SCALE: 3,
    /** 零件字形佔圖示直徑的比例（烘焙時把零件縮放到這個大小內） */
    GLYPH_FIT: 0.86,
    BG: 'rgba(2, 6, 23, 0.88)',
    BORDER_WIDTH: 1.5,
    BORDER_DEBUFF: '#f87171',
    BORDER_BUFF: '#4ade80',
    /** 剩餘時間扇形遮罩（已過的部分，從 12 點鐘順時針掃） */
    SWEEP: 'rgba(0, 0, 0, 0.6)',
} as const;

/** 背水一戰橫幅（HUDRenderer）：螢幕座標（CSS px） */
export const LAST_STAND_BANNER = {
    COLOR: '#ef4444',
    PULSE_FREQ: 4,
    VIGNETTE_ALPHA: 0.1,
    VIGNETTE_PULSE: 0.15,
    VIGNETTE_REACH: 0.8,
    BANNER_H: 40,
    BANNER_TOP: 'rgba(15, 23, 42, 0.9)',
    BANNER_BOTTOM: 'rgba(15, 23, 42, 0)',
    TITLE: 'L A S T   S T A N D',
    TITLE_SIZE: 28,
    TITLE_FONT: '900 italic 28px "Arial Black", sans-serif',
    TITLE_Y: 34,
    TITLE_STROKE: '#000',
    TITLE_STROKE_W: 4,
    TITLE_GLOW_BLUR: 10,
    SUBTITLE: 'ALL DEFENSES COLLAPSED • HEALING DISABLED',
    SUBTITLE_FONT: 'bold 12px "Segoe UI", sans-serif',
    SUBTITLE_COLOR: '#cbd5e1',
    SUBTITLE_Y: 61,
} as const;

/**
 * 浮動文字動畫（TextPainter）：PCT 是剩餘壽命比例，SEC 是秒，FREQ 是 rad/s，其餘是 px 或倍率。
 * 碎裂亂流與中斷錯位都用確定性雜湊（TEXT_BREAK_JITTER），不每幀呼叫 Math.random。
 */
export const TEXT_ANIM = {
    CULL_PCT: 0.05,
    FADE_IN_PCT: 0.3,
    SHATTER_GROW: 0.8,
    SHATTER_JITTER: 10,
    SHOUT_POP_SEC: 0.25,
    SHOUT_POP_BOUNCE: 0.2,
    SHOUT_FLOAT_FREQ: 6,
    SHOUT_FLOAT_AMP: 3,
    /** 呼喊框比文字寬 PAD_X、高 PAD_Y（奧義／一般） */
    SHOUT_PAD_X: 24,
    SHOUT_PAD_Y_ULT: 16,
    SHOUT_PAD_Y_CAST: 10,
    ULT_PULSE_FREQ: 12,
    ULT_PULSE_AMP: 0.05,
    SUCCESS_GROW: 0.2,
    SUCCESS_LINE_W: 2,
    SUCCESS_LINE_SPREAD: 0.5,
    BRACKET: 8,
    BRACKET_W: 2,
    BRACKET_GLOW_BASE: 0.5,
    BRACKET_GLOW_AMP: 0.3,
    BRACKET_GLOW_FREQ: 8,
    GHOST_ALPHA: 0.15,
    /** 進度超過此值就不畫掃描線 */
    SCAN_DONE: 0.99,
    KILL_POP_SPEED: 5,
    KILL_PULSE_FREQ: 10,
    KILL_PULSE_AMP: 0.1,
    KILL_SCALE: 1.5,
    KILL_STROKE_W: 4,
    NUMBER_STROKE_W: 3,
} as const;

/** 詠唱中斷文字的錯位抖動（確定性：依文字存活時間雜湊，不每幀呼叫 Math.random） */
export const TEXT_BREAK_JITTER = { X: 8, Y: 4, HASH_FREQ: 47, HASH_SCALE: 43758.5453 } as const;

// SSOT: Floating Text Effect Colors
export const TEXT_PAINTER_COLORS = {
    STROKE_SHADOW: 'rgba(0, 0, 0, 0.8)',
    KILL_STREAK_STROKE: '#000000',
    WHITE: '#ffffff',
    /** 詠唱中斷文字的陣營錯位色（ART_SPEC §13：投影失真用陣營色，不用 RGB 分離） */
    CAST_BREAK_BLUE: '#fbbf24',
    CAST_BREAK_RED: '#dc2626',
    TECH_BG: 'rgba(15, 23, 42, 0.4)',
    GRAD_TRANSPARENT: 'rgba(255, 255, 255, 0)'
};

/** 程序繪製參數：保留原始數值與運算次序。 */
export const UI_ICON_BAKE = {
    /** 技能符號光暈模糊（px） */
    SKILL_GLOW_BLUR: 5,
    /** 斬擊弧半徑（px） */
    SLASH_RADIUS: 8,
    /** 斬擊斜線端點距中心（px） */
    SLASH_EXTENT: 8,
    /** 箭身端點距中心（px） */
    ARROW_EXTENT: 6,
    /** 箭頭垂直終點向上距離（px） */
    ARROW_HEAD_END_UP: 2,
    /** 火球半徑（px） */
    FIREBALL_RADIUS: 6,
    /** 火球尾線頂端向上距離（px） */
    FIREBALL_TAIL_TOP: 8,
    /** 火球尾線底端向上距離（px） */
    FIREBALL_TAIL_BOTTOM: 4,
    /** 閃電符號半高（px） */
    BOLT_HALF_HEIGHT: 8,
    /** 閃電折點向左位移（px） */
    BOLT_KINK_LEFT: 4,
    /** 閃電底端向左位移（px） */
    BOLT_BOTTOM_LEFT: 2,
    /** 光束十字端點距中心（px） */
    BEAM_EXTENT: 8,
    /** 重擊方塊向左位移（px） */
    SMASH_LEFT: 6,
    /** 重擊方塊向上位移（px） */
    SMASH_TOP: 8,
    /** 重擊方塊寬度（px） */
    SMASH_WIDTH: 12,
    /** 重擊方塊高度（px） */
    SMASH_HEIGHT: 8,
    /** 炸彈半徑（px） */
    BOMB_RADIUS: 6,
    /** 引信起點向上距離（px） */
    BOMB_FUSE_START_UP: 4,
    /** 引信終點水平位置（px） */
    BOMB_FUSE_END_X: 8,
    /** 引信終點向上距離（px） */
    BOMB_FUSE_END_UP: 8,
    /** 預設技能圖示半徑（px） */
    DEFAULT_SKILL_RADIUS: 6,
    /** 狀態符號光暈模糊（px） */
    STATUS_GLOW_BLUR: 5,
    /** 暈眩螺旋每點半徑增量（px） */
    HALO_SPIRAL_STEP: 1.5,
    /** 沉默方框半寬（px） */
    LOCK_HALF_WIDTH: 12,
    /** 沉默方框向上位移（px） */
    LOCK_TOP: 10,
    /** 沉默方框寬度（px） */
    LOCK_WIDTH: 24,
    /** 沉默點水平間距（px） */
    LOCK_DOT_SPACING: 6,
    /** 沉默點向上距離（px） */
    LOCK_DOT_UP: 2,
    /** 放逐稜晶圖示半徑（px） */
    PRISM_RADIUS: 14,
    /** 中毒符文半徑（px） */
    POISON_RUNE_RADIUS: 14,
    /** 中毒交叉線向左位移（px） */
    POISON_CROSS_LEFT: 4,
    /** 中毒交叉線向上位移（px） */
    POISON_CROSS_UP: 4,
    /** 再生十字半高（px） */
    REGEN_HALF_HEIGHT: 10,
    /** 再生十字半寬（px） */
    REGEN_HALF_WIDTH: 10,
    /** 預設符文半徑（px） */
    DEFAULT_RUNE_RADIUS: 14,
    /** 骷髏頭部向上距離（px） */
    SKULL_HEAD_UP: 4,
    /** 骷髏頭部半徑（px） */
    SKULL_HEAD_RADIUS: 8,
    /** 骷髏下顎向左位移（px） */
    SKULL_JAW_LEFT: 6,
    /** 骷髏下顎寬度（px） */
    SKULL_JAW_WIDTH: 12,
    /** 骷髏下顎高度（px） */
    SKULL_JAW_HEIGHT: 8,
    /** 骷髏左眼向左距離（px） */
    SKULL_EYE_LEFT: 3,
    /** 骷髏眼睛向上距離（px） */
    SKULL_EYE_UP: 4,
    /** 嘲諷左括號向左距離（px） */
    ANGRY_LEFT: 10,
    /** 嘲諷括號半高（px） */
    ANGRY_HALF_HEIGHT: 10,
    /** 嘲諷左括號折點向左距離（px） */
    ANGRY_LEFT_KINK: 5,
    /** 嘲諷中心直線半高（px） */
    ANGRY_CENTER_HALF_HEIGHT: 12,
    /** 嘲諷右括號折點水平位置（px） */
    ANGRY_RIGHT_KINK: 5,
    /** 致盲眼形水平半徑（px） */
    EYE_RADIUS_X: 12,
    /** 致盲眼形垂直半徑（px） */
    EYE_RADIUS_Y: 6,
    /** 致盲斜線端點距中心（px） */
    EYE_SLASH_EXTENT: 12,
    /** 護盾十字半高（px） */
    SHIELD_CROSS_HALF_HEIGHT: 8,
    /** 護盾十字半寬（px） */
    SHIELD_CROSS_HALF_WIDTH: 8,
    /** 預設狀態圖示半徑（px） */
    DEFAULT_STATUS_RADIUS: 8,
} as const;

/** 程序繪製參數：保留原始數值與運算次序。 */
export const TACTICAL_DRAW = {
    /** 既有路徑連線離地高度（px） */
    PATH_LIFT: 30,
    /** 路徑虛線長度（px） */
    PATH_DASH_LENGTH: 5,
    /** 路徑虛線間隔（px） */
    PATH_DASH_GAP: 5,
    /** 路徑連線不透明度（比例） */
    PATH_ALPHA: 0.6,
    /** 目的地標記垂直壓縮（倍） */
    DESTINATION_SQUASH: 0.6,
    /** 目的地填色不透明度（比例） */
    DESTINATION_FILL_ALPHA: 0.3,
    /** 目的地輪廓不透明度（比例） */
    DESTINATION_LINE_ALPHA: 0.8,
    /** 既有目標連線離地高度（px） */
    TARGET_LIFT: 30,
    /** 目標連線實色起點（比例） */
    TARGET_COLOR_STOP: 0.2,
    /** 目標連線基礎不透明度（比例） */
    TARGET_ALPHA_BASE: 0.8,
    /** 目標連線透明度脈動幅度（比例） */
    TARGET_ALPHA_PULSE: 0.2,
    /** 導播框邊距（px） */
    DIRECTOR_PADDING: 40,
    /** 導播框角邊長（px） */
    DIRECTOR_CORNER: 25,
    /** 導播框線寬（px） */
    DIRECTOR_LINE_WIDTH: 1.5,
    /** 錄影點相對邊距橫向位置（px） */
    REC_OFFSET_X: 15,
    /** 錄影點相對邊距縱向位置（px） */
    REC_OFFSET_Y: 15,
    /** 錄影點半徑（px） */
    REC_RADIUS: 5,
    /** 導播標籤相對邊距橫向位置（px） */
    DIRECTOR_LABEL_X: 25,
    /** 導播標籤相對邊距縱向位置（px） */
    DIRECTOR_LABEL_Y: 18,
    /** 追蹤標籤右側內縮（px） */
    TRACK_LABEL_INSET: 5,
    /** 幀率文字縱向位置（px） */
    DEBUG_FPS_Y: 20,
    /** 效能摘要縱向位置（px） */
    DEBUG_SUMMARY_Y: 32,
    /** 尖峰摘要縱向位置（px） */
    DEBUG_SPIKE_Y: 44,
    /** 驟死警告閃爍半週期（ms） */
    SUDDEN_DEATH_BLINK_MS: 500,
    /** 驟死警告標題縱向位置（px） */
    SUDDEN_DEATH_TITLE_Y: 30,
    /** 驟死警告副標題縱向位置（px） */
    SUDDEN_DEATH_SUBTITLE_Y: 45,
} as const;

/** 程序繪製參數：保留原始數值與運算次序。 */
export const HUD_TEXT_MOTION = {
    /** 浮字物件池初始大小（個） */
    POOL_SIZE: 50,
    /** 詠唱浮字最長時間（s） */
    CAST_MAX_DURATION: 5.0,
    /** 奧義呼喊初始上升速度（px/s） */
    ULT_SHOUT_RISE: 5,
    /** 奧義呼喊字級（px） */
    ULT_SHOUT_SIZE: 24,
    /** 一般呼喊初始上升速度（px/s） */
    SHOUT_RISE: 20,
    /** 一般呼喊字級（px） */
    SHOUT_SIZE: 14,
    /** 控制提示初始上升速度（px/s） */
    CC_RISE: 20,
    /** 控制提示壽命（s） */
    CC_LIFE: 1.5,
    /** 連殺提示初始上升速度（px/s） */
    STREAK_RISE: 30,
    /** 連殺提示壽命（s） */
    STREAK_LIFE: 3.5,
    /** 連殺提示字級（px） */
    STREAK_SIZE: 32,
    /** 傷害浮字初始上升速度（px/s） */
    DAMAGE_RISE: 100,
    /**
     * 多段傷害／治療浮字錯位（HUDSystem.addFloatingText）：同一個單位在 WINDOW 秒內已有 n 個傷害／治療字時，
     * 新字依 n 排進格子：先往上疊滿一欄 ROWS 列（每列往上 STEP_Y），再換到右欄、左欄（各偏 STEP_X），一次多段（最多 8 段、約 0.6 秒）也每個數字都讀得出來。
     */
    STAGGER: { WINDOW: 0.45, ROWS: 5, STEP_Y: 15, STEP_X: 40 },
    /** 施法成功文字上升速度（px/s） */
    SUCCESS_RISE: 400,
    /** 施法成功文字壽命（s） */
    SUCCESS_LIFE: 0.3,
    /** 施法中斷文字上升速度（px/s） */
    BREAK_RISE: 250,
    /** 施法中斷文字橫向速度範圍（px/s） */
    BREAK_SCATTER: 400,
    /** 施法中斷文字旋轉速度範圍（rad/s） */
    BREAK_SPIN: 30,
    /** 施法中斷文字壽命（s） */
    BREAK_LIFE: 0.4,
    /** 呼喊與控制浮字每幀速度保留率（比例） */
    SHOUT_DAMPING: 0.95,
    /** 連殺浮字每幀速度保留率（比例） */
    STREAK_DAMPING: 0.92,
} as const;
