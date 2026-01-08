
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
    'FX_ULT_BLUE_SANCTUARY_IMPACT': {
        id: 'FX_ULT_BLUE_SANCTUARY_IMPACT',
        emitters: [
            // Replaced generic PILLAR with MAGIC_CIRCLE + GIANT_HEX combo
            { particleType: 'MAGIC_CIRCLE', count: 1, lifetime: [3.0, 4.0], size: [120, 140], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0, vRotation: [1.0, 1.0] },
            { particleType: 'GIANT_HEX', count: 1, lifetime: [1.5, 2.5], size: [80, 100], colors: ['#fef3c7'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [15, 25], lifetime: [1.2, 2.0], size: [4, 8], speed: [60, 150], vz: [150, 400], gravity: -150, colors: ['#ffffff', '#fde047'], shape: 'CIRCLE', shapeRadius: 60, blendMode: 'lighter', delay: 0.1 }
        ]
    },
    'FX_ULT_BLUE_KINGS_BLESSING': {
        id: 'FX_ULT_BLUE_KINGS_BLESSING',
        emitters: [
            { particleType: 'GIANT_HEX', count: 1, lifetime: [1.5, 2.0], size: [60, 80], colors: ['#fffbeb'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RING', count: 1, lifetime: [0.8, 1.4], size: [60, 250], colors: ['#fcd34d'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0.1 },
            { particleType: 'HEX_GLOW', count: 1, lifetime: [0.5, 1.0], size: [80, 120], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_AEGIS_IMPACT': {
        id: 'FX_ULT_BLUE_AEGIS_IMPACT',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.4, 0.6], size: [200, 350], colors: ['#3b82f6'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            // Single massive volumetric hex
            { particleType: 'GIANT_HEX', count: 1, lifetime: [2.0, 3.0], size: [120, 140], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'HEX_GLOW', count: 2, lifetime: [1.0, 1.5], size: [60, 90], colors: ['#60a5fa'], speed: [0, 0], shape: 'CIRCLE', shapeRadius: 80, blendMode: 'screen', delay: 0.15 }
        ]
    },
    'FX_ULT_BLUE_TITAN_SMASH': {
        id: 'FX_ULT_BLUE_TITAN_SMASH',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.3, 0.5], size: [150, 300], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'CRACKS', count: 1, lifetime: [2.0, 3.0], size: [100, 140], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RUBBLE', count: [10, 20], lifetime: [0.8, 1.5], size: [8, 16], speed: [300, 700], gravity: 2500, colors: ['#d97706', '#92400e'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_FINAL_DEFENSE': {
        id: 'FX_ULT_BLUE_FINAL_DEFENSE',
        emitters: [
            { particleType: 'DOMAIN', visualStyle: 'DOMAIN_SHIELD', count: 1, lifetime: [3.0, 4.0], size: [180, 220], colors: ['#60a5fa'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GRID_FIELD', visualStyle: 'GRID_TECH_BLUE', count: 1, lifetime: [3.0, 4.0], size: [150, 180], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'overlay', delay: 0 }
        ]
    },

    // WARRIOR
    'FX_ULT_BLUE_THUNDER_SLAM': {
        id: 'FX_ULT_BLUE_THUNDER_SLAM',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.2, 0.4], size: [150, 300], colors: ['#3b82f6', '#fff'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [20, 30], lifetime: [0.5, 0.8], size: [3, 6], speed: [400, 800], colors: ['#60a5fa', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'GIANT_HEX', count: 1, lifetime: [0.3, 0.5], size: [60, 80], speed: [0,0], colors: ['#93c5fd'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_DAYBREAK': {
        id: 'FX_ULT_BLUE_DAYBREAK',
        emitters: [
            { particleType: 'HEX_GLOW', count: 1, lifetime: [0.2, 0.4], size: [150, 250], colors: ['#fef3c7'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RING', count: 2, lifetime: [0.3, 0.6], size: [50, 250], colors: ['#f59e0b'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 },
            { particleType: 'SPARK', count: [15, 25], lifetime: [0.4, 0.7], size: [4, 8], speed: [300, 600], colors: ['#fcd34d', '#fff'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_EXCALIBUR': {
        id: 'FX_ULT_BLUE_EXCALIBUR',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.5, 0.8], size: [40, 60], height: [800, 800], speed: [0,0], colors: ['#facc15'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SLASH', count: 1, lifetime: [0.2, 0.4], size: [150, 200], colors: ['#fef08a'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1, vRotation: 45 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.3, 0.5], size: [100, 200], colors: ['#eab308'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
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
    'FX_ULT_BLUE_GLACIAL_BURST': {
        id: 'FX_ULT_BLUE_GLACIAL_BURST',
        emitters: [
            { particleType: 'SHARD', count: [15, 25], lifetime: [1.0, 1.5], size: [8, 15], speed: [300, 600], vz: [400, 800], gravity: 1500, colors: ['#bae6fd', '#fff'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE', count: [10, 15], lifetime: [1.5, 2.5], size: [60, 100], speed: [100, 200], colors: ['#e0f2fe', '#fff'], shape: 'CIRCLE', shapeRadius: 80, blendMode: 'screen', delay: 0.1 },
            { particleType: 'GIANT_HEX', count: 1, lifetime: [1.0, 1.5], size: [80, 120], colors: ['#60a5fa'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_STARFALL': {
        id: 'FX_ULT_BLUE_STARFALL',
        emitters: [
            { particleType: 'SPARK', count: [10, 20], lifetime: [0.5, 1.0], size: [5, 10], speed: [200, 400], colors: ['#fcd34d', '#fff'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'lighter', delay: 0 },
            { particleType: 'RING', count: 2, lifetime: [0.5, 1.0], size: [50, 300], colors: ['#fef3c7'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.2 }
        ]
    },
    'FX_ULT_BLUE_ORBITAL_BEAM': {
        id: 'FX_ULT_BLUE_ORBITAL_BEAM',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [1.2, 1.8], size: [120, 150], speed: [0, 0], colors: ['#22d3ee', '#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.4, 0.7], size: [100, 400], colors: ['#06b6d4'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
    'FX_ULT_BLUE_LOCKDOWN': {
        id: 'FX_ULT_BLUE_LOCKDOWN',
        emitters: [
            { particleType: 'GIANT_HEX', count: 1, lifetime: [1.5, 2.5], size: [80, 100], colors: ['#8b5cf6'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GRID_FIELD', count: 1, lifetime: [2.0, 3.0], size: [120, 120], colors: ['#7c3aed'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
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
    'FX_ULT_BLUE_BLACKHOLE': {
        id: 'FX_ULT_BLUE_BLACKHOLE',
        emitters: [
            { particleType: 'BLACK_HOLE', count: 1, lifetime: [2.0, 2.5], size: [120, 150], speed: [0,0], colors: ['#8b5cf6'], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.5, 0.8], size: [150, 250], colors: ['#c084fc'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 },
            { particleType: 'SMOKE', count: [5, 8], lifetime: [1.0, 1.5], size: [15, 30], speed: [50, 100], colors: ['#000', '#4c1d95'], shape: 'CIRCLE', shapeRadius: 60, delay: 0.2 }
        ]
    },
    'FX_ULT_BLUE_TIMESTOP': {
        id: 'FX_ULT_BLUE_TIMESTOP',
        emitters: [
            { particleType: 'MAGIC_CIRCLE', count: 1, lifetime: [2.0, 3.0], size: [250, 250], colors: ['#fef08a'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RING', count: 1, lifetime: [0.5, 1.0], size: [300, 500], colors: ['#fcd34d'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
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
    'FX_ULT_BLUE_INTERVENTION': {
        id: 'FX_ULT_BLUE_INTERVENTION',
        emitters: [
            { particleType: 'GIANT_HEX', count: 1, lifetime: [2.0, 2.5], size: [60, 80], colors: ['#fef3c7'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'MAGIC_CIRCLE', count: 1, lifetime: [1.5, 2.0], size: [80, 100], colors: ['#fbbf24'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
    'FX_ULT_BLUE_RESURRECTION': {
        id: 'FX_ULT_BLUE_RESURRECTION',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [1.5, 2.5], size: [80, 120], speed: [0, 0], colors: ['#86efac', '#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'HEX_GLOW', count: 1, lifetime: [1.0, 2.0], size: [60, 100], colors: ['#bbf7d0'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_HYMN': {
        id: 'FX_ULT_BLUE_HYMN',
        emitters: [
            { particleType: 'RING', count: 3, lifetime: [1.0, 1.5], size: [50, 300], colors: ['#3b82f6', '#fff'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [10, 20], lifetime: [1.0, 2.0], size: [3, 5], speed: [50, 100], vz: [50, 100], colors: ['#93c5fd'], shape: 'CIRCLE', shapeRadius: 150, delay: 0 }
        ]
    },
    'FX_ULT_BLUE_WRATH': {
        id: 'FX_ULT_BLUE_WRATH',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 3, lifetime: [0.5, 0.8], size: [30, 50], speed: [0,0], colors: ['#fcd34d'], shape: 'CIRCLE', shapeRadius: 40, blendMode: 'screen', delay: 0 },
            { particleType: 'BLAST', count: 1, lifetime: [0.3, 0.5], size: [80, 120], colors: ['#f59e0b'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
    'FX_ULT_BLUE_RAIN': {
        id: 'FX_ULT_BLUE_RAIN',
        emitters: [
            // DRASTIC REDUCTION: 50-80 -> 20-30 sparks
            { particleType: 'SPARK', count: [20, 30], lifetime: [1.0, 1.5], size: [2, 4], speed: [50, 100], vz: [-200, -300], colors: ['#86efac', '#dcfce7'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'screen', delay: 0 },
            { particleType: 'HEX_GLOW', count: [3, 5], lifetime: [0.5, 1.0], size: [10, 20], colors: ['#bbf7d0'], speed: [0,0], shape: 'CIRCLE', shapeRadius: 150, delay: 0.5 }
        ]
    }
};
