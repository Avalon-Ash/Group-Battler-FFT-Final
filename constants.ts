
import { Team } from './types';

export const HEX_SIZE = 36; // Slightly smaller to accommodate height
export const BLOCK_HEIGHT = 24; // Increased to 24 for distinct "Step" look (Tactics Ogre style)
export const MAX_TERRAIN_TIER = 6; // Max height steps
export const ISO_SCALE_Y = 0.58; // Moved here from utils.ts

// --- VISUAL STANDARDS (UNIT ANCHORS) ---
export const UNIT_VISUAL_HEIGHT = 90; // Standardized "Head" position. Ensures clearance for tallest sprites.
export const UNIT_BODY_OFFSET = 45;   // NEW: The visual "Chest/Center" height from the ground. Syncs Render & VFX.
export const HUD_PADDING = 10;        // Safety buffer between sprite top and UI elements.
export const HUD_ANCHOR_OFFSET = UNIT_VISUAL_HEIGHT + HUD_PADDING;

// --- HUD & FEEDBACK CONFIG ---
export const HUD_TEXT_OFFSET = UNIT_VISUAL_HEIGHT + HUD_PADDING + 20;
export const KILL_STREAK_WINDOW = 12.0; // Seconds allowed between kills to count as a streak

// --- ASSET PALETTES ---

// 1. FACTION THEMES (Used by Renderers)
export const THEME_IMPERIAL = {
    primary: '#3b82f6',    // Blue-500 (Brighter)
    secondary: '#fde047',  // Yellow-300 (Energy)
    armorLight: '#f1f5f9', // Slate-100
    armorDark: '#1e3a8a',  // Blue-900
    energy: '#60a5fa',     // Blue-400
    cape: 'rgba(30, 58, 138, 0.9)' // Blue-900 alpha
};

export const THEME_COVENANT = {
    primary: '#ef4444',    // Red-500
    secondary: '#f87171',  // Red-400 (Glow)
    armorDark: '#09090b',  // Zinc-950
    armorBase: '#27272a',  // Zinc-800
    accent: '#7f1d1d',     // Red-900
    spike: '#18181b'       // Zinc-900
};

// 2. LOG & UI COLORS (Used by GameEngine & Logs)
export const LOG_COLORS = {
    MOVE: '#38bdf8',     // Sky-400
    CAST: '#fbbf24',     // Amber-400
    HIT: '#f87171',      // Red-400
    HEAL: '#4ade80',     // Green-400
    DECISION: '#c084fc', // Purple-400
    DEATH: '#94a3b8',    // Slate-400
    CC: '#facc15',       // Yellow-400
    SYSTEM: '#64748b'    // Slate-500
};

export const PALETTE = {
    UI_BG: '#020617', // Slate 950
    UI_BORDER: '#1e293b', // Slate 800
    SHADOW: 'rgba(0, 0, 0, 0.6)',
    
    // FACTION THEMES (WoW Style)
    TEAMS: {
        [Team.BLUE]: { 
            // ALLIANCE: Royal Blue, Gold, Marble
            main: '#2563eb', 
            dark: '#1e3a8a', 
            light: '#fbbf24', // Gold trim
            glow: 'rgba(59, 130, 246, 0.8)',
            accent: '#f8fafc' // Marble White
        }, 
        [Team.RED]: { 
            // HORDE: Crimson, Iron Grey, Bone
            main: '#dc2626', 
            dark: '#450a0a', 
            light: '#a1a1aa', // Iron Grey
            glow: 'rgba(220, 38, 38, 0.8)',
            accent: '#1c1917' // Warpaint Black
        }
    },
    
    // Skill Types (High Contrast)
    DAMAGE: '#ffffff',
    HEAL: '#10b981', 
    CRIT: '#ef4444', // Critical red
    MAGIC: '#8b5cf6' 
};

export const COLORS = {
    [Team.BLUE]: PALETTE.TEAMS[Team.BLUE].main,
    [Team.RED]: PALETTE.TEAMS[Team.RED].main,
    HP: '#22c55e', // Green-500
    MP: '#3b82f6', // Blue-500
    CAST: '#eab308' // Yellow-500
};

// --- GAMEPLAY PARAMETERS (Separated from Logic) ---
export const COMBAT_PARAM = {
    HIT_IMPULSE_MAX: 400, // Significantly increased from 20 for visible physics kick
    HIT_IMPULSE_MIN: 100, // Significantly increased from 5
    DR_RESET_TIME: 10.0,
    EXECUTE_THRESHOLD: 0.3, // 30% HP
    BASE_EXECUTE_MULTIPLIER: 1.5,
    BASE_VAMP_PCT: 0.5,
    MANA_BURN_DEFAULT: 30,
    MANA_RESTORE_DEFAULT: 30,
};

// --- MATERIAL 2.0 DEFINITIONS ---
// Improved palette for better lighting simulation in 2D
export const TERRAIN_THEMES: Record<string, { top: string, sideLight: string, sideDark: string, detail: string, rim: string }> = {
    'VOID': { 
        top: '#1e293b',        // Slate-800
        sideLight: '#0f172a',  // Slate-900
        sideDark: '#020617',   // Slate-950
        detail: '#334155',     // Slate-700 (Circuit lines)
        rim: '#64748b'         // Slate-500 (Edge Highlight)
    },
    'FOREST': { 
        top: '#15803d',        // Green-700
        sideLight: '#14532d',  // Green-900
        sideDark: '#052e16',   // Darker Green
        detail: '#4ade80',     // Green-400 (Grass blades)
        rim: '#86efac'         // Green-300 (Sunlight edge)
    }, 
    'ICE': { 
        top: '#60a5fa',        // Blue-400 (Glacier top)
        sideLight: '#2563eb',  // Blue-600
        sideDark: '#1e40af',   // Blue-800
        detail: '#dbeafe',     // Blue-100 (Frost)
        rim: '#ffffff'         // Pure White (Specular)
    }, 
    'MAGMA': { 
        top: '#450a0a',        // Red-950 (Cooling rock)
        sideLight: '#27272a',  // Zinc-800 (Charred)
        sideDark: '#18181b',   // Zinc-900
        detail: '#ef4444',     // Red-500 (Lava veins)
        rim: '#f87171'         // Red-400 (Glow edge)
    }, 
    'DESERT': { 
        top: '#d97706',        // Amber-600
        sideLight: '#b45309',  // Amber-700
        sideDark: '#78350f',   // Amber-900
        detail: '#fbbf24',     // Amber-400 (Sand ripples)
        rim: '#fcd34d'         // Amber-300 (Bright sand)
    } 
};

// Obstacle Visual Styles (Matched to Themes)
export const OBSTACLE_STYLES: Record<string, { main: string, light: string, dark: string, detail: string, highlight: string }> = {
    'WALL': { 
        main: '#475569', light: '#64748b', dark: '#334155', detail: '#94a3b8', highlight: '#cbd5e1' 
    }, 
    'TREE': { 
        main: '#3f6212', light: '#4d7c0f', dark: '#1a2e05', detail: '#84cc16', highlight: '#bef264' 
    }, 
    'ICE_CRYSTAL': { 
        main: '#7dd3fc', light: '#bae6fd', dark: '#0ea5e9', detail: '#e0f2fe', highlight: '#ffffff' 
    }, 
    'OBSIDIAN_PILLAR': { 
        main: '#18181b', light: '#27272a', dark: '#09090b', detail: '#ef4444', highlight: '#fca5a5' 
    }, 
    'SANDSTONE': { 
        main: '#b45309', light: '#d97706', dark: '#92400e', detail: '#f59e0b', highlight: '#fde047' 
    } 
};
