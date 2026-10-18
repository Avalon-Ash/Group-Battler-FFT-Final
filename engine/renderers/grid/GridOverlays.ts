// ╔══════════════════════════════════════════════════════════╗
// ║  GridOverlays — 地格疊層（背水一戰、地格狀態底色、區域、光源、║
// ║  預警、射程、滑過），逐格向量六角                            ║
// ║  上游：GridRenderStrategy（TERRAIN op 帶的 oStatus／oDanger／ ║
// ║        射程與預警旗標）、STATUS_VISUALS.floorColor            ║
// ║  [ARCH] 錨點＝getIsoVisualY(baseY, h) 再 applyLayerBias       ║
// ║  'OVERLAY'（RenderSpec §2、§3）；參數 GRID_OVERLAY。          ║
// ╚══════════════════════════════════════════════════════════╝

import { ZoneRenderer } from "./ZoneRenderer";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../types";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { ActiveZone } from "../../systems/ZoneSystem";
import { HexUtils } from "../../utils";
import { VisualMath } from "../../math/VisualMath";
import { GRID_OVERLAY } from "../../../constants";

export const GridOverlays = {
    drawOverlays(
        ctx: CanvasRenderingContext2D,
        x: number, baseY: number, 
        height: number,
        size: number,
        specialStatus: string | undefined, 
        zoneInfo: ActiveZone | undefined,    
        lightColor: string | null,
        lightIntensity: number,
        isRange: boolean,
        rangeColor: string,
        isHover: boolean,
        isWarning: boolean,
        isLastStand: boolean,
        hasUnit: boolean,
        q: number, r: number,
        globalTime: number,
        layout: HexLayout
    ) {
        // SSOT: Calculate surface Y via projection formula
        const G = GRID_OVERLAY;
        const visualSurfaceY = VisualMath.getIsoVisualY(baseY, height);
        const drawY = VisualMath.applyLayerBias(visualSurfaceY, 'OVERLAY');

        if (isLastStand) {
            ctx.save();
            const L = G.LAST_STAND;
            ctx.translate(x, drawY - L.LIFT);
            const pulse = (Math.sin(globalTime * L.FREQ) + 1) / 2;
            ctx.fillStyle = L.FILL;
            ctx.globalAlpha = L.FILL_ALPHA + pulse * L.FILL_PULSE;
            HexGeometry.traceHex(ctx, 0, 0, size * L.RADIUS, true, layout);
            ctx.fill();

            ctx.strokeStyle = L.STROKE;
            ctx.lineWidth = L.LINE_W + pulse * L.LINE_PULSE;
            ctx.globalAlpha = L.STROKE_ALPHA + pulse * L.STROKE_PULSE;
            HexGeometry.traceHex(ctx, 0, 0, size * L.RADIUS, true, layout);
            ctx.stroke();
            ctx.restore();
        }

        if (specialStatus && specialStatus !== 'NONE') {
            const def = STATUS_VISUALS[specialStatus];
            if (def && def.floorColor) {
                ctx.save();
                ctx.translate(x, drawY);
                ctx.fillStyle = def.floorColor;
                ctx.globalAlpha = def.floorOpacity || G.STATUS_FLOOR_ALPHA;
                HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
                ctx.fill();
                ctx.restore();
            }
        }

        if (zoneInfo) {
            const dist = HexUtils.dist({q, r}, {q: zoneInfo.q, r: zoneInfo.r});
            ZoneRenderer.drawTileZoneEffect(
                ctx, x, drawY - G.ZONE_LIFT, size,
                dist,
                zoneInfo.radius,
                zoneInfo.color,
                zoneInfo.progress,
                zoneInfo.isEnemy,
                layout
            );
        }

        if (lightColor && lightIntensity > 0) {
            ctx.save();
            ctx.translate(x, drawY);
            ctx.globalCompositeOperation = 'screen'; 
            ctx.fillStyle = lightColor;
            ctx.globalAlpha = Math.min(G.LIGHT.MAX_ALPHA, lightIntensity * G.LIGHT.GAIN);
            HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
            ctx.fill();
            ctx.restore();
        }

        if (isRange || isHover || hasUnit || isWarning) {
            ctx.save();
            // 預警／射程／滑過再多抬 MARK_LIFT，保證蓋在地格底色之上
            const overlayY = drawY - G.MARK_LIFT;
            ctx.translate(x, overlayY); 
            
            if (isWarning) {
                const W = G.WARNING;
                const pulse = (Math.sin(globalTime * W.FREQ) + 1) / 2;
                ctx.fillStyle = W.FILL;
                ctx.globalAlpha = W.FILL_ALPHA + pulse * W.FILL_PULSE;
                HexGeometry.traceHex(ctx, 0, 0, size * W.RADIUS, true, layout);
                ctx.fill();

                ctx.strokeStyle = W.STROKE;
                ctx.lineWidth = W.LINE_W;
                ctx.globalAlpha = W.STROKE_ALPHA + pulse * W.STROKE_PULSE;
                HexGeometry.traceHex(ctx, 0, 0, size * W.RADIUS, true, layout);
                ctx.stroke();
            }

            ctx.globalCompositeOperation = 'screen';
            if (isRange) { 
                const R = G.RANGE;
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = R.FILL_ALPHA;
                HexGeometry.traceHex(ctx, 0, 0, size * R.FILL_RADIUS, true, layout);
                ctx.fill();
                ctx.strokeStyle = rangeColor;
                ctx.lineWidth = R.LINE_W;
                ctx.globalAlpha = R.STROKE_ALPHA;
                HexGeometry.traceHex(ctx, 0, 0, size * R.STROKE_RADIUS, true, layout);
                ctx.stroke();
            }
            if (isHover) { 
                ctx.strokeStyle = G.HOVER.STROKE;
                ctx.lineWidth = G.HOVER.LINE_W;
                ctx.globalAlpha = G.HOVER.ALPHA;
                HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
};