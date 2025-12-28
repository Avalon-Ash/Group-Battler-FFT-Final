
import { ZoneRenderer } from "./ZoneRenderer";
import { HazardPainter } from "./painters/HazardPainter"; 
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { GroundHazard } from "../../../types";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { HEX_SIZE } from "../../../constants";
import { ActiveZone } from "../../systems/ZoneSystem";
import { HexMath } from "../../math/HexMath";

export const GridOverlays = {
    
    drawOverlays(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, // Visual Top Face Y
        size: number,
        
        // State Props
        specialStatus: string | undefined, 
        zoneInfo: ActiveZone | undefined,    
        
        // Lighting
        lightColor: string | null,
        lightIntensity: number,
        
        // Interactive
        isRange: boolean,
        rangeColor: string,
        isHover: boolean,
        hasUnit: boolean,
        
        // Metadata
        q: number, r: number,
        globalTime: number,
        hazard: GroundHazard | undefined
    ) {
        // --- LAYER 1: HAZARDS ---
        if (hazard) {
            HazardPainter.draw(ctx, x, y, hazard, globalTime);
        }

        // --- LAYER 2: UNIT STATUS FLOOR (e.g. Rooted, Frozen) ---
        if (specialStatus && specialStatus !== 'NONE') {
            const def = STATUS_VISUALS[specialStatus];
            if (def && def.floorColor) {
                ctx.save();
                ctx.translate(x, y);
                ctx.fillStyle = def.floorColor;
                ctx.globalAlpha = def.floorOpacity || 0.5;
                HexGeometry.traceHex(ctx, 0, 0, size, true);
                ctx.fill();
                ctx.restore();
            }
        }

        // --- LAYER 3: UNIFIED ZONE RIPPLE ---
        if (zoneInfo) {
            // Calculate distance from this tile to the zone center
            const dist = HexMath.distance({q, r}, {q: zoneInfo.q, r: zoneInfo.r});
            
            // Render PER TILE effect
            ZoneRenderer.drawTileZoneEffect(
                ctx, x, y, size,
                dist,
                zoneInfo.radius,
                zoneInfo.color,
                zoneInfo.progress,
                zoneInfo.isEnemy
            );
        }

        // --- LAYER 4: DYNAMIC LIGHTING ---
        if (lightColor && lightIntensity > 0) {
            ctx.save();
            ctx.translate(x, y);
            ctx.globalCompositeOperation = 'screen'; 
            ctx.fillStyle = lightColor;
            ctx.globalAlpha = Math.min(0.6, lightIntensity * 0.5);
            HexGeometry.traceHex(ctx, 0, 0, size, true);
            ctx.fill();
            ctx.restore();
        }

        // --- LAYER 5: INTERACTIVE HIGHLIGHTS ---
        if (isRange || isHover || hasUnit) {
            ctx.save();
            ctx.translate(x, y);
            ctx.globalCompositeOperation = 'screen';

            // Valid Move Range
            if (isRange) { 
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.15;
                HexGeometry.traceHex(ctx, 0, 0, size * 0.9, true);
                ctx.fill();
                
                ctx.strokeStyle = rangeColor;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.4;
                HexGeometry.traceHex(ctx, 0, 0, size * 0.9, true);
                ctx.stroke();
            }
            
            // Hover Cursor
            if (isHover) { 
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.2;
                HexGeometry.traceHex(ctx, 0, 0, size, true);
                ctx.fill();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.9;
                HexGeometry.traceHex(ctx, 0, 0, size, true);
                ctx.stroke();
            }
            
            // Unit Position Ring
            if (hasUnit && !isHover && !zoneInfo) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.3;
                HexGeometry.traceHex(ctx, 0, 0, size * 0.9, true);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
};
