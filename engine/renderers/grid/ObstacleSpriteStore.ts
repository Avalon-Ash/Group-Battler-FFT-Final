/**
 * ObstacleSpriteStore — 障礙物預渲染精靈（VISUAL_ROADMAP O2）
 * -----------------------------------------------------------------------------
 *  職責：載入 public/assets/obstacles/manifest.json 與各類型圖集（tools/assets/blender/render_obstacle.py
 *        → pack_obstacles.py 產生），依格子雜湊選變體，合成「六角足跡陰影＋精靈」為一張畫布並快取。
 *  上游：RenderDispatcher（OBSTACLE op）、GameCanvas（編輯器拖曳預覽）經 SpriteManager.getObstacleSprite。
 *  [ARCH] 錨點＝格子中心的地面點（manifest 的 ax／ay），繪製時對齊 op.tx／op.ty（地塊頂面中心），
 *         不再用 ENV_SPRITE.ANCHOR_Y 手調值；排序規則不變（RenderSpec §2：足跡 Y，不加高度）。
 *         圖集未載入時回傳 null，呼叫端退回 EnvironmentFactory 程序化外觀。
 *  純衍生資源快取，不持遊戲狀態。
 */

import { HEX_SIZE, OBSTACLE_SPRITE } from '../../../constants';
import { HexLayout } from '../../../types';
import { createCanvas } from '../../graphics/CanvasUtils';
import { EnvironmentFactory } from '../../graphics/EnvironmentFactory';
import { resolveAssetUrl } from './TerrainTextureStore';

interface ObstacleVariantDef {
    x: number;
    y: number;
    w: number;
    h: number;
    /** 錨點（格子中心地面點）在此影格內的像素位置 */
    ax: number;
    ay: number;
    heightHex: number;
    source: string;
}

interface ObstacleTypeDef {
    file: string;
    atlas: { w: number; h: number };
    variants: ObstacleVariantDef[];
}

export interface ObstacleManifest {
    version: number;
    /** 圖集中一個 HEX_SIZE（六角外接半徑）佔幾像素 */
    pxPerHex: number;
    elevationDeg: number;
    types: Record<string, ObstacleTypeDef>;
}

/** 合成後的障礙物精靈：尺寸與錨點都是 canvas 單位（與 ENV_SPRITE 同一把尺） */
export interface ObstacleSprite {
    image: CanvasImageSource;
    width: number;
    height: number;
    anchorX: number;
    anchorY: number;
}

/** 純函式：依格子座標選變體（穩定、不閃爍） */
export function obstacleVariant(q: number, r: number, count: number): number {
    if (count <= 1) return 0;
    let h = Math.imul(q | 0, 0x27d4eb2d) ^ Math.imul(r | 0, 0x165667b1);
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    return (h >>> 0) % count;
}

class ObstacleSpriteStoreImpl {
    private manifest: ObstacleManifest | null = null;
    private images = new Map<string, HTMLImageElement>();
    private sprites = new Map<string, ObstacleSprite>();
    private _readyPromise: Promise<void>;

    constructor() {
        this._readyPromise = this.load();
    }

    get readyPromise(): Promise<void> {
        return this._readyPromise;
    }

    private async load(): Promise<void> {
        if (typeof window === 'undefined' || typeof fetch === 'undefined' || typeof Image === 'undefined') return;
        try {
            const res = await fetch(resolveAssetUrl(OBSTACLE_SPRITE.manifestPath));
            if (!res.ok) return;
            const manifest = (await res.json()) as ObstacleManifest;
            await Promise.all(Object.entries(manifest.types).map(([type, def]) => new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => { this.images.set(type, img); resolve(); };
                img.onerror = () => resolve();
                img.src = resolveAssetUrl(`${OBSTACLE_SPRITE.dir}/${def.file}`);
            })));
            this.manifest = manifest;
        } catch {
            this.manifest = null;
        }
    }

    getManifest(): ObstacleManifest | null {
        return this.manifest;
    }

    /** @returns null＝此類型沒有預渲染圖集（或尚未載入），呼叫端用程序化外觀 */
    get(type: string, layout: HexLayout, q: number, r: number): ObstacleSprite | null {
        const def = this.manifest?.types[type];
        const img = this.images.get(type);
        if (!def || !img || def.variants.length === 0) return null;
        const idx = obstacleVariant(q, r, def.variants.length);
        const key = `${type}|${layout}|${idx}`;
        const hit = this.sprites.get(key);
        if (hit) return hit;
        const sprite = this.compose(img, def.variants[idx], layout, this.manifest!.pxPerHex);
        this.sprites.set(key, sprite);
        return sprite;
    }

    private compose(img: HTMLImageElement, v: ObstacleVariantDef, layout: HexLayout, pxPerHex: number): ObstacleSprite {
        const k = HEX_SIZE / pxPerHex;
        const pad = OBSTACLE_SPRITE.SHADOW_PAD;
        const shadowR = HEX_SIZE + pad;
        const left = Math.min(-v.ax * k, -shadowR);
        const right = Math.max((v.w - v.ax) * k, shadowR);
        const top = -v.ay * k;
        const bottom = Math.max((v.h - v.ay) * k, shadowR);
        const width = right - left;
        const height = bottom - top;
        const s = OBSTACLE_SPRITE.BAKE_SCALE;
        const { canvas, ctx } = createCanvas(Math.ceil(width * s), Math.ceil(height * s));
        ctx.scale(s, s);
        ctx.translate(-left, -top);
        EnvironmentFactory.drawHexShadow(ctx, layout);
        ctx.drawImage(img, v.x, v.y, v.w, v.h, -v.ax * k, -v.ay * k, v.w * k, v.h * k);
        return { image: canvas, width: Math.ceil(width * s) / s, height: Math.ceil(height * s) / s, anchorX: -left, anchorY: -top };
    }
}

export const obstacleSpriteStore = new ObstacleSpriteStoreImpl();
