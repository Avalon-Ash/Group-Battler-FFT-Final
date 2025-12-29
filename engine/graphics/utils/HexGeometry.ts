
import { ISO_SCALE_Y } from "../../../constants";
import { HexLayout } from "../../../types";

/**
 * 核心六邊形幾何真理 (Single Source of Truth) - V3.5 Physics Corrected
 * 修正了旋轉物體在 ISO 視角下變形的問題。
 */
export const HexGeometry = {
    
    /**
     * 獲取標準化頂點
     * @param radius 半徑
     * @param applyIso 是否應用 2.5D 壓扁
     * @param layout 佈局模式 (FLAT | POINTY)
     */
    getVertices(radius: number, applyIso: boolean = true, layout: HexLayout = 'FLAT'): {x: number, y: number}[] {
        const vertices = [];
        // FLAT: 頂部平坦, 起始 0 度 | POINTY: 頂部尖銳, 起始 30 度
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

    /**
     * 在 Context 上描繪標準路徑
     */
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
     * 向量旋轉繪製 - 物理正確版
     * 先在邏輯平面 (Top Down) 旋轉，再進行 ISO 投影。
     * 這保證了圓形/六邊形在旋轉時，永遠貼合地面透視，不會變成奇怪的扭動橢圓。
     */
    traceRotatedHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rotation: number, applyIso: boolean = true, layout: HexLayout = 'FLAT') {
        // 1. Get RAW vertices (No ISO scale yet)
        const verts = this.getVertices(radius, false, layout);
        
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const scaleY = applyIso ? ISO_SCALE_Y : 1.0;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const vx = verts[i].x;
            const vy = verts[i].y;
            
            // 2. Rotate on 2D Plane (XZ Logic)
            const rx = vx * cosR - vy * sinR;
            const ry = vx * sinR + vy * cosR;
            
            // 3. Apply ISO Projection (Squash Y)
            const projectedX = rx;
            const projectedY = ry * scaleY;

            if (i === 0) ctx.moveTo(x + projectedX, y + projectedY);
            else ctx.lineTo(x + projectedX, y + projectedY);
        }
        ctx.closePath();
    }
};
