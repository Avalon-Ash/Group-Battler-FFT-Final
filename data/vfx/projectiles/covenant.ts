
import { ProjectileVisualDef } from "./definitions";

export const COVENANT_PROJECTILES: Record<string, ProjectileVisualDef> = {
    // --- RED FACTION SPECIFIC ---
    
    'PROJ_RED_HEAVY_BOLT': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'BOLT',
        scale: 2.0, // Heavy impact
        colorOverride: '#450a0a', 
        speed: 900, // Slow and heavy
        trailLength: 10
    },
    'PROJ_RED_CHAOS_ORB': {
        trajectory: 'WOBBLE',
        wobbleFreq: 0.3, // Erratic
        wobbleAmp: 15,
        renderType: 'SPRITE',
        spriteKey: 'FIREBALL',
        colorOverride: '#a3e635', 
        scale: 1.5,
        spinSpeed: 5,
        trailLength: 15
    },
    'PROJ_RED_AXE': {
        trajectory: 'ARC',
        arcHeight: 60,
        renderType: 'SPRITE',
        spriteKey: 'AXE', 
        spinSpeed: 15, // Visible spin
        scale: 1.4,
        colorOverride: '#7f1d1d',
        trailLength: 5
    },
    'PROJ_RED_SHADOW': {
        trajectory: 'WOBBLE',
        wobbleFreq: 0.1,
        wobbleAmp: 5,
        renderType: 'SPRITE',
        spriteKey: 'BOLT',
        colorOverride: '#581c87', 
        scale: 1.3,
        trailLength: 10
    },
    
    // ULT BEAMS
    'rr_u1': { trajectory: 'INSTANT', renderType: 'RAY', beamWidth: 20, colorOverride: '#000000', trailLength: 2 },
    'mr_u2': { trajectory: 'INSTANT', renderType: 'RAY', beamWidth: 8, colorOverride: '#b91c1c', trailLength: 2 }
};
