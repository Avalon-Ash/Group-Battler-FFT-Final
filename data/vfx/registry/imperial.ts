
import { VFXAsset } from "../../../types/VFXSchema";

export const IMPERIAL_VFX: Record<string, VFXAsset> = {
    
    // --- ULTIMATES (BLUE / ORDER / HOLY) ---
    // ... (Keep existing Ultimates as they are, assume previous content here) ...
    'FX_ULT_BLUE_SANCTUARY_IMPACT': {
        id: 'FX_ULT_BLUE_SANCTUARY_IMPACT',
        description: 'Holy ground impact',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [1.0, 1.5], size: [80, 100], speed: [0, 0], colors: ['#fef3c7'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'MAGIC_CIRCLE', count: 1, lifetime: [2.0, 3.0], size: [250, 300], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0, vRotation: [10, 10] },
            { particleType: 'SPARK', count: [20, 30], lifetime: [1.0, 2.0], size: [4, 8], speed: [20, 50], gravity: -50, colors: ['#fcd34d', '#ffffff'], shape: 'CIRCLE', shapeRadius: 100, blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_KINGS_BLESSING': {
        id: 'FX_ULT_BLUE_KINGS_BLESSING',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.5, 1.0], size: [150, 200], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [1.0, 2.0], size: [50, 80], speed: [0, 0], colors: ['#fef3c7'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_AEGIS_IMPACT': {
        id: 'FX_ULT_BLUE_AEGIS_IMPACT',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.3, 0.6], size: [100, 300], colors: ['#3b82f6'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GRID_FIELD', visualStyle: 'GRID_TECH_BLUE', count: 1, lifetime: [1.5, 2.0], size: [200, 200], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_TITAN_SMASH': {
        id: 'FX_ULT_BLUE_TITAN_SMASH',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 3, lifetime: [0.2, 0.5], size: [100, 400], colors: ['#fcd34d'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'CRACKS', count: 1, lifetime: [2.0, 3.0], size: [150, 200], colors: ['#fbbf24'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_FINAL_DEFENSE': {
        id: 'FX_ULT_BLUE_FINAL_DEFENSE',
        emitters: [
            { particleType: 'DOMAIN', visualStyle: 'DOMAIN_SHIELD', count: 1, lifetime: [2.0, 3.0], size: [300, 300], colors: ['#60a5fa'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_THUNDER_SLAM': {
        id: 'FX_ULT_BLUE_THUNDER_SLAM',
        emitters: [
            { particleType: 'SPIKE', count: 1, lifetime: [0.2, 0.4], size: [150, 300], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [30, 50], lifetime: [0.3, 0.6], size: [3, 6], speed: [600, 1500], colors: ['#60a5fa', '#bae6fd'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.4, 0.6], size: [100, 400], colors: ['#3b82f6'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
    'FX_ULT_BLUE_DAYBREAK': {
        id: 'FX_ULT_BLUE_DAYBREAK',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.5, 1.0], size: [200, 400], colors: ['#fff', '#fef3c7'], speed: [0, 0], shape: 'POINT', blendMode: 'lighter', delay: 0 },
            { particleType: 'SPARK', count: [20, 30], lifetime: [0.5, 1.0], size: [4, 8], speed: [200, 500], colors: ['#fcd34d'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_EXCALIBUR': {
        id: 'FX_ULT_BLUE_EXCALIBUR',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.3, 0.5], size: [30, 30], speed: [0, 0], colors: ['#facc15'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.2, 0.4], size: [50, 150], colors: ['#facc15'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_BLADESTORM': {
        id: 'FX_ULT_BLUE_BLADESTORM',
        emitters: [
            { particleType: 'RING', count: 3, lifetime: [0.5, 0.8], size: [100, 200], colors: ['#60a5fa'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0, vRotation: [10, 20] }
        ]
    },
    'FX_ULT_BLUE_LIGHTSPEED': {
        id: 'FX_ULT_BLUE_LIGHTSPEED',
        emitters: [
            { particleType: 'STREAK', count: [5, 8], lifetime: [0.2, 0.4], size: [50, 100], speed: [0, 0], colors: ['#e0f2fe'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_GLACIAL_BURST': {
        id: 'FX_ULT_BLUE_GLACIAL_BURST',
        emitters: [
            { particleType: 'SHARD', count: [15, 20], lifetime: [1.0, 1.5], size: [20, 40], speed: [200, 600], gravity: 800, colors: ['#e0f2fe', '#bae6fd'], shape: 'BURST_DIR', delay: 0, vRotation: [0, 0] },
            { particleType: 'SMOKE', count: [10, 15], lifetime: [1.5, 2.0], size: [60, 100], speed: [50, 100], colors: ['#bfdbfe'], shape: 'CIRCLE', blendMode: 'screen', delay: 0 },
            { particleType: 'RING', count: 1, lifetime: [0.5, 1.0], size: [100, 400], colors: ['#fff'], speed: [0, 0], shape: 'POINT', blendMode: 'overlay', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_ORBITAL_BEAM': {
        id: 'FX_ULT_BLUE_ORBITAL_BEAM',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [2.0, 3.0], size: [200, 200], colors: ['#000'], speed: [0, 0], shape: 'POINT', blendMode: 'multiply', delay: 0 },
            { particleType: 'GLOW', count: [3, 5], lifetime: [0.2, 0.4], size: [100, 200], colors: ['#22d3ee', '#06b6d4'], speed: [0, 0], shape: 'POINT', blendMode: 'lighter', delay: 0 },
            { particleType: 'RUBBLE', count: [10, 20], lifetime: [0.5, 1.0], size: [10, 30], speed: [400, 800], colors: ['#164e63'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_STARFALL': {
        id: 'FX_ULT_BLUE_STARFALL',
        emitters: [{ particleType: 'SPARK', count: [10, 20], lifetime: [0.5, 1.0], size: [4, 8], speed: [100, 300], gravity: 500, colors: ['#fcd34d'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_BLUE_LOCKDOWN': {
        id: 'FX_ULT_BLUE_LOCKDOWN',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_TECH_BLUE', count: 1, lifetime: [2.0, 3.0], size: [150, 150], speed: [0, 0], colors: ['#8b5cf6'], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_BLUE_OVERLOAD': {
        id: 'FX_ULT_BLUE_OVERLOAD',
        emitters: [{ particleType: 'SPARK', count: [20, 30], lifetime: [0.2, 0.5], size: [2, 4], speed: [500, 800], colors: ['#fff'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_BLUE_BLACKHOLE': {
        id: 'FX_ULT_BLUE_BLACKHOLE',
        emitters: [
            { particleType: 'GIANT_HEX', count: 1, lifetime: [3.0, 3.0], size: [150, 150], speed: [0, 0], colors: ['#000'], shape: 'POINT', blendMode: 'source-over', delay: 0, vRotation: [10, 10] },
            { particleType: 'RING', count: 2, lifetime: [2.0, 2.0], size: [200, 300], speed: [0, 0], colors: ['#8b5cf6'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_TIMESTOP': {
        id: 'FX_ULT_BLUE_TIMESTOP',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.5, 1.0], size: [800, 1200], colors: ['#fef08a'], speed: [0, 0], shape: 'POINT', blendMode: 'difference', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_TORRENT': {
        id: 'FX_ULT_BLUE_TORRENT',
        emitters: [{ particleType: 'SPARK', count: [20, 30], lifetime: [0.5, 1.0], size: [5, 10], speed: [200, 400], colors: ['#a855f7'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_BLUE_FOCUS_BEAM': {
        id: 'FX_ULT_BLUE_FOCUS_BEAM',
        emitters: [
            { particleType: 'GLOW', count: 2, lifetime: [0.5, 1.0], size: [100, 200], colors: ['#60a5fa'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_RESURRECTION': {
        id: 'FX_ULT_BLUE_RESURRECTION',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [1.5, 2.0], size: [100, 150], speed: [0, 0], colors: ['#86efac'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GLOW', count: [10, 15], lifetime: [1.0, 2.0], size: [10, 20], speed: [20, 50], gravity: -100, colors: ['#bbf7d0', '#fff'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_BLUE_INTERVENTION': {
        id: 'FX_ULT_BLUE_INTERVENTION',
        emitters: [{ particleType: 'DOMAIN', visualStyle: 'DOMAIN_SHIELD', count: 1, lifetime: [2.0, 3.0], size: [150, 150], colors: ['#fef08a'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_BLUE_HYMN': {
        id: 'FX_ULT_BLUE_HYMN',
        emitters: [{ particleType: 'SHOCKWAVE', count: 3, lifetime: [1.0, 1.5], size: [200, 400], colors: ['#3b82f6'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_BLUE_WRATH': {
        id: 'FX_ULT_BLUE_WRATH',
        emitters: [{ particleType: 'BLAST', count: 1, lifetime: [0.5, 1.0], size: [150, 200], colors: ['#fcd34d'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_BLUE_RAIN': {
        id: 'FX_ULT_BLUE_RAIN',
        emitters: [{ particleType: 'SPARK', count: [20, 30], lifetime: [1.0, 2.0], size: [2, 4], speed: [50, 100], gravity: 200, colors: ['#86efac'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'screen', delay: 0 }]
    },

    // --- MID-TIER ACTIVE SKILLS (NEW) ---
    
    'FX_ACTIVE_BLUE_TECH_BURST': {
        id: 'FX_ACTIVE_BLUE_TECH_BURST',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.4, 0.6], size: [80, 120], colors: ['#60a5fa'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [10, 15], lifetime: [0.3, 0.5], size: [3, 6], speed: [300, 600], colors: ['#fff', '#bae6fd'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_ACTIVE_BLUE_HOLY_SMITE': {
        id: 'FX_ACTIVE_BLUE_HOLY_SMITE',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.3, 0.5], size: [20, 30], height: 600, speed: [0, 0], colors: ['#facc15'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GLOW', count: 1, lifetime: [0.2, 0.4], size: [100, 150], colors: ['#fef3c7'], speed: [0, 0], shape: 'POINT', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_ACTIVE_BLUE_FROST_SNAP': {
        id: 'FX_ACTIVE_BLUE_FROST_SNAP',
        emitters: [
            { particleType: 'SHARD', count: [10, 15], lifetime: [0.5, 0.8], size: [10, 20], speed: [200, 400], gravity: 800, colors: ['#e0f2fe', '#fff'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'RING', count: 1, lifetime: [0.4, 0.6], size: [100, 150], colors: ['#bae6fd'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ACTIVE_BLUE_ARCANE_RIPPLE': {
        id: 'FX_ACTIVE_BLUE_ARCANE_RIPPLE',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.5, 0.8], size: [150, 200], colors: ['#8b5cf6'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'GLOW', count: [5, 8], lifetime: [0.5, 1.0], size: [10, 20], speed: [50, 100], colors: ['#d8b4fe'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_ACTIVE_BLUE_TECH_SHIELD': {
        id: 'FX_ACTIVE_BLUE_TECH_SHIELD',
        emitters: [
            { particleType: 'DOMAIN', visualStyle: 'DOMAIN_SHIELD', count: 1, lifetime: [1.0, 1.5], size: [120, 120], colors: ['#60a5fa'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },

    // --- FACTION HITS ---
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
