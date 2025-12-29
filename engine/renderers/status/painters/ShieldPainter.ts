
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
        const pulse = 0.2 + (pct * 0.4) + Math.sin(t * 5) * 0.1;
        
        ctx.save();
        ctx.translate(x, y); 
        
        // 使用 3D 稜柱繪製體積感
        // 向上抬升一半高度以實現垂直居中
        const shieldH = 80;
        const shieldR = 38;
        
        ctx.globalCompositeOperation = 'screen';
        VolumePainter.draw3DPrism(ctx, 0, shieldH/2, shieldR, shieldH, color, pulse, 'SOLID');
        
        // 邊緣掃描線 (TA 效果)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = pulse * 0.5;
        const scanLineY = (t * 100) % shieldH - shieldH/2;
        ctx.beginPath();
        ctx.moveTo(-shieldR * 0.8, scanLineY);
        ctx.lineTo(shieldR * 0.8, scanLineY);
        ctx.stroke();
        
        ctx.restore();
    }
};
