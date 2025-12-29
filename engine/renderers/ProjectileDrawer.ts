
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

            ctx.strokeStyle = trailGrad;
            ctx.lineWidth = op.pIsUlt ? 8 : 3;
            ctx.globalAlpha = 0.6;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }

        // 2. 主體精靈渲染
        ctx.save();
        ctx.translate(x, y);
        
        // 運動模糊模擬：根據速度向量進行視覺拉伸 (SSOT: 此處假設速度影響拉伸)
        const stretch = op.pIsUlt ? 1.5 : 1.15;
        if (op.pSpin !== 0) {
            ctx.rotate(op.pSpin);
        } else {
            ctx.rotate(angle);
            ctx.scale(stretch, 1.0 / stretch); // 體積守恆拉伸
        }

        const img = AssetManager.getProjectile(op.pSkillVis, color);
        if (img) {
            const scale = op.pIsUlt ? 1.8 : 1.2;
            
            // 底層：基礎色
            ctx.globalAlpha = 1.0;
            ctx.drawImage(img, -32 * scale, -32 * scale, 64 * scale, 64 * scale);
            
            // 頂層：動態發光 (Additive Pulse)
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.4 + Math.sin(globalTime * 20) * 0.2;
            ctx.drawImage(img, -36 * scale, -36 * scale, 72 * scale, 72 * scale);
        }
        
        ctx.restore();

        // 3. 亮點補償 (奧義專用)
        if (op.pIsUlt) {
            ctx.save();
            ctx.translate(x, y);
            ctx.globalCompositeOperation = 'screen';
            const flare = ctx.createRadialGradient(0,0,0, 0,0, 40);
            flare.addColorStop(0, '#fff');
            flare.addColorStop(0.3, color);
            flare.addColorStop(1, 'transparent');
            ctx.fillStyle = flare;
            ctx.beginPath(); ctx.arc(0,0, 40, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }
};
