import { Agent } from "../../../game";
import { HexLayout } from "../../../../types";
import { getFactionSkin } from "../../../../data/units/factionSkin";
import { SHIELD_VISUAL, UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET } from "../../../../constants";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";
import { SpriteUnitRenderer } from "../../units/factions/SpriteUnitRenderer";
import { STATUS_VISUALS } from "../../../../data/vfx/status_visuals";

export interface ShieldGeometry {
    /** 稜柱總高度（螢幕單位） */
    height: number;
    /** 稜柱中心相對 body center Y 的垂直位移（正值＝往下），使稜柱底部貼齊腳底 */
    centerOffsetY: number;
}

/**
 * 依角色頭頂高度計算護盾稜柱幾何（純函式，便於測試）。
 * @param headHeight 腳底到頭頂的螢幕高度；null 表示圖集未就緒，退回 SHIELD_VISUAL.height
 */
export function computeShieldGeometry(headHeight: number | null): ShieldGeometry {
    const height = headHeight === null ? SHIELD_VISUAL.height : headHeight + SHIELD_VISUAL.headMargin;
    const feetDropY = UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET;
    return { height, centerOffsetY: feetDropY - height / 2 };
}

export const ShieldPainter = {
    /**
     * 繪製包裹單位的能量護盾
     * @param y 單位視覺中心 Y 軸
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number, layout: HexLayout) {
        if (agent.shield <= 0) return;

        const shieldDef = STATUS_VISUALS['SHIELD'];
        
        // Task C1: 主色讀 STATUS_VISUALS，team 色用於描邊
        const baseColor = shieldDef?.primaryColor || '#bae6fd';
        const teamColor = getFactionSkin(agent.team).shield.strokeColor;
        
        // 護盾強度視覺映射
        const pct = Math.min(1, agent.shield / (agent.maxShield || 100));
        
        // Increased visibility: Base pulse 0.3 -> 0.5
        const pulse = 0.3 + (pct * 0.4) + Math.sin(t * 5) * 0.1;
        
        ctx.save();

        // 護盾高度＝角色頭頂高度＋餘裕，底部貼齊腳底；y 為 body center（已含飛行升空），
        // 所以飛行單位的護盾會自動跟著升空，不需額外處理。
        const geometry = computeShieldGeometry(SpriteUnitRenderer.getHeadHeight(agent));
        const shieldH = geometry.height;
        const shieldR = SHIELD_VISUAL.radius;
        ctx.translate(x, y + geometry.centerOffsetY);

        // 使用 3D 稜柱繪製體積感（以稜柱中心為原點）
        ctx.globalCompositeOperation = 'screen';
        // [FIX] Pass layout to VolumePainter
        VolumePainter.draw3DPrism(ctx, 0, shieldH/2, shieldR, shieldH, baseColor, pulse, 'GRADIENT_FADE', layout);
        
        // 邊緣掃描線 (TA 效果) - Enhanced with double scanlines
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 2; // Thicker lines
        
        // Primary Scanline
        ctx.globalAlpha = Math.min(1, pulse * 1.2);
        const scanLineY1 = (t * 120) % shieldH - shieldH/2;
        ctx.beginPath();
        ctx.moveTo(-shieldR * 0.9, scanLineY1);
        ctx.lineTo(shieldR * 0.9, scanLineY1);
        ctx.stroke();

        // Secondary Scanline (Offset, fainter)
        ctx.globalAlpha = Math.min(1, pulse * 0.6);
        const scanLineY2 = ((t * 120 + shieldH * 0.5) % shieldH) - shieldH/2;
        ctx.beginPath();
        ctx.moveTo(-shieldR * 0.7, scanLineY2);
        ctx.lineTo(shieldR * 0.7, scanLineY2);
        ctx.stroke();
        
        // Shield Top/Bottom Caps for definition
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        ctx.strokeStyle = teamColor;
        ctx.beginPath();
        ctx.ellipse(0, -shieldH/2, shieldR, shieldR*0.5, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, shieldH/2, shieldR, shieldR*0.5, 0, 0, Math.PI*2);
        ctx.stroke();

        ctx.restore();
    }
};
