
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
    'FX_ULT_RED_BLOODSTORM': {
        id: 'FX_ULT_RED_BLOODSTORM',
        emitters: [
            { particleType: 'ATMOSPHERE', count: [20, 30], lifetime: [1.2, 1.8], size: [80, 110], speed: [15, 40], colors: ['#7f1d1d', '#450a0a'], shape: 'CIRCLE', shapeRadius: 40, blendMode: 'source-over', delay: 0 },
            { particleType: 'SHARD', count: [30, 50], lifetime: [0.8, 1.4], size: [10, 18], speed: [100, 200], vz: [300, 600], gravity: 2000, colors: ['#ef4444', '#000'], shape: 'CIRCLE', shapeRadius: 30, vRotation: [15, 40], delay: 0.05 }
        ]
    },
    'FX_ULT_RED_UNLIMITED_BLADE': {
        id: 'FX_ULT_RED_UNLIMITED_BLADE',
        emitters: [
            // DRASTIC REDUCTION: 15 -> 6 Pillars to fix FPS
            { particleType: 'PILLAR', visualStyle: 'PILLAR_VOID', count: 6, lifetime: [0.5, 1.0], size: [15, 25], height: [200, 300], speed: [0,0], colors: ['#000'], shape: 'CIRCLE', shapeRadius: 120, blendMode: 'source-over', delay: 0 },
            { particleType: 'HEX_GLOW', count: 1, lifetime: [0.1, 0.2], size: [150, 200], colors: ['#ef4444'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },

    // RANGER
    'FX_ULT_RED_RAILGUN': {
        id: 'FX_ULT_RED_RAILGUN',
        emitters: [
            { particleType: 'BEAM', visualStyle: 'DEATH_RAY', count: 1, lifetime: [0.5, 0.8], size: [20, 20], colors: ['#000'], speed: [0,0], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.2, 0.4], size: [50, 100], colors: ['#ef4444'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_RED_INFERNO': {
        id: 'FX_ULT_RED_INFERNO',
        emitters: [
            { particleType: 'BLAST', count: [3, 5], lifetime: [0.5, 1.0], size: [30, 60], colors: ['#ea580c'], speed: [0,0], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [15, 25], lifetime: [0.5, 1.0], size: [3, 6], speed: [50, 100], vz: [100, 200], colors: ['#f97316', '#fff'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'lighter', delay: 0.2 }
        ]
    },
    'FX_ULT_RED_HEADHUNTER': {
        id: 'FX_ULT_RED_HEADHUNTER',
        emitters: [
            { particleType: 'RING', count: 1, lifetime: [0.3, 0.5], size: [20, 80], colors: ['#7f1d1d'], speed: [0,0], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'RUBBLE', count: [8, 12], lifetime: [0.5, 0.8], size: [5, 10], speed: [100, 200], vz: [100, 200], colors: ['#991b1b'], shape: 'BURST_DIR', delay: 0.1 }
        ]
    },
    'FX_ULT_RED_DOOM': {
        id: 'FX_ULT_RED_DOOM',
        emitters: [
            { particleType: 'MAGIC_CIRCLE', count: 1, lifetime: [1.5, 2.0], size: [100, 120], colors: ['#581c87'], speed: [0,0], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SMOKE', count: [8, 12], lifetime: [1.0, 1.5], size: [30, 50], speed: [30, 60], colors: ['#4c1d95', '#000'], shape: 'CIRCLE', shapeRadius: 80, delay: 0.2 }
        ]
    },

    // MAGE
    'FX_ULT_RED_DEATH_FINGER': {
        id: 'FX_ULT_RED_DEATH_FINGER',
        emitters: [
            { particleType: 'BEAM', visualStyle: 'DEATH_RAY', count: 1, lifetime: [0.6, 0.8], size: [15, 15], colors: ['#be123c'], speed: [0,0], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SPARK', count: [15, 25], lifetime: [0.4, 0.6], size: [3, 5], speed: [100, 200], vz: [100, 200], colors: ['#ef4444'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_ULT_RED_SOUL_BURN': {
        id: 'FX_ULT_RED_SOUL_BURN',
        emitters: [
            { particleType: 'BLAST', count: [2, 3], lifetime: [0.5, 0.8], size: [50, 80], colors: ['#dc2626'], speed: [0,0], shape: 'CIRCLE', shapeRadius: 80, blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [10, 20], lifetime: [0.5, 1.0], size: [3, 5], speed: [50, 100], vz: [50, 100], colors: ['#fca5a5'], shape: 'BURST_DIR', delay: 0.1 }
        ]
    },

    // SUPPORT
    'FX_ULT_RED_VOODOO': {
        id: 'FX_ULT_RED_VOODOO',
        emitters: [
            { particleType: 'SMOKE', count: [15, 25], lifetime: [1.0, 1.5], size: [30, 50], speed: [30, 60], colors: ['#4c1d95', '#a78bfa'], shape: 'CIRCLE', shapeRadius: 150, delay: 0 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.5, 0.8], size: [300, 400], colors: ['#581c87'], speed: [0,0], shape: 'POINT', blendMode: 'multiply', delay: 0.2 }
        ]
    },
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
