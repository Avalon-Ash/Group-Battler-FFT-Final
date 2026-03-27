
import { Agent } from "../../../../game";
import { Team, HexLayout } from "../../../../types";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const ShieldPainter = {
    /**
     * 繪製包裹單位的能量護盾
     * @param y 單位視覺中心 Y 軸
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number, layout: HexLayout) {
        if (agent.shield <= 0) return;

        const isBlue = agent.team === Team.BLUE;
        const color = isBlue ? '#60a5fa' : '#ef4444';
        
        // 護盾強度視覺映射
        const pct = Math.min(1, agent.shield / (agent.maxShield || 100));
        
        // Increased visibility: Base pulse 0.3 -> 0.5
        const pulse = 0.3 + (pct * 0.4) + Math.sin(t * 5) * 0.1;
        
        ctx.save();
        ctx.translate(x, y); 
        
        // 使用 3D 稜柱繪製體積感
        // 向上抬升一半高度以實現垂直居中
        const shieldH = 80;
        const shieldR = 38;
        
        ctx.globalCompositeOperation = 'screen';
        // [FIX] Pass layout to VolumePainter
        VolumePainter.draw3DPrism(ctx, 0, shieldH/2, shieldR, shieldH, color, pulse, 'GRADIENT_FADE', layout);
        
        // 邊緣掃描線 (TA 效果) - Enhanced with double scanlines
        ctx.strokeStyle = '#ffffff';
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
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, -shieldH/2, shieldR, shieldR*0.5, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, shieldH/2, shieldR, shieldR*0.5, 0, 0, Math.PI*2);
        ctx.stroke();

        ctx.restore();
    }
};
