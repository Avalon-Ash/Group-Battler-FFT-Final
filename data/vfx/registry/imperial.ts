
import { VFXAsset } from "../../../types/VFXSchema";

export const IMPERIAL_VFX: Record<string, VFXAsset> = {
    
    // --- 🔵 BASIC & ACTIVE (Standard) ---
    'FX_HIT_BLUE_PHYSICAL': {
        id: 'FX_HIT_BLUE_PHYSICAL',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.15, 0.25], size: [20, 35], colors: ['#60a5fa'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [3, 5], lifetime: [0.2, 0.4], size: [2, 4], speed: [150, 300], colors: ['#e0f2fe', '#fff'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_TECH': {
        id: 'FX_HIT_BLUE_TECH',
        emitters: [
            { particleType: 'RING', count: 1, lifetime: [0.1, 0.2], size: [10, 40], colors: ['#22d3ee'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [6, 10], lifetime: [0.1, 0.3], size: [2, 5], speed: [200, 500], colors: ['#67e8f9', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_HOLY': {
        id: 'FX_HIT_BLUE_HOLY',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', height: [40, 60], count: 1, lifetime: [0.2, 0.4], size: [15, 25], speed: [0,0], colors: ['#fef3c7'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [5, 8], lifetime: [0.3, 0.6], size: [3, 6], speed: [80, 200], colors: ['#fbbf24', '#fff'], shape: 'CIRCLE', shapeRadius: 12, blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_ARCANE': {
        id: 'FX_HIT_BLUE_ARCANE',
        emitters: [
            { particleType: 'RING', count: 2, lifetime: [0.2, 0.4], size: [20, 50], colors: ['#a855f7'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE', count: [3, 5], lifetime: [0.4, 0.7], size: [15, 25], speed: [30, 60], colors: ['#d8b4fe', '#c084fc'], shape: 'CIRCLE', shapeRadius: 15, delay: 0 }
        ]
    },
    'FX_HIT_BLUE_ICE': {
        id: 'FX_HIT_BLUE_ICE',
        emitters: [
            { particleType: 'SHARD', count: [5, 8], lifetime: [0.3, 0.6], size: [4, 8], speed: [150, 300], vz: [100, 300], gravity: 1500, colors: ['#bae6fd', '#e0f2fe'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SMOKE', count: [2, 4], lifetime: [0.5, 0.8], size: [20, 30], speed: [20, 50], colors: ['#e0f2fe'], shape: 'CIRCLE', shapeRadius: 10, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ACTIVE_BLUE_TECH_SHIELD': {
        id: 'FX_ACTIVE_BLUE_TECH_SHIELD',
        emitters: [{ particleType: 'HEX_GLOW', count: 1, lifetime: [0.5, 0.8], size: [40, 60], colors: ['#60a5fa'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ACTIVE_BLUE_HOLY_SMITE': {
        id: 'FX_ACTIVE_BLUE_HOLY_SMITE',
        emitters: [{ particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.4, 0.6], size: [20, 30], height: [60, 80], speed: [0,0], colors: ['#fcd34d', '#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ACTIVE_BLUE_TECH_BURST': {
        id: 'FX_ACTIVE_BLUE_TECH_BURST',
        emitters: [{ particleType: 'SHOCKWAVE', count: 1, lifetime: [0.2, 0.3], size: [40, 60], colors: ['#3b82f6'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ACTIVE_BLUE_FROST_SNAP': {
        id: 'FX_ACTIVE_BLUE_FROST_SNAP',
        emitters: [{ particleType: 'SHARD', count: [6, 10], lifetime: [0.4, 0.7], size: [5, 10], speed: [200, 400], vz: [100, 300], gravity: 1500, colors: ['#bae6fd', '#fff'], shape: 'BURST_DIR', delay: 0 }]
    },
    'FX_ACTIVE_BLUE_ARCANE_RIPPLE': {
        id: 'FX_ACTIVE_BLUE_ARCANE_RIPPLE',
        emitters: [{ particleType: 'RING', count: 2, lifetime: [0.4, 0.6], size: [30, 80], colors: ['#a855f7'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },

    // --- 🔵 ULTIMATE UNIQUE EFFECTS (2.5D Volumetric Optimized) ---

    // TANK

    // WARRIOR

    // RANGER

    // MAGE

    // SUPPORT
    'FX_IMPERIAL_SCAN': {
        id: 'FX_IMPERIAL_SCAN',
        emitters: [
            { particleType: 'HEX_GRID', count: 1, lifetime: [0.6, 1.0], size: [100, 150], colors: ['#60a5fa'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RING', count: 1, lifetime: [0.4, 0.6], size: [20, 180], colors: ['#3b82f6'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_IMPERIAL_HALO': {
        id: 'FX_IMPERIAL_HALO',
        emitters: [
            { particleType: 'MAGIC_CIRCLE', count: 1, lifetime: [1.0, 1.5], size: [60, 80], colors: ['#fbbf24'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [5, 10], lifetime: [0.5, 1.0], size: [2, 4], speed: [20, 50], vz: [50, 100], colors: ['#fff'], shape: 'CIRCLE', shapeRadius: 30, delay: 0.1 }
        ]
    }
};
