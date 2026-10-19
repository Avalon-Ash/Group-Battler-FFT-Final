// ╔══════════════════════════════════════════════════════════╗
// ║  ZoneRenderer — 地格區域效果（擴張波紋、區域底色、邊界）    ║
// ║  上游：GridOverlays（逐格呼叫，原點＝格子頂面＋OVERLAY 偏移） ║
// ║  參數：constants/terrain.ts ZONE_RENDER                              ║
// ║  [ARCH] 波紋與邊界是柔光格（SoftTile，screen），2026-10-19   ║
// ║  取代逐格實線雙環＋虛線邊界。                                ║
// ╚══════════════════════════════════════════════════════════╝

import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../types";
import { ZONE_RENDER } from "../../../constants";
import { SoftTile, type SoftTileLook } from "./SoftTile";

const LOOK: SoftTileLook = { fill: '', edge: '', fillAlpha: 0, edgeAlpha: 0, coreAlpha: 0 };

export const ZoneRenderer = {
    
    drawTileZoneEffect(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, 
        size: number,
        distToCenter: number, 
        zoneRadius: number,
        color: string,
        progress: number, 
        isEnemy: boolean,
        layout: HexLayout
    ) {
        ctx.save();
        ctx.translate(x, y);

        const Z = ZONE_RENDER;
        const currentWaveRadius = progress * (zoneRadius + Z.WAVE_OVERSHOOT);
        const distDiff = Math.abs(distToCenter - currentWaveRadius);

        let waveIntensity = 0;
        if (distDiff < Z.WAVE_WIDTH) {
            waveIntensity = (Math.cos((distDiff / Z.WAVE_WIDTH) * Math.PI) + 1) * 0.5;
        }

        const isInside = distToCenter < currentWaveRadius;
        const drawColor = isEnemy ? Z.ENEMY_COLOR : color;

        let baseAlpha = 0;
        if (isEnemy) baseAlpha = Z.ENEMY_ALPHA;
        if (isInside && !isEnemy) baseAlpha = Z.INSIDE_ALPHA;

        if (baseAlpha > 0) {
            ctx.fillStyle = drawColor;
            ctx.globalAlpha = baseAlpha;
            HexGeometry.traceHex(ctx, 0, 0, size * Z.FILL_RADIUS, true, layout);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'screen';
        LOOK.fill = drawColor; LOOK.edge = drawColor; LOOK.fillAlpha = 0;
        if (waveIntensity > Z.MIN_WAVE) {
            LOOK.edgeAlpha = Z.WAVE_EDGE_ALPHA; LOOK.coreAlpha = Z.WAVE_CORE_ALPHA;
            ctx.globalAlpha = waveIntensity;
            SoftTile.draw(ctx, LOOK, size, layout, 1 + waveIntensity * Z.WAVE_SCALE_GROW);
        }

        if (isEnemy || isInside) {
            const isBorder = Math.abs(distToCenter - zoneRadius) < Z.BORDER_BAND;
            if (isBorder) {
                LOOK.edgeAlpha = isEnemy ? Z.ENEMY_BORDER_EDGE_ALPHA : Z.BORDER_EDGE_ALPHA; LOOK.coreAlpha = Z.BORDER_CORE_ALPHA;
                ctx.globalAlpha = 1;
                SoftTile.draw(ctx, LOOK, size, layout);
            }
        }

        ctx.restore();
    }
};
