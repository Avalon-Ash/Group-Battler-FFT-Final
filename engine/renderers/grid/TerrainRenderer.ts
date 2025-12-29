import { ISO_SCALE_Y, BASE_HEIGHT } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { HexLayout } from "../../../types";
const WALL_SLOP_EPSILON = 1.0; 
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
        const visualTopY = -height;
        const vertices = HexGeometry.getVertices(size, true, layout); 
        ctx.save();
        ctx.translate(x, y);
        if (layout === 'FLAT') {
            this.drawVerticalWall(ctx, vertices[1], vertices[0], visualTopY, theme.sideDark);
            this.drawVerticalWall(ctx, vertices[2], vertices[1], visualTopY, theme.sideLight);
            this.drawVerticalWall(ctx, vertices[3], vertices[2], visualTopY, theme.sideDark);
        } else {
            this.drawVerticalWall(ctx, vertices[1], vertices[0], visualTopY, theme.sideDark);
            this.drawVerticalWall(ctx, vertices[2], vertices[1], visualTopY, theme.sideLight);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(vertices[1].x, vertices[1].y);
            ctx.lineTo(vertices[1].x, vertices[1].y + visualTopY);
            ctx.stroke();
        }
        ctx.translate(0, visualTopY);
        const topGrad = ctx.createLinearGradient(-size, -size, size, size);
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
        ctx.strokeStyle = theme.rim;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        if (type === 'MAGMA') {
            SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', globalTime, 1.0);
        }
        ctx.restore();
    },
    drawVerticalWall(ctx: CanvasRenderingContext2D, vBottom1: {x:number, y:number}, vBottom2: {x:number, y:number}, topY: number, color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(vBottom1.x, vBottom1.y);
        ctx.lineTo(vBottom2.x, vBottom2.y);
        ctx.lineTo(vBottom2.x, vBottom2.y + topY);
        ctx.lineTo(vBottom1.x, vBottom1.y + topY);
        ctx.lineTo(vBottom1.x, vBottom1.y + BASE_HEIGHT + WALL_SLOP_EPSILON);
        ctx.lineTo(vBottom2.x, vBottom2.y + BASE_HEIGHT + WALL_SLOP_EPSILON);
        ctx.lineTo(vBottom2.x, vBottom2.y); 
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(vBottom1.x, vBottom1.y + topY); 
        ctx.lineTo(vBottom1.x, vBottom1.y + BASE_HEIGHT); 
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
        const visualY = baseY - height;
        if (type === 'FOREST' || type === 'VOID') {
            const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
            if (seed > 0.6) {
                SurfacePainter.drawDetailTexture(ctx, baseX, visualY, type, detailColor, seed);
            }
        }
    }
};