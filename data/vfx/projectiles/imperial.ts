
import { ProjectileVisualDef } from "./definitions";

export const IMPERIAL_PROJECTILES: Record<string, ProjectileVisualDef> = {
    // --- BLUE FACTION SPECIFIC ---
    
    // Blue Ranger: High Velocity Sniper
    'PROJ_BLUE_SNIPER': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'HEX_DART', 
        scale: 1.5, // Bigger
        colorOverride: '#60a5fa',
        speed: 1500, // Was 2500
        trailLength: 15
    },
    
    // Blue Ranger: Ice Arrow
    'PROJ_BLUE_ICE_ARROW': {
        trajectory: 'ARC',
        arcHeight: 80,
        renderType: 'SPRITE',
        spriteKey: 'CRYSTAL', 
        colorOverride: '#bae6fd',
        scale: 1.3,
        trailLength: 10,
        spinSpeed: 2
    },
    
    // Blue Mage: Arcane Orb
    'PROJ_BLUE_ORB': {
        trajectory: 'WOBBLE',
        wobbleFreq: 0.15, // Slower wobble
        wobbleAmp: 5,
        renderType: 'SPRITE',
        spriteKey: 'ORB', 
        colorOverride: '#8b5cf6',
        scale: 1.2,
        spinSpeed: 0,
        trailLength: 8
    },
    
    // Blue Mage: Frost Bolt
    'PROJ_BLUE_FROST_BOLT': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'CRYSTAL',
        scale: 1.2,
        colorOverride: '#e0f2fe',
        trailLength: 12
    },
    
    // Blue Warrior: Shockwave/Slash
    'PROJ_BLUE_WAVE': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'SLASH', // Uses fallback icon logic if sprite not in factory, but it is
        colorOverride: '#93c5fd',
        scale: 1.8,
        trailLength: 5
    },

    // ULT BEAMS
    'wb_u5': { trajectory: 'INSTANT', renderType: 'RAY', beamWidth: 15, colorOverride: '#e0f2fe', trailLength: 5 }
};
