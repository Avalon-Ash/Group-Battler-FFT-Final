
import { ProjectileVisualDef } from "./projectiles/definitions";
import { SHARED_PROJECTILES } from "./projectiles/shared";
import { IMPERIAL_PROJECTILES } from "./projectiles/imperial";
import { COVENANT_PROJECTILES } from "./projectiles/covenant";

export * from "./projectiles/definitions";

/**
 * 🏹 PROJECTILE BALLISTICS v12.0 - Faction Differentiation
 * Imperial: Faster, Linear, Long/Thin Trails.
 * Covenant: Slower, Heavier, Wide/Smoky Trails.
 */
export const PROJECTILE_VISUALS: Record<string, ProjectileVisualDef> = {
    ...SHARED_PROJECTILES,
    ...IMPERIAL_PROJECTILES,
    ...COVENANT_PROJECTILES,
    
    // --- GENERIC OVERRIDES ---
    'ARROW': { 
        trajectory: 'ARC', arcHeight: 150, 
        renderType: 'SPRITE', spriteKey: 'ARROW', 
        trailLength: 12, speed: 650, scale: 0.7 
    },
    'BOLT': { 
        trajectory: 'HOVER_DIP', dipAmount: 18, 
        renderType: 'SPRITE', spriteKey: 'BOLT', 
        trailLength: 10, speed: 750, scale: 0.7 
    },
    
    // --- IMPERIAL OVERRIDES (Blue) ---
    // Characteristics: Speed, Precision, "Railgun" look
    'PROJ_BLUE_SNIPER': {
        trajectory: 'HOVER_DIP', dipAmount: 10,
        renderType: 'SPRITE', spriteKey: 'HEX_DART', 
        scale: 0.9, 
        colorOverride: '#60a5fa',
        speed: 1600, // Very Fast
        trailLength: 40 // Very Long Trail
    },
    'PROJ_BLUE_ICE_ARROW': {
        trajectory: 'ARC', arcHeight: 80, // Flatter Arc
        renderType: 'SPRITE', spriteKey: 'CRYSTAL', 
        colorOverride: '#bae6fd',
        scale: 0.8,
        trailLength: 20,
        speed: 900,
        spinSpeed: 5
    },
    'PROJ_BLUE_ORB': {
        trajectory: 'WOBBLE', wobbleFreq: 1.0, wobbleAmp: 5, // Tight wobble
        renderType: 'SPRITE', spriteKey: 'ORB', 
        colorOverride: '#8b5cf6',
        scale: 0.9,
        speed: 700,
        spinSpeed: 0,
        trailLength: 15
    },
    'PROJ_BLUE_FROST_BOLT': {
        trajectory: 'HOVER_DIP', dipAmount: 15,
        renderType: 'SPRITE', spriteKey: 'CRYSTAL',
        scale: 0.8,
        colorOverride: '#e0f2fe',
        speed: 1000,
        trailLength: 25
    },

    // --- COVENANT OVERRIDES (Red) ---
    // Characteristics: Weight, Chaos, "Magma" look
    'PROJ_RED_HEAVY_BOLT': {
        trajectory: 'HOVER_DIP', dipAmount: 30,
        renderType: 'SPRITE', spriteKey: 'BOLT',
        scale: 1.2, // Bulky
        colorOverride: '#450a0a', 
        speed: 600, // Slower, feels heavy
        trailLength: 15 // Shorter but thicker (handled by Drawer)
    },
    'PROJ_RED_CHAOS_ORB': {
        trajectory: 'WOBBLE', wobbleFreq: 3.5, wobbleAmp: 25, // Erratic wobble
        renderType: 'SPRITE', spriteKey: 'FIREBALL',
        colorOverride: '#a3e635', 
        scale: 1.1,
        speed: 550,
        spinSpeed: 8,
        trailLength: 18
    },
    'PROJ_RED_AXE': {
        trajectory: 'ARC', arcHeight: 120, // High, lobbed arc (adjusted for adaptive logic)
        renderType: 'SPRITE', spriteKey: 'AXE', 
        spinSpeed: 15, 
        scale: 1.1,
        speed: 700,
        colorOverride: '#7f1d1d',
        trailLength: 8
    },
    'PROJ_RED_SHADOW': {
        trajectory: 'WOBBLE', wobbleFreq: 0.5, wobbleAmp: 10,
        renderType: 'SPRITE', spriteKey: 'BOLT',
        colorOverride: '#581c87', 
        scale: 1.0,
        speed: 600,
        trailLength: 20
    }
};
