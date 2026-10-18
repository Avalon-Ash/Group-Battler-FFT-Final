// ╔══════════════════════════════════════════════════════════╗
// ║  ZoneRenderer — 地格區域效果（擴張波紋、區域底色、邊界）    ║
// ║  上游：GridOverlays（逐格呼叫，原點＝格子頂面＋OVERLAY 偏移） ║
// ║  參數：constants.ts ZONE_RENDER                              ║
// ╚══════════════════════════════════════════════════════════╝

import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../types";
import { ZONE_RENDER } from "../../../constants";

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

        if (waveIntensity > Z.MIN_WAVE) {
            ctx.strokeStyle = drawColor;
            ctx.lineWidth = Z.WAVE_LINE_W + waveIntensity * Z.WAVE_LINE_GROW;
            ctx.globalAlpha = waveIntensity;
            const pulseSize = size * (Z.WAVE_RADIUS + waveIntensity * Z.WAVE_RADIUS_GROW);
            HexGeometry.traceHex(ctx, 0, 0, pulseSize, true, layout);
            ctx.stroke();

            ctx.lineWidth = 1;
            HexGeometry.traceHex(ctx, 0, 0, pulseSize * Z.WAVE_INNER_RATIO, true, layout);
            ctx.stroke();
        }

        if (isEnemy || isInside) {
            const isBorder = Math.abs(distToCenter - zoneRadius) < Z.BORDER_BAND;
            if (isBorder) {
                ctx.strokeStyle = drawColor;
                ctx.lineWidth = 1;
                ctx.globalAlpha = Z.BORDER_ALPHA;
                if (isEnemy) ctx.setLineDash(Z.ENEMY_DASH);
                HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        ctx.restore();
    }
};
