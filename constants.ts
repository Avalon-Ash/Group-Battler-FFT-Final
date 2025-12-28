
import { Team } from './types';

// --- GEOMETRY SCALE ---
export const HEX_SIZE = 44; 
export const BLOCK_HEIGHT = 24; 
export const MAX_TERRAIN_TIER = 6; // Reduced from 8 to fit smaller map scale better
export const ISO_SCALE_Y = 0.58; 

// --- VISUAL STANDARDS (UNIT ANCHORS) ---
export const UNIT_VISUAL_HEIGHT = 100; 
export const UNIT_BODY_OFFSET = 40;    
export const UNIT_HOVER_OFFSET = 6; // Standard lift for unit base/shadow separation

export const HUD_PADDING = 10;         

export const STATUS_ICON_OFFSET = 120; 
export const HUD_BAR_OFFSET = 150;     

// --- HUD & FEEDBACK CONFIG ---
export const HUD_TEXT_OFFSET = HUD_BAR_OFFSET + 30;
export const KILL_STREAK_WINDOW = 12.0; 

// --- PHYSICS & FALL DAMAGE ---
export const PHYSICS = {
    GRAVITY: 2500, // Heavier gravity for snappier falls
    SAFE_FALL_VELOCITY: 800, 
    FATAL_FALL_VELOCITY: 2400, 
    FALL_DAMAGE_MIN: 100, // Higher penalty
};

// --- ASSET PALETTES ---
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
    secondary: '#f87171',  
    armorDark: '#09090b',  
    armorBase: '#27272a',  
    accent: '#7f1d1d',     
    spike: '#18181b'       
};

// 2. LOG & UI COLORS
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
        [Team.BLUE]: { 
            main: '#2563eb', 
            dark: '#1e3a8a', 
            light: '#fbbf24', 
            glow: 'rgba(59, 130, 246, 0.8)',
            accent: '#f8fafc' 
        }, 
        [Team.RED]: { 
            main: '#dc2626', 
            dark: '#450a0a', 
            light: '#a1a1aa', 
            glow: 'rgba(220, 38, 38, 0.8)',
            accent: '#1c1917' 
        }
    },
    
    DAMAGE: '#ffffff',
    HEAL: '#10b981', 
    CRIT: '#ef4444', 
    MAGIC: '#8b5cf6' 
};

export const COMBAT_PARAM = {
    HIT_IMPULSE_MAX: 600, // Massive physics kick
    HIT_IMPULSE_MIN: 150, 
    DR_RESET_TIME: 10.0,
    EXECUTE_THRESHOLD: 0.3, 
    BASE_EXECUTE_MULTIPLIER: 1.5,
    BASE_VAMP_PCT: 0.5,
    MANA_BURN_DEFAULT: 30,
    MANA_RESTORE_DEFAULT: 30,
};

// --- MATERIAL 2.0 DEFINITIONS ---
export const TERRAIN_THEMES: Record<string, { top: string, sideLight: string, sideDark: string, detail: string, rim: string }> = {
    'VOID': { 
        top: '#1e293b',        
        sideLight: '#0f172a',  
        sideDark: '#020617',   
        detail: '#334155',     
        rim: '#64748b'         
    },
    'FOREST': { 
        top: '#15803d',        
        sideLight: '#14532d',  
        sideDark: '#052e16',   
        detail: '#4ade80',     
        rim: '#86efac'         
    }, 
    'ICE': { 
        top: '#60a5fa',        
        sideLight: '#2563eb',  
        sideDark: '#1e40af',   
        detail: '#dbeafe',     
        rim: '#ffffff'         
    }, 
    'MAGMA': { 
        top: '#450a0a',        
        sideLight: '#27272a',  
        sideDark: '#18181b',   
        detail: '#ef4444',     
        rim: '#f87171'         
    }, 
    'DESERT': { 
        top: '#d97706',        
        sideLight: '#b45309',  
        sideDark: '#78350f',   
        detail: '#fbbf24',     
        rim: '#fcd34d'         
    } 
};

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
