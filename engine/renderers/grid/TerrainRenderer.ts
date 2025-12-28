
import { HEX_SIZE, BLOCK_HEIGHT, ISO_SCALE_Y } from "../../../constants";
import { HEX_VERTICES, HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { GridOverlays } from "./GridOverlays";

// --- CACHE ---
// Reuse gradients or styles to prevent rapid GC
// Since heights and themes change, full caching is hard, but we can minimize ops.

export const TerrainRenderer = {
    
    drawBlockGeometry(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        size: number, height: number, 
        theme: any,
        type: string,
        globalTime: number
    ) {
        const BASE_THICKNESS = 12; 
        const heightOffset = height; 
        const faceY = y - heightOffset; // Top face Y

        // OPTIMIZATION: Avoid ctx.save()/restore() for the main block body
        // We use direct drawing commands.

        // 1. Draw Side Faces
        // Visible indices in Pointy-Top ISO order: [5, 0, 1] (Bottom Left, Bottom, Bottom Right)
        const visibleIndices = [5, 0, 1]; 

        // Shared Side Gradient:
        // Instead of creating it 3 times per block, create once per block.
        // It's still per-block because 'faceY' changes.
        // However, we can use a simpler flat fill for the sides to save perf, 
        // or a simpler vertical gradient.
        
        // Gradient optimization:
        const grad = ctx.createLinearGradient(0, faceY, 0, y + BASE_THICKNESS);
        grad.addColorStop(0, theme.sideDark); // Darker at top (fake occlusion)
        grad.addColorStop(0.5, theme.sideLight); // Light mid
        grad.addColorStop(1, '#020617'); // Fade to black at bottom

        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; 
        ctx.lineWidth = 1; 

        ctx.beginPath();
        for (const i of visibleIndices) {
            const j = (i + 1) % 6;
            const v1 = HEX_VERTICES[i];
            const v2 = HEX_VERTICES[j];
            
            const x1 = x + v1.x * size;
            const y1_top = faceY + v1.y * size * ISO_SCALE_Y;
            const x2 = x + v2.x * size;
            const y2_top = faceY + v2.y * size * ISO_SCALE_Y;

            const y1_bottom = y + v1.y * size * ISO_SCALE_Y + BASE_THICKNESS; 
            const y2_bottom = y + v2.y * size * ISO_SCALE_Y + BASE_THICKNESS;
            
            ctx.moveTo(x1, y1_bottom);
            ctx.lineTo(x2, y2_bottom); 
            ctx.lineTo(x2, y2_top);    
            ctx.lineTo(x1, y1_top);    
            ctx.lineTo(x1, y1_bottom); // Close shape
        }
        ctx.fill();
        ctx.stroke();

        // 2. Draw Top Face
        // Use a simple gradient for top face
        // Pre-calced gradient would be better, but coordinates shift.
        // Keep it simple.
        const topGrad = ctx.createLinearGradient(x - size, faceY - size, x + size, faceY + size);
        topGrad.addColorStop(0, theme.rim); 
        topGrad.addColorStop(0.3, theme.top);
        topGrad.addColorStop(1, theme.sideDark); 
        ctx.fillStyle = topGrad;
        
        HexGeometry.traceHex(ctx, x, faceY, size, true);
        ctx.fill();

        // Tier lines (Only if tall)
        if (height > BLOCK_HEIGHT) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Iterate visible faces again for tier lines
            for (const i of visibleIndices) {
                const j = (i + 1) % 6;
                const v1 = HEX_VERTICES[i];
                const v2 = HEX_VERTICES[j];
                const x1 = x + v1.x * size;
                const x2 = x + v2.x * size;
                
                for (let hStep = BLOCK_HEIGHT; hStep < height; hStep += BLOCK_HEIGHT) {
                    ctx.moveTo(x1, y - hStep + v1.y * size * ISO_SCALE_Y);
                    ctx.lineTo(x2, y - hStep + v2.y * size * ISO_SCALE_Y);
                }
            }
            ctx.stroke();
        }

        // 3. Surface Assets (Requires state changes, so we isolate these)
        if (type === 'MAGMA' || type === 'VOID' || type === 'ICE') {
            if (type === 'MAGMA') {
                SurfacePainter.drawLiquid(ctx, x, faceY, '#ef4444', globalTime, 1.0);
                const crackInt = 0.5 + Math.sin(globalTime) * 0.2;
                SurfacePainter.drawCracks(ctx, x, faceY, '#fca5a5', crackInt);
            } else if (type === 'VOID') {
                SurfacePainter.drawFog(ctx, x, faceY, theme.fogColor || '#6366f1', globalTime);
            } else if (type === 'ICE') {
                const bandPos = (globalTime * 50 + x + y) % (size * 4) - size * 2;
                ctx.save(); // Needed for clip
                HexGeometry.traceHex(ctx, x, faceY, size, true);
                ctx.clip(); 
                const specGrad = ctx.createLinearGradient(x - size, faceY - size, x + size, faceY + size);
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
        
        ctx.moveTo(x + v4.x * size, faceY + v4.y * size * ISO_SCALE_Y);
        ctx.lineTo(x + v3.x * size, faceY + v3.y * size * ISO_SCALE_Y);
        ctx.lineTo(x + v2.x * size, faceY + v2.y * size * ISO_SCALE_Y);
        
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        
        // Final outline
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        HexGeometry.traceHex(ctx, x, faceY, size, true);
        ctx.stroke();
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
