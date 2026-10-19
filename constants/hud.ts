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

/** 單位頭頂圓形量表（GaugePainter）：控制剩餘時間（顏色＝STATUS_VISUALS）或詠唱進度 */
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
