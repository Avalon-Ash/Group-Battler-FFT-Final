import { ISO_SCALE_Y, HEX_SIZE, TerrainTheme, RENDER_CACHE, TERRAIN_SKIN } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { HexLayout } from "../../../types";
import { VisualMath } from "../../math/VisualMath";
import { MaterialPainter } from "../../graphics/materials/MaterialPainter";
import { variantFor } from "../../graphics/materials/NoiseLib";
import { MATERIAL_CONFIG } from "../../../data/vfx/materialConfig";
import {
    createTerrainSpriteStore,
    quantizeRenderScale,
    terrainSpriteKey,
    TerrainSpriteEntry,
    SurfaceFactory,
} from "./TerrainBlockCache";
import { terrainTextureStore } from "./TerrainTextureStore";

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

export const TerrainRenderer = {
    store: createTerrainSpriteStore(),
    lastTextureRev: -1,

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
        r2: number = 0
    ) {
        if (this.lastTextureRev !== terrainTextureStore.getRevision()) {
            this.lastTextureRev = terrainTextureStore.getRevision();
            this.store.clear();
        }

        const drawX = Math.floor(x);
        const drawY = Math.floor(y);
        const isFloatingBiome = type === 'VOID' || type === 'MAGMA';
        let floatOffset = 0;
        if (isFloatingBiome) {
            const rawFloat = Math.sin(globalTime * 1.5 + (x * 0.01) + (y * 0.01)) * 4;
            floatOffset = Math.round(rawFloat / RENDER_CACHE.FLOAT_STEP) * RENDER_CACHE.FLOAT_STEP;
        }

        const tf = ctx.getTransform();
        const currentScale = Math.hypot(tf.a, tf.b);
        const renderScale = quantizeRenderScale(currentScale);
        const variant = variantFor(q, r2, MATERIAL_CONFIG.terrain.grain.variants);

        const key = terrainSpriteKey(theme, layout, type, height, variant, floatOffset, renderScale);
        const sprite = this.store.get(key, (factory) => {
            return this.bakeBlock(factory, size, height, theme, type, layout, variant, floatOffset, renderScale);
        });

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(drawX, drawY);
        if (renderScale === 1) {
            ctx.drawImage(sprite.canvas, -sprite.anchorX, -sprite.anchorY);
        } else {
            ctx.drawImage(sprite.canvas, -sprite.anchorX, -sprite.anchorY, sprite.width, sprite.height);
        }

        if (type === 'MAGMA') {
            const visualTopY = VisualMath.getIsoVisualY(0, height, floatOffset);
            ctx.translate(0, visualTopY);
            SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', globalTime, 1.0, layout);
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
        renderScale: number
    ): TerrainSpriteEntry {
        const visualTopY = VisualMath.getIsoVisualY(0, height, floatOffset);
        const currentPedestalDepth = Math.max(PEDESTAL_DEPTH, -visualTopY + 15);
        const r = size + EXPANSION_BIAS;
        const vertices = HexGeometry.getVertices(r, true, layout);

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
            ? Math.max(currentPedestalDepth + maxVy, visualTopY + maxVy)
            : Math.max(currentPedestalDepth + maxVy, maxVy);

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

        const drawFace = (idx1: number, idx2: number, color: string, isLightSide: boolean) => {
            const v1 = vertices[idx1], v2 = vertices[idx2];
            sCtx.beginPath();
            sCtx.moveTo(v1.x, v1.y + visualTopY);
            sCtx.lineTo(v2.x, v2.y + visualTopY);
            sCtx.lineTo(v2.x, v2.y + currentPedestalDepth);
            sCtx.lineTo(v1.x, v1.y + currentPedestalDepth);
            sCtx.closePath();

            if (sideImg) {
                sCtx.save();
                sCtx.clip();
                const minX = Math.min(v1.x, v2.x), maxX = Math.max(v1.x, v2.x);
                const faceW = maxX - minX;
                const faceTopY = Math.min(v1.y, v2.y) + visualTopY;
                const faceH = currentPedestalDepth - faceTopY;

                const sidePattern = terrainTextureStore.getSidePattern(sCtx, type);
                if (sidePattern) {
                    sCtx.save();
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

                if (Number.isFinite(visualTopY)) {
                    const grad = sCtx.createLinearGradient(0, visualTopY, 0, currentPedestalDepth);
                    grad.addColorStop(0, color);
                    grad.addColorStop(1, isLightSide ? theme.sideDark : '#020617');
                    sCtx.globalAlpha = TERRAIN_SKIN.tintStrength;
                    sCtx.fillStyle = grad;
                    sCtx.fillRect(minX, faceTopY, faceW, faceH);
                }
                sCtx.restore();
            } else {
                sCtx.fillStyle = color;
                sCtx.fill();
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

            const topPattern = terrainTextureStore.getTopPattern(sCtx, type);
            if (topPattern) {
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
            }

            if (Number.isFinite(r)) {
                const topGrad = sCtx.createLinearGradient(-r, -r, r, r);
                topGrad.addColorStop(0, theme.rim);
                topGrad.addColorStop(0.3, theme.top);
                topGrad.addColorStop(1, theme.sideDark);
                sCtx.fillStyle = topGrad;
                sCtx.globalAlpha = TERRAIN_SKIN.tintStrength;
                sCtx.fillRect(-r * 2, -r * 2, r * 4, r * 4);
            }

            sCtx.globalAlpha = 1.0;
            const [qCoord, rCoord] = getCoordForVariant(variant, MATERIAL_CONFIG.terrain.grain.variants);
            MaterialPainter.paintTerrainGrain(sCtx, r, layout, qCoord, rCoord);

            sCtx.restore();

            sCtx.beginPath();
            sCtx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) sCtx.lineTo(vertices[i].x, vertices[i].y);
            sCtx.closePath();
            sCtx.strokeStyle = theme.rim;
            sCtx.lineWidth = 1.5;
            sCtx.globalAlpha = 0.6;
            sCtx.stroke();
            sCtx.globalAlpha = 1.0;
        } else {
            sCtx.fillStyle = theme.top;
            sCtx.beginPath();
            sCtx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < 6; i++) sCtx.lineTo(vertices[i].x, vertices[i].y);
            sCtx.closePath();
            sCtx.fill();
            sCtx.strokeStyle = theme.rim;
            sCtx.lineWidth = 1.5;
            sCtx.globalAlpha = 0.6;
            sCtx.stroke();
            sCtx.globalAlpha = 1.0;
        }

        sCtx.restore();

        return {
            canvas: surface.canvas,
            anchorX,
            anchorY,
            width: localW,
            height: localH,
        };
    },


    drawTerrainDetail(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, height: number, type: string, detailColor: string, q: number, r: number, globalTime: number = 0, layout: HexLayout = 'FLAT', theme: TerrainTheme, alpha: number = 1.0) {
        const isFloatingBiome = type === 'VOID' || type === 'MAGMA';
        let floatOffset = 0;
        if (isFloatingBiome) {
            const rawFloat = Math.sin(globalTime * 1.5 + (baseX * 0.01) + (baseY * 0.01)) * 4;
            floatOffset = Math.round(rawFloat / RENDER_CACHE.FLOAT_STEP) * RENDER_CACHE.FLOAT_STEP;
        }
        
        const visualY = VisualMath.getIsoVisualY(baseY, height, floatOffset);
        ctx.save();
        ctx.globalAlpha = alpha;
        if (type === 'FOREST') SurfacePainter.drawGrass(ctx, baseX, visualY, theme.top || '#14532d', 5, globalTime);
        else if (type === 'ICE') SurfacePainter.drawIceSheen(ctx, baseX, visualY, HEX_SIZE, globalTime, layout);
        else if (type === 'DESERT') SurfacePainter.drawSandRipples(ctx, baseX, visualY, HEX_SIZE, theme.sideDark || '#92400e');
        else if (type === 'VOID') {
            const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
            if (seed > 0.6) SurfacePainter.drawDetailTexture(ctx, baseX, visualY, type, detailColor, seed);
        }
        ctx.restore();
    }
};