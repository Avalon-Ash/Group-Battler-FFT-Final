
import { RenderOp } from "./RenderList";
import { AssetManager } from "../assets";

/**
 * 飛行物視覺呈現器 v14.0 - TA Visual Polish
 */
export const ProjectileDrawer = {
    draw(ctx: CanvasRenderingContext2D, op: RenderOp, globalTime: number) {
        const { pVisX: x, pVisY: y, pColor: color, pAngle: angle, pTrail: trail } = op;

        // 1. 渲染能量尾跡 (Analytic Gradient Trail)
        if (trail && trail.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath();
            ctx.moveTo(x, y);
            
            for (let i = 0; i < trail.length; i++) {
                ctx.lineTo(trail[i].x, trail[i].y);
            }

            const trailGrad = ctx.createLinearGradient(x, y, trail[trail.length-1].x, trail[trail.length-1].y);
            trailGrad.addColorStop(0, color);
            trailGrad.addColorStop(1, 'transparent');

            // Ult trails are thicker
            ctx.strokeStyle = trailGrad;
            ctx.lineWidth = (op.pIsUlt ? 12 : 6) * op.pScale;
            ctx.globalAlpha = 0.8;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }

        // 2. 主體精靈渲染
        ctx.save();
        ctx.translate(x, y);
        
        // 運動模糊模擬
        const stretch = op.pIsUlt ? 1.2 : 1.05; 
        
        if (op.pSpin !== 0) {
            ctx.rotate(op.pSpin);
        } else {
            ctx.rotate(angle);
            ctx.scale(stretch, 1.0 / stretch); 
        }

        const img = AssetManager.getProjectile(op.pSkillVis, color);
        
        // Force minimum visibility scale
        const baseScale = Math.max(1.3, op.pScale || 1.2);
        const finalScale = (op.pIsUlt ? 1.5 : 1.0) * baseScale;

        if (img) {
            // 底層：基礎色
            ctx.globalAlpha = 1.0;
            ctx.drawImage(img, -32 * finalScale, -32 * finalScale, 64 * finalScale, 64 * finalScale);
            
            // 頂層：動態發光 (Additive Pulse)
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.6 + Math.sin(globalTime * 20) * 0.2;
            ctx.drawImage(img, -36 * finalScale, -36 * finalScale, 72 * finalScale, 72 * finalScale);
        } else {
            // Fallback rendering
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(0,0, 15 * finalScale, 0, Math.PI*2); ctx.fill();
        }
        
        ctx.restore();

        // 3. 亮點補償 (所有子彈都有核心高光)
        ctx.save();
        ctx.translate(x, y);
        ctx.globalCompositeOperation = 'screen';
        const flare = ctx.createRadialGradient(0,0,0, 0,0, 40 * op.pScale);
        flare.addColorStop(0, '#fff');
        flare.addColorStop(0.3, color);
        flare.addColorStop(1, 'transparent');
        ctx.fillStyle = flare;
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(0,0, 20 * op.pScale, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
};
