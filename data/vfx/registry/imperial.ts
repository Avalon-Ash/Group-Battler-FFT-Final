
import { VFXAsset } from "../../../types/VFXSchema";

// ==========================================
// 🔵 IMPERIAL VFX (BLUE FACTION)
// Focus: Order, Tech, Light, Ice
// ==========================================

export const IMPERIAL_VFX: Record<string, VFXAsset> = {
    
    // --- ULTIMATE SPECIALS ---

    // Tank: Sanctuary
    'FX_ULT_BLUE_SANCTUARY_IMPACT': {
        id: 'FX_ULT_BLUE_SANCTUARY_IMPACT',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.5, 0.8], size: [200, 400], speed: [0, 0], colors: ['#fbbf24'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GLOW', count: [10, 15], lifetime: [1.0, 2.0], size: [50, 100], speed: [20, 50], colors: ['#fef3c7', '#fff'], shape: 'CIRCLE', blendMode: 'lighter', delay: 0 }
        ]
    },

    // Warrior: Thunder
    'FX_ULT_BLUE_THUNDER_SLAM': {
        id: 'FX_ULT_BLUE_THUNDER_SLAM',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.1, 0.2], size: [100, 200], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [20, 30], lifetime: [0.3, 0.6], size: [3, 6], speed: [500, 1200], colors: ['#60a5fa', '#bae6fd'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'HEX_LOCK', count: 1, lifetime: [0.4, 0.6], size: [150, 200], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },

    // Ranger: Orbital
    'FX_ULT_BLUE_ORBITAL_BEAM': {
        id: 'FX_ULT_BLUE_ORBITAL_BEAM',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.2, 0.4], size: [120, 180], speed: [0, 0], colors: ['#22d3ee', '#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.3, 0.5], size: [50, 250], speed: [0, 0], colors: ['#06b6d4'], shape: 'POINT', blendMode: 'lighter', delay: 0.1 }
        ]
    },

    // Mage: Absolute Zero
    'FX_ULT_BLUE_GLACIAL_BURST': {
        id: 'FX_ULT_BLUE_GLACIAL_BURST',
        emitters: [
            { particleType: 'SHARD', count: [15, 25], lifetime: [0.8, 1.2], size: [10, 20], speed: [300, 800], gravity: 600, colors: ['#e0f2fe', '#fff'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SMOKE', count: [8, 12], lifetime: [1.0, 2.0], size: [50, 100], speed: [50, 100], colors: ['#bfdbfe', '#bae6fd'], shape: 'CIRCLE', blendMode: 'screen', delay: 0, drag: 0.1 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.3, 0.5], size: [100, 300], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'overlay', delay: 0 }
        ]
    },

    // Support: Resurrection
    'FX_ULT_BLUE_RESURRECTION': {
        id: 'FX_ULT_BLUE_RESURRECTION',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [1.5, 1.5], size: [80, 80], speed: [0, 0], colors: ['#86efac'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GLOW', count: [20, 30], lifetime: [1.0, 2.0], size: [10, 30], speed: [20, 100], colors: ['#dcfce7', '#fff'], shape: 'CIRCLE', blendMode: 'lighter', delay: 0 }
        ]
    },

    // --- FACTION HITS ---

    'FX_HIT_BLUE_PHYSICAL': {
        id: 'FX_HIT_BLUE_PHYSICAL',
        description: 'Imperial steel impact',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.1, 0.2], size: [40, 60], speed: [0, 0], colors: ['#e2e8f0'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [8, 12], lifetime: [0.2, 0.4], size: [2, 3], speed: [300, 600], colors: ['#bae6fd', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.2, 0.3], size: [30, 50], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'overlay', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_HOLY': {
        id: 'FX_HIT_BLUE_HOLY',
        description: 'Divine light impact',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.2, 0.3], size: [20, 30], speed: [0, 0], colors: ['#fbbf24'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GLOW', count: [6, 10], lifetime: [0.4, 0.6], size: [30, 50], speed: [50, 100], colors: ['#fef3c7', '#fcd34d'], shape: 'CIRCLE', blendMode: 'lighter', delay: 0 },
            { particleType: 'SPARK', count: [5, 8], lifetime: [0.3, 0.5], size: [2, 4], speed: [200, 400], colors: ['#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_BLUE_TECH': {
        id: 'FX_HIT_BLUE_TECH',
        description: 'Electric discharge',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.1, 0.15], size: [50, 70], speed: [0, 0], colors: ['#60a5fa'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [10, 15], lifetime: [0.2, 0.3], size: [2, 3], speed: [400, 800], colors: ['#93c5fd', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'HEX_LOCK', count: 1, lifetime: [0.3, 0.5], size: [30, 40], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
    'FX_HIT_BLUE_ICE': {
        id: 'FX_HIT_BLUE_ICE',
        description: 'Ice shattering',
        emitters: [
            { particleType: 'SHARD', count: [8, 12], lifetime: [0.5, 0.8], size: [5, 10], speed: [200, 400], gravity: 800, colors: ['#e0f2fe', '#bae6fd'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SMOKE', count: [5, 8], lifetime: [0.6, 1.0], size: [30, 60], speed: [20, 50], colors: ['#bfdbfe'], shape: 'CIRCLE', blendMode: 'screen', delay: 0, drag: 0.1 }
        ]
    },
    'FX_HIT_BLUE_ARCANE': {
        id: 'FX_HIT_BLUE_ARCANE',
        description: 'Arcane burst',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.4, 0.5], size: [20, 100], speed: [0, 0], colors: ['#a855f7'], shape: 'POINT', blendMode: 'lighter', delay: 0 },
            { particleType: 'GLOW', count: [8, 12], lifetime: [0.6, 0.9], size: [15, 30], speed: [50, 100], colors: ['#d8b4fe', '#c084fc'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 }
        ]
    }
};
