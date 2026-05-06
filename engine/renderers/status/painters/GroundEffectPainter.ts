
import { Agent } from "../../../game";
import { ISO_SCALE_Y, DOT_COLORS } from "../../../../constants";
import { VolumePainter } from "../../../graphics/painters/VolumePainter";
import { HexGeometry } from "../../../graphics/utils/HexGeometry";
import { HexLayout } from "../../../../types";
import { STATUS_VISUALS } from "../../../../data/vfx/status_visuals";

// 數學規範：CC 地面層偏置量
const CC_GROUND_BIAS = -5;

export const GroundEffectPainter = {
    /**
     * 繪製單位身上的持續性 CC 特效 (地面 -> 身體)
     * @param y 單位目前的視覺腳底高度 (含物理 Z)
     */
    draw(ctx: CanvasRenderingContext2D, agent: Agent, x: number, y: number, t: number, layout: HexLayout) {
        const groundY = y + CC_GROUND_BIAS;

        // 1. 禁錮效果 (Root / Vines)
        if (agent.rootTimer > 0) {
            const color = '#fbbf24'; 
            ctx.save();
            ctx.translate(x, groundY);
            
            const pulse = 0.8 + Math.sin(t * 12) * 0.15;
            const r = 24 * pulse;

            // A. 底層能量環
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            // [FIX] Use layout
            HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
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
                ctx.lineTo(sx, sy - 25); 
                ctx.lineTo(sx + 6, sy + 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 2. 持續傷害 (DoT) - 顯眼的上升氣流
        if (agent.dotTimer > 0 && agent.dotDmg > 0) {
            // Determine color based on hazard guessing (Green for generic/poison, Red for fire)
            const color = (DOT_COLORS as any)[agent.dotType] || '#a3e635'; 
            const secondary = agent.dotType === 'BURN' ? '#991b1b' : '#4d7c0f';

            ctx.save();
            ctx.translate(x, groundY);
            
            // Floor Puddle
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = secondary;
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); 
            ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI*2); 
            ctx.fill();

            // Rising Fumes (Vertical Lines around body)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.globalCompositeOperation = 'screen';
            
            const strands = 4;
            const height = 60;
            
            for(let i=0; i<strands; i++) {
                const offset = i * (Math.PI * 2 / strands);
                const loopT = (t * 2 + offset) % 1; // 0 to 1
                const curH = loopT * height;
                const fade = Math.sin(loopT * Math.PI); // Fade in/out
                
                const wave = Math.sin(t * 5 + curH * 0.1) * 5;
                const rx = Math.cos(offset) * 15 + wave;
                const ry = Math.sin(offset) * 15 * ISO_SCALE_Y;

                ctx.globalAlpha = fade;
                ctx.beginPath();
                ctx.moveTo(rx, ry - curH);
                ctx.lineTo(rx, ry - curH - 15); // Length of fume
                ctx.stroke();
            }
            ctx.restore();
        }

        // 3. 持續恢復 (HoT) - 上升十字/光點
        if (agent.hotTimer > 0) {
            const color = '#86efac'; // Bright Green/Mint
            
            ctx.save();
            ctx.translate(x, groundY);
            
            // Floor Glow
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath(); ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI*2); ctx.fill();

            // Spiraling Energy
            const particles = 3;
            const height = 70;
            
            for(let i=0; i<particles; i++) {
                const offset = i * (Math.PI * 2 / particles);
                const loopT = (t * 1.5 + offset) % 1;
                const curH = loopT * height;
                const fade = 1.0 - Math.pow(Math.abs(loopT - 0.5) * 2, 2); // Smooth bell curve fade
                
                const angle = t * 4 + curH * 0.1;
                const radius = 20 * (1 - loopT * 0.5); // Taper in
                
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius * ISO_SCALE_Y;

                ctx.globalAlpha = fade;
                ctx.fillStyle = color;
                
                // Draw Plus Sign or Dot
                ctx.save();
                ctx.translate(px, py - curH);
                ctx.fillRect(-2, -6, 4, 12);
                ctx.fillRect(-6, -2, 12, 4);
                ctx.restore();
            }
            ctx.restore();
        }

        // 4. POLYMORPH / FROZEN 地板光暈
        if (agent.visualStatus === 'POLYMORPH' || agent.visualStatus === 'FROZEN') {
            const def = STATUS_VISUALS[agent.visualStatus];
            if (def && def.floorColor) {
                ctx.save();
                ctx.translate(x, groundY);
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = def.floorColor;
                ctx.beginPath();
                ctx.ellipse(0, 0, 24, 12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }
};
