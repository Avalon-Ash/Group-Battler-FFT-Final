
import { VFXAsset } from "../../../types/VFXSchema";

export const IMPERIAL_VFX: Record<string, VFXAsset> = {
    
    // --- 🔵 CLASS HITS (Required for Auto-Flavor) ---
    'FX_HIT_BLUE_TANK': {
        id: 'FX_HIT_BLUE_TANK',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.2, 0.3], size: [30, 50], colors: ['#60a5fa'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [5, 8], lifetime: [0.3, 0.5], size: [3, 5], speed: [100, 200], colors: ['#fbbf24', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_WARRIOR': {
        id: 'FX_HIT_BLUE_WARRIOR',
        emitters: [
            { particleType: 'SLASH', count: 1, lifetime: [0.15, 0.25], size: [40, 60], colors: ['#93c5fd'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0, vRotation: 20 },
            { particleType: 'SPARK', count: [4, 6], lifetime: [0.2, 0.4], size: [2, 4], speed: [150, 300], colors: ['#fff'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_RANGER': {
        id: 'FX_HIT_BLUE_RANGER',
        emitters: [
            { particleType: 'RING', count: 1, lifetime: [0.1, 0.2], size: [10, 30], colors: ['#38bdf8'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [3, 5], lifetime: [0.1, 0.3], size: [2, 3], speed: [200, 400], colors: ['#e0f2fe'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_MAGE': {
        id: 'FX_HIT_BLUE_MAGE',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.2, 0.4], size: [40, 60], colors: ['#8b5cf6'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE', count: [2, 4], lifetime: [0.4, 0.6], size: [15, 25], speed: [50, 100], colors: ['#ddd6fe'], shape: 'CIRCLE', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_SUPPORT': {
        id: 'FX_HIT_BLUE_SUPPORT',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', height: [20, 40], count: 1, lifetime: [0.3, 0.5], size: [10, 20], speed: [0,0], colors: ['#fef3c7'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GLOW', count: 1, lifetime: [0.3, 0.5], size: [30, 50], colors: ['#fbbf24'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },

    // --- 🔵 聖光結界 (Sanctuary) ---
    'FX_ULT_BLUE_SANCTUARY_IMPACT': {
        id: 'FX_ULT_BLUE_SANCTUARY_IMPACT',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [1.5, 2.2], size: [100, 140], speed: [0, 0], colors: ['#fef3c7', '#fbbf24'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'MAGIC_CIRCLE', count: 1, lifetime: [3.0, 4.5], size: [120, 160], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0, vRotation: [1.5, 1.5] },
            { particleType: 'SPARK', count: [30, 50], lifetime: [1.2, 2.5], size: [4, 8], speed: [60, 150], vz: [150, 400], gravity: -150, colors: ['#ffffff', '#fde047'], shape: 'CIRCLE', shapeRadius: 60, blendMode: 'lighter', delay: 0.1 }
        ]
    },
    'FX_ULT_BLUE_KINGS_BLESSING': {
        id: 'FX_ULT_BLUE_KINGS_BLESSING',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.5, 0.8], size: [100, 150], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [1.2, 1.8], size: [45, 60], speed: [0, 0], colors: ['#fffbeb'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RING', count: 2, lifetime: [0.8, 1.4], size: [60, 160], colors: ['#fcd34d'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
    'FX_ULT_BLUE_AEGIS_IMPACT': {
        id: 'FX_ULT_BLUE_AEGIS_IMPACT',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.4, 0.6], size: [200, 450], colors: ['#3b82f6'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GIANT_HEX', count: 1, lifetime: [2.0, 3.5], size: [140, 160], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'HEX_GLOW', count: 5, lifetime: [1.0, 1.8], size: [60, 90], colors: ['#60a5fa'], speed: [0, 0], shape: 'CIRCLE', shapeRadius: 100, blendMode: 'screen', delay: 0.15 }
        ]
    },
    'FX_ULT_BLUE_TITAN_SMASH': {
        id: 'FX_ULT_BLUE_TITAN_SMASH',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.3, 0.5], size: [150, 350], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'CRACKS', count: 1, lifetime: [2.5, 4.0], size: [100, 140], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RUBBLE', count: [20, 35], lifetime: [0.8, 1.5], size: [8, 16], speed: [300, 700], gravity: 2500, colors: ['#d97706', '#92400e'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_ORBITAL_BEAM': {
        id: 'FX_ULT_BLUE_ORBITAL_BEAM',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [1.2, 1.8], size: [150, 200], speed: [0, 0], colors: ['#22d3ee', '#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.4, 0.7], size: [100, 400], colors: ['#06b6d4'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
    'FX_ULT_BLUE_FINAL_DEFENSE': {
        id: 'FX_ULT_BLUE_FINAL_DEFENSE',
        emitters: [
            { particleType: 'DOMAIN', visualStyle: 'DOMAIN_SHIELD', count: 1, lifetime: [3.0, 5.0], size: [180, 220], colors: ['#60a5fa'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GRID_FIELD', visualStyle: 'GRID_TECH_BLUE', count: 1, lifetime: [3.0, 5.0], size: [150, 180], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'overlay', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_THUNDER_SLAM': {
        id: 'FX_ULT_BLUE_THUNDER_SLAM',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.2, 0.4], size: [150, 300], colors: ['#3b82f6', '#fff'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [40, 60], lifetime: [0.5, 0.8], size: [3, 6], speed: [400, 800], colors: ['#60a5fa', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.2, 0.3], size: [80, 100], speed: [0,0], colors: ['#93c5fd'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_GLACIAL_BURST': {
        id: 'FX_ULT_BLUE_GLACIAL_BURST',
        emitters: [
            { particleType: 'SHARD', count: [40, 60], lifetime: [1.0, 1.5], size: [8, 15], speed: [300, 600], vz: [400, 800], gravity: 1500, colors: ['#bae6fd', '#fff'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE', count: [30, 40], lifetime: [2.0, 3.0], size: [100, 150], speed: [100, 200], colors: ['#e0f2fe', '#fff'], shape: 'CIRCLE', shapeRadius: 80, blendMode: 'screen', delay: 0.1 },
            { particleType: 'RING', count: 2, lifetime: [0.5, 1.0], size: [100, 300], colors: ['#60a5fa'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    }
};
