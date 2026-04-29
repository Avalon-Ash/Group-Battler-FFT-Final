
import { VFXAsset } from "../../../types/VFXSchema";

export const LAST_STAND_VFX: Record<string, VFXAsset> = {
    'FX_LAST_STAND_LOCKED': {
        id: 'FX_LAST_STAND_LOCKED',
        description: 'Ground EMP for Last Stand entry',
        emitters: [
            { 
                particleType: 'SHOCKWAVE', 
                count: 1, 
                lifetime: [0.3, 0.4], 
                size: [80, 120], 
                colors: ['#c084fc'], 
                speed: [0, 0], 
                shape: 'POINT', 
                blendMode: 'screen', 
                delay: 0 
            },
            { 
                particleType: 'RING', 
                count: 1, 
                lifetime: [0.4, 0.5], 
                size: [100, 140], 
                colors: ['#f0abfc'], 
                speed: [0, 0], 
                shape: 'POINT', 
                blendMode: 'screen', 
                delay: 0.05 
            },
            {
                particleType: 'HEX_GLOW',
                count: 1,
                lifetime: [0.5, 0.6],
                size: [60, 80],
                colors: ['#a855f7'],
                speed: [0, 0],
                shape: 'POINT',
                blendMode: 'screen',
                delay: 0
            }
        ]
    }
};
