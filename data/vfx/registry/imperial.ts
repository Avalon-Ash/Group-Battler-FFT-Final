
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
    'FX_ULT_BLUE_BLADESTORM': {
        id: 'FX_ULT_BLUE_BLADESTORM',
        emitters: [
            { particleType: 'SLASH', count: [5, 8], lifetime: [0.4, 0.6], size: [80, 120], colors: ['#60a5fa', '#93c5fd'], speed: [0,0], shape: 'CIRCLE', shapeRadius: 50, blendMode: 'screen', delay: 0, vRotation: [360, 720] },
            { particleType: 'RING', count: 1, lifetime: [0.8, 1.2], size: [100, 150], colors: ['#3b82f6'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_LIGHTSPEED': {
        id: 'FX_ULT_BLUE_LIGHTSPEED',
        emitters: [
            { particleType: 'BEAM', count: 3, lifetime: [0.2, 0.4], size: [20, 80], colors: ['#e0f2fe', '#fff'], speed: [0,0], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 },
            { particleType: 'HEX_GLOW', count: 1, lifetime: [0.1, 0.2], size: [80, 150], colors: ['#bae6fd'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },

    // RANGER
    'FX_ULT_BLUE_STARFALL': {
        id: 'FX_ULT_BLUE_STARFALL',
        emitters: [
            { particleType: 'SPARK', count: [10, 20], lifetime: [0.5, 1.0], size: [5, 10], speed: [200, 400], colors: ['#fcd34d', '#fff'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'lighter', delay: 0 },
            { particleType: 'RING', count: 2, lifetime: [0.5, 1.0], size: [50, 300], colors: ['#fef3c7'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.2 }
        ]
    },
    'FX_ULT_BLUE_OVERLOAD': {
        id: 'FX_ULT_BLUE_OVERLOAD',
        emitters: [
            { particleType: 'SPARK', count: [25, 40], lifetime: [0.3, 0.6], size: [3, 6], speed: [400, 800], colors: ['#38bdf8', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'RING', count: 2, lifetime: [0.2, 0.4], size: [50, 150], colors: ['#fff'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },

    // MAGE
    'FX_ULT_BLUE_TORRENT': {
        id: 'FX_ULT_BLUE_TORRENT',
        emitters: [
            { particleType: 'SHARD', count: [10, 20], lifetime: [0.5, 1.0], size: [5, 10], speed: [200, 400], colors: ['#a855f7', '#d8b4fe'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE_PUFF', count: [5, 10], lifetime: [0.5, 1.0], size: [20, 40], speed: [50, 100], colors: ['#7c3aed'], shape: 'CIRCLE', shapeRadius: 40, delay: 0 }
        ]
    },
    'FX_ULT_BLUE_FOCUS_BEAM': {
        id: 'FX_ULT_BLUE_FOCUS_BEAM',
        emitters: [
            { particleType: 'BEAM', visualStyle: 'DEATH_RAY', count: 1, lifetime: [0.8, 1.0], size: [20, 20], colors: ['#60a5fa'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.3, 0.5], size: [50, 100], colors: ['#3b82f6'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },

    // SUPPORT
    'FX_ULT_BLUE_HYMN': {
        id: 'FX_ULT_BLUE_HYMN',
        emitters: [
            { particleType: 'RING', count: 3, lifetime: [1.0, 1.5], size: [50, 300], colors: ['#3b82f6', '#fff'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [10, 20], lifetime: [1.0, 2.0], size: [3, 5], speed: [50, 100], vz: [50, 100], colors: ['#93c5fd'], shape: 'CIRCLE', shapeRadius: 150, delay: 0 }
        ]
    },
    'FX_ULT_BLUE_RAIN': {
        id: 'FX_ULT_BLUE_RAIN',
        emitters: [
            // DRASTIC REDUCTION: 50-80 -> 20-30 sparks
            { particleType: 'SPARK', count: [20, 30], lifetime: [1.0, 1.5], size: [2, 4], speed: [50, 100], vz: [-200, -300], colors: ['#86efac', '#dcfce7'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'screen', delay: 0 },
            { particleType: 'HEX_GLOW', count: [3, 5], lifetime: [0.5, 1.0], size: [10, 20], colors: ['#bbf7d0'], speed: [0,0], shape: 'CIRCLE', shapeRadius: 150, delay: 0.5 }
        ]
    },
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
