
import { ISO_SCALE_Y, BASE_HEIGHT, BLOCK_HEIGHT } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { HexLayout } from "../../../types";

// 幾何常數
const PEDESTAL_DEPTH = 120; // 基座向下延伸深度，確保無穿幫
const EXPANSION_BIAS = 0.6; // 數學膨脹量 (px)，解決縫隙

export const TerrainRenderer = {
    drawBlock(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        size: number, height: number, 
        theme: any,
        type: string,
        globalTime: number,
        layout: HexLayout
    ) {
        // 物理座標取整
        const drawX = Math.floor(x);
        const drawY = Math.floor(y);
        
        // 視覺頂面 Y 軸 (相對於 drawY)
        const visualTopY = -Math.floor(height);
        
        // 膨脹幾何半徑
        const r = size + EXPANSION_BIAS;
        const vertices = HexGeometry.getVertices(r, true, layout); 
        
        ctx.save();
        ctx.translate(drawX, drawY);

        // 1. 繪製基座與側牆 (Pedestal & Walls)
        // 側牆從 visualTopY 延伸至 PEDESTAL_DEPTH
        // 確保無論地形多高，下方都有支撐
        
        // 判斷可見面：根據佈局繪製前向面
        // Flat: Bottom(1,2), BottomRight(0,1), BottomLeft(2,3) -> Indices 0,1,2,3 relevant
        // Pointy: BottomRight(0,1), BottomLeft(1,2) -> Indices 0,1,2 relevant
        
        const drawFace = (idx1: number, idx2: number, color: string) => {
            const v1 = vertices[idx1];
            const v2 = vertices[idx2];
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y + visualTopY); // Top-Left
            ctx.lineTo(v2.x, v2.y + visualTopY); // Top-Right
            ctx.lineTo(v2.x, v2.y + PEDESTAL_DEPTH); // Bottom-Right (Deep)
            ctx.lineTo(v1.x, v1.y + PEDESTAL_DEPTH); // Bottom-Left (Deep)
            ctx.closePath();
            ctx.fill();
            
            // 側邊高光稜線
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y + visualTopY);
            ctx.lineTo(v1.x, v1.y + PEDESTAL_DEPTH);
            ctx.stroke();
        };

        if (layout === 'FLAT') {
            drawFace(1, 0, theme.sideDark);  // Right-Bottom
            drawFace(2, 1, theme.sideLight); // Bottom
            drawFace(3, 2, theme.sideDark);  // Left-Bottom
        } else {
            // Pointy Layout Indices: 0(Right), 1(BottomRight), 2(BottomLeft), 3(Left)...
            // Forward facing are usually 0->1 and 1->2
            drawFace(1, 0, theme.sideDark);  // Right Side
            drawFace(2, 1, theme.sideLight); // Left Side
        }

        // 2. 繪製頂部 (Top Cap)
        ctx.translate(0, visualTopY);
        
        const topGrad = ctx.createLinearGradient(-r, -r, r, r);
        topGrad.addColorStop(0, theme.rim); 
        topGrad.addColorStop(0.5, theme.top);
        topGrad.addColorStop(1, theme.sideDark); 
        
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // 頂部描邊 (Rim)
        ctx.strokeStyle = theme.rim;
        ctx.lineWidth = 1.0;
        ctx.globalAlpha = 0.5;
        ctx.stroke();

        if (type === 'MAGMA') {
            SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', globalTime, 1.0);
        }
        
        ctx.restore();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        baseX: number, baseY: number, 
        height: number,
        type: string, 
        detailColor: string,
        q: number, r: number
    ) {
        // 裝飾物跟隨頂面高度
        const visualY = Math.floor(baseY) - Math.floor(height);
        if (type === 'FOREST' || type === 'VOID') {
            const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
            if (seed > 0.6) {
                SurfacePainter.drawDetailTexture(ctx, baseX, visualY, type, detailColor, seed);
            }
        }
    }
};
