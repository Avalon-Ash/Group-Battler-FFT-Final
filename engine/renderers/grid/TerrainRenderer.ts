import { ISO_SCALE_Y, HEX_SIZE } from "../../../constants";
import { HexGeometry } from "../../graphics/utils/HexGeometry";
import { SurfacePainter } from "../../graphics/painters/SurfacePainter";
import { HexLayout } from "../../../types";
import { VisualMath } from "../../math/VisualMath";

const PEDESTAL_DEPTH = 45; 
const EXPANSION_BIAS = 0.6;

export const TerrainRenderer = {
    drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, height: number, theme: any, type: string, globalTime: number, layout: HexLayout, alpha: number = 1.0) {
        const drawX = Math.floor(x);
        const isFloatingBiome = type === 'VOID' || type === 'MAGMA';
        let floatOffset = 0;
        if (isFloatingBiome) floatOffset = Math.sin(globalTime * 1.5 + (x * 0.01) + (y * 0.01)) * 4;
        
        // 強制遵照 SSOT 投影公式，將呼吸動畫作為 Z 軸偏移的一部分
        const visualTopY = VisualMath.getIsoVisualY(0, height, floatOffset);
        const drawY = Math.floor(y);
        const r = size + EXPANSION_BIAS;
        const vertices = HexGeometry.getVertices(r, true, layout); 
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(drawX, drawY);

        // Dynamic pedestal depth based on height to emphasize verticality
        const currentPedestalDepth = Math.max(PEDESTAL_DEPTH, -visualTopY + 15);

        const drawFace = (idx1: number, idx2: number, color: string, isLightSide: boolean) => {
            const v1 = vertices[idx1], v2 = vertices[idx2];
            if (Number.isFinite(visualTopY)) {
                const grad = ctx.createLinearGradient(0, visualTopY, 0, currentPedestalDepth);
                grad.addColorStop(0, color);
                grad.addColorStop(1, isLightSide ? theme.sideDark : '#020617');
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = color;
            }
            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y + visualTopY);
            ctx.lineTo(v2.x, v2.y + visualTopY);
            ctx.lineTo(v2.x, v2.y + currentPedestalDepth);
            ctx.lineTo(v1.x, v1.y + currentPedestalDepth);
            ctx.closePath();
            ctx.fill();
        };

        if (layout === 'FLAT') {
            drawFace(1, 0, theme.sideDark, false);
            drawFace(2, 1, theme.sideLight, true);
            drawFace(3, 2, theme.sideDark, false);
        } else {
            drawFace(1, 0, theme.sideDark, false);
            drawFace(2, 1, theme.sideLight, true);
        }

        ctx.translate(0, visualTopY);
        if (Number.isFinite(r)) {
            const topGrad = ctx.createLinearGradient(-r, -r, r, r);
            topGrad.addColorStop(0, theme.rim); 
            topGrad.addColorStop(0.3, theme.top);
            topGrad.addColorStop(1, theme.sideDark); 
            ctx.fillStyle = topGrad;
        } else {
            ctx.fillStyle = theme.top;
        }
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(vertices[i].x, vertices[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = theme.rim;
        ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; ctx.stroke();
        if (type === 'MAGMA') SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', globalTime, 1.0, layout);
        ctx.restore();
    },

    drawTerrainDetail(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, height: number, type: string, detailColor: string, q: number, r: number, globalTime: number = 0, layout: HexLayout = 'FLAT', theme: any, alpha: number = 1.0) {
        const isFloatingBiome = type === 'VOID' || type === 'MAGMA';
        let floatOffset = 0;
        if (isFloatingBiome) floatOffset = Math.sin(globalTime * 1.5 + (baseX * 0.01) + (baseY * 0.01)) * 4;
        
        const visualY = VisualMath.getIsoVisualY(baseY, height, floatOffset);
        ctx.save();
        ctx.globalAlpha = alpha;
        if (type === 'FOREST') SurfacePainter.drawGrass(ctx, baseX, visualY, theme.top || '#14532d', 5, globalTime);
        else if (type === 'ICE') SurfacePainter.drawIceSheen(ctx, baseX, visualY, HEX_SIZE, globalTime, layout);
        else if (type === 'DESERT') SurfacePainter.drawSandRipples(ctx, baseX, visualY, HEX_SIZE, theme.sideDark || '#92400e');
        else if (type === 'VOID') {
            const seed = Math.abs(Math.sin(q * 12.9898 + r * 78.233));
            if (seed > 0.6) SurfacePainter.drawDetailTexture(ctx, baseX, visualY, type, detailColor, seed);
        }
        ctx.restore();
    }
};