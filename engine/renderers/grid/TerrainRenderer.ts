
import { ISO_SCALE_Y, BASE_HEIGHT, BLOCK_HEIGHT } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { HexLayout } from "../../../types";

// 唯一幾何補償常數
const WALL_SKIRT_PX = 1.5;   // 解決下層裂縫
const TOP_SHRINK_PX = 0.2;   // 防止相鄰頂面重疊產生的閃爍
const Z_FIGHTING_LIFT = -0.1; // 極微量抬升

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
        // 物理座標捨入對齊：確保所有瓦片在物理像素邊界上對齊
        const drawX = Math.floor(x);
        const drawY = Math.floor(y);
        const visualTopY = -Math.floor(height);
        
        const vertices = HexGeometry.getVertices(size, true, layout); 
        
        ctx.save();
        ctx.translate(drawX, drawY);

        // 1. 繪製側牆 (由下而上，增加重疊補償)
        if (layout === 'FLAT') {
            this.drawVerticalWall(ctx, vertices[1], vertices[0], visualTopY - WALL_SKIRT_PX, theme.sideDark);
            this.drawVerticalWall(ctx, vertices[2], vertices[1], visualTopY - WALL_SKIRT_PX, theme.sideLight);
            this.drawVerticalWall(ctx, vertices[3], vertices[2], visualTopY - WALL_SKIRT_PX, theme.sideDark);
        } else {
            // Pointy 佈局：繪製前方可見的兩個面
            this.drawVerticalWall(ctx, vertices[1], vertices[0], visualTopY - WALL_SKIRT_PX, theme.sideDark);
            this.drawVerticalWall(ctx, vertices[2], vertices[1], visualTopY - WALL_SKIRT_PX, theme.sideLight);
        }

        // 2. 繪製頂部六邊形面 (Top Surface)
        ctx.translate(0, visualTopY + Z_FIGHTING_LIFT);
        
        // 頂面渲染：微縮幾何 (收縮 0.2px) 杜絕邊緣爭奪
        const topSize = size - TOP_SHRINK_PX;
        const topVerts = HexGeometry.getVertices(topSize, true, layout);
        
        const topGrad = ctx.createLinearGradient(-size, -size, size, size);
        topGrad.addColorStop(0, theme.rim); 
        topGrad.addColorStop(0.5, theme.top);
        topGrad.addColorStop(1, theme.sideDark); 
        
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.moveTo(topVerts[0].x, topVerts[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(topVerts[i].x, topVerts[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // 強力外框 (Outline)：數學上強化塊體輪廓，視覺上遮蓋微小拼貼誤差
        ctx.strokeStyle = theme.sideDark;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;
        ctx.stroke();

        if (type === 'MAGMA') {
            SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', globalTime, 1.0);
        }
        
        ctx.restore();
    },

    drawVerticalWall(ctx: CanvasRenderingContext2D, v1: {x:number, y:number}, v2: {x:number, y:number}, topY: number, color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        // 矩形四點座標
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.lineTo(v2.x, v2.y + topY);
        ctx.lineTo(v1.x, v1.y + topY);
        
        // 底座補強：確保牆面深入地平線
        ctx.lineTo(v1.x, v1.y + BASE_HEIGHT + 2.0); 
        ctx.closePath();
        ctx.fill();
        
        // 側稜線 (Bevel): 強化塊體感，防止相鄰面融為一體
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v1.x, v1.y + topY);
        ctx.stroke();
    },

    drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        baseX: number, baseY: number, 
        height: number,
        type: string, 
        detailColor: string,
        q: number, r: number
    ) {
        // 裝飾物 Y 座標必須嚴格繼承捨入後的瓦片頂面高度
        const visualY = Math.floor(baseY) - Math.floor(height) + Z_FIGHTING_LIFT;
        if (type === 'FOREST' || type === 'VOID') {
            const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
            if (seed > 0.6) {
                SurfacePainter.drawDetailTexture(ctx, baseX, visualY, type, detailColor, seed);
            }
        }
    }
};
