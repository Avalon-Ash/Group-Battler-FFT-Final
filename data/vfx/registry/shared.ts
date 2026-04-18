
import { VFXAsset } from "../../../types/VFXSchema";

export const SHARED_VFX: Record<string, VFXAsset> = {
    'FX_TELEPORT': {
        id: 'FX_TELEPORT',
        emitters: [
            { particleType: 'SPIKE', count: 1, lifetime: [0.25, 0.35], size: [30, 45], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.4, 0.4], size: [15, 25], speed: [0, 0], colors: ['#fff'], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_SPAWN_BLUE': {
        id: 'FX_SPAWN_BLUE',
        description: 'Imperial spawn teleport effect',
        emitters: [
            { particleType: 'HEX_GLOW', count: 1, lifetime: [0.4, 0.6], size: [40, 60], colors: ['#3b82f6'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.4, 0.5], size: [15, 25], speed: [0, 0], colors: ['#93c5fd', '#ffffff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [8, 12], lifetime: [0.3, 0.6], size: [2, 4], speed: [100, 200], vz: [100, 300], colors: ['#60a5fa', '#ffffff'], shape: 'CIRCLE', shapeRadius: 20, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_SPAWN_RED': {
        id: 'FX_SPAWN_RED',
        description: 'Covenant spawn teleport effect',
        emitters: [
            { particleType: 'MAGIC_CIRCLE', count: 1, lifetime: [0.4, 0.6], size: [40, 60], colors: ['#b91c1c'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'PILLAR', visualStyle: 'PILLAR_HOLY', count: 1, lifetime: [0.4, 0.5], size: [15, 25], speed: [0, 0], colors: ['#ef4444', '#ffffff'], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SMOKE', count: [4, 6], lifetime: [0.4, 0.7], size: [15, 25], speed: [20, 50], colors: ['#7f1d1d', '#000000'], shape: 'CIRCLE', shapeRadius: 20, delay: 0 }
        ]
    },
    'FX_IDLE_BLUE': {
        id: 'FX_IDLE_BLUE',
        description: 'Imperial idle energy hum',
        emitters: [
            { particleType: 'SPARK', count: 1, lifetime: [0.8, 1.2], size: [2, 4], speed: [5, 15], vz: [10, 25], colors: ['#60a5fa', '#ffffff'], shape: 'CIRCLE', shapeRadius: 15, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_IDLE_RED': {
        id: 'FX_IDLE_RED',
        description: 'Covenant idle chaos embers',
        emitters: [
            { particleType: 'SPARK', count: 1, lifetime: [0.6, 1.0], size: [2, 4], speed: [10, 20], vz: [20, 40], colors: ['#ef4444', '#f97316'], shape: 'CIRCLE', shapeRadius: 15, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_CAST_BREAK': {
        id: 'FX_CAST_BREAK',
        description: '能量崩解粒子：具備物理重力感的碎裂',
        emitters: [
            { 
                particleType: 'SHARD', count: [15, 20], lifetime: [0.5, 0.9], 
                size: [4, 10], speed: [150, 450], vz: [400, 800], 
                gravity: 4500, // 極高重力，產生沉重的崩裂感
                colors: ['#ffffff', '#cbd5e1'], // 基本色會被 Skill Color 覆蓋
                shape: 'BURST_DIR', delay: 0, vRotation: [20, 50] 
            },
            {
                particleType: 'SMOKE_PUFF', count: [4, 6], lifetime: [0.3, 0.5],
                size: [20, 35], speed: [50, 100], vz: [50, 150],
                colors: ['#64748b'], shape: 'CIRCLE', shapeRadius: 10,
                blendMode: 'screen', delay: 0
            }
        ]
    },
    'FX_GRID_IMPACT_BLUE': {
        id: 'FX_GRID_IMPACT_BLUE',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_TECH_BLUE', count: 1, lifetime: [0.4, 0.6], size: [32, 32], speed: [0, 0], colors: ['#3b82f6'], shape: 'POINT', locked: true, blendMode: 'screen', delay: 0 }]
    },
    'FX_GRID_IMPACT_RED': {
        id: 'FX_GRID_IMPACT_RED',
        emitters: [{ particleType: 'GRID_FIELD', visualStyle: 'GRID_CORRUPT_RED', count: 1, lifetime: [0.5, 0.7], size: [32, 32], speed: [0, 0], colors: ['#ef4444'], shape: 'POINT', locked: true, blendMode: 'screen', delay: 0 }]
    },
    'FX_HIT_GENERIC': {
        id: 'FX_HIT_GENERIC',
        description: 'Precise physical impact with airborne debris',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.15, 0.25], size: [30, 45], colors: ['#ffffff'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RUBBLE', count: [4, 6], lifetime: [0.3, 0.5], size: [4, 8], speed: [150, 300], vz: [200, 500], gravity: 3000, colors: ['#57534e', '#292524', '#78716c'], shape: 'BURST_DIR', vRotation: [20, 60], delay: 0 },
            { particleType: 'GLOW', count: 1, lifetime: [0.08, 0.12], size: [50, 70], colors: ['#fff'], speed: [0, 0], shape: 'POINT', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_HIT_FIRE': {
        id: 'FX_HIT_FIRE',
        emitters: [
            { particleType: 'RUBBLE', count: [3, 5], lifetime: [0.3, 0.5], size: [6, 12], speed: [100, 200], vz: [150, 400], colors: ['#f97316', '#7c2d12'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SPARK', count: [8, 12], lifetime: [0.3, 0.5], size: [2, 4], speed: [200, 500], vz: [100, 600], colors: ['#fcd34d', '#fbbf24', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
        ]
    },
    'FX_SELF_DAMAGE': {
        id: 'FX_SELF_DAMAGE',
        description: 'Self-inflicted damage effect (blood/chaos sacrifice)',
        emitters: [
            { particleType: 'SHARD', count: [8, 12], lifetime: [0.4, 0.6], size: [4, 8], speed: [50, 150], vz: [100, 200], gravity: 1500, colors: ['#991b1b', '#7f1d1d'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SMOKE', count: [3, 5], lifetime: [0.5, 0.8], size: [15, 25], speed: [20, 40], colors: ['#450a0a', '#000'], shape: 'CIRCLE', shapeRadius: 10, delay: 0 },
            { particleType: 'GLOW', count: 1, lifetime: [0.2, 0.3], size: [40, 60], colors: ['#7f1d1d'], speed: [0,0], shape: 'POINT', blendMode: 'multiply', delay: 0 }
        ]
    },
    'FX_HEAL_BURST': {
        id: 'FX_HEAL_BURST',
        description: 'Instant healing burst effect',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.3, 0.5], size: [40, 60], colors: ['#86efac'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [6, 10], lifetime: [0.4, 0.7], size: [3, 6], speed: [50, 100], vz: [100, 200], colors: ['#bbf7d0', '#ffffff'], shape: 'CIRCLE', shapeRadius: 15, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_VAMP_BURST': {
        id: 'FX_VAMP_BURST',
        description: 'Vampiric healing burst effect',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.3, 0.5], size: [40, 60], colors: ['#be123c'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [6, 10], lifetime: [0.4, 0.7], size: [3, 6], speed: [50, 100], vz: [100, 200], colors: ['#f43f5e', '#ffffff'], shape: 'CIRCLE', shapeRadius: 15, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_MANA_BURN': {
        id: 'FX_MANA_BURN',
        description: 'Mana burn effect',
        emitters: [
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.2, 0.4], size: [30, 50], colors: ['#8b5cf6'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [4, 8], lifetime: [0.3, 0.5], size: [2, 4], speed: [100, 200], vz: [50, 150], colors: ['#c084fc', '#ffffff'], shape: 'BURST_DIR', blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_MANA_RESTORE': {
        id: 'FX_MANA_RESTORE',
        description: 'Mana restore effect',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.3, 0.5], size: [40, 60], colors: ['#3b82f6'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [6, 10], lifetime: [0.4, 0.7], size: [3, 6], speed: [50, 100], vz: [100, 200], colors: ['#93c5fd', '#ffffff'], shape: 'CIRCLE', shapeRadius: 15, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_MASSIVE_IMPACT': {
        id: 'FX_MASSIVE_IMPACT',
        description: 'Screen-shaking massive impact flash',
        emitters: [
            { particleType: 'BLAST', count: 1, lifetime: [0.2, 0.4], size: [100, 150], colors: ['#ffffff'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SHOCKWAVE', count: 1, lifetime: [0.3, 0.5], size: [150, 250], colors: ['#ffffff'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'RUBBLE', count: [15, 25], lifetime: [0.6, 1.0], size: [8, 15], speed: [400, 800], vz: [400, 1000], gravity: 4000, colors: ['#ffffff', '#cbd5e1'], shape: 'BURST_DIR', delay: 0 }
        ]
    },
    'FX_TILE_COLLAPSE': {
        id: 'FX_TILE_COLLAPSE',
        description: 'Visual for map tiles breaking away',
        emitters: [
            { 
                particleType: 'SMOKE', count: [10, 15], lifetime: [0.8, 1.5], 
                size: [30, 60], colors: ['#44403c', '#1c1917'], 
                speed: [80, 150], vz: [50, 150], shape: 'CIRCLE', shapeRadius: 40, 
                blendMode: 'screen', delay: 0 
            },
            { 
                particleType: 'RUBBLE', count: [20, 30], lifetime: [1.0, 2.0], 
                size: [6, 12], speed: [200, 400], vz: [100, 300], 
                gravity: 2500, colors: ['#57534e', '#292524'], 
                shape: 'CIRCLE', shapeRadius: 30, vRotation: [30, 60], delay: 0 
            },
            {
                particleType: 'SHOCKWAVE', count: 1, lifetime: [0.4, 0.6],
                size: [80, 120], colors: ['#a8a29e'], speed: [0,0],
                shape: 'POINT', blendMode: 'screen', delay: 0
            }
        ]
    },
    'FX_MUZZLE_FLASH': {
        id: 'FX_MUZZLE_FLASH',
        description: 'Muzzle flash for projectiles',
        emitters: [
            { particleType: 'GLOW', count: 1, lifetime: [0.1, 0.2], size: [30, 50], colors: ['#ffffff'], speed: [0,0], shape: 'POINT', blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [4, 6], lifetime: [0.2, 0.3], size: [2, 4], speed: [100, 200], vz: [50, 100], colors: ['#fff', '#fbbf24'], shape: 'BURST_DIR', delay: 0 }
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
            { particleType: 'DUST', count: [2, 3], lifetime: [0.3, 0.6], size: [4, 8], speed: [10, 30], vz: [10, 20], colors: ['#d97706', '#78350f'], shape: 'CIRCLE', shapeRadius: 20, delay: 0 }
        ]
    },
    'FX_STATUS_VULNERABLE_LOOP': {
        id: 'FX_STATUS_VULNERABLE_LOOP',
        emitters: [
            { particleType: 'SPARK', count: 1, lifetime: [0.4, 0.6], size: [3, 5], speed: [20, 40], vz: [50, 80], colors: ['#ef4444', '#ffffff'], shape: 'CIRCLE', shapeRadius: 10, blendMode: 'screen', delay: 0 }
        ]
    }
};
