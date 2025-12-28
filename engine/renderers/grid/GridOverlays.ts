
import { ZoneRenderer } from "./ZoneRenderer";
import { HazardPainter } from "./painters/HazardPainter"; 
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { GroundHazard } from "../../../types";
import { STATUS_VISUALS } from "../../../data/vfx/status_visuals";
import { HEX_SIZE } from "../../../constants";

interface ZoneInfo {
    type: 'CAST';
    color: string;
    visual: string; // Skill visual tag
    progress: number;
    centerQ: number;
    centerR: number;
    radius: number;
    dist: number;
}

export const GridOverlays = {
    
    drawOverlays(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, // Visual Top Face Y
        size: number,
        
        // State Props
        specialStatus: string | undefined, 
        zoneInfo: ZoneInfo | undefined,    
        
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
        // --- PERFORMANCE OPTIMIZATION ---
        // If the size is standard (HEX_SIZE), use the cached Path2D from HexGeometry.
        // This avoids rebuilding the path logic every frame for every tile.
        // NOTE: We must translate to (x, y) first.
        
        const isStandard = Math.abs(size - HEX_SIZE) < 0.01;
        const hexPath = isStandard ? HexGeometry.getStandardPath() : null;

        const fillHex = (color: string, alpha: number) => {
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            if (hexPath) {
                ctx.translate(x, y);
                ctx.fill(hexPath);
                ctx.translate(-x, -y);
            } else {
                HexGeometry.traceHex(ctx, x, y, size);
                ctx.fill();
            }
        };

        const strokeHex = (color: string, width: number, alpha: number) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.globalAlpha = alpha;
            if (hexPath) {
                ctx.translate(x, y);
                ctx.stroke(hexPath);
                ctx.translate(-x, -y);
            } else {
                HexGeometry.traceHex(ctx, x, y, size);
                ctx.stroke();
            }
        };

        // --- LAYER 1: HAZARDS ---
        if (hazard) {
            HazardPainter.draw(ctx, x, y, hazard, globalTime);
        }

        // --- LAYER 2: UNIT STATUS FLOOR TINT ---
        if (specialStatus && specialStatus !== 'NONE') {
            const def = STATUS_VISUALS[specialStatus];
            if (def && def.floorColor) {
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                fillHex(def.floorColor, def.floorOpacity || 0.5);
                ctx.restore();
            }
        }

        // --- LAYER 3: CAST ZONES (Volumetric) ---
        // ZoneRenderer handles its own geometry (complex shapes)
        if (zoneInfo) {
            ZoneRenderer.drawZone(
                ctx, x, y, size,
                zoneInfo.color,
                zoneInfo.visual,
                zoneInfo.progress,
                globalTime,
                zoneInfo.dist,
                zoneInfo.radius
            );
        }

        // --- LAYER 4: DYNAMIC LIGHTING ---
        if (lightColor && lightIntensity > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen'; 
            fillHex(lightColor, Math.min(0.5, lightIntensity * 0.4));
            ctx.restore();
        }

        // --- LAYER 5: INTERACTIVE UI HIGHLIGHTS ---
        if (isRange || isHover || hasUnit) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            // Valid Move/Skill Range
            if (isRange) { 
                fillHex(rangeColor, 0.2);
                strokeHex(rangeColor, 2, 0.5);
            }
            
            // Mouse Hover - Bright Spotlight
            if (isHover) { 
                fillHex('#ffffff', 0.2);
                strokeHex('#ffffff', 2, 0.8);
            }
            
            // Unit Position - Subtle selection ring
            if (hasUnit && !isHover && !zoneInfo) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.3;
                // Use trace here as we might want scaling/offset for the ring
                HexGeometry.traceHex(ctx, x, y, size * 0.9);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
};
