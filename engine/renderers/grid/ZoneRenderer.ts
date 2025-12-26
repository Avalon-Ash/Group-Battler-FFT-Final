
import { SurfaceAssets } from "../../graphics/SurfaceAssets";

export const ZoneRenderer = {
    
    draw(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, // Center of the tile face
        size: number,
        color: string,
        type: 'CAST' | 'FIELD',
        visual: string,
        progress: number, 
        globalTime: number,
        dist: number, 
        maxRadius: number
    ) {
        // Note: We are already transformed to the tile's visual center by RenderList execution

        if (type === 'CAST') {
            // Telegraph: Single Hex Tacticals
            const isCenter = dist === 0;
            SurfaceAssets.drawTacticalGrid(ctx, x, y, color, progress, isCenter);
            
        } else if (type === 'FIELD') {
            // Persistent Field: Volumetric Extrusion
            // Logic: Create a "pool" effect. 
            // The renderer calls SurfaceAssets to draw an extruded hex.
            
            const intensity = Math.sin(globalTime * 2 + dist * 0.5) * 0.2 + 0.8;
            
            // "Pulsing" height based on time
            const height = 10 + Math.sin(globalTime * 3) * 3;
            
            // Determine opacity based on distance from center (fade edges)
            // But we want solid looking fields, so keep alpha high
            const alpha = 0.7 * intensity;

            SurfaceAssets.drawExtrudedHex(ctx, x, y, height, color, alpha, false);
            
            // Add top detail (Texture)
            ctx.save();
            ctx.translate(x, y - height); // Move to top face
            ctx.scale(1, 0.58);
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.restore();
        }
    }
};
