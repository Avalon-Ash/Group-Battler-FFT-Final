
import { ProjectileVisualDef } from "./projectiles/definitions";
import { SHARED_PROJECTILES } from "./projectiles/shared";
import { IMPERIAL_PROJECTILES } from "./projectiles/imperial";
import { COVENANT_PROJECTILES } from "./projectiles/covenant";

// Re-export types for consumers
export * from "./projectiles/definitions";

export const PROJECTILE_VISUALS: Record<string, ProjectileVisualDef> = {
    ...SHARED_PROJECTILES,
    ...IMPERIAL_PROJECTILES,
    ...COVENANT_PROJECTILES,
    
    // Add generic fallbacks
    'DEFAULT': { trajectory: 'LINEAR', renderType: 'SPRITE', spriteKey: 'BOLT', trailLength: 5 }
};
