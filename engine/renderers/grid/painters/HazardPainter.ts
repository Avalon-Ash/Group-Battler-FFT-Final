// ╔══════════════════════════════════════════════════════════╗
// ║  HazardPainter — 持續性空間危害（熔岩、毒沼、冰封、重力場）  ║
// ║  職責：依 HAZARD_VISUALS 在一格畫液面底＋零件層；中心格另畫  ║
// ║        centerLayers。執行期只有 drawImage／alpha／變換。      ║
// ║  上游：data/vfx/hazard_visuals.ts（表）、GridRenderStrategy   ║
// ║        （HAZARD op：op.tx／op.ty＝格子頂面中心，已含漂浮）、  ║
// ║        PartLayerPainter、TerrainLoopAtlas（液面循環影格）     ║
// ║  [ARCH] 錨點＝applyLayerBias(op.ty, 'HAZARD')（RenderSpec §2）；║
// ║  不做鋪設（§9），flat 層待在那格內（FLAT_MAX_RADIUS）。sprite  ║
// ║  依（危害、版面）快取，品質階層改變時重解；每幀零配置。       ║
// ╚══════════════════════════════════════════════════════════╝

import type { HexLayout, SpatialHazard } from "../../../../types";
import { HAZARD_VISUALS, HAZARD_RENDER, type HazardType } from "../../../../data/vfx/hazard_visuals";
import { SurfacePainter } from "../../../graphics/painters/SurfacePainter";
import { VisualMath } from "../../../math/VisualMath";
import { getQualityTier } from "../../RenderQuality";
import { resolvePartLayer, drawPartLayer, layoutAlign, type ResolvedPartLayer } from "../../vfxparts/PartLayerPainter";

interface ResolvedHazard {
    layers: ResolvedPartLayer[];
    center: ResolvedPartLayer[];
}

const HAZARD_TEAM = 0;
const cache = new Map<string, ResolvedHazard>();
let cacheTier = -1;

function resolve(type: HazardType, layout: HexLayout): ResolvedHazard {
    const tier = getQualityTier();
    if (tier !== cacheTier) { cache.clear(); cacheTier = tier; }
    const key = layout === 'POINTY' ? `${type}:P` : type;
    const hit = cache.get(key);
    if (hit) return hit;
    const def = HAZARD_VISUALS[type];
    const r: ResolvedHazard = {
        layers: def.layers.map((l) => resolvePartLayer(l, HAZARD_TEAM, layout)),
        center: (def.centerLayers ?? []).map((l) => resolvePartLayer(l, HAZARD_TEAM, layout)),
    };
    cache.set(key, r);
    return r;
}

function drawLayers(ctx: CanvasRenderingContext2D, list: ResolvedPartLayer[], x: number, y: number, t: number, align: number, fade: number, cutDecor: boolean): void {
    for (let i = 0; i < list.length; i++) {
        if (cutDecor && list[i].layer.decor) continue;
        drawPartLayer(ctx, list[i], x, y, t, align, fade);
    }
}

export const HazardPainter = {
    /** (x, y)＝格子頂面中心；(q, r)＝這一格（判斷是不是危害中心格） */
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, hazard: SpatialHazard, q: number, r: number, t: number, layout: HexLayout) {
        const type: HazardType = hazard.type;
        const def = HAZARD_VISUALS[type];
        const fade = hazard.duration < HAZARD_RENDER.FADE_SEC ? Math.max(0, hazard.duration / HAZARD_RENDER.FADE_SEC) : 1;
        const drawY = VisualMath.applyLayerBias(y, 'HAZARD');

        if (def.liquid) {
            const prev = ctx.globalAlpha;
            ctx.globalAlpha = prev * fade;
            SurfacePainter.drawLiquid(ctx, x, drawY + VisualMath.Z_LAYERS.LIQUID_OFFSET, def.liquid.color, t * def.liquid.speed, def.liquid.intensity, layout);
            ctx.globalAlpha = prev;
        }

        const set = resolve(type, layout);
        const align = layoutAlign(layout);
        const cutDecor = getQualityTier() >= HAZARD_RENDER.DECOR_CUT_TIER;
        drawLayers(ctx, set.layers, x, drawY, t, align, fade, cutDecor);
        if (set.center.length > 0 && hazard.centerQ === q && hazard.centerR === r) {
            drawLayers(ctx, set.center, x, drawY, t, align, fade, cutDecor);
        }
    },

    /** 測試／工具用：丟掉解析快取 */
    reset(): void {
        cache.clear();
    },
};
