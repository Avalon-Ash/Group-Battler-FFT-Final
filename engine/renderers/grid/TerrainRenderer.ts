
import { ISO_SCALE_Y, BASE_HEIGHT, BLOCK_HEIGHT, HEX_SIZE } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { HexLayout } from "../../../types";

// 幾何常數
const PEDESTAL_DEPTH = 30; 
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
        // 1. 物理座標取整
        const drawX = Math.floor(x);
        
        // 2. 呼吸戰場算法 (Biome Selective)
        const isFloatingBiome = type === 'VOID' || type === 'MAGMA';
        
        let floatOffset = 0;
        if (isFloatingBiome) {
            floatOffset = Math.sin(globalTime * 1.5 + (x * 0.01) + (y * 0.01)) * 4;
        }
        
        // 3. 視覺頂面 Y 軸 (相對於 drawY)
        const visualTopY = -Math.floor(height) + floatOffset;
        const drawY = Math.floor(y);
        
        // 膨脹幾何半徑
        const r = size + EXPANSION_BIAS;
        const vertices = HexGeometry.getVertices(r, true, layout); 
        
        ctx.save();
        ctx.translate(drawX, drawY);

        // 4. 繪製基座與側牆 (Pedestal & Walls)
        const drawFace = (idx1: number, idx2: number, color: string, isLightSide: boolean) => {
            const v1 = vertices[idx1];
            const v2 = vertices[idx2];
            
            // 漸層側牆 (增加立體感)
            const grad = ctx.createLinearGradient(0, visualTopY, 0, PEDESTAL_DEPTH);
            grad.addColorStop(0, color);
            grad.addColorStop(1, isLightSide ? theme.sideDark : '#020617'); // 底部漸黑，融入背景

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y + visualTopY); // Top-Left
            ctx.lineTo(v2.x, v2.y + visualTopY); // Top-Right
            ctx.lineTo(v2.x, v2.y + PEDESTAL_DEPTH); // Bottom-Right (Deep)
            ctx.lineTo(v1.x, v1.y + PEDESTAL_DEPTH); // Bottom-Left (Deep)
            ctx.closePath();
            ctx.fill();
            
            // 側邊高光稜線 (Rim Light)
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y + visualTopY);
            ctx.lineTo(v1.x, v1.y + PEDESTAL_DEPTH);
            ctx.stroke();
            
            // 頂部接縫高光
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y + visualTopY);
            ctx.lineTo(v2.x, v2.y + visualTopY);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.stroke();
        };

        if (layout === 'FLAT') {
            drawFace(1, 0, theme.sideDark, false);  // Right-Bottom
            drawFace(2, 1, theme.sideLight, true); // Bottom (Lightest)
            drawFace(3, 2, theme.sideDark, false);  // Left-Bottom
        } else {
            drawFace(1, 0, theme.sideDark, false);  // Right Side
            drawFace(2, 1, theme.sideLight, true); // Left Side
        }

        // 5. 繪製頂部 (Top Cap)
        ctx.translate(0, visualTopY);
        
        // 頂面材質光澤
        const topGrad = ctx.createLinearGradient(-r, -r, r, r);
        topGrad.addColorStop(0, theme.rim); 
        topGrad.addColorStop(0.3, theme.top);
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
        ctx.lineWidth = 1.5; // 加粗一點
        ctx.globalAlpha = 0.6;
        ctx.stroke();

        // 6. 特殊地表 (岩漿流動)
        if (type === 'MAGMA') {
            SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', globalTime, 1.0, layout);
        }
        
        ctx.restore();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        baseX: number, baseY: number, 
        height: number,
        type: string, 
        detailColor: string, // Usually theme.detail
        q: number, r: number,
        globalTime: number = 0,
        layout: HexLayout = 'FLAT',
        theme: any // Pass full theme for access to sideDark/rim if needed
    ) {
        // Biome Check for details too
        const isFloatingBiome = type === 'VOID' || type === 'MAGMA';
        
        let floatOffset = 0;
        if (isFloatingBiome) {
            floatOffset = Math.sin(globalTime * 1.5 + (baseX * 0.01) + (baseY * 0.01)) * 4;
        }
        
        const visualY = Math.floor(baseY) - Math.floor(height) + floatOffset;
        
        if (type === 'FOREST') {
            // Procedural Grass
            // [VISUAL UPDATE] Use theme.top to blend seamlessly with the block face.
            // SurfacePainter handles the shadowing/variation to make it visible.
            SurfacePainter.drawGrass(ctx, baseX, visualY, theme.top || '#14532d', 5, globalTime);
        } else if (type === 'ICE') {
            // Specular Ice
            SurfacePainter.drawIceSheen(ctx, baseX, visualY, HEX_SIZE, globalTime, layout);
        } else if (type === 'DESERT') {
            // Sand Ripples
            SurfacePainter.drawSandRipples(ctx, baseX, visualY, HEX_SIZE, theme.sideDark || '#92400e');
        } else if (type === 'VOID') {
            const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
            if (seed > 0.6) {
                SurfacePainter.drawDetailTexture(ctx, baseX, visualY, type, detailColor, seed);
            }
        }
    }
};
