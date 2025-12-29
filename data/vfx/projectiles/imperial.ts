
import { ProjectileVisualDef } from "./definitions";

export const IMPERIAL_PROJECTILES: Record<string, ProjectileVisualDef> = {
    // --- BLUE FACTION SPECIFIC ---
    
    // Blue Ranger: High Velocity Sniper
    'PROJ_BLUE_SNIPER': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'HEX_DART', 
        scale: 1.8, // Increased visibility
        colorOverride: '#60a5fa',
        speed: 1800, // Slightly reduced from 2500/1500 for better tracking
        trailLength: 20 // Longer trail for speed
    },
    
    // Blue Ranger: Ice Arrow
    'PROJ_BLUE_ICE_ARROW': {
        trajectory: 'ARC',
        arcHeight: 80,
        renderType: 'SPRITE',
        spriteKey: 'CRYSTAL', 
        colorOverride: '#bae6fd',
        scale: 1.5,
        trailLength: 12,
        speed: 1100,
        spinSpeed: 2
    },
    
    // Blue Mage: Arcane Orb
    'PROJ_BLUE_ORB': {
        trajectory: 'WOBBLE',
        wobbleFreq: 0.15, // Slower wobble
        wobbleAmp: 8,
        renderType: 'SPRITE',
        spriteKey: 'ORB', 
        colorOverride: '#8b5cf6',
        scale: 1.4,
        speed: 900,
        spinSpeed: 0,
        trailLength: 10
    },
    
    // Blue Mage: Frost Bolt
    'PROJ_BLUE_FROST_BOLT': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'CRYSTAL',
        scale: 1.3,
        colorOverride: '#e0f2fe',
        speed: 1200,
        trailLength: 12
    },
    
    // Blue Warrior: Shockwave/Slash
    'PROJ_BLUE_WAVE': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'SLASH', 
        colorOverride: '#93c5fd',
        scale: 2.0,
        speed: 1400,
        trailLength: 6
    },

    // ULT BEAMS
    'wb_u5': { trajectory: 'INSTANT', renderType: 'RAY', beamWidth: 15, colorOverride: '#e0f2fe', trailLength: 5 }
};
