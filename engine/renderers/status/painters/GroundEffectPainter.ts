
import { Agent } from "../../../../game";
import { ISO_SCALE_Y } from "../../../../../constants";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";

// 數學規範：CC 地面層偏置量
const CC_GROUND_BIAS = -5;

export const GroundEffectPainter = {
    /**
     * 繪製單位腳下的持續性 CC 特效
     * @param y 單位目前的視覺腳底高度 (含物理 Z)
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number) {
        // 1. 禁錮效果 (Root / Vines)
        if (agent.rootTimer > 0) {
            const color = '#fbbf24'; 
            ctx.save();
            ctx.translate(x, y + CC_GROUND_BIAS);
            
            // 幾何脈衝函數
            const pulse = 0.8 + Math.sin(t * 12) * 0.15;
            const r = 24 * pulse;

            // A. 底層能量環 (Vector Hex)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            HexGeometry.traceHex(ctx, 0, 0, r, true);
            ctx.stroke();

            // B. 3D 突刺 (幾何模擬)
            ctx.fillStyle = color;
            ctx.globalCompositeOperation = 'source-over';
            const count = 3;
            for(let i=0; i<count; i++) {
                const angle = i * (Math.PI*2/count) + t * 2;
                const sx = Math.cos(angle) * (r * 0.7);
                const sy = Math.sin(angle) * (r * 0.7) * ISO_SCALE_Y;
                
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx, sy - 20); // 垂直向上的幾何刺
                ctx.lineTo(sx + 5, sy + 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 2. 灼燒/DoT 地標 (Burn Ground)
        if (agent.dotTimer > 0 && agent.dotDmg > 0) {
            ctx.save();
            ctx.translate(x, y + CC_GROUND_BIAS + 1); // 再低 1px
            ctx.globalCompositeOperation = 'lighter';
            
            const r = 18 + Math.sin(t * 15) * 2;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            grad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.scale(1, ISO_SCALE_Y);
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }
};
