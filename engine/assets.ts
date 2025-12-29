import { VFXFactory } from "./graphics/VFXFactory";
import { UIFactory } from "./graphics/UIFactory";
const cache: Map<string, HTMLCanvasElement> = new Map();
export const AssetManager = {
    getGlowSprite(color: string): HTMLCanvasElement {
        const key = `GLOW_SPRITE_${color}`;
        if (!cache.has(key)) cache.set(key, VFXFactory.generateGlowOrb(color));
        return cache.get(key)!;
    },
    getFogCloud(color: string): HTMLCanvasElement {
        const key = `FOG_${color}`;
        if (!cache.has(key)) cache.set(key, VFXFactory.generateFogCloud(color));
        return cache.get(key)!;
    },
    getProjectile(visual: string, color: string): HTMLCanvasElement {
        const key = `PROJ_${visual}_${color}`;
        if (!cache.has(key)) {
            const v = ['ARROW', 'FIREBALL', 'BOLT', 'BOMB'].includes(visual) ? visual : 'BOLT';
            cache.set(key, VFXFactory.getTexture(v, color));
        }
        return cache.get(key)!;
    },
    getSkillIcon(visual: string, color: string): HTMLCanvasElement {
        const key = `SK_ICON_${visual}_${color}`;
        if (!cache.has(key)) cache.set(key, UIFactory.generateSkillIcon(visual, color));
        return cache.get(key)!;
    },
    getStatusIcon(type: string): HTMLCanvasElement {
        const key = `STATUS_${type}`;
        if (!cache.has(key)) cache.set(key, UIFactory.generateStatusIcon(type));
        return cache.get(key)!;
    },
    getBlastZone(color: string): HTMLCanvasElement {
        const key = `BLAST_${color}_V2`;
        if (!cache.has(key)) cache.set(key, VFXFactory.getTexture('BLAST', color));
        return cache.get(key)!;
    }
};