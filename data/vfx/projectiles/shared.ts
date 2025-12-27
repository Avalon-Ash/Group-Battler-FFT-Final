
import { ProjectileVisualDef } from "./definitions";

export const SHARED_PROJECTILES: Record<string, ProjectileVisualDef> = {
    // --- GENERIC ---
    'ARROW': { trajectory: 'ARC', arcHeight: 120, renderType: 'SPRITE', spriteKey: 'ARROW', trailLength: 8 },
    'BOLT': { trajectory: 'LINEAR', renderType: 'SPRITE', spriteKey: 'BOLT', trailLength: 5 },
    'FIREBALL': { trajectory: 'WOBBLE', wobbleFreq: 0.2, wobbleAmp: 10, renderType: 'SPRITE', spriteKey: 'FIREBALL', trailLength: 8 },
    'BOMB': { trajectory: 'ARC', arcHeight: 200, spinSpeed: 15, renderType: 'SPRITE', spriteKey: 'BOMB', trailLength: 0 },
    'BEAM': { trajectory: 'INSTANT', renderType: 'RAY', beamWidth: 3, trailLength: 2 },
};
