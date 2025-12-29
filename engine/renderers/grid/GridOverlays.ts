
import { ZoneRenderer } from "./ZoneRenderer";
import { HazardPainter } from "./painters/HazardPainter"; 
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { GroundHazard, HexLayout } from "../../../types";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { HEX_SIZE } from "../../../constants";
import { ActiveZone } from "../../systems/ZoneSystem";
import { HexUtils } from "../../utils";

// Lift overlays slightly off the terrain mesh (Top Face) to avoid Z-fighting
const OVERLAY_LIFT = -4;
const HAZARD_LIFT = -12; // Hazards like fog need more lift

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
        // Apply global lift to all floor overlays
        const drawY = y + OVERLAY_LIFT;

        if (hazard) {
            // Draw hazard with extra lift for volume fog
            HazardPainter.draw(ctx, x, y + HAZARD_LIFT, hazard, globalTime);
        }

        // 1. Status Floor Color (e.g. Frozen/Poison tile tint)
        if (specialStatus && specialStatus !== 'NONE') {
            const def = STATUS_VISUALS[specialStatus];
            if (def && def.floorColor) {
                ctx.save();
                ctx.translate(x, drawY);
                ctx.fillStyle = def.floorColor;
                ctx.globalAlpha = def.floorOpacity || 0.5;
                HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
                ctx.fill();
                ctx.restore();
            }
        }

        // 2. Active Zones (AOE Warnings)
        if (zoneInfo) {
            const dist = HexUtils.dist({q, r}, {q: zoneInfo.q, r: zoneInfo.r});
            ZoneRenderer.drawTileZoneEffect(
                ctx, x, drawY, size,
                dist,
                zoneInfo.radius,
                zoneInfo.color,
                zoneInfo.progress,
                zoneInfo.isEnemy,
                layout
            );
        }

        // 3. Dynamic Lighting (Projectile Pass-over)
        if (lightColor && lightIntensity > 0) {
            ctx.save();
            ctx.translate(x, drawY);
            ctx.globalCompositeOperation = 'screen'; 
            ctx.fillStyle = lightColor;
            ctx.globalAlpha = Math.min(0.6, lightIntensity * 0.5);
            HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
            ctx.fill();
            ctx.restore();
        }

        // 4. Interaction Highlights (Range/Hover)
        if (isRange || isHover || hasUnit) {
            ctx.save();
            ctx.translate(x, drawY);
            ctx.globalCompositeOperation = 'screen';

            if (isRange) { 
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.15;
                HexGeometry.traceHex(ctx, 0, 0, size * 0.95, true, layout);
                ctx.fill();
                
                ctx.strokeStyle = rangeColor;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.4;
                HexGeometry.traceHex(ctx, 0, 0, size * 0.9, true, layout);
                ctx.stroke();
            }
            
            if (isHover) { 
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.2;
                HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
                ctx.fill();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.9;
                HexGeometry.traceHex(ctx, 0, 0, size, true, layout);
                ctx.stroke();
            }
            
            if (hasUnit && !isHover && !zoneInfo) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.3;
                HexGeometry.traceHex(ctx, 0, 0, size * 0.9, true, layout);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
};
