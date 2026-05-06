
import { Team } from '../../types';
import { THEME_IMPERIAL, THEME_COVENANT } from '../../constants';

// =========================================================================================
// 🚩 FACTION VISUAL CONFIGURATION
// 
// Defines the "Look and Feel" specific to each team.
// Replaces hardcoded "if (team === BLUE)" checks in renderers.
// =========================================================================================

export interface FactionVisualDef {
    id: Team;
    name: string;
    
    // Theme Colors
    primaryColor: string;
    secondaryColor: string;
    darkColor: string;
    
    // Visual Preferences
    flightTrailColor: string;
    defaultHitEffect: string; // VFX Registry Key
    
    // Death VFX
    deathShatterColors: string[]; // Palette for debris
    deathSpiritColor: string;     // Color of rising soul/energy

    // Ambient VFX
    ambientGlowColor?: string;
    ambientGlowRadius?: number;
    ambientParticleColor?: string;
    ambientParticleRate?: number;
}

export const FACTION_VISUALS: Record<Team, FactionVisualDef> = {
    [Team.BLUE]: {
        id: Team.BLUE,
        name: 'Imperial',
        primaryColor: THEME_IMPERIAL.primary,
        secondaryColor: THEME_IMPERIAL.energy,
        darkColor: THEME_IMPERIAL.armorDark,
        
        flightTrailColor: '#bae6fd',
        defaultHitEffect: 'FX_HIT_BLUE_PHYSICAL', // Updated
        
        deathShatterColors: [THEME_IMPERIAL.primary, THEME_IMPERIAL.armorLight, THEME_IMPERIAL.armorDark],
        deathSpiritColor: '#60a5fa',

        ambientGlowColor: '#60a5fa',
        ambientGlowRadius: 6,
        ambientParticleColor: '#bae6fd',
        ambientParticleRate: 0.6,
    },
    
    [Team.RED]: {
        id: Team.RED,
        name: 'Covenant',
        primaryColor: THEME_COVENANT.primary,
        secondaryColor: THEME_COVENANT.secondary,
        darkColor: THEME_COVENANT.armorDark,
        
        flightTrailColor: '#fecaca',
        defaultHitEffect: 'FX_HIT_RED_PHYSICAL', // Updated
        
        deathShatterColors: [THEME_COVENANT.primary, THEME_COVENANT.armorBase, '#450a0a'],
        deathSpiritColor: '#ef4444',

        ambientGlowColor: '#dc2626',
        ambientGlowRadius: 10,
        ambientParticleColor: '#7f1d1d',
        ambientParticleRate: 1.2,
    }
};
