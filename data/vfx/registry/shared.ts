
import { VFXAsset } from "../../../types/VFXSchema";

// 格子脈衝、出手閃光、治療、吸血、瞬移、燒魔、通用撞擊、護盾火花、出場、待機、自傷、回魔、擊退塵已改零件版，見 shared_parts.ts；詠唱中斷見 cast_break.ts
export const SHARED_VFX: Record<string, VFXAsset> = {
    'FX_CASTING_ULT': {
        id: 'FX_CASTING_ULT',
        description: 'ULT casting aura',
        emitters: [
            { particleType: 'GLOW', count: 2, lifetime: [0.8, 1.2], size: [20, 40], speed: [2, 10], vz: [100, 200], colors: ['rgba(251,191,36,0.3)', 'rgba(217,119,6,0)'], shape: 'CIRCLE', shapeRadius: 25, blendMode: 'screen', delay: 0 },
            { particleType: 'SPARK', count: [4, 8], lifetime: [0.4, 0.8], size: [2, 5], speed: [10, 30], vz: [150, 300], colors: ['#fbbf24', '#fef3c7'], shape: 'CIRCLE', shapeRadius: 30, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_CASTING_ACTIVE': {
        id: 'FX_CASTING_ACTIVE',
        description: 'Active casting aura',
        emitters: [
            { particleType: 'SPARK', count: [2, 4], lifetime: [0.5, 0.9], size: [1, 3], speed: [5, 20], vz: [50, 100], colors: ['#60a5fa', '#dbeafe'], shape: 'CIRCLE', shapeRadius: 20, blendMode: 'screen', delay: 0 }
        ]
    },
    'FX_HIT_FIRE': {
        id: 'FX_HIT_FIRE',
        emitters: [
            { particleType: 'RUBBLE', count: [3, 5], lifetime: [0.3, 0.5], size: [6, 12], speed: [100, 200], vz: [150, 400], colors: ['#f97316', '#7c2d12'], shape: 'BURST_DIR', delay: 0 },
            { particleType: 'SPARK', count: [8, 12], lifetime: [0.3, 0.5], size: [2, 4], speed: [200, 500], vz: [100, 600], colors: ['#fcd34d', '#fbbf24', '#fff'], shape: 'BURST_DIR', blendMode: 'lighter', delay: 0 }
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
