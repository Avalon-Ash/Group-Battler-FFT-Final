import { ISO_SCALE_Y } from "../../../constants";
import { HexLayout } from "../../../types";

/**
 * 核心六邊形幾何真理 (Single Source of Truth) - V3.6 TA Corrected
 */
export const HexGeometry = {
    getVertices(radius: number, applyIso: boolean = true, layout: HexLayout = 'FLAT'): {x: number, y: number}[] {
        const vertices = [];
        const baseStartAngle = layout === 'FLAT' ? 0 : Math.PI / 6;
        const scaleY = applyIso ? ISO_SCALE_Y : 1.0;
        for (let i = 0; i < 6; i++) {
            const angle = baseStartAngle + i * Math.PI / 3;
            vertices.push({ 
                x: Math.cos(angle) * radius, 
                y: Math.sin(angle) * radius * scaleY 
            });
        }
        return vertices;
    },

    traceHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, applyIso: boolean = true, layout: HexLayout = 'FLAT') {
        const verts = this.getVertices(radius, applyIso, layout);
        ctx.beginPath();
        ctx.moveTo(x + verts[0].x, y + verts[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(x + verts[i].x, y + verts[i].y);
        }
        ctx.closePath();
    },

    /**
     * 向量旋轉繪製 - TA 修正版：確保先旋轉再投影
     */
    traceRotatedHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number, applyIso: boolean = true, layout: HexLayout = 'FLAT') {
        // 1. 取得原始平面的頂點 (applyIso = false)
        const baseVerts = this.getVertices(radius, false, layout);
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const scaleY = applyIso ? ISO_SCALE_Y : 1.0;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const vx = baseVerts[i].x;
            const vy = baseVerts[i].y;
            
            // 2. 進行二維旋轉矩陣運算
            const rx = vx * cosR - vy * sinR;
            const ry = vx * sinR + vy * cosR;
            
            // 3. 最後應用等角 Y 軸壓縮
            const px = x + rx;
            const py = y + ry * scaleY;
            
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }
};