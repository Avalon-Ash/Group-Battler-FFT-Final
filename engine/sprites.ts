// ╔══════════════════════════════════════════════════════════════════╗
// ║  SpriteManager — Canvas 資產快取層 (Asset Cache Layer)          ║
// ║                                                                  ║
// ║  職責：                                                          ║
// ║    對 UnitFactory / EnvironmentFactory 產生的 HTMLCanvasElement  ║
// ║    做 key-based 快取，避免每幀重複繪製相同資產                   ║
// ║    本層不持有任何繪製邏輯，只做快取存取                          ║
// ║                                                                  ║
// ║  呼叫端 (現役)：                                                 ║
// ║    UnitShadowPainter / UnitCorePainter → getUnitImages          ║
// ║    RenderDispatcher  → getObstacleSprite（預渲染優先，         ║
// ║                        ObstacleSpriteStore；退回程序化）       ║
// ║    GameCanvas        → getObstacleSprite (編輯器模式)           ║
// ╚══════════════════════════════════════════════════════════════════╝

import { Role, Team, HexLayout, BodyTypeId } from "../types";
import { UnitFactory } from "./graphics/UnitFactory";
import { getFactionSkin } from "../data/units/factionSkin";
import { factionTextureStore } from "./renderers/units/FactionTextureStore";
import { EnvironmentFactory } from "./graphics/EnvironmentFactory";
import { CoreFactory, CoreSprites } from "./graphics/units/CoreFactory";
import { obstacleSpriteStore, ObstacleSprite } from "./renderers/grid/ObstacleSpriteStore";
import { ENV_SPRITE } from "../constants";
const cache: Map<string, any> = new Map();
export interface UnitAssets {
    base: HTMLCanvasElement;
    /** 棋座核心（懸浮晶體）：本體＋光暈，位置見 VisualMath.getCoreAnchor */
    core: CoreSprites;
}
// 棋座／核心烘焙快取：陣營貼圖載入完成（revision 變動）時整批丟棄重烘
const _tokenCache = new Map<string, UnitAssets>();
let _tokenRevision = -1;
const _proceduralObstacles = new Map<string, ObstacleSprite>();
export const SpriteManager = {
    /**
     * 棋座（含刻在頂面的職業字形）與核心（陣營皮膚 FACTION_SKINS＋手繪貼圖槽，烘焙一次後快取）
     */
    getUnitImages(role: Role, team: Team, body: BodyTypeId = 'MALE', layout: HexLayout = 'FLAT'): UnitAssets {
        if (_tokenRevision !== factionTextureStore.revision) {
            _tokenRevision = factionTextureStore.revision;
            _tokenCache.clear();
        }
        const key = `${team}|${role}|${body}|${layout}`;
        let assets = _tokenCache.get(key);
        if (!assets) {
            const skin = getFactionSkin(team, role, body);
            const base = UnitFactory.generateTokenBase(skin, role, layout, {
                pedestalTexture: factionTextureStore.getTexture(team, 'pedestalTexture', role, body),
                pedestalRim: factionTextureStore.getTexture(team, 'pedestalRim', role, body),
                emblem: factionTextureStore.getTexture(team, 'emblem', role, body),
                classIcon: factionTextureStore.getTexture(team, 'classIcon', role, body),
            });
            const core = CoreFactory.generate(skin, factionTextureStore.getTexture(team, 'core', role, body));
            assets = { base, core };
            _tokenCache.set(key, assets);
        }
        return assets;
    },
    /**
     * 障礙物精靈：預渲染圖集（ObstacleSpriteStore，依 q,r 選變體）優先，未載入時退回程序化（ENV_SPRITE 錨點）。
     * 尺寸與錨點都是 canvas 單位；錨點＝格子中心地面點。
     */
    getObstacleSprite(styleKey: string, layout: HexLayout, q: number = 0, r: number = 0, time: number = 0): ObstacleSprite {
        const baked = obstacleSpriteStore.get(styleKey, layout, q, r, time);
        if (baked) return baked;
        const key = `OBSTACLE_${styleKey}_${layout}`;
        let sprite = _proceduralObstacles.get(key);
        if (!sprite) {
            sprite = { image: EnvironmentFactory.generateObstacle(styleKey, layout), width: ENV_SPRITE.CANVAS_W, height: ENV_SPRITE.CANVAS_H, anchorX: ENV_SPRITE.ANCHOR_X, anchorY: ENV_SPRITE.ANCHOR_Y };
            _proceduralObstacles.set(key, sprite);
        }
        return sprite;
    }
};