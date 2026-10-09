
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
};

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

export const TERRAIN_THEMES: Record<string, { top: string, sideLight: string, sideDark: string, detail: string, rim: string }> = {
    'VOID':   { top: '#1e293b', sideLight: '#334155', sideDark: '#0f172a', detail: '#6366f1', rim: '#818cf8' }, // Indigo tints
    'FOREST': { top: '#14532d', sideLight: '#166534', sideDark: '#052e16', detail: '#4ade80', rim: '#86efac' }, // Deep Jungle
    'ICE':    { top: '#3b82f6', sideLight: '#2563eb', sideDark: '#1e3a8a', detail: '#bae6fd', rim: '#e0f2fe' }, // Glacial
    'MAGMA':  { top: '#7f1d1d', sideLight: '#991b1b', sideDark: '#450a0a', detail: '#fca5a5', rim: '#f87171' }, // Obsidian/Lava
    'DESERT': { top: '#b45309', sideLight: '#d97706', sideDark: '#78350f', detail: '#fde047', rim: '#fcd34d' }  // Sandstone
};

export const OBSTACLE_STYLES: Record<string, { main: string, light: string, dark: string, detail: string, highlight: string }> = {
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
