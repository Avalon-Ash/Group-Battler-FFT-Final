
import { ProjectileVisualDef } from "./projectiles/definitions";
import { SHARED_PROJECTILES } from "./projectiles/shared";
import { IMPERIAL_PROJECTILES } from "./projectiles/imperial";
import { COVENANT_PROJECTILES } from "./projectiles/covenant";

export * from "./projectiles/definitions";

/**
 * 🏹 PROJECTILE BALISTICS v10.1 (Optimized for Visibility)
 * Speeds reduced by ~30% and sizes increased for better readability.
 */
export const PROJECTILE_VISUALS: Record<string, ProjectileVisualDef> = {
    ...SHARED_PROJECTILES,
    ...IMPERIAL_PROJECTILES,
    ...COVENANT_PROJECTILES,
    
    // Generic Overrides - Slower and Bigger
    'ARROW':    { trajectory: 'ARC',    arcHeight: 80,  renderType: 'SPRITE', spriteKey: 'ARROW',    trailLength: 12, speed: 1100, scale: 1.2 },
    'BOLT':     { trajectory: 'LINEAR',                 renderType: 'SPRITE', spriteKey: 'BOLT',     trailLength: 8,  speed: 1300, scale: 1.3 },
    'FIREBALL': { trajectory: 'WOBBLE', wobbleFreq: 0.3, wobbleAmp: 15, renderType: 'SPRITE', spriteKey: 'FIREBALL', trailLength: 15, speed: 1000, scale: 1.4 },
    'BOMB':     { trajectory: 'ARC',    arcHeight: 250, spinSpeed: 10, renderType: 'SPRITE', spriteKey: 'BOMB',     trailLength: 0,  speed: 800, scale: 1.5 },
    'BEAM':     { trajectory: 'INSTANT',                renderType: 'RAY',    beamWidth: 5,     trailLength: 2,  speed: 8000 },
    
    'DEFAULT':  { trajectory: 'LINEAR',                 renderType: 'SPRITE', spriteKey: 'BOLT',     trailLength: 8,  speed: 1200, scale: 1.2 }
};
