
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
    'PROJ_BLUE_LIGHT_ARROW': {
        trajectory: 'HOVER_DIP', dipAmount: 10,
        renderType: 'SPRITE', spriteKey: 'ARROW', 
        scale: 0.9, 
        colorOverride: '#60a5fa',
        speed: 1600, // Very Fast
        trailLength: 40 // Very Long Trail
    },
    'PROJ_BLUE_ICE_ARROW': {
        trajectory: 'ARC', arcHeight: 80, // Flatter Arc
        renderType: 'SPRITE', spriteKey: 'ARROW', 
        colorOverride: '#bae6fd',
        scale: 0.8,
        trailLength: 20,
        speed: 900,
        spinSpeed: 5
    },
    'PROJ_BLUE_ORB': {
        trajectory: 'WOBBLE', wobbleFreq: 1.0, wobbleAmp: 5, // Tight wobble
        renderType: 'SPRITE', spriteKey: 'FIREBALL', 
        colorOverride: '#8b5cf6',
        scale: 0.9,
        speed: 700,
        spinSpeed: 0,
        trailLength: 15
    },
    'PROJ_BLUE_FROST_BOLT': {
        trajectory: 'HOVER_DIP', dipAmount: 15,
        renderType: 'SPRITE', spriteKey: 'BOLT',
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
        renderType: 'SPRITE', spriteKey: 'ARROW', 
        spinSpeed: 15, 
        scale: 1.1,
        speed: 700,
        colorOverride: '#7f1d1d',
        trailLength: 8
    },
    // rr_a2 爆裂散射：近距離霰彈（短、直、快）
    'PROJ_RED_SCATTER_SHOT': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE', spriteKey: 'BOLT',
        colorOverride: '#7c2d12',
        scale: 0.9,
        trailLength: 6
    },
    // tr_a1 奪命血鉤：直線甩出的血色鉤索
    'PROJ_RED_BLOOD_HOOK': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE', spriteKey: 'ARROW',
        colorOverride: '#991b1b',
        scale: 1.2,
        trailLength: 24
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
