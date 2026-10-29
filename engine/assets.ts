import { VFXFactory } from "./graphics/VFXFactory";
import { UIFactory } from "./graphics/UIFactory";
const cache: Map<string, HTMLCanvasElement> = new Map();
export const AssetManager = {
    getFogCloud(color: string): HTMLCanvasElement {
        const key = `FOG_${color}`;
        if (!cache.has(key)) cache.set(key, VFXFactory.generateFogCloud(color));
        return cache.get(key)!;
    },
    getSkillIcon(visual: string, color: string): HTMLCanvasElement {
        const key = `SK_ICON_${visual}_${color}`;
        if (!cache.has(key)) cache.set(key, UIFactory.generateSkillIcon(visual, color));
        return cache.get(key)!;
    },
};