import { Role, Team, HexLayout } from "../types";
import { PALETTE } from "../constants";
import { UnitFactory } from "./graphics/UnitFactory";
import { EnvironmentFactory } from "./graphics/EnvironmentFactory";
const cache: Map<string, any> = new Map();
export interface UnitAssets {
    base: HTMLCanvasElement;
    icon: HTMLCanvasElement;
    color: string;
}
export interface UnitAssetsFull extends UnitAssets {
    rim: HTMLCanvasElement;   
    core: HTMLCanvasElement;  
}
export const SpriteManager = {
    getUnitImages(role: Role, team: Team): UnitAssets {
        const keyBase = `TOKEN_BASE_${team}_V3`; 
        let base = cache.get(keyBase);
        if (!base) {
            base = UnitFactory.generateTokenBase(team);
            cache.set(keyBase, base);
        }
        const keyIcon = `ROLE_ICON_${role}_${team}_V3`;
        let icon = cache.get(keyIcon);
        if (!icon) {
            icon = UnitFactory.generateRoleIcon(role, team);
            cache.set(keyIcon, icon);
        }
        return {
            base: base,
            icon: icon,
            color: PALETTE.TEAMS[team].glow
        };
    },
    getUnitLayers(role: Role, team: Team): UnitAssetsFull {
        const key = `UNIT_LAYERS_${role}_${team}_V1`;
        if (cache.has(key)) return cache.get(key);
        
        const layers = UnitFactory.generateLayers(role, team);
        cache.set(key, layers);
        return layers;
    },
    getObstacleSprite(styleKey: string, layout: HexLayout): HTMLCanvasElement {
        const key = `OBSTACLE_${styleKey}_${layout}`;
        if (cache.has(key)) return cache.get(key)!;
        const canvas = EnvironmentFactory.generateObstacle(styleKey, layout);
        cache.set(key, canvas);
        return canvas;
    },
    getSpecialModel(type: 'SHEEP' | 'ICE'): HTMLCanvasElement {
        const key = `MODEL_${type}`;
        if (cache.has(key)) return cache.get(key)!;
        let canvas;
        if (type === 'SHEEP') {
            canvas = UnitFactory.generateSheep();
        } else {
            canvas = EnvironmentFactory.generateIceBlock('FLAT');
        }
        cache.set(key, canvas);
        return canvas;
    }
};