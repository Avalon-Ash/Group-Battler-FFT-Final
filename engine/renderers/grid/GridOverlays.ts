import { ZoneRenderer } from "./ZoneRenderer";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { GroundHazard, HexLayout } from "../../../types";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { ActiveZone } from "../../systems/ZoneSystem";
import { HexUtils } from "../../utils";
import { VisualMath } from "../../math/VisualMath";

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
        const visualSurfaceY = VisualMath.getIsoVisualY(baseY, height);
        const drawY = VisualMath.applyLayerBias(visualSurfaceY, 'OVERLAY');

        if (isLastStand) {
            ctx.save();
            ctx.translate(x, drawY - 2);
            const pulse = (Math.sin(globalTime * 15) + 1) / 2; // High frequency
            ctx.fillStyle = '#c084fc'; // Purple/Magenta pulse
            ctx.globalAlpha = 0.2 + pulse * 0.3;
            HexGeometry.traceHex(ctx, 0, 0, size * 0.98, true, layout);
            ctx.fill();
            
            ctx.strokeStyle = '#f0abfc';
            ctx.lineWidth = 1.5 + pulse * 1.5;
            ctx.globalAlpha = 0.4 + pulse * 0.4;
            HexGeometry.traceHex(ctx, 0, 0, size * 0.98, true, layout);
            ctx.stroke();
            ctx.restore();
        }

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

        if (isRange || isHover || hasUnit || isWarning) {
            ctx.save();
            // Use a stronger bias for overlays to ensure they are above the terrain
            const overlayY = VisualMath.applyLayerBias(visualSurfaceY, 'OVERLAY') - 2;
            ctx.translate(x, overlayY); 
            
            if (isWarning) {
                const pulse = (Math.sin(globalTime * 12) + 1) / 2; // Faster pulse
                ctx.fillStyle = '#ff0000'; // Pure red
                ctx.globalAlpha = 0.6 + pulse * 0.4; // Higher alpha
                HexGeometry.traceHex(ctx, 0, 0, size * 0.95, true, layout); // Slightly smaller to show edges
                ctx.fill();
                
                // Add a border to the warning
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.3 + pulse * 0.5;
                HexGeometry.traceHex(ctx, 0, 0, size * 0.95, true, layout);
                ctx.stroke();
            }

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