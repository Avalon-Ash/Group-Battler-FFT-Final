
import { HEX_SIZE, BLOCK_HEIGHT, ISO_SCALE_Y } from "../../../constants";
import { SurfaceAssets } from "../../graphics/SurfaceAssets";

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
        const topY = height; 

        // 1. Draw Side Faces (The Stack)
        const visibleIndices = [5, 0, 1];

        for (const i of visibleIndices) {
            const j = (i + 1) % 6;
            const c1 = HEX_CORNERS[i];
            const c2 = HEX_CORNERS[j];
            
            const x1 = x + c1.x;
            const y1_top = y + c1.y - topY;
            const x2 = x + c2.x;
            const y2_top = y + c2.y - topY;

            const y1_bottom = y + c1.y + BASE_THICKNESS;
            const y2_bottom = y + c2.y + BASE_THICKNESS;
            
            const grad = ctx.createLinearGradient(0, y - topY, 0, y + BASE_THICKNESS);
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
            
            // Layer Lines
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

        // 2. Draw Top Face (Base)
        this.traceTopFace(ctx, x, y - topY);
        
        // --- BASE MATERIAL ---
        const topGrad = ctx.createLinearGradient(x - size, y - topY - size, x + size, y - topY + size);
        topGrad.addColorStop(0, theme.rim); 
        topGrad.addColorStop(0.3, theme.top);
        topGrad.addColorStop(1, theme.sideDark); 
        ctx.fillStyle = topGrad;
        ctx.fill();

        // --- DYNAMIC OVERLAYS ---
        if (type === 'MAGMA') {
            const pulse = Math.sin(globalTime * 1.5 + x * 0.1 + y * 0.1); 
            if (pulse > 0.2) {
                const heatAlpha = (pulse - 0.2) * 0.3; 
                ctx.fillStyle = `rgba(239, 68, 68, ${heatAlpha})`; 
                ctx.fill();
            }
        } else if (type === 'ICE') {
            const bandPos = (globalTime * 50 + x + y) % (size * 4) - size * 2;
            ctx.save();
            ctx.clip(); 
            const specGrad = ctx.createLinearGradient(x - size, y - topY - size, x + size, y - topY + size);
            specGrad.addColorStop(0, 'transparent');
            specGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)'); 
            specGrad.addColorStop(1, 'transparent');
            ctx.translate(bandPos * 0.5, 0); 
            ctx.fillStyle = specGrad;
            ctx.fill();
            ctx.restore();
        } 

        // 3. Rim Light
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.rim || 'rgba(255,255,255,0.3)';
        ctx.globalAlpha = 0.6;
        
        ctx.beginPath();
        const c4 = HEX_CORNERS[4];
        const c3 = HEX_CORNERS[3];
        const c2 = HEX_CORNERS[2];
        
        ctx.moveTo(x + c4.x, y - topY + c4.y);
        ctx.lineTo(x + c3.x, y - topY + c3.y);
        ctx.lineTo(x + c2.x, y - topY + c2.y); 
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
        
        // 4. Subtle Outline
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(x + HEX_CORNERS[2].x, y - topY + HEX_CORNERS[2].y);
        ctx.lineTo(x + HEX_CORNERS[1].x, y - topY + HEX_CORNERS[1].y);
        ctx.lineTo(x + HEX_CORNERS[0].x, y - topY + HEX_CORNERS[0].y);
        ctx.lineTo(x + HEX_CORNERS[5].x, y - topY + HEX_CORNERS[5].y);
        ctx.lineTo(x + HEX_CORNERS[4].x, y - topY + HEX_CORNERS[4].y);
        ctx.stroke();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        cx: number, cy: number, 
        q: number, r: number, 
        type: string, 
        detailColor: string
    ) {
        // Delegate to SurfaceAssets to keep Renderer pure
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
