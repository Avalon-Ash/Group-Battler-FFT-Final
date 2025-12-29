import { RenderOp } from "./RenderList";
import { AssetManager } from "../assets";

export const ProjectileDrawer = {
    draw(ctx: CanvasRenderingContext2D, op: RenderOp, globalTime: number) {
        const isRay = op.pSkillVis === 'BEAM'; 
        
        // 1. 光束類渲染 (Beams)
        if (isRay && op.pTrail && op.pTrail.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen'; 
            
            const start = op.pTrail[op.pTrail.length - 1]; 
            const end = { x: op.pVisX, y: op.pVisY };
            
            // 外層光暈
            ctx.shadowColor = op.pColor;
            ctx.shadowBlur = op.pIsUlt ? 30 : 15;
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = op.pIsUlt ? 16 : 8;
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();

            // 內層核心 (純白)
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = op.pIsUlt ? 6 : 3;
            ctx.globalAlpha = 1.0;
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();

            // 頭部閃光
            ctx.translate(end.x, end.y);
            const pulse = 1.0 + Math.sin(globalTime * 30) * 0.2;
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.arc(0, 0, (op.pIsUlt ? 12 : 6) * pulse, 0, Math.PI*2); ctx.fill();
            
            ctx.restore();
            return;
        }

        // 2. 一般飛行物渲染 (Sprites + Trails)
        if (op.pTrail && op.pTrail.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath();
            const trail = op.pTrail;
            ctx.moveTo(trail[0].x, trail[0].y);
            for(let i=1; i<trail.length; i++) {
                const alpha = (i / trail.length) * 0.5;
                ctx.globalAlpha = alpha;
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.restore();
        }

        // 飛行物本體
        ctx.save();
        ctx.translate(Math.round(op.pVisX), Math.round(op.pVisY));
        if (op.pSpin !== 0) ctx.rotate(op.pSpin); 
        else ctx.rotate(op.pAngle);
        
        const img = AssetManager.getProjectile(op.pSkillVis, op.pColor);
        if (img && img.width > 0) {
            const scale = op.pIsUlt ? 1.8 : 1.2;
            ctx.scale(scale, scale);
            
            // 渲染兩次：一次色彩混合，一次發光
            ctx.globalAlpha = 1.0;
            ctx.drawImage(img, -48, -32, 96, 64);
            
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.7;
            ctx.drawImage(img, -48, -32, 96, 64);
        }
        ctx.restore();
    }
};