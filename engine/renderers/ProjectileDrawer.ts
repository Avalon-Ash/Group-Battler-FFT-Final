
import { RenderOp } from "./RenderList";
import { AssetManager } from "../assets";

export const ProjectileDrawer = {
    draw(ctx: CanvasRenderingContext2D, op: RenderOp, globalTime: number) {
        // --- VECTOR BEAM REFACTOR (Moving High-Speed Projectiles) ---
        const isRay = op.pSkillVis === 'BEAM'; 
        
        if (isRay && op.pTrail && op.pTrail.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            
            const start = op.pTrail[op.pTrail.length - 1]; 
            const end = { x: op.pVisX, y: op.pVisY };
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            const angle = Math.atan2(dy, dx);

            // 1. Energetic Core Beam
            const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.2, op.pColor);
            grad.addColorStop(0.8, op.pColor);
            grad.addColorStop(1, '#fff');

            ctx.strokeStyle = grad;
            ctx.lineWidth = op.pIsUlt ? 6 : 3;
            ctx.lineCap = 'round';
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.moveTo(Math.round(start.x), Math.round(start.y));
            ctx.lineTo(Math.round(end.x), Math.round(end.y));
            ctx.stroke();

            // 2. Shock Rings (Mach Cones)
            if (len > 20) {
                const ringCount = Math.floor(len / 30);
                ctx.translate(start.x, start.y);
                ctx.rotate(angle);
                ctx.strokeStyle = op.pColor;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.6;
                
                for(let i=1; i<=ringCount; i++) {
                    const x = i * 30 - (globalTime * 200 % 30); 
                    if (x > 0 && x < len) {
                        ctx.beginPath();
                        ctx.ellipse(x, 0, 3, 10, 0, 0, Math.PI*2);
                        ctx.stroke();
                    }
                }
            }
            
            // 3. Bloom
            ctx.shadowColor = op.pColor;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = op.pIsUlt ? 16 : 8;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            ctx.restore();
            return;
        }

        // --- STANDARD SPRITE PROJECTILE ---
        if (op.pTrail && op.pTrail.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath();
            const trail = op.pTrail;
            ctx.moveTo(Math.round(trail[0].x), Math.round(trail[0].y));
            for(let i=1; i<trail.length; i++) {
                ctx.lineTo(Math.round(trail[i].x), Math.round(trail[i].y));
            }
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }

        const shadowAltitude = op.pVisShadowY - op.pVisY; 
        if (Math.abs(shadowAltitude) > 5) {
            ctx.save();
            ctx.translate(Math.round(op.pVisX), Math.round(op.pVisShadowY));
            const shadowAlpha = Math.max(0, 0.4 - Math.abs(shadowAltitude)/800);
            ctx.scale(1, 0.5); 
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
            ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(Math.round(op.pVisX), Math.round(op.pVisY));
        if (op.pSpin !== 0) ctx.rotate(op.pSpin); 
        else ctx.rotate(op.pAngle);
        
        const img = AssetManager.getProjectile(op.pSkillVis, op.pColor);
        if (img && img.width > 0) {
            let scale = 0.6;
            if (op.pIsUlt) scale = 1.0;
            ctx.scale(scale, scale);
            ctx.drawImage(img, -48, -32, 96, 64);
        }
        ctx.restore();
    }
};
