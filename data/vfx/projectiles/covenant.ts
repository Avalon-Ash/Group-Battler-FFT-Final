
import { ProjectileVisualDef } from "./definitions";

export const COVENANT_PROJECTILES: Record<string, ProjectileVisualDef> = {
    // --- RED FACTION SPECIFIC ---
    
    'PROJ_RED_HEAVY_BOLT': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'BOLT',
        scale: 1.5,
        colorOverride: '#450a0a', 
        trailLength: 10
    },
    'PROJ_RED_CHAOS_ORB': {
        trajectory: 'WOBBLE',
        wobbleFreq: 0.3,
        wobbleAmp: 15,
        renderType: 'SPRITE',
        spriteKey: 'FIREBALL',
        colorOverride: '#a3e635', 
        trailLength: 12
    },
    'PROJ_RED_AXE': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'SMASH', 
        spinSpeed: 25, 
        scale: 1.2,
        colorOverride: '#7f1d1d',
        trailLength: 4
    },
    'PROJ_RED_SHADOW': {
        trajectory: 'WOBBLE',
        wobbleFreq: 0.1,
        wobbleAmp: 5,
        renderType: 'SPRITE',
        spriteKey: 'BOLT',
        colorOverride: '#581c87', 
        trailLength: 8
    },
    
    // ULT BEAMS
    'rr_u1': { trajectory: 'INSTANT', renderType: 'RAY', beamWidth: 20, colorOverride: '#000000', trailLength: 2 },
    'mr_u2': { trajectory: 'INSTANT', renderType: 'RAY', beamWidth: 8, colorOverride: '#b91c1c', trailLength: 2 }
};
