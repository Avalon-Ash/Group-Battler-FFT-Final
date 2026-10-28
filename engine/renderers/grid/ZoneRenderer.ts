// ╔══════════════════════════════════════════════════════════╗
// [ARCH] GridOverlays passes caster faction color and GroundPriority fill multiplier; both teams share one wave rule.
// ║  ZoneRenderer — 地格區域效果（擴張波紋、區域底色、邊界）    ║
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
        layout: HexLayout,
        fillMultiplier: number
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

        const baseAlpha = isInside ? Z.INSIDE_ALPHA : 0;

        if (baseAlpha > 0) {
            ctx.fillStyle = color;
            ctx.globalAlpha = baseAlpha * fillMultiplier;
            HexGeometry.traceHex(ctx, 0, 0, size * Z.FILL_RADIUS, true, layout);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'screen';
        LOOK.fill = color; LOOK.edge = color; LOOK.fillAlpha = 0;
        if (waveIntensity > Z.MIN_WAVE) {
            LOOK.edgeAlpha = Z.WAVE_EDGE_ALPHA; LOOK.coreAlpha = Z.WAVE_CORE_ALPHA;
            ctx.globalAlpha = waveIntensity;
            SoftTile.draw(ctx, LOOK, size, layout, 1 + waveIntensity * Z.WAVE_SCALE_GROW);
        }

        if (isInside) {
            const isBorder = Math.abs(distToCenter - zoneRadius) < Z.BORDER_BAND;
            if (isBorder) {
                LOOK.edgeAlpha = Z.BORDER_EDGE_ALPHA; LOOK.coreAlpha = Z.BORDER_CORE_ALPHA;
                ctx.globalAlpha = 1;
                SoftTile.draw(ctx, LOOK, size, layout);
            }
        }

        ctx.restore();
    }
};
