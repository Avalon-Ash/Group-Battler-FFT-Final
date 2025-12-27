
import { VFXFactory } from "./graphics/VFXFactory";
import { UIFactory } from "./graphics/UIFactory";

const cache: Map<string, HTMLCanvasElement> = new Map();

export const AssetManager = {
    // New: Optimized Glow Sprite (Small) for replacement of shadowBlur
    getGlowSprite(color: string): HTMLCanvasElement {
        const key = `GLOW_SPRITE_${color}`;
        if (!cache.has(key)) cache.set(key, VFXFactory.generateGlowOrb(color));
        return cache.get(key)!;
    },

    // New: Pre-rendered Fog
    getFogCloud(color: string): HTMLCanvasElement {
        const key = `FOG_${color}`;
        if (!cache.has(key)) cache.set(key, VFXFactory.generateFogCloud(color));
        return cache.get(key)!;
    },
    
    // VFX: Projectiles
    getProjectile(visual: string, color: string): HTMLCanvasElement {
        const key = `PROJ_${visual}_${color}`;
        if (!cache.has(key)) {
            // Fallback to BOLT if unknown
            const v = ['ARROW', 'FIREBALL', 'BOLT', 'BOMB'].includes(visual) ? visual : 'BOLT';
            cache.set(key, VFXFactory.generateProjectileSprite(v, color));
        }
        return cache.get(key)!;
    },
    
    // UI: Skill Icons
    getSkillIcon(visual: string, color: string): HTMLCanvasElement {
        const key = `SK_ICON_${visual}_${color}`;
        if (!cache.has(key)) cache.set(key, UIFactory.generateSkillIcon(visual, color));
        return cache.get(key)!;
    },
    
    // UI: Status Icons
    getStatusIcon(type: string): HTMLCanvasElement {
        const key = `STATUS_${type}`;
        if (!cache.has(key)) cache.set(key, UIFactory.generateStatusIcon(type));
        return cache.get(key)!;
    },
    
    // VFX: Ground Decals
    getBlastZone(color: string): HTMLCanvasElement {
        const key = `BLAST_${color}_V2`; // V2 for updated style
        if (!cache.has(key)) cache.set(key, VFXFactory.generateBlastZone(color));
        return cache.get(key)!;
    }
};
