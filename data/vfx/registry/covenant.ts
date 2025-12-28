
import { VFXAsset } from "../../../types/VFXSchema";

export const COVENANT_VFX: Record<string, VFXAsset> = {

    // --- ULTIMATES (RED / CHAOS / FIRE) ---
    // ... (Keep existing Ultimates) ...
    'FX_ULT_RED_GUILLOTINE_IMPACT': {
        id: 'FX_ULT_RED_GUILLOTINE_IMPACT',
        description: 'Massive execution slash',
        emitters: [
            { particleType: 'SHARD', count: [15, 25], lifetime: [0.5, 0.8], size: [10, 20], speed: [400, 800], gravity: 1500, colors: ['#7f1d1d', '#991b1b'], shape: 'CONE', vRotation: [10, 30], delay: 0 },
            { particleType: 'GRID_FIELD', visualStyle: 'GRID_BLOOD', count: 1, lifetime: [2.0, 3.0], size: [120, 150], speed: [0, 0], colors: ['#7f1d1d'], shape: 'POINT', blendMode: 'multiply', delay: 0 },
            { particleType: 'GLOW', count: 1, lifetime: [0.1, 0.2], size: [200, 300], colors: ['#ef4444'], speed: [0, 0], shape: 'POINT', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_ULT_RED_PLAGUE': {
        id: 'FX_ULT_RED_PLAGUE',
        emitters: [
            { particleType: 'GRID_FIELD', visualStyle: 'GRID_RED_POISON', count: 1, lifetime: [3.0, 4.0], size: [200, 200], speed: [0, 0], colors: ['#3f6212'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE', count: [10, 20], lifetime: [1.0, 2.0], size: [40, 60], speed: [20, 50], colors: ['#bef264'], shape: 'CIRCLE', shapeRadius: 150, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_RED_UNDYING': {
        id: 'FX_ULT_RED_UNDYING',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [1.0, 2.0], size: [100, 150], colors: ['#16a34a'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_RED_NIGHTMARE': {
        id: 'FX_ULT_RED_NIGHTMARE',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.5, 1.0], size: [600, 800], colors: ['#581c87'], speed: [0, 0], shape: 'POINT', blendMode: 'multiply', delay: 0 }
        ]
    },
    'FX_ULT_RED_BLOOD_WALL': {
        id: 'FX_ULT_RED_BLOOD_WALL',
        emitters: [
            { particleType: 'DOMAIN', count: 1, lifetime: [2.0, 3.0], size: [250, 250], colors: ['#991b1b'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_RED_RAGNAROK_ERUPTION': {
        id: 'FX_ULT_RED_RAGNAROK_ERUPTION',
        description: 'Magma eruption',
        emitters: [
            { particleType: 'ROCK', count: [10, 15], lifetime: [0.8, 1.2], size: [20, 40], speed: [300, 600], gravity: 1200, colors: ['#450a0a', '#1c1917'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SPARK', count: [30, 50], lifetime: [0.5, 1.0], size: [4, 8], speed: [600, 1000], colors: ['#f97316', '#fbbf24'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'CRACKS', count: 2, lifetime: [2.0, 3.0], size: [150, 200], speed: [0, 0], colors: ['#ea580c'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_RED_BLOODSTORM': {
        id: 'FX_ULT_RED_BLOODSTORM',
        emitters: [{ particleType: 'SMOKE', count: [10, 20], lifetime: [0.5, 1.0], size: [40, 60], speed: [50, 100], colors: ['#dc2626'], shape: 'CIRCLE', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_RED_DEMON_FORM': {
        id: 'FX_ULT_RED_DEMON_FORM',
        emitters: [{ particleType: 'GLOW', count: 1, lifetime: [1.0, 1.5], size: [100, 120], colors: ['#7f1d1d'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_RED_UNLIMITED_BLADE': {
        id: 'FX_ULT_RED_UNLIMITED_BLADE',
        emitters: [{ particleType: 'SHOCKWAVE', count: 1, lifetime: [0.5, 1.0], size: [200, 300], colors: ['#000'], speed: [0, 0], shape: 'POINT', blendMode: 'source-over', delay: 0 }]
    },
    'FX_ULT_RED_DEVASTATE': {
        id: 'FX_ULT_RED_DEVASTATE',
        emitters: [{ particleType: 'SHOCKWAVE', count: 1, lifetime: [0.3, 0.6], size: [150, 250], colors: ['#450a0a'], speed: [0, 0], shape: 'POINT', blendMode: 'overlay', delay: 0 }]
    },
    'FX_ULT_RED_NUKE_FLASH': {
        id: 'FX_ULT_RED_NUKE_FLASH',
        description: 'Initial blinding flash',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.3, 0.6], size: [800, 1200], colors: ['#ffffff'], speed: [0, 0], shape: 'POINT', blendMode: 'lighter', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.5, 0.8], size: [100, 800], colors: ['#fca5a5', '#ef4444'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0.1 }
        ]
    },
    'FX_ULT_RED_NUKE_CLOUD': {
        id: 'FX_ULT_RED_NUKE_CLOUD',
        description: 'Mushroom cloud cap',
        emitters: [
            { particleType: 'SMOKE_PUFF', count: [15, 20], lifetime: [3.0, 4.5], size: [150, 250], speed: [50, 100], gravity: -50, drag: 0.9, colors: ['#292524', '#450a0a', '#1c1917'], shape: 'BURST_DIR', blendMode: 'source-over', delay: 0 },
            { particleType: 'GLOW', count: [6, 10], lifetime: [2.0, 3.0], size: [100, 180], speed: [20, 50], colors: ['#f97316', '#dc2626'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0.2 },
            { particleType: 'SPARK', count: [30, 50], lifetime: [2.0, 3.5], size: [3, 6], speed: [100, 300], gravity: 200, colors: ['#fbbf24', '#fdba74'], shape: 'CIRCLE', shapeRadius: 150, blendMode: 'screen', delay: 0.5 }
        ]
    },
    'FX_ULT_RED_RAILGUN': {
        id: 'FX_ULT_RED_RAILGUN',
        emitters: [{ particleType: 'BLAST', count: 1, lifetime: [0.5, 1.0], size: [100, 150], colors: ['#000'], speed: [0, 0], shape: 'POINT', blendMode: 'multiply', delay: 0 }]
    },
    'FX_ULT_RED_INFERNO': {
        id: 'FX_ULT_RED_INFERNO',
        emitters: [{ particleType: 'SPARK', count: [20, 30], lifetime: [1.0, 2.0], size: [4, 8], speed: [50, 100], gravity: 200, colors: ['#f97316'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_RED_HEADHUNTER': {
        id: 'FX_ULT_RED_HEADHUNTER',
        emitters: [{ particleType: 'HEX_LOCK', count: 1, lifetime: [0.5, 1.0], size: [50, 50], colors: ['#7f1d1d'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_RED_DOOM': {
        id: 'FX_ULT_RED_DOOM',
        emitters: [{ particleType: 'SHOCKWAVE', count: 1, lifetime: [0.5, 1.0], size: [200, 300], colors: ['#581c87'], speed: [0, 0], shape: 'POINT', blendMode: 'multiply', delay: 0 }]
    },
    'FX_ULT_RED_METEOR_IMPACT': {
        id: 'FX_ULT_RED_METEOR_IMPACT',
        description: 'Meteor crash',
        emitters: [
            { particleType: 'GLOW', count: 3, lifetime: [0.4, 0.6], size: [150, 250], colors: ['#f97316', '#ea580c'], speed: [0, 0], shape: 'POINT', blendMode: 'lighter', delay: 0 },
            { particleType: 'RUBBLE', count: [10, 15], lifetime: [0.6, 1.0], size: [20, 40], speed: [400, 800], colors: ['#7c2d12', '#451a03'], shape: 'CIRCLE', blendMode: 'source-over', delay: 0 },
            { particleType: 'BLAST', count: 1, lifetime: [3.0, 4.0], size: [180, 180], colors: ['#000'], speed: [0, 0], shape: 'POINT', blendMode: 'multiply', delay: 0 }
        ]
    },
    'FX_ULT_RED_DEATH_FINGER': {
        id: 'FX_ULT_RED_DEATH_FINGER',
        emitters: [{ particleType: 'GLOW', count: 1, lifetime: [0.2, 0.5], size: [80, 120], colors: ['#be123c'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_RED_VOID_PORTAL': {
        id: 'FX_ULT_RED_VOID_PORTAL',
        emitters: [{ particleType: 'GIANT_HEX', count: 1, lifetime: [2.0, 3.0], size: [100, 100], colors: ['#581c87'], speed: [0, 0], shape: 'POINT', blendMode: 'source-over', delay: 0, vRotation: [10, 20] }]
    },
    'FX_ULT_RED_POISON_RAIN': {
        id: 'FX_ULT_RED_POISON_RAIN',
        emitters: [{ particleType: 'SMOKE', count: [20, 30], lifetime: [1.0, 2.0], size: [10, 20], speed: [20, 50], colors: ['#a3e635'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_RED_SOUL_BURN': {
        id: 'FX_ULT_RED_SOUL_BURN',
        emitters: [{ particleType: 'SPARK', count: [20, 30], lifetime: [0.5, 1.0], size: [4, 8], speed: [200, 400], colors: ['#dc2626'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_RED_SOUL_WEB': {
        id: 'FX_ULT_RED_SOUL_WEB',
        description: 'Dark magic web',
        emitters: [
            { particleType: 'MAGIC_CIRCLE', count: 1, lifetime: [2.0, 3.0], size: [300, 300], colors: ['#581c87'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0, vRotation: [30, 30] },
            { particleType: 'SMOKE', count: [10, 15], lifetime: [1.5, 2.5], size: [40, 80], speed: [50, 100], colors: ['#3b0764', '#6b21a8'], shape: 'CIRCLE', shapeRadius: 150, blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_ULT_RED_BLOOD_PACT': {
        id: 'FX_ULT_RED_BLOOD_PACT',
        emitters: [{ particleType: 'DOMAIN', count: 1, lifetime: [2.0, 3.0], size: [300, 300], colors: ['#ef4444'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_RED_VOODOO': {
        id: 'FX_ULT_RED_VOODOO',
        emitters: [{ particleType: 'SMOKE', count: [10, 20], lifetime: [1.0, 2.0], size: [30, 50], speed: [20, 50], colors: ['#4c1d95'], shape: 'CIRCLE', shapeRadius: 200, blendMode: 'multiply', delay: 0 }]
    },
    'FX_ULT_RED_BLOOD_MOON': {
        id: 'FX_ULT_RED_BLOOD_MOON',
        emitters: [{ particleType: 'GLOW', count: 1, lifetime: [3.0, 4.0], size: [400, 400], colors: ['#be123c'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },
    'FX_ULT_RED_POSSESSION': {
        id: 'FX_ULT_RED_POSSESSION',
        emitters: [{ particleType: 'GLOW', count: 1, lifetime: [1.0, 1.5], size: [100, 100], colors: ['#7f1d1d'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }]
    },

    // --- MID-TIER ACTIVE SKILLS (NEW) ---
    
    'FX_ACTIVE_RED_BLOOD_RAGE': {
        id: 'FX_ACTIVE_RED_BLOOD_RAGE',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.4, 0.6], size: [80, 120], colors: ['#dc2626'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RUBBLE', count: [8, 12], lifetime: [0.5, 0.8], size: [5, 10], speed: [200, 400], gravity: 1000, colors: ['#991b1b', '#ef4444'], shape: 'BURST_DIR', blendMode: 'source-over', delay: 0 }
        ]
    },
    'FX_ACTIVE_RED_SHADOW_SCREAM': {
        id: 'FX_ACTIVE_RED_SHADOW_SCREAM',
        emitters: [
            { particleType: 'RING', count: 2, lifetime: [0.5, 0.8], size: [150, 200], colors: ['#581c87'], speed: [0, 0], shape: 'POINT', blendMode: 'multiply', delay: 0 },
            { particleType: 'SMOKE', count: [5, 8], lifetime: [0.8, 1.2], size: [30, 50], speed: [50, 100], colors: ['#4c1d95'], shape: 'CIRCLE', shapeRadius: 80, blendMode: 'multiply', delay: 0 }
        ]
    },
    'FX_ACTIVE_RED_MAGMA_ERUPTION': {
        id: 'FX_ACTIVE_RED_MAGMA_ERUPTION',
        emitters: [
            { particleType: 'CRACKS', count: 1, lifetime: [1.5, 2.0], size: [100, 150], colors: ['#ea580c'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [15, 20], lifetime: [0.5, 0.8], size: [3, 6], speed: [300, 600], gravity: 800, colors: ['#f97316', '#fbbf24'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_ACTIVE_RED_FEL_SPLASH': {
        id: 'FX_ACTIVE_RED_FEL_SPLASH',
        emitters: [
            { particleType: 'RUBBLE', count: [10, 15], lifetime: [0.6, 1.0], size: [10, 20], speed: [100, 300], gravity: 500, colors: ['#a3e635', '#3f6212'], shape: 'CIRCLE', blendMode: 'source-over', delay: 0 },
            { particleType: 'SMOKE', count: [5, 8], lifetime: [1.0, 1.5], size: [20, 40], speed: [20, 50], colors: ['#bef264'], shape: 'CIRCLE', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ACTIVE_RED_WAR_STOMP': {
        id: 'FX_ACTIVE_RED_WAR_STOMP',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.3, 0.5], size: [100, 150], colors: ['#450a0a'], speed: [0, 0], shape: 'POINT', blendMode: 'overlay', delay: 0 },
            { particleType: 'ROCK', count: [5, 8], lifetime: [0.5, 0.8], size: [10, 20], speed: [200, 400], gravity: 1500, colors: ['#292524'], shape: 'CIRCLE', blendMode: 'source-over', delay: 0 }
        ]
    },

    // --- FACTION HITS ---
    'FX_HIT_RED_PHYSICAL': {
        id: 'FX_HIT_RED_PHYSICAL',
        emitters: [
            { particleType: 'SHARD', count: [6, 10], lifetime: [0.5, 0.8], size: [8, 16], speed: [200, 500], gravity: 1800, colors: ['#450a0a', '#7f1d1d'], shape: 'BURST_DIR', delay: 0, vRotation: [20, 50] },
            { particleType: 'RUBBLE', count: [3, 5], lifetime: [0.4, 0.6], size: [30, 50], speed: [20, 60], colors: ['#292524'], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SPARK', count: [5, 8], lifetime: [0.2, 0.4], size: [2, 4], speed: [400, 700], colors: ['#fca5a5', '#fbbf24'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_RED_BLOOD': {
        id: 'FX_HIT_RED_BLOOD',
        emitters: [
            { particleType: 'SHARD', count: [8, 12], lifetime: [0.4, 0.6], size: [4, 8], speed: [100, 300], gravity: 1000, colors: ['#991b1b', '#7f1d1d'], shape: 'BURST_DIR', delay: 0, vRotation: [10, 20] },
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
        emitters: [
            { particleType: 'RUBBLE', count: [6, 10], lifetime: [0.6, 1.0], size: [20, 40], speed: [20, 60], colors: ['#3f6212', '#65a30d'], shape: 'CIRCLE', blendMode: 'source-over', delay: 0, drag: 0.05 },
            { particleType: 'SPARK', count: [5, 8], lifetime: [0.3, 0.5], size: [3, 5], speed: [200, 400], colors: ['#bef264'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_RED_MAGMA': {
        id: 'FX_HIT_RED_MAGMA',
        emitters: [
            { particleType: 'RUBBLE', count: [5, 8], lifetime: [0.8, 1.2], size: [30, 60], speed: [50, 100], colors: ['#1c1917', '#450a0a'], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SHARD', count: [6, 10], lifetime: [0.5, 0.8], size: [5, 10], speed: [300, 600], gravity: 1000, colors: ['#f97316', '#ea580c'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_HIT_RED_SHADOW': {
        id: 'FX_HIT_RED_SHADOW',
        emitters: [
            { particleType: 'RUBBLE', count: [5, 8], lifetime: [0.6, 1.0], size: [20, 50], speed: [30, 60], colors: ['#000', '#2e1065'], shape: 'BURST_DIR', blendMode: 'source-over', delay: 0 },
            { particleType: 'SPIKE', count: 1, lifetime: [0.3, 0.5], size: [40, 100], speed: [0, 0], colors: ['#7e22ce'], shape: 'POINT', blendMode: 'lighter', delay: 0 }
        ]
    }
};
