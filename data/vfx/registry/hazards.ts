
import { VFXAsset } from "../../../types/VFXSchema";

export const HAZARD_VFX: Record<string, VFXAsset> = {
    'FX_HAZARD_FIELD_FIRE': {
        id: 'FX_HAZARD_FIELD_FIRE',
        emitters: [{
            count: 1, particleType: 'GRID_FIELD', 
            shape: 'POINT', 
            lifetime: 4.0, // Fixed long duration, HazardSystem handles the actual lifetime by spawning more if needed or we can loop it
            colors: ['#ea580c'], // Lava orange
            size: 1.0, 
            speed: 0,
            delay: 0,
            visualStyle: 'FIRE',
            locked: true,
            blendMode: 'lighter'
        }, {
            count: 3, particleType: 'SMOKE', 
            shape: 'CIRCLE',
            shapeRadius: 20,
            lifetime: [1, 2],
            colors: ['#fbbf24', '#f59e0b'],
            size: [10, 20],
            speed: [10, 30],
            delay: 0,
            vz: [30, 80],
            visualStyle: 'FLAME'
        }]
    },
    'FX_HAZARD_FIELD_POISON': {
        id: 'FX_HAZARD_FIELD_POISON',
        emitters: [{
            count: 1, particleType: 'GRID_FIELD',
            shape: 'POINT',
            lifetime: 4.0,
            colors: ['#65a30d'],
            size: 1.0,
            speed: 0,
            delay: 0,
            visualStyle: 'POISON',
            locked: true,
            blendMode: 'screen'
        }]
    },
    'FX_HAZARD_FIELD_ICE': {
        id: 'FX_HAZARD_FIELD_ICE',
        emitters: [{
            count: 1, particleType: 'GRID_FIELD',
            shape: 'POINT',
            lifetime: 4.0,
            colors: ['#38bdf8'],
            size: 1.0,
            speed: 0,
            delay: 0,
            visualStyle: 'ICE',
            locked: true,
            blendMode: 'screen'
        }]
    },
    'FX_HAZARD_FIELD_GRAVITY': {
        id: 'FX_HAZARD_FIELD_GRAVITY',
        emitters: [{
            count: 1, particleType: 'GRID_FIELD',
            shape: 'POINT',
            lifetime: 4.0,
            colors: ['#7c3aed'],
            size: 1.0,
            speed: 0,
            delay: 0,
            visualStyle: 'VOID',
            locked: true,
            blendMode: 'multiply'
        }]
    },
    'FX_HAZARD_FIELD_GENERIC': {
        id: 'FX_HAZARD_FIELD_GENERIC',
        emitters: [{
            count: 1, particleType: 'GRID_FIELD',
            shape: 'POINT',
            lifetime: 4.0,
            colors: ['#94a3b8'],
            size: 1.0,
            speed: 0,
            delay: 0,
            visualStyle: 'FOG',
            locked: true,
            blendMode: 'screen'
        }]
    }
};
