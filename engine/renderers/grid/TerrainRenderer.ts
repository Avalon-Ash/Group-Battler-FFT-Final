
import { HEX_SIZE, BLOCK_HEIGHT, ISO_SCALE_Y } from "../../../constants";
import { HEX_VERTICES, HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { GridOverlays } from "./GridOverlays";

// --- MATERIAL CACHE ---
// Keys: `${themeId}_${height}`
// Stores reusable CanvasGradients to avoid creation every frame (CPU killer)
const MATERIAL_CACHE: Map<string, { side: CanvasGradient, top: CanvasGradient }> = new Map();

// Helper to get or create cached gradient
function getMaterials(ctx: CanvasRenderingContext2D, theme: any, height: number, themeId: string) {
    // Round height to nearest BLOCK_HEIGHT to reduce cache entries in case of float drifts
    // although heights should be integers of BLOCK_HEIGHT usually.
    const hKey = Math.round(height);
    const key = `${themeId}_${hKey}`;
    
    if (MATERIAL_CACHE.has(key)) return MATERIAL_CACHE.get(key)!;

    // 1. Side Gradient (Vertical)
    // We assume drawing in local space (0,0 is base of block)
    // The visual face goes from -height to 0. Plus BASE_THICKNESS (12px).
    const topY = -height;
    const bottomY = 12; // Base thickness
    
    const sideGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
    sideGrad.addColorStop(0, theme.sideDark);
    sideGrad.addColorStop(0.5, theme.sideLight);
    sideGrad.addColorStop(1, '#020617'); // Fade to black at bottom

    // 2. Top Gradient (Diagonal)
    // Local coords relative to top face center (0, -height)
    // Hex size radius is approx 36.
    const r = HEX_SIZE;
    const topGrad = ctx.createLinearGradient(-r, topY - r, r, topY + r);
    topGrad.addColorStop(0, theme.rim); 
    topGrad.addColorStop(0.3, theme.top);
    topGrad.addColorStop(1, theme.sideDark);

    const mats = { side: sideGrad, top: topGrad };
    MATERIAL_CACHE.set(key, mats);
    return mats;
}

export const TerrainRenderer = {
    
    /**
     * Optimized Block Drawer using Local Space Coordinates and Cached Materials.
     */
    drawBlockGeometry(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        size: number, height: number, 
        theme: any,
        type: string,
        globalTime: number
    ) {
        const BASE_THICKNESS = 12; 
        const faceY = -height; // Local Top Face Y

        ctx.save();
        ctx.translate(x, y); // Move to Base Center

        // Retrieve Cached Gradients
        const mats = getMaterials(ctx, theme, height, type);

        // 1. Draw Side Faces
        // Visible indices: 5, 0, 1
        const visibleIndices = [5, 0, 1]; 

        ctx.fillStyle = mats.side;
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; 
        ctx.lineWidth = 1; 

        ctx.beginPath();
        for (const i of visibleIndices) {
            const j = (i + 1) % 6;
            const v1 = HEX_VERTICES[i];
            const v2 = HEX_VERTICES[j];
            
            // Pre-calc coordinates
            const v1x = v1.x * size;
            const v1y = v1.y * size * ISO_SCALE_Y;
            const v2x = v2.x * size;
            const v2y = v2.y * size * ISO_SCALE_Y;

            // Top vertices
            const x1 = v1x;
            const y1_top = faceY + v1y;
            const x2 = v2x;
            const y2_top = faceY + v2y;

            // Bottom vertices
            const y1_bottom = v1y + BASE_THICKNESS; 
            const y2_bottom = v2y + BASE_THICKNESS;
            
            ctx.moveTo(x1, y1_bottom);
            ctx.lineTo(x2, y2_bottom); 
            ctx.lineTo(x2, y2_top);    
            ctx.lineTo(x1, y1_top);    
            ctx.lineTo(x1, y1_bottom); // Close quad
        }
        ctx.fill();
        ctx.stroke();

        // 2. Draw Top Face
        ctx.fillStyle = mats.top;
        HexGeometry.traceHex(ctx, 0, faceY, size, true);
        ctx.fill();

        // Tier lines (Only if tall)
        if (height > BLOCK_HEIGHT) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (const i of visibleIndices) {
                const j = (i + 1) % 6;
                const v1 = HEX_VERTICES[i];
                const v2 = HEX_VERTICES[j];
                
                const x1 = v1.x * size;
                const x2 = v2.x * size;
                const y1_base = v1.y * size * ISO_SCALE_Y;
                const y2_base = v2.y * size * ISO_SCALE_Y;
                
                // Draw lines at step intervals
                for (let hStep = BLOCK_HEIGHT; hStep < height; hStep += BLOCK_HEIGHT) {
                    const localY = -hStep;
                    ctx.moveTo(x1, localY + y1_base);
                    ctx.lineTo(x2, localY + y2_base);
                }
            }
            ctx.stroke();
        }

        // 3. Surface Assets (Animated)
        if (type === 'MAGMA' || type === 'VOID' || type === 'ICE') {
            if (type === 'MAGMA') {
                SurfacePainter.drawLiquid(ctx, 0, faceY, '#ef4444', globalTime, 1.0);
                const crackInt = 0.5 + Math.sin(globalTime) * 0.2;
                SurfacePainter.drawCracks(ctx, 0, faceY, '#fca5a5', crackInt);
            } else if (type === 'VOID') {
                SurfacePainter.drawFog(ctx, 0, faceY, theme.fogColor || '#6366f1', globalTime);
            } else if (type === 'ICE') {
                const bandPos = (globalTime * 50 + x + y) % (size * 4) - size * 2;
                ctx.save(); 
                HexGeometry.traceHex(ctx, 0, faceY, size, true);
                ctx.clip(); 
                const specGrad = ctx.createLinearGradient(-size, faceY - size, size, faceY + size);
                specGrad.addColorStop(0, 'transparent');
                specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)'); 
                specGrad.addColorStop(1, 'transparent');
                ctx.translate(bandPos * 0.5, 0); 
                ctx.fillStyle = specGrad;
                ctx.fill();
                ctx.restore();
            } 
        }

        // 4. Rim Light (Highlight Edges)
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.rim || 'rgba(255,255,255,0.3)';
        ctx.globalAlpha = 0.6;
        
        ctx.beginPath();
        // Visible top back edges (4, 3, 2 indices) for highlight
        const v4 = HEX_VERTICES[4];
        const v3 = HEX_VERTICES[3];
        const v2 = HEX_VERTICES[2];
        
        // Scale vertices
        const sx = size;
        const sy = size * ISO_SCALE_Y;

        ctx.moveTo(v4.x * sx, faceY + v4.y * sy);
        ctx.lineTo(v3.x * sx, faceY + v3.y * sy);
        ctx.lineTo(v2.x * sx, faceY + v2.y * sy);
        
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        
        // Final outline
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        HexGeometry.traceHex(ctx, 0, faceY, size, true);
        ctx.stroke();

        ctx.restore();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        cx: number, cy: number, 
        q: number, r: number, 
        type: string, 
        detailColor: string
    ) {
        // Optimized: Uses cached sprites from VFXFactory internally
        const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
        SurfacePainter.drawDetailTexture(ctx, cx, cy, type, detailColor, seed);
    }
};
