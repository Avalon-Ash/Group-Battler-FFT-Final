
import { VFXAsset } from "../../../types/VFXSchema";

export const SHARED_VFX: Record<string, VFXAsset> = {
    'FX_TELEPORT': {
        id: 'FX_TELEPORT',
        emitters: [
            { particleType: 'SPIKE', count: 1, lifetime: [0.3, 0.5], size: [40, 80], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.5, 0.5], size: [30, 40], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_CAST_BREAK': {
        id: 'FX_CAST_BREAK',
        emitters: [
            { particleType: 'SHARD', count: [5, 8], lifetime: [0.5, 0.8], size: [8, 12], speed: [200, 400], gravity: 800, colors: ['#94a3b8', '#cbd5e1'], shape: 'BURST_DIR', delay: 0, vRotation: [10, 20] }
        ]
    },
    'FX_GRID_IMPACT_BLUE': {
        id: 'FX_GRID_IMPACT_BLUE',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_TECH_BLUE', count: 1, lifetime: [0.8, 1.0], size: [36, 36], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', locked: true, blendMode: 'screen', delay: 0 }]
    },
    'FX_GRID_IMPACT_RED': {
        id: 'FX_GRID_IMPACT_RED',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_CORRUPT_RED', count: 1, lifetime: [1.0, 1.2], size: [36, 36], speed: [0, 0], colors: ['#ef4444'], shape: 'POINT', locked: true, blendMode: 'lighter', delay: 0 }]
    },
    
    // --- BASIC HIT EFFECTS (PHYSICAL REMASTER) ---
    // Concept: Hardcore Kinetic Impact.
    // 1. Shockwave (Flattened Ground Ring)
    // 2. Debris (Solid physics chunks with Gravity)
    // 3. Spike (Instant Flash)
    
    'FX_HIT_GENERIC': {
        id: 'FX_HIT_GENERIC',
        description: 'Physical Ground Impact (Hardcore)',
        emitters: [
            // 1. Ground Shockwave (Flattens to floor)
            {
                particleType: 'SHOCKWAVE', 
                count: 1,
                lifetime: [0.2, 0.2],
                size: [30, 50],
                colors: ['#ffffff'],
                speed: [0, 0],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            },
            // 2. Physical Debris (Gravity & Bounce)
            {
                particleType: 'RUBBLE',
                count: [4, 6],
                lifetime: [0.3, 0.5],
                size: [4, 8],
                speed: [150, 350],
                gravity: 1200,      // Heavy gravity
                drag: 0.92,         // Air resistance
                colors: ['#78716c', '#44403c'], // Stone colors
                blendMode: 'source-over',       // SOLID, not glowing
                shape: 'BURST_DIR',
                vRotation: [10, 30],
                delay: 0
            },
            // 3. Impact Spike (Instant Flash, 3 frames only)
            {
                particleType: 'SPIKE',
                count: 1,
                lifetime: [0.05, 0.05], 
                size: [60, 90],
                colors: ['#fff'],
                speed: [0, 0],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            }
        ]
    },

    'FX_HIT_FIRE': {
        id: 'FX_HIT_FIRE',
        emitters: [
            { particleType: 'RUBBLE', count: [4, 6], lifetime: [0.5, 0.8], size: [20, 40], speed: [50, 100], colors: ['#f97316', '#7c2d12'], shape: 'CIRCLE', blendMode: 'source-over', delay: 0 },
            { particleType: 'SPIKE', count: 1, lifetime: [0.1, 0.2], size: [50, 80], speed: [0, 0], colors: ['#fbbf24'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [8, 12], lifetime: [0.3, 0.6], size: [3, 5], speed: [300, 500], colors: ['#fcd34d', '#fbbf24'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    
    // Status Loops
    'FX_STATUS_POISON_LOOP': {
        id: 'FX_STATUS_POISON_LOOP',
        emitters: [{ particleType: 'RUBBLE', count: 1, lifetime: [1.0, 1.5], size: [10, 20], speed: [10, 20], gravity: -20, colors: ['#a3e635'], shape: 'CIRCLE', shapeRadius: 10, blendMode: 'source-over', delay: 0 }]
    },
    'FX_STATUS_BURN_LOOP': {
        id: 'FX_STATUS_BURN_LOOP',
        emitters: [{ particleType: 'SPARK', count: [1, 2], lifetime: [0.5, 0.8], size: [2, 4], speed: [20, 40], gravity: -50, colors: ['#fca5a5', '#ef4444'], shape: 'CIRCLE', shapeRadius: 10, blendMode: 'lighter', delay: 0 }]
    },
    'FX_STATUS_REGEN_LOOP': {
        id: 'FX_STATUS_REGEN_LOOP',
        emitters: [{ particleType: 'SPARK', count: 1, lifetime: [1.0, 1.5], size: [3, 5], speed: [10, 20], gravity: -30, colors: ['#86efac'], shape: 'CIRCLE', shapeRadius: 15, blendMode: 'screen', delay: 0 }]
    },
    'FX_STATUS_BANISH_LOOP': {
        id: 'FX_STATUS_BANISH_LOOP',
        emitters: [{ particleType: 'SPIKE', count: 1, lifetime: [0.5, 0.8], size: [10, 20], speed: [0, 0], colors: ['#7c3aed'], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    }
};
