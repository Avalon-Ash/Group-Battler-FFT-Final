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

import { HEX_SIZE, OBSTACLE_SPRITE, type ObstacleAnimConfig } from '../../../constants';
import { loopFrameIndex } from './TerrainLoopAtlas';
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
    /** 有值時 image 是循環影格表，取這個子矩形（像素） */
    sx?: number;
    sy?: number;
    sw?: number;
    sh?: number;
    /** 動態疊層（glint／glow）：加法混合，(x, y) 是左上角相對錨點的位移（canvas 單位）；alpha 0 時不畫 */
    overlay?: { image: CanvasImageSource; x: number; y: number; width: number; height: number; alpha: number };
    width: number;
    height: number;
    anchorX: number;
    anchorY: number;
}

/** 圖集中的一張影格（地表裝飾直接取用，不合成陰影）；k＝每像素幾個 canvas 單位 */
export interface AtlasFrame {
    image: HTMLImageElement;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    ax: number;
    ay: number;
    k: number;
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
    private sprites = new Map<string, ObstacleSprite[]>();
    /** glint／glow 的疊層原型（每組一份，get() 每次只改 alpha 與位置後回傳同一個物件） */
    private overlays = new Map<string, ObstacleOverlaySet>();
    private _readyPromise: Promise<void>;
    /** 圖集載入完成時遞增；用到裝飾的烘焙快取（地塊 sprite、草叢循環）據此重烘 */
    private _revision = 0;

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
            this._revision++;
        } catch {
            this.manifest = null;
        }
    }

    getManifest(): ObstacleManifest | null {
        return this.manifest;
    }

    get revision(): number {
        return this._revision;
    }

    /** 此類型已載入的影格數（0＝沒有圖集或尚未載入） */
    frameCount(type: string): number {
        return this.images.has(type) ? (this.manifest?.types[type]?.variants.length ?? 0) : 0;
    }

    /** 地表裝飾用：取原始影格（idx 會取模） */
    getFrame(type: string, idx: number): AtlasFrame | null {
        const def = this.manifest?.types[type];
        const img = this.images.get(type);
        if (!def || !img || def.variants.length === 0) return null;
        const v = def.variants[((idx % def.variants.length) + def.variants.length) % def.variants.length];
        return { image: img, sx: v.x, sy: v.y, sw: v.w, sh: v.h, ax: v.ax, ay: v.ay, k: HEX_SIZE / this.manifest!.pxPerHex };
    }

    /**
     * @param time 戰鬥時間（秒）：有動態設定（OBSTACLE_SPRITE.ANIM）的類型依它選影格，相位依 q,r 錯開
     * @returns null＝此類型沒有預渲染圖集（或尚未載入），呼叫端用程序化外觀
     */
    get(type: string, layout: HexLayout, q: number, r: number, time: number = 0): ObstacleSprite | null {
        const def = this.manifest?.types[type];
        const img = this.images.get(type);
        if (!def || !img || def.variants.length === 0) return null;
        const idx = obstacleVariant(q, r, def.variants.length);
        const key = `${type}|${layout}|${idx}`;
        let set = this.sprites.get(key);
        if (!set) {
            set = this.compose(img, def.variants[idx], layout, this.manifest!.pxPerHex, OBSTACLE_SPRITE.ANIM[type]);
            this.sprites.set(key, set);
        }
        const anim = OBSTACLE_SPRITE.ANIM[type];
        if (!anim) return set[0];
        // 相位：同一個雜湊換個種子（變體已用掉低位）
        const phase = obstacleVariant(r * 7 + 3, q * 13 + 5, 997) / 997;
        if (anim.kind === 'sway') return set[loopFrameIndex(time, anim.period, set.length, phase)];
        let ov = this.overlays.get(key);
        if (!ov) {
            ov = this.composeOverlay(img, def.variants[idx], this.manifest!.pxPerHex, anim, set[0]);
            this.overlays.set(key, ov);
        }
        let u = (time / anim.period + phase) % 1;
        if (u < 0) u += 1;
        const o = ov.sprite.overlay!;
        if (anim.kind === 'glow') {
            o.alpha = anim.amp * (0.5 + 0.5 * Math.sin(Math.PI * 2 * u));
        } else if (anim.kind === 'glint') {
            const t = u / anim.visible;
            o.alpha = u < anim.visible ? anim.amp * Math.sin(Math.PI * t) : 0;
            o.y = -ov.spriteH * (0.3 + 0.55 * Math.min(1, t)) - o.height / 2;
        }
        return ov.sprite;
    }

    /** 疊層：glow＝取色遮罩（含模糊光暈）；glint＝星芒小圖。本體沿用靜態合成那張 */
    private composeOverlay(img: HTMLImageElement, v: ObstacleVariantDef, pxPerHex: number, anim: ObstacleAnimConfig, base: ObstacleSprite): ObstacleOverlaySet {
        const k = HEX_SIZE / pxPerHex;
        const s = OBSTACLE_SPRITE.BAKE_SCALE;
        const spriteH = v.ay * k;
        if (anim.kind === 'glow') {
            const mask = extractGlowMask(img, v);
            const pad = anim.blurPx * 2;
            const w = v.w * k + pad * 2, h = v.h * k + pad * 2;
            const { canvas, ctx } = createCanvas(Math.ceil(w * s), Math.ceil(h * s));
            if (mask) {
                ctx.setTransform(s, 0, 0, s, pad * s, pad * s);
                ctx.filter = `blur(${anim.blurPx}px)`;
                ctx.drawImage(mask, 0, 0, v.w * k, v.h * k);
                ctx.filter = 'none';
                ctx.drawImage(mask, 0, 0, v.w * k, v.h * k);
            }
            return { spriteH, sprite: { ...base, overlay: { image: canvas, x: -v.ax * k - pad, y: -v.ay * k - pad, width: w, height: h, alpha: 0 } } };
        }
        const r = anim.kind === 'glint' ? anim.radius : 1;
        const size = r * 3.4;
        const { canvas, ctx } = createCanvas(Math.ceil(size * s), Math.ceil(size * s));
        ctx.setTransform(s, 0, 0, s, (size / 2) * s, (size / 2) * s);
        drawGlint(ctx, 0, 0, r, 1);
        return { spriteH, sprite: { ...base, overlay: { image: canvas, x: -size / 2, y: 0, width: size, height: size, alpha: 0 } } };
    }

    private compose(img: HTMLImageElement, v: ObstacleVariantDef, layout: HexLayout, pxPerHex: number, anim?: ObstacleAnimConfig): ObstacleSprite[] {
        const k = HEX_SIZE / pxPerHex;
        const pad = OBSTACLE_SPRITE.SHADOW_PAD;
        const shadowR = HEX_SIZE + pad;
        const sway = anim?.kind === 'sway' ? anim.amp : 0;
        const glintR = anim?.kind === 'glint' ? anim.radius : 0;
        const left = Math.min(-v.ax * k - sway, -shadowR);
        const right = Math.max((v.w - v.ax) * k + sway, shadowR);
        const top = -v.ay * k - glintR;
        const bottom = Math.max((v.h - v.ay) * k, shadowR);
        const width = right - left;
        const height = bottom - top;
        const s = OBSTACLE_SPRITE.BAKE_SCALE;
        const fw = Math.ceil(width * s), fh = Math.ceil(height * s);
        // 只有 sway 烘成影格表；glint／glow 用靜態本體＋疊層（composeOverlay）
        const frames = anim?.kind === 'sway' ? anim.frames : 1;
        const cols = Math.max(1, Math.min(frames, Math.floor(OBSTACLE_SPRITE.SHEET_MAX_W / fw)));
        const rows = Math.ceil(frames / cols);
        const { canvas, ctx } = createCanvas(fw * cols, fh * rows);
        const spriteH = v.ay * k;
        const out: ObstacleSprite[] = [];
        for (let f = 0; f < frames; f++) {
            const u = f / frames;
            const ox = (f % cols) * fw, oy = Math.floor(f / cols) * fh;
            ctx.save();
            ctx.setTransform(s, 0, 0, s, ox - left * s, oy - top * s);
            EnvironmentFactory.drawHexShadow(ctx, layout);
            if (anim?.kind === 'sway') {
                // 底部（錨點）不動、頂端位移 amp·sin：x' = x − (w / H)·y（y 往上為負）
                const w = anim.amp * Math.sin(Math.PI * 2 * u);
                ctx.transform(1, 0, -w / Math.max(1, spriteH), 1, 0, 0);
            }
            ctx.drawImage(img, v.x, v.y, v.w, v.h, -v.ax * k, -v.ay * k, v.w * k, v.h * k);
            ctx.restore();
            out.push({ image: canvas, sx: ox, sy: oy, sw: fw, sh: fh, width: fw / s, height: fh / s, anchorX: -left, anchorY: -top });
        }
        if (frames === 1) {
            const only = out[0];
            return [{ image: canvas, width: only.width, height: only.height, anchorX: only.anchorX, anchorY: only.anchorY }];
        }
        return out;
    }
}

interface ObstacleOverlaySet {
    spriteH: number;
    sprite: ObstacleSprite;
}

/** 從精靈取出橘色發光部位（黑曜柱頂）：其餘像素透明。只在烘焙時讀一次像素 */
function extractGlowMask(img: HTMLImageElement, v: ObstacleVariantDef): HTMLCanvasElement | null {
    const { canvas, ctx } = createCanvas(v.w, v.h);
    ctx.drawImage(img, v.x, v.y, v.w, v.h, 0, 0, v.w, v.h);
    let data: ImageData;
    try {
        data = ctx.getImageData(0, 0, v.w, v.h);
    } catch {
        return null;
    }
    const K = OBSTACLE_SPRITE.GLOW_KEY;
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
        const keep = d[i] >= K.minR && d[i + 2] <= K.maxB && d[i] >= d[i + 1] * K.ratio;
        if (!keep) d[i + 3] = 0;
    }
    ctx.putImageData(data, 0, 0);
    return canvas;
}

/** 四芒星光點（烘焙時用）：柔光核＋細十字 */
function drawGlint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
    if (alpha <= 0) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(200,240,255,0.55)');
    g.addColorStop(1, 'rgba(200,240,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x + r * 1.6, y);
    ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y + r * 1.6);
    ctx.stroke();
}

export const obstacleSpriteStore = new ObstacleSpriteStoreImpl();
