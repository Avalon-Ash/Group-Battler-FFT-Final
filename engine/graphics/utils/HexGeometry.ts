import { ISO_SCALE_Y } from "../../../constants";
import { HexLayout } from "../../../types";

/**
 * 核心六邊形幾何真理 (Single Source of Truth) - V3.6 TA Corrected
 */
export const HexGeometry = {
    /**
     * 版面 → 六角頂點起始角（弧度）：FLAT 平頂為 0（頂點在左右），POINTY 尖頂為 π/6（頂點在上下）。
     * 所有「要和地圖格同向」的六角（地形、覆蓋層、地面特效、預烘焙零件）都以此為唯一來源。
     */
    layoutAngle(layout: HexLayout): number {
        return layout === 'FLAT' ? 0 : Math.PI / 6;
    },

    /**
     * 以起始角 bakedAngle 預先畫好的六角圖（零件 sprite、材質貼圖）要在地面平面上旋轉多少才會與 layout 的格子同向。
     * 旋轉須在 ISO_SCALE_Y 壓扁之前套用（先在地面旋轉再投影）。六角每 60° 對稱，所以 FLAT 烘焙的圖在 FLAT 地圖上恆為 0。
     */
    alignRotation(layout: HexLayout, bakedAngle: number = 0): number {
        return HexGeometry.layoutAngle(layout) - bakedAngle;
    },

    getVertices(radius: number, applyIso: boolean = true, layout: HexLayout = 'FLAT'): {x: number, y: number}[] {
        const vertices = [];
        const baseStartAngle = HexGeometry.layoutAngle(layout);
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

    /**
     * 取得旋轉並投影後的頂點座標
     */
    getRotatedVertices(radius: number, rotation: number, applyIso: boolean = true, layout: HexLayout = 'FLAT'): {x: number, y: number}[] {
        const baseVerts = this.getVertices(radius, false, layout);
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const scaleY = applyIso ? ISO_SCALE_Y : 1.0;
        
        return baseVerts.map(v => ({
            x: v.x * cosR - v.y * sinR,
            y: (v.x * sinR + v.y * cosR) * scaleY
        }));
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