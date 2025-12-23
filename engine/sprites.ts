
import { Role, Team } from "../types";
import { PALETTE } from "../constants";
import { UnitFactory } from "./graphics/UnitFactory";
import { EnvironmentFactory } from "./graphics/EnvironmentFactory";

const cache: Map<string, any> = new Map();

export interface UnitAssets {
    base: HTMLCanvasElement; // Pre-rendered base
    weapon: HTMLCanvasElement; // Pre-rendered weapon
    icon: HTMLCanvasElement;   // Pre-rendered class icon
    color: string;           // Glow color
}

// ==========================================
// Sprite Manager (Cache & Facade)
// ==========================================
export const SpriteManager = {
    getUnitImages(role: Role, team: Team): UnitAssets {
        // Updated keys to force refresh with new designs
        const keyBase = `TOKEN_BASE_${team}_V3`; 
        let base = cache.get(keyBase);
        if (!base) {
            base = UnitFactory.generateTokenBase(team);
            cache.set(keyBase, base);
        }

        const keyWep = `WEAPON_${role}_${team}_V3`;
        let weapon = cache.get(keyWep);
        if (!weapon) {
            weapon = UnitFactory.generateWeapon(role, team);
            cache.set(keyWep, weapon);
        }

        const keyIcon = `ROLE_ICON_${role}_${team}_V3`;
        let icon = cache.get(keyIcon);
        if (!icon) {
            icon = UnitFactory.generateRoleIcon(role, team);
            cache.set(keyIcon, icon);
        }

        return {
            base: base,
            weapon: weapon,
            icon: icon,
            color: PALETTE.TEAMS[team].glow
        };
    },
    
    getObstacleSprite(styleKey: string = 'WALL'): HTMLCanvasElement {
        const key = `OBSTACLE_${styleKey}`;
        if (cache.has(key)) return cache.get(key)!;
        
        const canvas = EnvironmentFactory.generateObstacle(styleKey);
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
            canvas = EnvironmentFactory.generateIceBlock();
        }
        
        cache.set(key, canvas);
        return canvas;
    }
};
