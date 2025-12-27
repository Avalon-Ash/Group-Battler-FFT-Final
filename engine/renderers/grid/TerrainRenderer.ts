
import { HEX_SIZE, BLOCK_HEIGHT, ISO_SCALE_Y } from "../../../constants";
import { SurfaceAssets, GEOMETRY } from "../../graphics/SurfaceAssets";
import { GridOverlays } from "./GridOverlays";

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
        const faceY = y - heightOffset;

        // 1. Draw Side Faces
        // We use the shared GEOMETRY from SurfaceAssets to ensure vertices match perfectly
        const visibleIndices = [5, 0, 1];

        for (const i of visibleIndices) {
            const j = (i + 1) % 6;
            
            // Pre-calculated Cos/Sin from SurfaceAssets (Radius = 1.0)
            const c1x = size * GEOMETRY.HEX_COS[i];
            const c1y = size * GEOMETRY.HEX_SIN[i] * ISO_SCALE_Y;
            
            const c2x = size * GEOMETRY.HEX_COS[j];
            const c2y = size * GEOMETRY.HEX_SIN[j] * ISO_SCALE_Y;
            
            const x1 = x + c1x;
            const y1_top = faceY + c1y;     // Top vertex relative to faceY
            const x2 = x + c2x;
            const y2_top = faceY + c2y;     // Top vertex relative to faceY

            const y1_bottom = y + c1y + BASE_THICKNESS; // Bottom relative to base Y
            const y2_bottom = y + c2y + BASE_THICKNESS;
            
            const grad = ctx.createLinearGradient(0, faceY, 0, y + BASE_THICKNESS);
            const baseColor = (i === 0) ? theme.sideDark : theme.sideLight; 
            
            grad.addColorStop(0, baseColor);
            grad.addColorStop(0.7, baseColor);
            grad.addColorStop(1, '#020617');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x1, y1_bottom);
            ctx.lineTo(x2, y2_bottom); 
            ctx.lineTo(x2, y2_top);    
            ctx.lineTo(x1, y1_top);    
            ctx.closePath();
            ctx.fill();
            
            if (height > BLOCK_HEIGHT) {
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let hStep = BLOCK_HEIGHT; hStep < height; hStep += BLOCK_HEIGHT) {
                    ctx.moveTo(x1, y - hStep + c1y);
                    ctx.lineTo(x2, y - hStep + c2y);
                }
                ctx.stroke();
            }

            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; 
            ctx.lineWidth = 1; 
            ctx.stroke();
        }

        // 2. Draw Top Face
        // Direct call to SurfaceAssets ensures strict alignment with GridOverlays
        ctx.fillStyle = '#000'; // Fallback
        const topGrad = ctx.createLinearGradient(x - size, faceY - size, x + size, faceY + size);
        topGrad.addColorStop(0, theme.rim); 
        topGrad.addColorStop(0.3, theme.top);
        topGrad.addColorStop(1, theme.sideDark); 
        ctx.fillStyle = topGrad;
        
        SurfaceAssets.traceHex(ctx, x, faceY, size);
        ctx.fill();

        // 3. Surface Assets
        if (type === 'MAGMA') {
            SurfaceAssets.drawLiquid(ctx, x, faceY, '#ef4444', globalTime, 1.0);
            const crackInt = 0.5 + Math.sin(globalTime) * 0.2;
            SurfaceAssets.drawCracks(ctx, x, faceY, '#fca5a5', crackInt);
        } else if (type === 'VOID') {
            SurfaceAssets.drawFog(ctx, x, faceY, theme.fogColor || '#6366f1', globalTime);
        } else if (type === 'ICE') {
            const bandPos = (globalTime * 50 + x + y) % (size * 4) - size * 2;
            ctx.save();
            SurfaceAssets.traceHex(ctx, x, faceY, size);
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

        // 4. Rim Light
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.rim || 'rgba(255,255,255,0.3)';
        ctx.globalAlpha = 0.6;
        
        ctx.beginPath();
        // Use SurfaceAssets Geometry
        const c4 = {x: size*GEOMETRY.HEX_COS[4], y: size*GEOMETRY.HEX_SIN[4]*ISO_SCALE_Y};
        const c3 = {x: size*GEOMETRY.HEX_COS[3], y: size*GEOMETRY.HEX_SIN[3]*ISO_SCALE_Y};
        const c2 = {x: size*GEOMETRY.HEX_COS[2], y: size*GEOMETRY.HEX_SIN[2]*ISO_SCALE_Y};
        
        ctx.moveTo(x + c4.x, faceY + c4.y);
        ctx.lineTo(x + c3.x, faceY + c3.y);
        ctx.lineTo(x + c2.x, faceY + c2.y); 
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        SurfaceAssets.traceHex(ctx, x, faceY, size);
        ctx.stroke();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        cx: number, cy: number, 
        q: number, r: number, 
        type: string, 
        detailColor: string
    ) {
        const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
        SurfaceAssets.drawDetailTexture(ctx, cx, cy, type, detailColor, seed);
    }
};
