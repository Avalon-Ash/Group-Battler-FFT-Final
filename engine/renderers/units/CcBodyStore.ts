// ╔══════════════════════════════════════════════════════════╗
// ║  CcBodyStore — 變羊／冰塊的 Blender 烘焙圖集（四向）         ║
// ║  職責：載入 public/assets/cc_bodies/manifest.json 與圖集，   ║
// ║        載入後各產生一次：羊每隊一張（項圈遮罩依陣營上色）、   ║
// ║        羊的白色剪影；執行期（painter）只有 drawImage          ║
// ║  上游：PolymorphPainter、FrozenPainter（UnitBodyPainter）。   ║
// ║  [ARCH] 圖集由 tools/assets/blender/render_cc_body.py →       ║
// ║  pack_cc_body.py 產生；錨點（ax／ay）＝格子中心的地面點，      ║
// ║  座標規則見 data/units/appearance/ccBody.ts 與 RenderSpec §4。 ║
// ║  純衍生資源快取，不持遊戲狀態；圖集未載入時 get() 回傳 null，  ║
// ║  呼叫端畫原本的單位（不保留第二套程式繪製）。                 ║
// ╚══════════════════════════════════════════════════════════╝

import { HEX_SIZE } from "../../../constants";
import { Team } from "../../../types";
import { CC_BODY_ASSETS, SHEEP_BODY, type CcBodyType } from "../../../data/units/appearance/ccBody";
import type { SpriteDirection } from "../../../data/units/appearance/selectSpriteFrame";
import { getFactionSkin } from "../../../data/units/factionSkin";
import { createCanvas } from "../../graphics/CanvasUtils";
import { resolveAssetUrl } from "../grid/TerrainTextureStore";

type Surface = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
export type SurfaceFactory = (w: number, h: number) => Surface;

/** manifest 內一個方向的影格：atlas 矩形與錨點（像素） */
interface CcFrameDef { x: number; y: number; w: number; h: number; ax: number; ay: number }

interface CcTypeDef {
    file: string;
    maskFile?: string;
    atlas: { w: number; h: number };
    heightHex: number;
    frames: Record<SpriteDirection, CcFrameDef>;
}

export interface CcBodyManifest {
    version: number;
    /** 圖集中一個 HEX_SIZE（六角外接半徑）佔幾像素 */
    pxPerHex: number;
    elevationDeg: number;
    types: Partial<Record<CcBodyType, CcTypeDef>>;
}

/** 一個類型載入後的繪製資料 */
export interface CcBodyEntry {
    frames: Record<SpriteDirection, CcFrameDef>;
    /** 依 Team 取用的彩色圖集（冰塊兩隊共用同一張） */
    colorByTeam: readonly CanvasImageSource[];
    /** 純白剪影（受擊閃白、被遮擋輪廓）；沒有時為 null */
    silhouette: CanvasImageSource | null;
}

/** 載入器依賴（測試注入） */
export interface CcBodyDeps {
    fetchManifest: () => Promise<CcBodyManifest | null>;
    loadImage: (relativePath: string) => Promise<HTMLImageElement | null>;
    createSurface: SurfaceFactory;
}

const TEAMS: readonly Team[] = [Team.BLUE, Team.RED];

/** 羊的項圈：遮罩有值的像素乘上陣營色（multiply 只改這些像素） */
function composeTinted(base: CanvasImageSource, mask: CanvasImageSource, w: number, h: number, tint: string, createSurface: SurfaceFactory): HTMLCanvasElement {
    const out = createSurface(w, h);
    out.ctx.drawImage(base, 0, 0);
    const layer = createSurface(w, h);
    layer.ctx.drawImage(mask, 0, 0);
    layer.ctx.globalCompositeOperation = 'source-in';
    layer.ctx.fillStyle = tint;
    layer.ctx.fillRect(0, 0, w, h);
    out.ctx.globalCompositeOperation = 'multiply';
    out.ctx.drawImage(layer.canvas, 0, 0);
    out.ctx.globalCompositeOperation = 'source-over';
    return out.canvas;
}

function composeSilhouette(base: CanvasImageSource, w: number, h: number, createSurface: SurfaceFactory): HTMLCanvasElement {
    const out = createSurface(w, h);
    out.ctx.drawImage(base, 0, 0);
    out.ctx.globalCompositeOperation = 'source-in';
    out.ctx.fillStyle = SHEEP_BODY.silhouetteColor;
    out.ctx.fillRect(0, 0, w, h);
    return out.canvas;
}

/** 純函式：manifest ＋已載入的圖 → 各類型的繪製資料（載入後只呼叫一次） */
export function buildCcBodyEntries(
    manifest: CcBodyManifest,
    images: Partial<Record<string, CanvasImageSource>>,
    createSurface: SurfaceFactory,
): Partial<Record<CcBodyType, CcBodyEntry>> {
    const out: Partial<Record<CcBodyType, CcBodyEntry>> = {};
    for (const type of Object.keys(manifest.types) as CcBodyType[]) {
        const def = manifest.types[type];
        const img = def && images[def.file];
        if (!def || !img) continue;
        const { w, h } = def.atlas;
        const mask = def.maskFile ? images[def.maskFile] : undefined;
        const colorByTeam = TEAMS.map((team) => (mask
            ? composeTinted(img, mask, w, h, getFactionSkin(team).fallbackBodyColor, createSurface)
            : img));
        out[type] = {
            frames: def.frames,
            colorByTeam,
            silhouette: type === 'SHEEP' ? composeSilhouette(colorByTeam[0], w, h, createSurface) : null,
        };
    }
    return out;
}

function defaultDeps(): CcBodyDeps {
    return {
        createSurface: createCanvas,
        fetchManifest: async () => {
            const res = await fetch(resolveAssetUrl(CC_BODY_ASSETS.manifestPath));
            return res.ok ? ((await res.json()) as CcBodyManifest) : null;
        },
        loadImage: (relativePath) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = resolveAssetUrl(`${CC_BODY_ASSETS.dir}/${relativePath}`);
        }),
    };
}

export class CcBodyStore {
    private manifest: CcBodyManifest | null = null;
    private entries: Partial<Record<CcBodyType, CcBodyEntry>> = {};
    private _readyPromise: Promise<void>;

    /** deps 省略＝瀏覽器環境的預設載入器（沒有 window／fetch／Image 時不載入）；測試注入假依賴 */
    constructor(deps?: CcBodyDeps) {
        const inBrowser = typeof window !== 'undefined' && typeof fetch !== 'undefined' && typeof Image !== 'undefined';
        this._readyPromise = deps ? this.load(deps) : inBrowser ? this.load(defaultDeps()) : Promise.resolve();
    }

    get readyPromise(): Promise<void> {
        return this._readyPromise;
    }

    /** 圖集中一個像素佔幾個 canvas 單位（HEX_SIZE／pxPerHex）；未載入時為 0 */
    get pixelScale(): number {
        return this.manifest ? HEX_SIZE / this.manifest.pxPerHex : 0;
    }

    private async load(deps: CcBodyDeps): Promise<void> {
        try {
            const manifest = await deps.fetchManifest();
            if (!manifest) return;
            const files = new Set<string>();
            for (const def of Object.values(manifest.types)) {
                if (!def) continue;
                files.add(def.file);
                if (def.maskFile) files.add(def.maskFile);
            }
            const names = [...files];
            const loaded = await Promise.all(names.map((f) => deps.loadImage(f)));
            const images: Record<string, CanvasImageSource> = {};
            names.forEach((f, i) => { const img = loaded[i]; if (img) images[f] = img; });
            this.entries = buildCcBodyEntries(manifest, images, deps.createSurface);
            this.manifest = manifest;
        } catch {
            this.manifest = null;
            this.entries = {};
        }
    }

    /** 此類型的繪製資料；圖集未載入（或該類型缺圖）時為 null */
    get(type: CcBodyType): CcBodyEntry | null {
        return this.entries[type] ?? null;
    }
}

export const ccBodyStore = new CcBodyStore();
