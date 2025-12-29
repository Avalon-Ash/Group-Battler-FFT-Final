
import { ProjectileVisualDef } from "./projectiles/definitions";
import { SHARED_PROJECTILES } from "./projectiles/shared";
import { IMPERIAL_PROJECTILES } from "./projectiles/imperial";
import { COVENANT_PROJECTILES } from "./projectiles/covenant";

export * from "./projectiles/definitions";

/**
 * 🏹 PROJECTILE BALISTICS v10.0
 * Speeds normalized for 60FPS high-speed tactical combat.
 */
export const PROJECTILE_VISUALS: Record<string, ProjectileVisualDef> = {
    ...SHARED_PROJECTILES,
    ...IMPERIAL_PROJECTILES,
    ...COVENANT_PROJECTILES,
    
    'ARROW':    { trajectory: 'ARC',    arcHeight: 80,  renderType: 'SPRITE', spriteKey: 'ARROW',    trailLength: 10, speed: 1600 },
    'BOLT':     { trajectory: 'LINEAR',                 renderType: 'SPRITE', spriteKey: 'BOLT',     trailLength: 12, speed: 2200 },
    'FIREBALL': { trajectory: 'WOBBLE', wobbleFreq: 0.3, wobbleAmp: 15, renderType: 'SPRITE', spriteKey: 'FIREBALL', trailLength: 15, speed: 1300 },
    'BOMB':     { trajectory: 'ARC',    arcHeight: 250, spinSpeed: 30, renderType: 'SPRITE', spriteKey: 'BOMB',     trailLength: 0,  speed: 1000 },
    'BEAM':     { trajectory: 'INSTANT',                renderType: 'RAY',    beamWidth: 5,     trailLength: 2,  speed: 8000 },
    
    'DEFAULT':  { trajectory: 'LINEAR',                 renderType: 'SPRITE', spriteKey: 'BOLT',     trailLength: 6,  speed: 1500 }
};
