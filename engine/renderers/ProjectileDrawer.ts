
import { RenderOp } from "./RenderList";
import { AssetManager } from "../assets";

export const ProjectileDrawer = {
    draw(ctx: CanvasRenderingContext2D, op: RenderOp, globalTime: number) {
        // --- BEAM / LASER STYLE ---
        const isRay = op.pSkillVis === 'BEAM'; 
        
        if (isRay && op.pTrail && op.pTrail.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen'; // Use Screen for additive but not blown out
            
            const start = op.pTrail[op.pTrail.length - 1]; 
            const end = { x: op.pVisX, y: op.pVisY };
            
            // 1. Outer Glow (Wide)
            ctx.shadowColor = op.pColor;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = op.pIsUlt ? 12 : 6;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // 2. Inner Core (Bright)
            const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.2, op.pColor);
            grad.addColorStop(1, '#ffffff'); // White hot tip

            ctx.strokeStyle = grad;
            ctx.lineWidth = op.pIsUlt ? 4 : 2;
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // 3. Head Flare
            ctx.translate(end.x, end.y);
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(0, 0, op.pIsUlt ? 6 : 3, 0, Math.PI*2); ctx.fill();
            
            ctx.restore();
            return;
        }

        // --- SPRITE PROJECTILE STYLE ---
        if (op.pTrail && op.pTrail.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath();
            const trail = op.pTrail;
            ctx.moveTo(trail[0].x, trail[0].y);
            for(let i=1; i<trail.length; i++) {
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            
            // Fading trail
            ctx.strokeStyle = op.pColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            
            ctx.restore();
        }

        // Shadow
        const shadowAltitude = op.pVisShadowY - op.pVisY; 
        if (Math.abs(shadowAltitude) > 5) {
            ctx.save();
            ctx.translate(Math.round(op.pVisX), Math.round(op.pVisShadowY));
            const shadowAlpha = Math.max(0, 0.4 - Math.abs(shadowAltitude)/1000);
            ctx.scale(1, 0.5); 
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // Projectile Body
        ctx.save();
        ctx.translate(Math.round(op.pVisX), Math.round(op.pVisY));
        if (op.pSpin !== 0) ctx.rotate(op.pSpin); 
        else ctx.rotate(op.pAngle);
        
        // Draw Mach Cone (Shockwave front) for fast objects
        if (!op.pSpin) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = op.pColor;
            ctx.beginPath();
            ctx.moveTo(20, 0); ctx.lineTo(-10, -15); ctx.lineTo(-5, 0); ctx.lineTo(-10, 15);
            ctx.fill();
            ctx.restore();
        }

        const img = AssetManager.getProjectile(op.pSkillVis, op.pColor);
        if (img && img.width > 0) {
            let scale = 0.8; // Beefier projectiles
            if (op.pIsUlt) scale = 1.2;
            ctx.scale(scale, scale);
            ctx.drawImage(img, -48, -32, 96, 64);
            
            // Bloom Overlay
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5;
            ctx.drawImage(img, -48, -32, 96, 64);
        }
        ctx.restore();
    }
};
