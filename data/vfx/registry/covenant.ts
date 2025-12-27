
import { VFXAsset } from "../../../types/VFXSchema";

export const COVENANT_VFX: Record<string, VFXAsset> = {

    // ... (Ultimates preserved for structure) ...

    // --- FACTION HITS (PHYSICAL) ---

    'FX_HIT_RED_PHYSICAL': {
        id: 'FX_HIT_RED_PHYSICAL',
        description: 'Heavy metal impact',
        emitters: [
            { particleType: 'SHARD', count: [6, 10], lifetime: [0.5, 0.8], size: [8, 16], speed: [200, 500], gravity: 1800, colors: ['#450a0a', '#7f1d1d'], shape: 'BURST_DIR', delay: 0, vRotation: [20, 50] },
            { particleType: 'RUBBLE', count: [3, 5], lifetime: [0.4, 0.6], size: [30, 50], speed: [20, 60], colors: ['#292524'], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SPIKE', count: 1, lifetime: [0.1, 0.2], size: [50, 80], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [5, 8], lifetime: [0.2, 0.4], size: [2, 4], speed: [400, 700], colors: ['#fca5a5', '#fbbf24'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_RED_BLOOD': {
        id: 'FX_HIT_RED_BLOOD',
        description: 'Visceral blood splatter',
        emitters: [
            // Blood Chunks (Solid)
            { particleType: 'SHARD', count: [8, 12], lifetime: [0.4, 0.6], size: [4, 8], speed: [100, 300], gravity: 1000, colors: ['#991b1b', '#7f1d1d'], shape: 'BURST_DIR', delay: 0, vRotation: [10, 20] },
            // Blood Mist (Rubble instead of smoke)
            { particleType: 'RUBBLE', count: [4, 6], lifetime: [0.5, 0.8], size: [10, 20], speed: [50, 100], gravity: 200, colors: ['#ef4444', '#b91c1c'], shape: 'BURST_DIR', blendMode: 'source-over', delay: 0 }
        ]
    },
    'FX_HIT_RED_HEAVY': {
        id: 'FX_HIT_RED_HEAVY', 
        emitters: [
            { particleType: 'ROCK', count: [3, 5], lifetime: [0.6, 1.0], size: [10, 20], speed: [300, 600], gravity: 2000, colors: ['#1c1917'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SPIKE', count: 1, lifetime: [0.2, 0.3], size: [60, 100], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'overlay', delay: 0 }
        ]
    },
    'FX_HIT_RED_FEL': {
        id: 'FX_HIT_RED_FEL',
        description: 'Fel magic explosion',
        emitters: [
            { particleType: 'RUBBLE', count: [6, 10], lifetime: [0.6, 1.0], size: [20, 40], speed: [20, 60], colors: ['#3f6212', '#65a30d'], shape: 'CIRCLE', blendMode: 'source-over', delay: 0, drag: 0.05 },
            { particleType: 'SPARK', count: [5, 8], lifetime: [0.3, 0.5], size: [3, 5], speed: [200, 400], colors: ['#bef264'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_RED_MAGMA': {
        id: 'FX_HIT_RED_MAGMA',
        description: 'Fire explosion',
        emitters: [
            { particleType: 'RUBBLE', count: [5, 8], lifetime: [0.8, 1.2], size: [30, 60], speed: [50, 100], colors: ['#1c1917', '#450a0a'], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SHARD', count: [6, 10], lifetime: [0.5, 0.8], size: [5, 10], speed: [300, 600], gravity: 1000, colors: ['#f97316', '#ea580c'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_HIT_RED_SHADOW': {
        id: 'FX_HIT_RED_SHADOW',
        description: 'Void implosion',
        emitters: [
            { particleType: 'RUBBLE', count: [5, 8], lifetime: [0.6, 1.0], size: [20, 50], speed: [30, 60], colors: ['#000', '#2e1065'], shape: 'BURST_DIR', blendMode: 'source-over', delay: 0 },
            { particleType: 'SPIKE', count: 1, lifetime: [0.3, 0.5], size: [40, 100], speed: [0, 0], colors: ['#7e22ce'], shape: 'POINT', blendMode: 'lighter', delay: 0 }
        ]
    }
};
