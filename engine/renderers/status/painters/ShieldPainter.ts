
import { Agent } from "../../../../game";
import { Team } from "../../../../../types";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";

export const ShieldPainter = {
    /**
     * 繪製包裹單位的能量護盾
     * @param y 單位視覺中心 Y 軸
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number) {
        if (agent.shield <= 0) return;

        const isBlue = agent.team === Team.BLUE;
        const color = isBlue ? '#60a5fa' : '#ef4444';
        
        // 護盾強度視覺映射
        const pct = Math.min(1, agent.shield / (agent.maxShield || 100));
        
        // [VISUAL FIX] Reduced opacity significantly to avoid "Solid Block" look.
        // Now it looks like a holographic field.
        const pulse = 0.1 + (pct * 0.3) + Math.sin(t * 5) * 0.05;
        
        ctx.save();
        ctx.translate(x, y); 
        
        // 使用 3D 稜柱繪製體積感
        // 向上抬升一半高度以實現垂直居中
        const shieldH = 80;
        const shieldR = 38;
        
        ctx.globalCompositeOperation = 'screen';
        VolumePainter.draw3DPrism(ctx, 0, shieldH/2, shieldR, shieldH, color, pulse, 'GRADIENT_FADE');
        
        // 邊緣掃描線 (TA 效果) - Enhanced with double scanlines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        
        // Primary Scanline
        ctx.globalAlpha = pulse * 0.8;
        const scanLineY1 = (t * 120) % shieldH - shieldH/2;
        ctx.beginPath();
        ctx.moveTo(-shieldR * 0.9, scanLineY1);
        ctx.lineTo(shieldR * 0.9, scanLineY1);
        ctx.stroke();

        // Secondary Scanline (Offset, fainter)
        ctx.globalAlpha = pulse * 0.4;
        const scanLineY2 = ((t * 120 + shieldH * 0.5) % shieldH) - shieldH/2;
        ctx.beginPath();
        ctx.moveTo(-shieldR * 0.7, scanLineY2);
        ctx.lineTo(shieldR * 0.7, scanLineY2);
        ctx.stroke();
        
        ctx.restore();
    }
};
