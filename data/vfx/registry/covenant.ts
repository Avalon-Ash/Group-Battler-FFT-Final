
import { VFXAsset } from "../../../types/VFXSchema";

export const COVENANT_VFX: Record<string, VFXAsset> = {
    
    // --- 🔴 CLASS HITS (Required for Auto-Flavor) ---
    'FX_HIT_RED_TANK': {
        id: 'FX_HIT_RED_TANK',
        emitters: [
            { particleType: 'RUBBLE', count: [3, 5], lifetime: [0.4, 0.6], size: [5, 10], speed: [100, 300], gravity: 3000, colors: ['#7f1d1d', '#000'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.1, 0.2], size: [30, 50], colors: ['#991b1b'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_HIT_RED_WARRIOR': {
        id: 'FX_HIT_RED_WARRIOR',
        emitters: [
            { particleType: 'SLASH', count: 1, lifetime: [0.15, 0.25], size: [40, 60], colors: ['#ef4444'], speed: [0,0], shape: 'POINT', blendMode: 'source-over', delay: 0, vRotation: -20 },
            { particleType: 'SHARD', count: [3, 5], lifetime: [0.3, 0.5], size: [3, 6], speed: [150, 300], colors: ['#b91c1c'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_HIT_RED_RANGER': {
        id: 'FX_HIT_RED_RANGER',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.1, 0.2], size: [20, 30], colors: ['#ea580c'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE', count: [2, 3], lifetime: [0.3, 0.5], size: [10, 20], speed: [50, 100], colors: ['#450a0a'], shape: 'CIRCLE', delay: 0 }
        ]
    },
    'FX_HIT_RED_MAGE': {
        id: 'FX_HIT_RED_MAGE',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.2, 0.4], size: [30, 50], colors: ['#581c87'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [3, 5], lifetime: [0.4, 0.6], size: [4, 8], speed: [100, 200], colors: ['#a855f7'], shape: 'CIRCLE', delay: 0 }
        ]
    },
    'FX_HIT_RED_SUPPORT': {
        id: 'FX_HIT_RED_SUPPORT',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.3, 0.5], size: [30, 50], colors: ['#991b1b'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RING', count: 1, lifetime: [0.2, 0.4], size: [20, 40], colors: ['#ef4444'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },

    'FX_ULT_RED_BLOODSTORM': {
        id: 'FX_ULT_RED_BLOODSTORM',
        emitters: [
            { 
                particleType: 'ATMOSPHERE', count: [30, 45], lifetime: [1.2, 1.8], size: [80, 110], 
                speed: [15, 40], colors: ['#7f1d1d', '#450a0a'], shape: 'CIRCLE', shapeRadius: 40, 
                blendMode: 'source-over', delay: 0 
            },
            { 
                particleType: 'SHARD', count: [50, 70], lifetime: [0.8, 1.4], size: [10, 18], 
                speed: [100, 200], vz: [300, 600], gravity: 2000, colors: ['#ef4444', '#000'], 
                shape: 'CIRCLE', shapeRadius: 30, vRotation: [15, 40], delay: 0.05 
            }
        ]
    },
    'FX_ULT_RED_RAGNAROK_ERUPTION': {
        id: 'FX_ULT_RED_RAGNAROK_ERUPTION',
        emitters: [
            { particleType: 'BLAST', count: 3, lifetime: [1.0, 1.5], size: [160, 220], colors: ['#ea580c'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE_PUFF', count: [40, 60], lifetime: [2.5, 4.0], size: [90, 140], speed: [200, 300], colors: ['#1c1917', '#450a0a'], shape: 'BURST_DIR', delay: 0.1 },
            { particleType: 'SPARK', count: [60, 100], lifetime: [1.5, 2.5], size: [5, 12], speed: [600, 1200], gravity: 1500, colors: ['#f97316', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_ULT_RED_NUKE_FLASH': {
        id: 'FX_ULT_RED_NUKE_FLASH',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 4, lifetime: [0.8, 1.2], size: [100, 600], colors: ['#f97316', '#ea580c'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RING', count: 3, lifetime: [1.2, 1.8], size: [50, 750], colors: ['#ea580c'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
    'FX_ULT_RED_NUKE_CLOUD': {
        id: 'FX_ULT_RED_NUKE_CLOUD',
        emitters: [
            { particleType: 'SMOKE', count: [70, 90], lifetime: [4.0, 6.0], size: [120, 200], speed: [80, 150], vz: [300, 500], colors: ['#18181b', '#000'], shape: 'CIRCLE', shapeRadius: 60, delay: 0 },
            { particleType: 'GLOW', count: [40, 60], lifetime: [2.0, 3.5], size: [80, 150], speed: [200, 400], colors: ['#ea580c', '#b91c1c'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0.1 },
            { particleType: 'RUBBLE', count: [80, 120], lifetime: [3.0, 5.0], size: [8, 20], speed: [500, 1000], vz: [600, 1200], gravity: 3000, colors: ['#450a0a', '#000'], shape: 'BURST_DIR', delay: 0.2 }
        ]
    },
    'FX_ULT_RED_METEOR_IMPACT': {
        id: 'FX_ULT_RED_METEOR_IMPACT',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.5, 0.8], size: [200, 350], colors: ['#f97316', '#ea580c'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE_PUFF', count: [30, 50], lifetime: [2.0, 3.0], size: [60, 100], speed: [150, 300], colors: ['#1c1917', '#450a0a'], shape: 'BURST_DIR', delay: 0.1 },
            { particleType: 'RUBBLE', count: [40, 60], lifetime: [1.0, 2.0], size: [10, 25], speed: [400, 800], vz: [500, 1000], gravity: 2500, colors: ['#7f1d1d', '#000'], shape: 'BURST_DIR', delay: 0.1 },
            { particleType: 'SPARK', count: [50, 80], lifetime: [1.0, 1.5], size: [4, 8], speed: [500, 1000], colors: ['#fde047', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_ULT_RED_GUILLOTINE_IMPACT': {
        id: 'FX_ULT_RED_GUILLOTINE_IMPACT',
        emitters: [
            { particleType: 'SLASH', count: 1, lifetime: [0.3, 0.5], size: [150, 200], colors: ['#991b1b'], speed: [0, 0], shape: 'POINT', blendMode: 'source-over', delay: 0, vRotation: 0 },
            { particleType: 'SHARD', count: [30, 50], lifetime: [0.8, 1.5], size: [6, 12], speed: [200, 400], vz: [300, 600], colors: ['#ef4444', '#7f1d1d'], shape: 'BURST_DIR', delay: 0.1 },
            { particleType: 'SMOKE', count: [15, 25], lifetime: [1.5, 2.5], size: [50, 80], speed: [50, 100], colors: ['#000', '#27272a'], shape: 'CIRCLE', shapeRadius: 40, delay: 0.2 }
        ]
    }
};
