
import { HEX_SIZE, BLOCK_HEIGHT, ISO_SCALE_Y } from "../../../constants";
import { SurfaceAssets } from "../../graphics/SurfaceAssets";
import { GridOverlays } from "./GridOverlays";

// Optimization: Precompute Hex Polygon Offsets
const START_ANGLE = Math.PI / 6 + Math.PI / 4; 
const HEX_CORNERS: {x: number, y: number}[] = [];
for (let i = 0; i < 6; i++) {
    const angle = START_ANGLE + i * Math.PI / 3;
    HEX_CORNERS.push({ 
        x: HEX_SIZE * Math.cos(angle), 
        y: HEX_SIZE * Math.sin(angle) * ISO_SCALE_Y 
    });
}

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
        const visibleIndices = [5, 0, 1];

        for (const i of visibleIndices) {
            const j = (i + 1) % 6;
            const c1 = HEX_CORNERS[i];
            const c2 = HEX_CORNERS[j];
            
            const x1 = x + c1.x;
            const y1_top = y + c1.y - heightOffset;
            const x2 = x + c2.x;
            const y2_top = y + c2.y - heightOffset;

            const y1_bottom = y + c1.y + BASE_THICKNESS;
            const y2_bottom = y + c2.y + BASE_THICKNESS;
            
            const grad = ctx.createLinearGradient(0, y - heightOffset, 0, y + BASE_THICKNESS);
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
                    ctx.moveTo(x1, y + c1.y - hStep);
                    ctx.lineTo(x2, y + c2.y - hStep);
                }
                ctx.stroke();
            }

            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; 
            ctx.lineWidth = 1; 
            ctx.stroke();
        }

        // 2. Draw Top Face
        this.traceTopFace(ctx, x, faceY);
        const topGrad = ctx.createLinearGradient(x - size, faceY - size, x + size, faceY + size);
        topGrad.addColorStop(0, theme.rim); 
        topGrad.addColorStop(0.3, theme.top);
        topGrad.addColorStop(1, theme.sideDark); 
        ctx.fillStyle = topGrad;
        ctx.fill();

        // 3. Surface Assets
        if (type === 'MAGMA') {
            SurfaceAssets.drawLiquidSurface(ctx, x, faceY, '#ef4444', globalTime, 1.0);
            const crackInt = 0.5 + Math.sin(globalTime) * 0.2;
            SurfaceAssets.drawGroundCracks(ctx, x, faceY, '#fca5a5', crackInt);
        } else if (type === 'VOID') {
            SurfaceAssets.drawVolumetricFog(ctx, x, faceY, theme.fogColor || '#6366f1', globalTime);
        } else if (type === 'ICE') {
            const bandPos = (globalTime * 50 + x + y) % (size * 4) - size * 2;
            ctx.save();
            this.traceTopFace(ctx, x, faceY);
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
        const c4 = HEX_CORNERS[4];
        const c3 = HEX_CORNERS[3];
        const c2 = HEX_CORNERS[2];
        ctx.moveTo(x + c4.x, faceY + c4.y);
        ctx.lineTo(x + c3.x, faceY + c3.y);
        ctx.lineTo(x + c2.x, faceY + c2.y); 
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.traceTopFace(ctx, x, faceY);
        ctx.stroke();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        cx: number, cy: number, 
        q: number, r: number, 
        type: string, 
        detailColor: string
    ) {
        SurfaceAssets.drawTexture(ctx, cx, cy, q, r, type, detailColor, performance.now() / 1000);
    },

    traceTopFace(ctx: CanvasRenderingContext2D, x: number, y: number) {
        ctx.beginPath();
        const c0 = HEX_CORNERS[0];
        ctx.moveTo(x + c0.x, y + c0.y);
        for (let i = 1; i < 6; i++) {
            const c = HEX_CORNERS[i];
            ctx.lineTo(x + c.x, y + c.y);
        }
        ctx.closePath();
    }
};
