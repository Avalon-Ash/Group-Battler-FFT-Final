
import { Role, Team, HexLayout } from "../types";
import { PALETTE } from "../constants";
import { UnitFactory } from "./graphics/UnitFactory";
import { EnvironmentFactory } from "./graphics/EnvironmentFactory";

const cache: Map<string, any> = new Map();

export interface UnitAssets {
    base: HTMLCanvasElement; // Pre-rendered base
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
    
    getObstacleSprite(styleKey: string, layout: HexLayout): HTMLCanvasElement {
        // Cache Key now includes Layout to support switching modes
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
            // Ice block assumes default layout for simplicity, or we could update this too
            // For special models, we default to FLAT as they are organic shapes usually
            canvas = EnvironmentFactory.generateIceBlock('FLAT');
        }
        
        cache.set(key, canvas);
        return canvas;
    }
};
