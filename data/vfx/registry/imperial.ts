
import { VFXAsset } from "../../../types/VFXSchema";

export const IMPERIAL_VFX: Record<string, VFXAsset> = {
    
    'FX_ULT_BLUE_THUNDER_SLAM': {
        id: 'FX_ULT_BLUE_THUNDER_SLAM',
        emitters: [
            { particleType: 'SPIKE', count: 1, lifetime: [0.2, 0.4], size: [100, 300], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [20, 30], lifetime: [0.3, 0.5], size: [3, 6], speed: [500, 1200], colors: ['#60a5fa', '#bae6fd'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
        ]
    },

    // --- FACTION HITS (PHYSICAL) ---

    'FX_HIT_BLUE_PHYSICAL': {
        id: 'FX_HIT_BLUE_PHYSICAL',
        description: 'Imperial Metal Hit',
        emitters: [
            { particleType: 'SHARD', count: [5, 8], lifetime: [0.4, 0.7], size: [6, 12], speed: [300, 600], gravity: 1500, colors: ['#e0f2fe', '#94a3b8'], shape: 'BURST_DIR', delay: 0, vRotation: [15, 45] },
            { particleType: 'SPIKE', count: 1, lifetime: [0.1, 0.15], size: [40, 60], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [5, 10], lifetime: [0.1, 0.2], size: [2, 4], speed: [500, 800], colors: ['#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_TECH': {
        id: 'FX_HIT_BLUE_TECH',
        description: 'Electric discharge',
        emitters: [
            { particleType: 'SPARK', count: [10, 15], lifetime: [0.2, 0.3], size: [2, 4], speed: [600, 1000], colors: ['#60a5fa', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'SPIKE', count: 1, lifetime: [0.2, 0.3], size: [30, 70], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_ICE': {
        id: 'FX_HIT_BLUE_ICE',
        description: 'Ice shattering',
        emitters: [
            { particleType: 'SHARD', count: [8, 12], lifetime: [0.5, 0.9], size: [6, 12], speed: [300, 600], gravity: 1200, colors: ['#fff', '#e0f2fe', '#bae6fd'], shape: 'BURST_DIR', delay: 0, vRotation: [10, 30] },
            { particleType: 'RUBBLE', count: [4, 6], lifetime: [0.6, 1.0], size: [20, 40], speed: [20, 50], colors: ['#bfdbfe'], shape: 'CIRCLE', blendMode: 'screen', delay: 0, drag: 0.1 }
        ]
    },
    'FX_HIT_BLUE_HOLY': {
        id: 'FX_HIT_BLUE_HOLY',
        description: 'Golden Impact',
        emitters: [
            { particleType: 'SPARK', count: [8, 12], lifetime: [0.3, 0.5], size: [3, 5], speed: [200, 400], colors: ['#fbbf24', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'SPIKE', count: 1, lifetime: [0.2, 0.3], size: [50, 90], speed: [0, 0], colors: ['#fcd34d'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_ARCANE': {
        id: 'FX_HIT_BLUE_ARCANE',
        emitters: [
            { particleType: 'RUBBLE', count: [3, 5], lifetime: [0.5, 0.8], size: [20, 40], speed: [50, 100], colors: ['#a855f7'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 },
            { particleType: 'SPIKE', count: 1, lifetime: [0.2, 0.3], size: [40, 60], speed: [0, 0], colors: ['#d8b4fe'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    }
};
