import { ISO_SCALE_Y, HEX_SIZE, TerrainTheme, RENDER_CACHE, TERRAIN_SKIN } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { HexLayout } from "../../../types";
import { VisualMath } from "../../math/VisualMath";
import { MaterialPainter } from "../../graphics/materials/MaterialPainter";
import { variantFor, tileHash01 } from "../../graphics/materials/NoiseLib";
import { MATERIAL_CONFIG } from "../../../data/vfx/materialConfig";
import { getTerrainAmbience, TERRAIN_LIQUID } from "../../../data/vfx/terrainAmbience";
import {
    createTerrainSpriteStore,
    quantizeRenderScaleSticky,
    terrainSpriteKey,
    TerrainSpriteEntry,
    SurfaceFactory,
} from "./TerrainBlockCache";
import { terrainTextureStore } from "./TerrainTextureStore";
import { obstacleSpriteStore } from "./ObstacleSpriteStore";
import { getEdgeTable } from "../../systems/grid/GridCache";

/**
 * 群系曝光（TERRAIN_SKIN.exposure，地形 T0）：整張地塊乘上 gain，只在烘焙時執行。
 * gain < 1：在既有像素上蓋一層黑（source-atop，透明處不動）；gain > 1：以 lighter 把自己再疊一次（每次最多 +1 倍）。
 */
function applyExposure(ctx: CanvasRenderingContext2D, canvas: CanvasImageSource & { width: number; height: number }, gain: number): void {
    if (!(gain > 0) || gain === 1) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (gain < 1) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = `rgba(0,0,0,${1 - gain})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.globalCompositeOperation = 'lighter';
        for (let g = gain - 1; g > 0; g -= 1) {
            ctx.globalAlpha = Math.min(1, g);
            ctx.drawImage(canvas, 0, 0);
        }
    }
    ctx.restore();
}

const PEDESTAL_DEPTH = 45; 
const EXPANSION_BIAS = 0.6;

function getCoordForVariant(targetVariant: number, variants: number): [number, number] {
    const safeVariants = Math.max(1, variants);
    for (let q = 0; q < safeVariants * 4; q++) {
        if (variantFor(q, 0, safeVariants) === targetVariant) {
            return [q, 0];
        }
    }
    return [0, 0];
}

/**
 * 靜態表面細節（DESERT 沙紋、VOID 紋路）：烘進地形 sprite，原點為頂面中心。
 * 變化只依 variant（不依螢幕座標）；哪些 variant 帶紋路由設定表決定。
 */
/**
 * 靜態地表裝飾（碎石、冰渣、虛空碎塊）：圖集已載入時烘進地塊 sprite，擺放由 variant 決定（TERRAIN_AMBIENCE.decor）。
 * 圖集載入時 drawBlock 依 obstacleSpriteStore.revision 清快取重烘。座標 (0, 0) 為頂面中心。
 */
function paintStaticDecor(sCtx: CanvasRenderingContext2D, type: string, variant: number) {
    const decor = getTerrainAmbience(type)?.decor;
    if (!decor) return;
    const count = Math.min(decor.spots.length, decor.countByVariant[variant % decor.countByVariant.length]);
    for (let i = 0; i < count; i++) {
        const f = obstacleSpriteStore.getFrame(decor.type, variant + i * 3);
        if (!f) return;
        const k = f.k * decor.scale;
        const s = decor.spots[(i + variant) % decor.spots.length];
        sCtx.drawImage(f.image, f.sx, f.sy, f.sw, f.sh, s.x - f.ax * k, s.y - f.ay * k, f.sw * k, f.sh * k);
    }
}

/** 確定性 0..1（崖邊裝飾的長度、位置）：同一 variant、邊、序號永遠同值 */
function edgeHash(variant: number, edge: number, k: number): number {
    let h = Math.imul(variant + 1, 0x9e3779b1) ^ Math.imul(edge + 7, 0x85ebca6b) ^ Math.imul(k + 13, 0xc2b2ae35);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
    return (h >>> 0) / 4294967296;
}

/**
 * 崖邊裝飾（TERRAIN_AMBIENCE.edge）：只畫在前側、鄰格較低的邊。座標 (0, 0) 為頂面中心，往下（+y）是側面。
 * 在頂面 clip 之外畫，垂草／垂冰／熔岩滴落才能蓋到側面上。
 */
function paintEdgeDecor(sCtx: CanvasRenderingContext2D, type: string, vertices: readonly { x: number; y: number }[], edgeMask: number, isFront: readonly boolean[], variant: number) {
    const cfg = getTerrainAmbience(type)?.edge;
    if (!cfg) return;
    sCtx.save();
    sCtx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
        if (((edgeMask >> i) & 1) === 0 || !isFront[i]) continue;
        const a = vertices[i], b = vertices[(i + 1) % 6];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const at = (t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        if (cfg.kind === 'FRINGE') {
            const n = Math.max(1, Math.floor(len / cfg.spacing));
            for (let j = 0; j < n; j++) {
                const p = at((j + 0.5) / n);
                const L = cfg.minLen + (cfg.maxLen - cfg.minLen) * edgeHash(variant, i, j);
                const sway = (edgeHash(variant, i, j + 97) - 0.5) * 3;
                sCtx.strokeStyle = cfg.color;
                sCtx.lineWidth = cfg.width;
                sCtx.beginPath();
                sCtx.moveTo(p.x, p.y - 1);
                sCtx.quadraticCurveTo(p.x + sway * 0.3, p.y + L * 0.5, p.x + sway, p.y + L);
                sCtx.stroke();
                sCtx.strokeStyle = cfg.tipColor;
                sCtx.lineWidth = cfg.width * 0.6;
                sCtx.beginPath();
                sCtx.moveTo(p.x, p.y - 1);
                sCtx.quadraticCurveTo(p.x + sway * 0.3, p.y + L * 0.35, p.x + sway * 0.6, p.y + L * 0.6);
                sCtx.stroke();
            }
        } else if (cfg.kind === 'EAVE') {
            sCtx.strokeStyle = cfg.color;
            sCtx.lineWidth = cfg.width;
            sCtx.beginPath(); sCtx.moveTo(a.x, a.y); sCtx.lineTo(b.x, b.y); sCtx.stroke();
            const n = Math.max(1, Math.floor(len / cfg.dripEvery));
            sCtx.fillStyle = cfg.color;
            for (let j = 0; j < n; j++) {
                const p = at((j + 0.3 + 0.4 * edgeHash(variant, i, j)) / n);
                const L = cfg.dripMin + (cfg.dripMax - cfg.dripMin) * edgeHash(variant, i, j + 31);
                const w = cfg.dripWidth * (0.6 + 0.4 * edgeHash(variant, i, j + 57));
                sCtx.beginPath();
                sCtx.moveTo(p.x - w, p.y);
                sCtx.lineTo(p.x + w, p.y);
                sCtx.lineTo(p.x, p.y + L);
                sCtx.closePath();
                sCtx.fill();
            }
        } else {
            sCtx.globalCompositeOperation = 'lighter';
            sCtx.globalAlpha = cfg.alpha;
            sCtx.strokeStyle = cfg.color;
            sCtx.lineWidth = cfg.width;
            sCtx.beginPath(); sCtx.moveTo(a.x, a.y); sCtx.lineTo(b.x, b.y); sCtx.stroke();
            if (cfg.dripEvery > 0) {
                const n = Math.max(1, Math.floor(len / cfg.dripEvery));
                for (let j = 0; j < n; j++) {
                    if (edgeHash(variant, i, j + 211) < 0.35) continue;
                    const p = at((j + 0.2 + 0.6 * edgeHash(variant, i, j)) / n);
                    const L = cfg.dripMin + (cfg.dripMax - cfg.dripMin) * edgeHash(variant, i, j + 19);
                    const g = sCtx.createLinearGradient(p.x, p.y, p.x, p.y + L);
                    g.addColorStop(0, cfg.color);
                    g.addColorStop(1, 'rgba(0,0,0,0)');
                    sCtx.strokeStyle = g;
                    sCtx.lineWidth = cfg.width * 0.8;
                    sCtx.beginPath(); sCtx.moveTo(p.x, p.y); sCtx.lineTo(p.x, p.y + L); sCtx.stroke();
                }
            }
            sCtx.globalCompositeOperation = 'source-over';
            sCtx.globalAlpha = 1;
        }
    }
    sCtx.restore();
}

function paintStaticDetail(sCtx: CanvasRenderingContext2D, size: number, theme: TerrainTheme, type: string, variant: number) {
    const detail = getTerrainAmbience(type)?.detail;
    if (!detail || !detail.baked) return;
    if (detail.kind === 'SAND_RIPPLES') {
        SurfacePainter.drawSandRipples(sCtx, 0, 0, size, theme.sideDark || detail.fallbackColor, variant);
    } else if (detail.variantMask[variant % detail.variantMask.length]) {
        SurfacePainter.drawDetailTexture(sCtx, 0, 0, type, theme.detail, variant);
    }
}

export const TerrainRenderer = {
    store: createTerrainSpriteStore(),
    lastTextureRev: -1,
    lastDecorRev: -1,
    lastTheme: null as TerrainTheme | null,
    lastRenderScale: -1,

    drawBlock(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        height: number,
        theme: TerrainTheme,
        type: string,
        globalTime: number,
        layout: HexLayout,
        alpha: number = 1.0,
        q: number = 0,
        r2: number = 0,
        edgeMask: number = 0,
        baseLevel: number = 0
    ) {
        if (this.lastTextureRev !== terrainTextureStore.getRevision() || this.lastDecorRev !== obstacleSpriteStore.revision) {
            this.lastTextureRev = terrainTextureStore.getRevision();
            this.lastDecorRev = obstacleSpriteStore.revision;
            this.store.clear();
        }
        if (this.lastTheme !== theme) {
            this.lastTheme = theme;
            this.store.evictOtherThemes(theme);
        }

        const drawX = Math.floor(x);
        // y 已含漂浮位移（GridRenderStrategy 以 VisualMath.floatBobAt 加在 op.ty 上），這裡不再自己算：
        // 同一個值也進了「繪製用地面高度」，站在地塊上的單位、狀態、HUD 才會跟地塊一起浮動。
        const drawY = Math.floor(y);

        const tf = ctx.getTransform();
        const currentScale = Math.hypot(tf.a, tf.b);
        const renderScale = quantizeRenderScaleSticky(currentScale, this.lastRenderScale);
        this.lastRenderScale = renderScale;
        const variant = variantFor(q, r2, MATERIAL_CONFIG.terrain.grain.variants);

        // 漂浮位移不進快取鍵（傳 0）：整塊地形在繪製時平移（漂浮島整塊上下浮動）。
        // 若把位移烘進 sprite，浮動地圖每個縮放級距會有 1500+ 種組合，跨級距時超過 MAX_TERRAIN_SPRITES 而不斷重烘焙
        // （見 docs/PERF_LIFECYCLE_FINDINGS.md）。
        const key = terrainSpriteKey(theme, layout, type, height, variant, 0, renderScale, edgeMask, baseLevel);
        const sprite = this.store.get(key, (factory) => {
            return this.bakeBlock(factory, size, height, theme, type, layout, variant, 0, renderScale, edgeMask, baseLevel);
        });

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(drawX, drawY);
        if (renderScale === 1 && sprite.canvas.width === sprite.width) {
            ctx.drawImage(sprite.canvas, -sprite.anchorX, -sprite.anchorY);
        } else {
            ctx.drawImage(sprite.canvas, -sprite.anchorX, -sprite.anchorY, sprite.width, sprite.height);
        }

        const liquid = getTerrainAmbience(type)?.liquid;
        if (liquid) {
            const visualTopY = VisualMath.getIsoVisualY(0, height, 0);
            ctx.translate(0, visualTopY);
            // 硬殼變體與相位依格子雜湊：鄰格不同步（2026-10-19 前全場同一張）
            SurfacePainter.drawLiquid(ctx, 0, 0, liquid.color, globalTime, liquid.intensity, layout,
                variantFor(q, r2, TERRAIN_LIQUID.variants), tileHash01(q, r2, TERRAIN_LIQUID.crust.seed), renderScale);
        }
        ctx.restore();
    },

    bakeBlock(
        factory: SurfaceFactory,
        size: number,
        height: number,
        theme: TerrainTheme,
        type: string,
        layout: HexLayout,
        variant: number,
        floatOffset: number,
        renderScale: number,
        edgeMask: number = 0,
        baseLevel: number = 0
    ): TerrainSpriteEntry {
        const visualTopY = VisualMath.getIsoVisualY(0, height, floatOffset);
        // 舊基座深度：光照漸層的錨點（非外露格與外露格的上段畫面維持不變）
        const currentPedestalDepth = Math.max(PEDESTAL_DEPTH, -visualTopY + 15);
        const r = size + EXPANSION_BIAS;
        const vertices = HexGeometry.getVertices(r, true, layout);

        // 島嶼底座：外露格的側面往下延伸到依地形輪廓換算的深度（見 GridCache.computeFoundationLevel）
        const fCfg = TERRAIN_SKIN.foundation;
        const profile = fCfg.profiles[type] ?? fCfg.defaultProfile;
        const levelT = baseLevel > 0 ? (Math.min(baseLevel, fCfg.levels) - 1) / Math.max(1, fCfg.levels - 1) : 0;
        const foundationDepth = baseLevel > 0
            ? Math.max(currentPedestalDepth, profile.minDepth + (profile.maxDepth - profile.minDepth) * levelT)
            : currentPedestalDepth;
        const hasTips = baseLevel > 0 && profile.tips && foundationDepth > currentPedestalDepth;
        // 有尖角時：側面頂點只延伸 shoulder 比例，整欄只有一個尖點（最前方）到 tipDepth（鐘乳岩）；平底則所有頂點同深
        const vertexDepth = hasTips
            ? currentPedestalDepth + (foundationDepth - currentPedestalDepth) * profile.shoulder
            : foundationDepth;
        const tipDepth = vertexDepth + (foundationDepth - vertexDepth) * fCfg.tipScales[variant % fCfg.tipScales.length];
        // 前側面：FLAT 為三面（正前面兩頂點同為最低 → 尖點在正前面中點），POINTY 為兩面（共用的前頂點即尖點）
        const sideFaces: readonly (readonly [number, number])[] = layout === 'FLAT' ? [[1, 0], [2, 1], [3, 2]] : [[1, 0], [2, 1]];
        let tipVertex = -1;
        let tipVertexY = -Infinity;
        let tipShared = false;
        for (const face of sideFaces) {
            for (const idx of face) {
                const vy = vertices[idx].y;
                if (vy > tipVertexY + 1e-6) { tipVertexY = vy; tipVertex = idx; tipShared = false; }
                else if (idx !== tipVertex && Math.abs(vy - tipVertexY) <= 1e-6) tipShared = true;
            }
        }

        let minVx = Infinity, maxVx = -Infinity, minVy = Infinity, maxVy = -Infinity;
        for (let i = 0; i < 6; i++) {
            const v = vertices[i];
            if (v.x < minVx) minVx = v.x;
            if (v.x > maxVx) maxVx = v.x;
            if (v.y < minVy) minVy = v.y;
            if (v.y > maxVy) maxVy = v.y;
        }

        const topEdge = Number.isFinite(visualTopY) ? visualTopY + minVy : minVy;
        const bottomEdge = Number.isFinite(visualTopY)
            ? Math.max(foundationDepth + maxVy, visualTopY + maxVy)
            : Math.max(foundationDepth + maxVy, maxVy);

        const padding = RENDER_CACHE.SPRITE_PADDING;
        const localLeft = Math.floor(minVx - padding);
        const localTop = Math.floor(topEdge - padding);
        const localRight = Math.ceil(maxVx + padding);
        const localBottom = Math.ceil(bottomEdge + padding);

        const localW = localRight - localLeft;
        const localH = localBottom - localTop;
        const anchorX = -localLeft;
        const anchorY = -localTop;

        const pixelW = Math.max(1, Math.round(localW * renderScale));
        const pixelH = Math.max(1, Math.round(localH * renderScale));

        const surface = factory(pixelW, pixelH);
        const sCtx = surface.ctx;

        sCtx.save();
        sCtx.scale(renderScale, renderScale);
        sCtx.translate(anchorX, anchorY);

        const useSkin = terrainTextureStore.isReady(type);
        const topImg = useSkin ? terrainTextureStore.getTopImage(type) : null;
        const sideImg = useSkin ? terrainTextureStore.getSideImage(type) : null;

        // 延伸段底端加暗（只在外露格；漸層於烘焙時建立，每幀成本不變）。呼叫前 current path 須為面多邊形。
        const shadeFoundation = (minX: number, faceW: number, faceBottomY: number) => {
            if (foundationDepth <= currentPedestalDepth || profile.bottomShade <= 0) return;
            sCtx.save();
            sCtx.clip();
            const shade = sCtx.createLinearGradient(0, currentPedestalDepth, 0, faceBottomY);
            shade.addColorStop(0, 'transparent');
            shade.addColorStop(1, TERRAIN_SKIN.sideShadeFloor);
            sCtx.globalAlpha = profile.bottomShade;
            sCtx.fillStyle = shade;
            sCtx.fillRect(minX, currentPedestalDepth, faceW, faceBottomY - currentPedestalDepth);
            sCtx.restore();
        };

        // 頂點底端深度：尖點頂點（POINTY）到 tipDepth，其餘停在 vertexDepth
        const depthAt = (idx: number) => (hasTips && !tipShared && idx === tipVertex ? tipDepth : vertexDepth);

        const drawFace = (idx1: number, idx2: number, color: string, isLightSide: boolean) => {
            const v1 = vertices[idx1], v2 = vertices[idx2];
            // FLAT 的正前面：兩頂點同為最低，尖點放在該面底端中點
            const midTip = hasTips && tipShared && Math.abs(v1.y - tipVertexY) <= 1e-6 && Math.abs(v2.y - tipVertexY) <= 1e-6;
            const d1 = depthAt(idx1), d2 = depthAt(idx2);
            const faceBottomY = Math.max(v1.y + d1, v2.y + d2, midTip ? tipVertexY + tipDepth : -Infinity);
            sCtx.beginPath();
            sCtx.moveTo(v1.x, v1.y + visualTopY);
            sCtx.lineTo(v2.x, v2.y + visualTopY);
            sCtx.lineTo(v2.x, v2.y + d2);
            if (midTip) sCtx.lineTo((v1.x + v2.x) / 2, tipVertexY + tipDepth);
            sCtx.lineTo(v1.x, v1.y + d1);
            sCtx.closePath();

            if (sideImg) {
                sCtx.save();
                sCtx.clip();
                const minX = Math.min(v1.x, v2.x), maxX = Math.max(v1.x, v2.x);
                const faceW = maxX - minX;
                const faceTopY = Math.min(v1.y, v2.y) + visualTopY;
                const faceH = Math.max(currentPedestalDepth, faceBottomY) - faceTopY;

                // 光照決定明暗：先以側面漸層全強度填底色，再疊貼圖細節
                if (Number.isFinite(visualTopY)) {
                    const grad = sCtx.createLinearGradient(0, visualTopY, 0, currentPedestalDepth);
                    grad.addColorStop(0, color);
                    grad.addColorStop(1, isLightSide ? theme.sideDark : TERRAIN_SKIN.sideShadeFloor);
                    sCtx.fillStyle = grad;
                } else {
                    sCtx.fillStyle = color;
                }
                sCtx.fillRect(minX, faceTopY, faceW, faceH);

                const sidePattern = terrainTextureStore.getSidePattern(sCtx, type);
                if (sidePattern) {
                    sCtx.save();
                    sCtx.globalCompositeOperation = TERRAIN_SKIN.sideDetail.blend;
                    sCtx.globalAlpha = TERRAIN_SKIN.sideDetail.alpha;
                    const patMatrix = new DOMMatrix();
                    const varOffsets = TERRAIN_SKIN.variantOffsets;
                    const varOffset = varOffsets[variant % varOffsets.length];
                    patMatrix.translateSelf(minX + varOffset.x, faceTopY);
                    patMatrix.scaleSelf(TERRAIN_SKIN.sideTexturePxPerUnit * (r / 96), TERRAIN_SKIN.sideTexturePxPerUnit * (r / 96));
                    sidePattern.setTransform(patMatrix);
                    sCtx.fillStyle = sidePattern;
                    sCtx.fillRect(minX, faceTopY, faceW, faceH);
                    sCtx.restore();
                }
                sCtx.restore();
                shadeFoundation(minX, faceW, faceBottomY);
            } else {
                sCtx.fillStyle = color;
                sCtx.fill();
                shadeFoundation(Math.min(v1.x, v2.x), Math.abs(v2.x - v1.x), faceBottomY);
            }
        };

        if (layout === 'FLAT') {
            drawFace(1, 0, theme.sideDark, false);
            drawFace(2, 1, theme.sideLight, true);
            drawFace(3, 2, theme.sideDark, false);
        } else {
            drawFace(1, 0, theme.sideDark, false);
            drawFace(2, 1, theme.sideLight, true);
        }

        sCtx.translate(0, visualTopY);
        if (topImg) {
            sCtx.save();
            sCtx.beginPath();
            sCtx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) sCtx.lineTo(vertices[i].x, vertices[i].y);
            sCtx.closePath();
            sCtx.clip();

            // 光照決定明暗：先以頂面漸層全強度填底色，再疊貼圖細節
            if (Number.isFinite(r)) {
                const topGrad = sCtx.createLinearGradient(-r, -r, r, r);
                topGrad.addColorStop(0, theme.rim);
                topGrad.addColorStop(0.3, theme.top);
                topGrad.addColorStop(1, theme.sideDark);
                sCtx.fillStyle = topGrad;
            } else {
                sCtx.fillStyle = theme.top;
            }
            sCtx.fillRect(-r * 2, -r * 2, r * 4, r * 4);

            const topPattern = terrainTextureStore.getTopPattern(sCtx, type);
            if (topPattern) {
                sCtx.save();
                sCtx.globalCompositeOperation = TERRAIN_SKIN.topDetail.blend;
                sCtx.globalAlpha = TERRAIN_SKIN.topDetail.alpha;
                const patMatrix = new DOMMatrix();
                const varOffsets = TERRAIN_SKIN.variantOffsets;
                const varOffset = varOffsets[variant % varOffsets.length];
                const scaleX = (r * 2) / TERRAIN_SKIN.texturePxPerHex;
                const scaleY = scaleX * ISO_SCALE_Y;
                patMatrix.translateSelf(varOffset.x, varOffset.y);
                patMatrix.scaleSelf(scaleX, scaleY);
                topPattern.setTransform(patMatrix);
                sCtx.fillStyle = topPattern;
                sCtx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
                sCtx.restore();
            }

            sCtx.globalAlpha = 1.0;
            const [qCoord, rCoord] = getCoordForVariant(variant, MATERIAL_CONFIG.terrain.grain.variants);
            MaterialPainter.paintTerrainGrain(sCtx, r, layout, qCoord, rCoord);
            paintStaticDetail(sCtx, size, theme, type, variant);

            // 鄰格高度遮罩（只在烘焙時處理）：前側有落差邊 → 崖邊亮邊；背側鄰格較高 → 接觸陰影
            const edgeCfg = TERRAIN_SKIN.edge;
            const edgeTable = getEdgeTable(layout);
            for (let i = 0; i < 6; i++) {
                if (((edgeMask >> i) & 1) === 0) continue;
                const a = vertices[i], b = vertices[(i + 1) % 6];
                if (edgeTable.edgeIsFront[i]) {
                    // 線寬取兩倍，外半被頂面 clip 切掉，內半即為亮邊
                    sCtx.beginPath();
                    sCtx.moveTo(a.x, a.y);
                    sCtx.lineTo(b.x, b.y);
                    sCtx.strokeStyle = theme.rim;
                    sCtx.lineWidth = edgeCfg.lip.width * 2;
                    sCtx.globalAlpha = edgeCfg.lip.alpha;
                    sCtx.stroke();
                } else {
                    // 漸層軸取「垂直於該邊」的向內法線（等距壓縮後邊與中心連線不垂直）
                    const ex = b.x - a.x, ey = b.y - a.y;
                    const len = Math.hypot(ex, ey);
                    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                    let nx = -ey / len, ny = ex / len;
                    if (nx * -mx + ny * -my < 0) { nx = -nx; ny = -ny; }
                    const depth = (nx * -mx + ny * -my) * edgeCfg.ao.widthRatio;
                    const aoGrad = sCtx.createLinearGradient(mx, my, mx + nx * depth, my + ny * depth);
                    aoGrad.addColorStop(0, TERRAIN_SKIN.sideShadeFloor);
                    aoGrad.addColorStop(1, 'transparent');
                    sCtx.globalAlpha = edgeCfg.ao.strength;
                    sCtx.fillStyle = aoGrad;
                    sCtx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
                }
            }
            sCtx.globalAlpha = 1.0;

            sCtx.restore();

            // 頂面輪廓線：平接邊淡化、有落差邊維持較強 alpha
            sCtx.strokeStyle = theme.rim;
            sCtx.lineWidth = 1.5;
            for (let i = 0; i < 6; i++) {
                const a = vertices[i], b = vertices[(i + 1) % 6];
                sCtx.beginPath();
                sCtx.moveTo(a.x, a.y);
                sCtx.lineTo(b.x, b.y);
                sCtx.globalAlpha = ((edgeMask >> i) & 1) === 1 ? edgeCfg.cliffRimAlpha : edgeCfg.flatRimAlpha;
                sCtx.stroke();
            }
            sCtx.globalAlpha = 1.0;
            paintEdgeDecor(sCtx, type, vertices, edgeMask, edgeTable.edgeIsFront, variant);
            paintStaticDecor(sCtx, type, variant);
        } else {
            sCtx.fillStyle = theme.top;
            sCtx.beginPath();
            sCtx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) sCtx.lineTo(vertices[i].x, vertices[i].y);
            sCtx.closePath();
            sCtx.fill();
            paintStaticDetail(sCtx, size, theme, type, variant);
            sCtx.strokeStyle = theme.rim;
            sCtx.lineWidth = 1.5;
            sCtx.globalAlpha = 0.6;
            sCtx.stroke();
            sCtx.globalAlpha = 1.0;
        }

        sCtx.restore();
        applyExposure(sCtx, surface.canvas, TERRAIN_SKIN.exposure[type] ?? 1);

        return {
            canvas: surface.canvas,
            anchorX,
            anchorY,
            width: localW,
            height: localH,
        };
    },


    /**
     * 動態地表細節（FOREST 草叢風擺、ICE 冰面反光）：從循環影格取圖，每格每幀一次 drawImage。
     * 靜態細節（DESERT、VOID）已烘進 sprite，這裡不處理。
     */
    drawTerrainDetail(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, height: number, type: string, detailColor: string, q: number, r: number, globalTime: number = 0, layout: HexLayout = 'FLAT', theme: TerrainTheme, alpha: number = 1.0) {
        const detail = getTerrainAmbience(type)?.detail;
        if (!detail || detail.baked || detail.kind === 'NONE') return;

        const visualY = VisualMath.getIsoVisualY(baseY, height, 0);
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha;
        if (detail.kind === 'GRASS') {
            const variant = variantFor(q, r, MATERIAL_CONFIG.terrain.grain.variants);
            SurfacePainter.drawGrass(ctx, baseX, visualY, theme.top || detail.fallbackColor, globalTime, variant);
        } else {
            SurfacePainter.drawIceSheen(ctx, baseX, visualY, HEX_SIZE, globalTime, layout);
        }
        ctx.globalAlpha = prevAlpha;
    }
};