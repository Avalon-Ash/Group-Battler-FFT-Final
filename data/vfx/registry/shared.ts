
import { VFXAsset } from "../../../types/VFXSchema";

// ==========================================
// 🌐 SHARED / SYSTEM VFX
// Includes: Teleports, Grid Impacts, Elemental Fallbacks
// ==========================================

export const SHARED_VFX: Record<string, VFXAsset> = {
    // --- SYSTEM ---
    'FX_TELEPORT': {
        id: 'FX_TELEPORT',
        description: 'Unit spawn/teleport effect',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.4, 0.6], size: [40, 80], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.5, 0.5], size: [30, 40], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_CAST_BREAK': {
        id: 'FX_CAST_BREAK',
        description: 'Interrupt shatter',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.2, 0.2], size: [40, 60], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SHARD', count: [6, 10], lifetime: [0.4, 0.7], size: [6, 10], speed: [150, 300], gravity: 800, colors: ['#cbd5e1'], shape: 'BURST_DIR', delay: 0 }
        ]
    },

    // --- GRID IMPACTS ---
    'FX_GRID_IMPACT_BLUE': {
        id: 'FX_GRID_IMPACT_BLUE',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_TECH_BLUE', count: 1, lifetime: [0.8, 1.0], size: [36, 36], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', locked: true, blendMode: 'screen', delay: 0 }]
    },
    'FX_GRID_IMPACT_RED': {
        id: 'FX_GRID_IMPACT_RED',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_CORRUPT_RED', count: 1, lifetime: [1.0, 1.2], size: [36, 36], speed: [0, 0], colors: ['#ef4444'], shape: 'POINT', locked: true, blendMode: 'lighter', delay: 0 }]
    },
    'FX_GRID_IMPACT_VOID': {
        id: 'FX_GRID_IMPACT_VOID',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_VOID', count: 1, lifetime: [1.2, 1.5], size: [36, 36], speed: [0, 0], colors: ['#7c3aed'], shape: 'POINT', locked: true, blendMode: 'source-over', delay: 0 }]
    },

    // --- ELEMENTAL FALLBACKS ---
    'FX_HIT_FIRE': {
        id: 'FX_HIT_FIRE',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.3, 0.3], size: [60, 80], speed: [0, 0], colors: ['#fef08a'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [8, 12], lifetime: [0.4, 0.7], size: [2, 4], speed: [200, 500], colors: ['#fcd34d', '#fbbf24'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_POISON': {
        id: 'FX_HIT_POISON',
        emitters: [
            { particleType: 'SMOKE', count: [5, 8], lifetime: [0.8, 1.2], size: [20, 40], speed: [50, 100], colors: ['#a3e635', '#4ade80'], shape: 'CIRCLE', shapeRadius: 15, blendMode: 'source-over', delay: 0, drag: 0.1 },
            { particleType: 'CHIP', count: [4, 6], lifetime: [0.4, 0.6], size: [3, 5], speed: [100, 200], gravity: 600, colors: ['#84cc16'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_HIT_GENERIC': {
        id: 'FX_HIT_GENERIC',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.1, 0.1], size: [30, 40], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'CHIP', count: [3, 5], lifetime: [0.2, 0.4], size: [2, 3], speed: [100, 200], colors: ['#ccc'], shape: 'BURST_DIR', delay: 0 }
        ]
    }
};
