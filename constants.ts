
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

export const PALETTE = {
    UI_BG: '#0a0a0c', // LoL Client Dark Grey
    UI_BORDER: '#785a28', // Hextech Gold
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
    HP: '#16a34a', // LoL Green HP bar
    MP: '#60a5fa', // Blue-400 (Brighter for visibility)
    CAST: '#fbbf24'
};

// 3D Terrain Materials (Updated for Material 2.0)
// Added 'rim' for edge highlighting and tweaked colors for better contrast
export const TERRAIN_THEMES: Record<string, { top: string, sideLight: string, sideDark: string, detail: string, rim: string }> = {
    'VOID': { 
        top: '#1e293b', sideLight: '#0f172a', sideDark: '#020617', detail: '#334155', rim: '#475569' 
    },
    'FOREST': { 
        top: '#14532d', sideLight: '#166534', sideDark: '#052e16', detail: '#22c55e', rim: '#4ade80' 
    }, 
    'ICE': { 
        top: '#3b82f6', sideLight: '#2563eb', sideDark: '#1e3a8a', detail: '#bfdbfe', rim: '#ffffff' 
    }, 
    'MAGMA': { 
        top: '#450a0a', sideLight: '#2a0a0a', sideDark: '#1a0505', detail: '#ef4444', rim: '#f87171' 
    }, 
    'DESERT': { 
        top: '#92400e', sideLight: '#78350f', sideDark: '#451a03', detail: '#d97706', rim: '#fcd34d' 
    } 
};

// Obstacle Visual Styles
export const OBSTACLE_STYLES: Record<string, { main: string, light: string, dark: string, detail: string }> = {
    'WALL': { main: '#52525b', light: '#71717a', dark: '#3f3f46', detail: '#166534' }, // Stone + Moss
    'TREE': { main: '#431407', light: '#78350f', dark: '#271c19', detail: '#15803d' }, // Dark Wood + Green Leaves
    'ICE_CRYSTAL': { main: '#bae6fd', light: '#e0f2fe', dark: '#7dd3fc', detail: '#fff' }, // Light Blue Ice
    'OBSIDIAN_PILLAR': { main: '#27272a', light: '#3f3f46', dark: '#18181b', detail: '#ef4444' }, // Black Stone + Magma Veins
    'SANDSTONE': { main: '#d97706', light: '#f59e0b', dark: '#b45309', detail: '#78350f' } // Orange Rock
};
