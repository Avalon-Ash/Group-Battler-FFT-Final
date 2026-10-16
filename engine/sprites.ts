// ╔══════════════════════════════════════════════════════════════════╗
// ║  SpriteManager — Canvas 資產快取層 (Asset Cache Layer)          ║
// ║                                                                  ║
// ║  職責：                                                          ║
// ║    對 UnitFactory / EnvironmentFactory 產生的 HTMLCanvasElement  ║
// ║    做 key-based 快取，避免每幀重複繪製相同資產                   ║
// ║    本層不持有任何繪製邏輯，只做快取存取                          ║
// ║                                                                  ║
// ║  呼叫端 (現役)：                                                 ║
// ║    UnitBodyPainter   → getSpecialModel('SHEEP' / 'ICE')         ║
// ║    UnitShadowPainter → getUnitImages                            ║
// ║    RenderDispatcher  → getObstacleSprite                        ║
// ║    GameCanvas        → getObstacleSprite (編輯器模式)           ║
// ║                                                                  ║
// ║  [注意] UnitLayers 等已無外部使用端，保留僅為向後相容           ║
// ╚══════════════════════════════════════════════════════════════════╝

import { Role, Team, HexLayout, BodyTypeId } from "../types";
import { UnitFactory } from "./graphics/UnitFactory";
import { getFactionSkin } from "../data/units/factionSkin";
import { factionTextureStore } from "./renderers/units/FactionTextureStore";
import { EnvironmentFactory } from "./graphics/EnvironmentFactory";
const cache: Map<string, any> = new Map();
export interface UnitAssets {
    base: HTMLCanvasElement;
    icon: HTMLCanvasElement;
}
export interface UnitLayers {
    base: HTMLCanvasElement;
    rim: HTMLCanvasElement;
    icon: HTMLCanvasElement;
}
const _layerCache = new Map<string, UnitLayers>();
// 棋座／職業圖示烘焙快取：陣營貼圖載入完成（revision 變動）時整批丟棄重烘
const _tokenCache = new Map<string, UnitAssets>();
let _tokenRevision = -1;
export const SpriteManager = {
    /**
     * 棋座與職業圖示（陣營皮膚 FACTION_SKINS＋手繪貼圖槽，烘焙一次後快取）
     */
    getUnitImages(role: Role, team: Team, body: BodyTypeId = 'MALE', layout: HexLayout = 'FLAT'): UnitAssets {
        if (_tokenRevision !== factionTextureStore.revision) {
            _tokenRevision = factionTextureStore.revision;
            _tokenCache.clear();
            _layerCache.clear();
        }
        const key = `${team}|${role}|${body}|${layout}`;
        let assets = _tokenCache.get(key);
        if (!assets) {
            const skin = getFactionSkin(team, role, body);
            const base = UnitFactory.generateTokenBase(skin, layout, {
                pedestalTexture: factionTextureStore.getTexture(team, 'pedestalTexture', role, body),
                pedestalRim: factionTextureStore.getTexture(team, 'pedestalRim', role, body),
                emblem: factionTextureStore.getTexture(team, 'emblem', role, body),
            });
            const icon = UnitFactory.generateRoleIcon(role, skin, factionTextureStore.getTexture(team, 'classIcon', role, body));
            assets = { base, icon };
            _tokenCache.set(key, assets);
        }
        return assets;
    },
    getUnitLayers(role: Role, team: Team): UnitLayers {
        const key = `${role}_${team}`;
        if (_layerCache.has(key)) return _layerCache.get(key)!;
        
        const full = this.getUnitImages(role, team);
        
        const base = document.createElement('canvas');
        base.width = 64; base.height = 64;
        base.getContext('2d')!.drawImage(full.base, 0, 0, 64, 64);
        
        const rim = document.createElement('canvas');
        rim.width = 64; rim.height = 64;
        rim.getContext('2d')!.drawImage(full.base, 0, 0, 64, 64);
        
        const icon = document.createElement('canvas');
        icon.width = 48; icon.height = 48;
        icon.getContext('2d')!.drawImage(full.icon, 0, 0, 48, 48);
        
        const layers: UnitLayers = { base, rim, icon };
        _layerCache.set(key, layers);
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