
import { VFXAsset } from "../../../types/VFXSchema";

export const COVENANT_VFX: Record<string, VFXAsset> = {
    
    // --- 🔴 BASIC & ACTIVE (Standard) ---
    'FX_HIT_RED_PHYSICAL': {
        id: 'FX_HIT_RED_PHYSICAL',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.15, 0.25], size: [25, 40], colors: ['#ef4444'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [4, 6], lifetime: [0.2, 0.4], size: [2, 4], speed: [200, 400], colors: ['#fca5a5', '#fff'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_HIT_RED_HEAVY': {
        id: 'FX_HIT_RED_HEAVY',
        emitters: [
            { particleType: 'RUBBLE', count: [5, 8], lifetime: [0.4, 0.7], size: [6, 10], speed: [150, 350], vz: [200, 500], gravity: 3000, colors: ['#450a0a', '#1c1917'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'BLAST', count: 1, lifetime: [0.1, 0.2], size: [30, 50], colors: ['#7f1d1d'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_HIT_RED_BLOOD': {
        id: 'FX_HIT_RED_BLOOD',
        emitters: [
            { particleType: 'RUBBLE', count: [6, 10], lifetime: [0.3, 0.6], size: [4, 7], speed: [100, 250], vz: [100, 300], gravity: 2000, colors: ['#991b1b', '#ef4444'], shape: 'BURST_DIR', delay: 0 }, 
            { particleType: 'GLOW', count: 1, lifetime: [0.2, 0.3], size: [40, 60], colors: ['#7f1d1d'], speed: [0,0], shape: 'POINT', blendMode: 'multiply', delay: 0 } 
        ]
    },
    'FX_HIT_RED_MAGMA': {
        id: 'FX_HIT_RED_MAGMA',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.2, 0.3], size: [30, 50], colors: ['#ea580c'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [8, 12], lifetime: [0.3, 0.5], size: [3, 5], speed: [200, 500], colors: ['#fcd34d', '#f97316'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_RED_FEL': {
        id: 'FX_HIT_RED_FEL',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.2, 0.4], size: [30, 60], colors: ['#a3e635'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE', count: [3, 5], lifetime: [0.5, 0.8], size: [15, 25], speed: [20, 50], colors: ['#4d7c0f', '#3f6212'], shape: 'CIRCLE', shapeRadius: 10, delay: 0 }
        ]
    },
    'FX_HIT_RED_SHADOW': {
        id: 'FX_HIT_RED_SHADOW',
        emitters: [
            { particleType: 'SMOKE_PUFF', count: [2, 4], lifetime: [0.4, 0.7], size: [20, 40], speed: [30, 60], colors: ['#581c87', '#000'], shape: 'CIRCLE', delay: 0 },
            { particleType: 'RING', count: 1, lifetime: [0.2, 0.4], size: [20, 40], colors: ['#7c3aed'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ACTIVE_RED_SHADOW_SCREAM': {
        id: 'FX_ACTIVE_RED_SHADOW_SCREAM',
        emitters: [{ particleType: 'SHOCKWAVE', count: 1, lifetime: [0.3, 0.5], size: [40, 70], colors: ['#7c3aed'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ACTIVE_RED_WAR_STOMP': {
        id: 'FX_ACTIVE_RED_WAR_STOMP',
        emitters: [{ particleType: 'RUBBLE', count: [6, 10], lifetime: [0.4, 0.7], size: [6, 12], speed: [200, 400], vz: [300, 600], gravity: 2500, colors: ['#450a0a', '#1c1917'], shape: 'BURST_DIR', delay: 0 }]
    },
    'FX_ACTIVE_RED_BLOOD_RAGE': {
        id: 'FX_ACTIVE_RED_BLOOD_RAGE',
        emitters: [{ particleType: 'GLOW', count: 1, lifetime: [0.3, 0.5], size: [50, 80], colors: ['#ef4444'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ACTIVE_RED_MAGMA_ERUPTION': {
        id: 'FX_ACTIVE_RED_MAGMA_ERUPTION',
        emitters: [{ particleType: 'BLAST', count: 1, lifetime: [0.3, 0.5], size: [40, 70], colors: ['#ea580c'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ACTIVE_RED_FEL_SPLASH': {
        id: 'FX_ACTIVE_RED_FEL_SPLASH',
        emitters: [{ particleType: 'SMOKE', count: [4, 6], lifetime: [0.6, 0.9], size: [20, 30], speed: [20, 50], colors: ['#a3e635', '#4d7c0f'], shape: 'CIRCLE', shapeRadius: 15, blendMode: 'screen', delay: 0 }]
    },

    // --- 🔴 ULTIMATE UNIQUE EFFECTS (2.5D Volumetric Optimized) ---

    // TANK

    // WARRIOR

    // RANGER

    // MAGE

    // SUPPORT
    'FX_COVENANT_RIFT': {
        id: 'FX_COVENANT_RIFT',
        emitters: [
            { particleType: 'CHAOS_RIFT', count: 1, lifetime: [0.8, 1.2], size: [80, 120], colors: ['#581c87'], speed: [0,0], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SMOKE_PUFF', count: [5, 10], lifetime: [0.4, 0.8], size: [30, 50], speed: [20, 40], colors: ['#000'], shape: 'CIRCLE', shapeRadius: 40, delay: 0.1 }
        ]
    },
    'FX_COVENANT_BLOOD_SPIKE': {
        id: 'FX_COVENANT_BLOOD_SPIKE',
        emitters: [
            { particleType: 'SPIKE', count: [3, 5], lifetime: [0.4, 0.6], size: [40, 60], colors: ['#7f1d1d'], speed: [100, 200], vz: [200, 400], gravity: 2000, shape: 'BURST_DIR', delay: 0 },
            { particleType: 'GLOW', count: 1, lifetime: [0.2, 0.4], size: [60, 100], colors: ['#ef4444'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    }
};
