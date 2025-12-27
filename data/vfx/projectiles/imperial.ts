
import { ProjectileVisualDef } from "./definitions";

export const IMPERIAL_PROJECTILES: Record<string, ProjectileVisualDef> = {
    // --- BLUE FACTION SPECIFIC ---
    
    // Blue Ranger: High Velocity Sniper
    'PROJ_BLUE_SNIPER': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'ARROW',
        scale: 1.2,
        colorOverride: '#60a5fa',
        trailLength: 15
    },
    
    // Blue Ranger: Ice Arrow
    'PROJ_BLUE_ICE_ARROW': {
        trajectory: 'ARC',
        arcHeight: 100,
        renderType: 'SPRITE',
        spriteKey: 'ARROW',
        colorOverride: '#bae6fd',
        trailLength: 10
    },
    
    // Blue Mage: Arcane Orb
    'PROJ_BLUE_ORB': {
        trajectory: 'WOBBLE',
        wobbleFreq: 0.4,
        wobbleAmp: 5,
        renderType: 'SPRITE',
        spriteKey: 'FIREBALL', // Reusing fireball sprite for spherical look
        colorOverride: '#8b5cf6',
        spinSpeed: 5,
        trailLength: 8
    },
    
    // Blue Mage: Frost Bolt
    'PROJ_BLUE_FROST_BOLT': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'BOLT',
        colorOverride: '#e0f2fe',
        trailLength: 6
    },
    
    // Blue Warrior: Shockwave/Slash
    'PROJ_BLUE_WAVE': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'SLASH',
        colorOverride: '#93c5fd',
        scale: 1.5,
        trailLength: 4
    },

    // ULT BEAMS
    'wb_u5': { trajectory: 'INSTANT', renderType: 'RAY', beamWidth: 15, colorOverride: '#e0f2fe', trailLength: 5 }
};
