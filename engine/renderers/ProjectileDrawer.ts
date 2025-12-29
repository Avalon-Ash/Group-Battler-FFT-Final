import { RenderOp } from "./RenderList";
import { AssetManager } from "../assets";

export const ProjectileDrawer = {
    draw(ctx: CanvasRenderingContext2D, op: RenderOp, globalTime: number) {
        const isRay = op.pSkillVis === 'BEAM'; 
        
        if (isRay && op.pTrail && op.pTrail.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen'; 
            
            const start = op.pTrail[op.pTrail.length - 1]; 
            const end = { x: op.pVisX, y: op.pVisY };
            
            ctx.shadowColor = op.pColor;
            ctx.shadowBlur = op.pIsUlt ? 25 : 15;
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = op.pIsUlt ? 20 : 10;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.shadowBlur = 0;

            const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.2, op.pColor);
            grad.addColorStop(0.5, '#ffffff'); 
            grad.addColorStop(1, '#ffffff'); 

            ctx.strokeStyle = grad;
            ctx.lineWidth = op.pIsUlt ? 8 : 4;
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
            ctx.stroke();

            ctx.translate(end.x, end.y);
            const pulse = 1.0 + Math.sin(globalTime * 25) * 0.3;
            const headSize = (op.pIsUlt ? 16 : 8) * pulse;
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, 0, headSize, 0, Math.PI*2); ctx.fill();
            
            ctx.restore();
            return;
        }

        if (op.pTrail && op.pTrail.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath();
            const trail = op.pTrail;
            ctx.moveTo(trail[0].x, trail[0].y);
            for(let i=1; i<trail.length; i++) {
                const alpha = (i / trail.length) * 0.6;
                ctx.globalAlpha = alpha;
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = 5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.shadowColor = op.pColor;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.restore();
        }

        const shadowAltitude = op.pVisShadowY - op.pVisY; 
        if (Math.abs(shadowAltitude) > 5) {
            ctx.save();
            ctx.translate(Math.round(op.pVisX), Math.round(op.pVisShadowY));
            const shadowAlpha = Math.max(0, 0.3 - Math.abs(shadowAltitude)/1500);
            ctx.scale(1, 0.5); 
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(Math.round(op.pVisX), Math.round(op.pVisY));
        if (op.pSpin !== 0) ctx.rotate(op.pSpin); 
        else ctx.rotate(op.pAngle);
        
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = op.pColor;
        ctx.beginPath();
        ctx.moveTo(35, 0); ctx.lineTo(-20, -25); ctx.lineTo(-5, 0); ctx.lineTo(-20, 25);
        ctx.fill();
        ctx.restore();

        const img = AssetManager.getProjectile(op.pSkillVis, op.pColor);
        if (img && img.width > 0) {
            const scale = op.pIsUlt ? 1.8 : 1.2;
            ctx.scale(scale, scale);
            ctx.drawImage(img, -48, -32, 96, 64);
            
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.8;
            ctx.drawImage(img, -48, -32, 96, 64);
        }
        ctx.restore();
    }
};