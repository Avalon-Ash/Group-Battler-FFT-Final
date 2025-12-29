
import { VFXAsset } from "../../../types/VFXSchema";

export const SHARED_VFX: Record<string, VFXAsset> = {
    'FX_TELEPORT': {
        id: 'FX_TELEPORT',
        emitters: [
            { particleType: 'SPIKE', count: 1, lifetime: [0.25, 0.35], size: [30, 45], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.4, 0.4], size: [15, 25], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_CAST_BREAK': {
        id: 'FX_CAST_BREAK',
        emitters: [
            { particleType: 'SHARD', count: [8, 12], lifetime: [0.4, 0.7], size: [5, 10], speed: [200, 400], vz: [300, 600], gravity: 2000, colors: ['#94a3b8', '#cbd5e1', '#fff'], shape: 'BURST_DIR', delay: 0, vRotation: [15, 30] }
        ]
    },
    'FX_GRID_IMPACT_BLUE': {
        id: 'FX_GRID_IMPACT_BLUE',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_TECH_BLUE', count: 1, lifetime: [0.4, 0.6], size: [32, 32], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', locked: true, blendMode: 'screen', delay: 0 }]
    },
    'FX_GRID_IMPACT_RED': {
        id: 'FX_GRID_IMPACT_RED',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_CORRUPT_RED', count: 1, lifetime: [0.5, 0.7], size: [32, 32], speed: [0, 0], colors: ['#ef4444'], shape: 'POINT', locked: true, blendMode: 'lighter', delay: 0 }]
    },
    'FX_HIT_GENERIC': {
        id: 'FX_HIT_GENERIC',
        description: 'Precise physical impact with airborne debris',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.15, 0.25], size: [30, 45], colors: ['#ffffff'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RUBBLE', count: [4, 6], lifetime: [0.4, 0.6], size: [4, 8], speed: [150, 300], vz: [200, 500], gravity: 3000, colors: ['#57534e', '#292524', '#78716c'], shape: 'BURST_DIR', vRotation: [20, 60], delay: 0 },
            { particleType: 'GLOW', count: 1, lifetime: [0.08, 0.12], size: [50, 70], colors: ['#fff'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_HIT_FIRE': {
        id: 'FX_HIT_FIRE',
        emitters: [
            { particleType: 'RUBBLE', count: [3, 5], lifetime: [0.4, 0.6], size: [6, 12], speed: [100, 200], vz: [150, 400], colors: ['#f97316', '#7c2d12'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SPARK', count: [8, 12], lifetime: [0.3, 0.5], size: [2, 4], speed: [200, 500], vz: [100, 600], colors: ['#fcd34d', '#fbbf24', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    
    // --- STATUS LOOPS (Continuous Effects) ---
    'FX_STATUS_STUN_LOOP': {
        id: 'FX_STATUS_STUN_LOOP',
        emitters: [
            { particleType: 'SPARK', count: 1, lifetime: [0.6, 0.9], size: [4, 6], speed: [30, 60], vz: [20, 40], colors: ['#fbbf24', '#ffffff'], shape: 'CIRCLE', shapeRadius: 20, blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_STATUS_SILENCE_LOOP': {
        id: 'FX_STATUS_SILENCE_LOOP',
        emitters: [
            { particleType: 'CHIP', count: 1, lifetime: [0.5, 0.8], size: [5, 8], speed: [10, 20], vz: [40, 70], colors: ['#94a3b8', '#cbd5e1'], shape: 'CIRCLE', shapeRadius: 15, delay: 0 }
        ]
    },
    'FX_STATUS_POISON_LOOP': {
        id: 'FX_STATUS_POISON_LOOP',
        emitters: [
            { particleType: 'SMOKE', count: 1, lifetime: [0.8, 1.2], size: [15, 25], speed: [10, 20], vz: [30, 60], colors: ['#a3e635', '#4d7c0f'], shape: 'CIRCLE', shapeRadius: 10, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_STATUS_BURN_LOOP': {
        id: 'FX_STATUS_BURN_LOOP',
        emitters: [
            { particleType: 'SPARK', count: 1, lifetime: [0.5, 0.8], size: [2, 4], speed: [20, 40], vz: [40, 80], colors: ['#f87171', '#fcd34d'], shape: 'CIRCLE', shapeRadius: 10, blendMode: 'lighter', delay: 0 },
            { particleType: 'SMOKE', count: 1, lifetime: [0.6, 1.0], size: [10, 20], speed: [10, 20], vz: [30, 50], colors: ['#7f1d1d', '#000'], shape: 'CIRCLE', shapeRadius: 8, delay: 0 }
        ]
    },
    'FX_STATUS_REGEN_LOOP': {
        id: 'FX_STATUS_REGEN_LOOP',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.8, 1.2], size: [5, 10], speed: [5, 10], vz: [20, 40], colors: ['#86efac', '#fff'], shape: 'CIRCLE', shapeRadius: 15, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_STATUS_BANISH_LOOP': {
        id: 'FX_STATUS_BANISH_LOOP',
        emitters: [
            { particleType: 'SHARD', count: 1, lifetime: [1.2, 1.8], size: [6, 12], speed: [5, 15], vz: [10, 30], colors: ['#c084fc', '#a855f7'], shape: 'CIRCLE', shapeRadius: 25, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_STATUS_FEAR_LOOP': {
        id: 'FX_STATUS_FEAR_LOOP',
        emitters: [
            { particleType: 'SMOKE_PUFF', count: 1, lifetime: [0.4, 0.6], size: [20, 35], speed: [40, 80], vz: [100, 150], colors: ['#581c87', '#7c3aed'], shape: 'CIRCLE', shapeRadius: 5, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_STATUS_ROOT_LOOP': {
        id: 'FX_STATUS_ROOT_LOOP',
        emitters: [
            { particleType: 'DUST', count: [2, 3], lifetime: [0.5, 0.8], size: [4, 8], speed: [10, 30], vz: [10, 20], colors: ['#d97706', '#78350f'], shape: 'CIRCLE', shapeRadius: 20, delay: 0 }
        ]
    }
};
