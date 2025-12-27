
import { VFXAsset } from "../../../types/VFXSchema";

// ==========================================
// 🔴 COVENANT VFX (RED FACTION)
// Focus: Chaos, Blood, Fire, Void
// ==========================================

export const COVENANT_VFX: Record<string, VFXAsset> = {

    // --- ULTIMATE SPECIALS ---

    // Tank: Guillotine
    'FX_ULT_RED_GUILLOTINE_IMPACT': {
        id: 'FX_ULT_RED_GUILLOTINE_IMPACT',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.3, 0.5], size: [100, 200], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'overlay', delay: 0 },
            { particleType: 'BLAST', count: 1, lifetime: [0.2, 0.3], size: [80, 120], speed: [0, 0], colors: ['#7f1d1d'], shape: 'POINT', blendMode: 'multiply', delay: 0 },
            { particleType: 'CHIP', count: [15, 25], lifetime: [0.5, 1.0], size: [5, 12], speed: [300, 800], gravity: 1500, colors: ['#991b1b', '#000'], shape: 'BURST_DIR', delay: 0 }
        ]
    },

    // Warrior: Ragnarok
    'FX_ULT_RED_RAGNAROK_ERUPTION': {
        id: 'FX_ULT_RED_RAGNAROK_ERUPTION',
        emitters: [
            { particleType: 'PILLAR', visualStyle: 'PILLAR_MAGMA', count: 1, lifetime: [0.8, 1.2], size: [60, 80], speed: [0, 0], colors: ['#ea580c'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'ROCK', count: [8, 12], lifetime: [1.0, 1.5], size: [10, 20], speed: [400, 900], gravity: 1200, colors: ['#450a0a', '#7f1d1d'], shape: 'CONE', delay: 0.1 }
        ]
    },

    // Ranger: Nuke
    'FX_ULT_RED_NUKE_FLASH': {
        id: 'FX_ULT_RED_NUKE_FLASH',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.1, 0.2], size: [800, 1200], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_ULT_RED_NUKE_CLOUD': {
        id: 'FX_ULT_RED_NUKE_CLOUD',
        emitters: [
            { particleType: 'SMOKE', count: [20, 30], lifetime: [2.0, 3.0], size: [60, 150], speed: [50, 150], colors: ['#fca5a5', '#450a0a', '#1c1917'], shape: 'CIRCLE', shapeRadius: 50, blendMode: 'source-over', delay: 0 },
            { particleType: 'GLOW', count: [10, 15], lifetime: [1.0, 2.0], size: [100, 200], speed: [20, 50], colors: ['#ef4444', '#f97316'], shape: 'CIRCLE', blendMode: 'lighter', delay: 0.1 }
        ]
    },

    // Mage: Meteor
    'FX_ULT_RED_METEOR_IMPACT': {
        id: 'FX_ULT_RED_METEOR_IMPACT',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 2, lifetime: [0.5, 0.8], size: [100, 300], speed: [0, 0], colors: ['#f97316'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'DEBRIS', count: [12, 20], lifetime: [0.8, 1.2], size: [8, 15], speed: [300, 600], gravity: 1000, colors: ['#78350f', '#450a0a'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'BLAST', count: 1, lifetime: [0.3, 0.4], size: [150, 200], speed: [0, 0], colors: ['#fffbeb'], shape: 'POINT', blendMode: 'lighter', delay: 0 }
        ]
    },

    // Support: Soul Link
    'FX_ULT_RED_SOUL_WEB': {
        id: 'FX_ULT_RED_SOUL_WEB',
        emitters: [
            { particleType: 'GRID_FIELD', visualStyle: 'GRID_VOID', count: 1, lifetime: [2.0, 2.0], size: [100, 100], speed: [0, 0], colors: ['#581c87'], shape: 'POINT', locked: true, blendMode: 'screen', delay: 0 }
        ]
    },

    // --- FACTION HITS ---

    'FX_HIT_RED_PHYSICAL': {
        id: 'FX_HIT_RED_PHYSICAL',
        description: 'Heavy metal impact',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.2, 0.3], size: [60, 90], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'overlay', delay: 0 },
            { particleType: 'SPARK', count: [10, 15], lifetime: [0.3, 0.5], size: [2, 4], speed: [300, 700], drag: 0.1, colors: ['#fca5a5', '#fbbf24'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 },
            { particleType: 'SMOKE', count: [4, 6], lifetime: [0.5, 0.8], size: [20, 40], speed: [50, 100], colors: ['#450a0a', '#292524'], shape: 'CIRCLE', blendMode: 'source-over', delay: 0 }
        ]
    },
    'FX_HIT_RED_BLOOD': {
        id: 'FX_HIT_RED_BLOOD',
        description: 'Visceral blood splatter',
        emitters: [
            { particleType: 'CHIP', count: [8, 12], lifetime: [0.4, 0.7], size: [4, 7], speed: [150, 450], gravity: 1200, colors: ['#991b1b', '#b91c1c', '#7f1d1d'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'BLAST', count: 1, lifetime: [0.2, 0.25], size: [40, 60], speed: [0, 0], colors: ['#450a0a'], shape: 'POINT', blendMode: 'multiply', delay: 0 }
        ]
    },
    'FX_HIT_RED_FEL': {
        id: 'FX_HIT_RED_FEL',
        description: 'Fel magic explosion',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.3, 0.4], size: [50, 80], speed: [0, 0], colors: ['#bef264'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE', count: [6, 10], lifetime: [0.8, 1.2], size: [30, 50], speed: [20, 60], colors: ['#3f6212', '#65a30d'], shape: 'CIRCLE', blendMode: 'source-over', delay: 0, drag: 0.05 },
            { particleType: 'GLOW', count: [3, 5], lifetime: [0.6, 1.0], size: [10, 20], speed: [50, 100], colors: ['#a3e635'], shape: 'CONE', blendMode: 'lighter', delay: 0.1 }
        ]
    },
    'FX_HIT_RED_SHADOW': {
        id: 'FX_HIT_RED_SHADOW',
        description: 'Void implosion',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.3, 0.3], size: [80, 20], speed: [0, 0], colors: ['#000000'], shape: 'POINT', blendMode: 'source-over', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.4, 0.5], size: [40, 100], speed: [0, 0], colors: ['#7e22ce'], shape: 'POINT', blendMode: 'lighter', delay: 0.1 },
            { particleType: 'GLOW', count: [5, 8], lifetime: [0.5, 0.8], size: [20, 40], speed: [30, 60], colors: ['#581c87'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_HIT_RED_MAGMA': {
        id: 'FX_HIT_RED_MAGMA',
        description: 'Fire explosion',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.2, 0.3], size: [60, 90], speed: [0, 0], colors: ['#f97316'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'ROCK', count: [4, 7], lifetime: [0.6, 0.9], size: [5, 10], speed: [200, 400], gravity: 1000, colors: ['#450a0a', '#7f1d1d'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
};
