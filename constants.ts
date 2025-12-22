
import { Team } from './types';

export const HEX_SIZE = 36; // Slightly smaller to accommodate height
export const BLOCK_HEIGHT = 24; // Increased to 24 for distinct "Step" look (Tactics Ogre style)
export const MAX_TERRAIN_TIER = 6; // Max height steps

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

// 3D Terrain Materials
// FIX: Darkened ICE top color to improve VFX visibility
export const TERRAIN_THEMES: Record<string, { top: string, sideLight: string, sideDark: string, detail: string }> = {
    'VOID': { top: '#1e293b', sideLight: '#0f172a', sideDark: '#020617', detail: '#334155' },
    'FOREST': { top: '#166534', sideLight: '#14532d', sideDark: '#052e16', detail: '#15803d' }, // Darker Green
    'ICE': { top: '#60a5fa', sideLight: '#3b82f6', sideDark: '#1e40af', detail: '#93c5fd' }, // Blue-400 (Frozen Lake) instead of White
    'MAGMA': { top: '#450a0a', sideLight: '#2a0a0a', sideDark: '#1a0505', detail: '#ef4444' }, // Obsidian
    'DESERT': { top: '#b45309', sideLight: '#92400e', sideDark: '#78350f', detail: '#d97706' } // Sandstone
};

// Obstacle Visual Styles
export const OBSTACLE_STYLES: Record<string, { main: string, light: string, dark: string, detail: string }> = {
    'WALL': { main: '#52525b', light: '#71717a', dark: '#3f3f46', detail: '#166534' }, // Stone + Moss
    'TREE': { main: '#431407', light: '#78350f', dark: '#271c19', detail: '#15803d' }, // Dark Wood + Green Leaves
    'ICE_CRYSTAL': { main: '#bae6fd', light: '#e0f2fe', dark: '#7dd3fc', detail: '#fff' }, // Light Blue Ice
    'OBSIDIAN_PILLAR': { main: '#27272a', light: '#3f3f46', dark: '#18181b', detail: '#ef4444' }, // Black Stone + Magma Veins
    'SANDSTONE': { main: '#d97706', light: '#f59e0b', dark: '#b45309', detail: '#78350f' } // Orange Rock
};
