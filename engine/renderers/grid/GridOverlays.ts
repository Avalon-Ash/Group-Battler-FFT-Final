
import { ZoneRenderer } from "./ZoneRenderer";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { GroundHazard, HexLayout } from "../../../types";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { ActiveZone } from "../../systems/ZoneSystem";
import { HexUtils } from "../../utils";

const OVERLAY_LIFT = -12; // Increased lift to sit above terrain details

export const GridOverlays = {
    drawOverlays(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, 
        size: number,
        specialStatus: string | undefined, 
        zoneInfo: ActiveZone | undefined,    
        lightColor: string | null,
        lightIntensity: number,
        isRange: boolean,
        rangeColor: string,
        isHover: boolean,
        hasUnit: boolean,
        q: number, r: number,
        globalTime: number,
        hazard: GroundHazard | undefined, 
        layout: HexLayout
    ) {
        const drawY = y + OVERLAY_LIFT;

        // 1. 狀態地效
        if (specialStatus && specialStatus !== 'NONE') {
            const def = STATUS_VISUALS[specialStatus];
            if (def && def.floorColor) {
                ctx.save();
                ctx.translate(x, drawY);
                ctx.fillStyle = def.floorColor;
                ctx.globalAlpha = def.floorOpacity || 0.4;
                HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
                ctx.fill();
                ctx.restore();
            }
        }

        // 2. 戰術區域 (奧義預警/AOE 範圍)
        if (zoneInfo) {
            const dist = HexUtils.dist({q, r}, {q: zoneInfo.q, r: zoneInfo.r});
            ZoneRenderer.drawTileZoneEffect(
                ctx, x, drawY - 1, size,
                dist,
                zoneInfo.radius,
                zoneInfo.color,
                zoneInfo.progress,
                zoneInfo.isEnemy,
                layout
            );
        }

        // 3. 點光源投影
        if (lightColor && lightIntensity > 0) {
            ctx.save();
            ctx.translate(x, drawY);
            ctx.globalCompositeOperation = 'screen'; 
            ctx.fillStyle = lightColor;
            ctx.globalAlpha = Math.min(0.5, lightIntensity * 0.4);
            HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
            ctx.fill();
            ctx.restore();
        }

        // 4. 交互高亮
        if (isRange || isHover || hasUnit) {
            ctx.save();
            ctx.translate(x, drawY + 1); 
            ctx.globalCompositeOperation = 'screen';
            if (isRange) { 
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.12;
                HexGeometry.traceHex(ctx, 0, 0, size * 0.95, true, layout);
                ctx.fill();
                ctx.strokeStyle = rangeColor;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.3;
                HexGeometry.traceHex(ctx, 0, 0, size * 0.9, true, layout);
                ctx.stroke();
            }
            if (isHover) { 
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.8;
                HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
};
