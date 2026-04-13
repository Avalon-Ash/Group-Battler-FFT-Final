
import { RenderOp } from "./RenderList";
import { AssetManager } from "../assets";

/**
 * 飛行物視覺呈現器 v16.0 - Faction Distinct Styles
 */
export const ProjectileDrawer = {
    draw(ctx: CanvasRenderingContext2D, op: RenderOp, globalTime: number) {
        const { pVisX: x, pVisY: y, pColor: color, pAngle: angle, pTrail: trail } = op;

        // Detect Style based on Color (Heuristic)
        // Blue/Cyan/White = Imperial (Tech/Energy)
        // Red/Orange/Purple = Covenant (Chaos/Blood)
        const isCovenant = color.includes('#ef') || color.includes('#dc') || color.includes('#b9') || color.includes('#7f') || color.includes('#ea') || color.includes('#58');

        // 1. 渲染能量尾跡 (Faction Specific Trails)
        if (trail && trail.length > 1) {
            ctx.save();
            
            if (isCovenant) {
                // --- COVENANT TRAIL (Smoky, Tapered, Heavy) ---
                ctx.globalCompositeOperation = 'source-over'; // Opaque/Darker feel
                const len = trail.length;
                
                // Draw multiple segments with varying width for "smoke" effect
                for (let i = 0; i < len - 1; i++) {
                    const p1 = trail[i];
                    const p2 = trail[i+1];
                    const progress = i / len; // 0.0 (Head) -> 1.0 (Tail)
                    
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    
                    // Tapering Width: Thick at head, very thin at tail
                    const width = (op.pIsUlt ? 16 : 8) * (1 - progress) * op.pScale;
                    
                    ctx.lineWidth = width;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = color;
                    ctx.globalAlpha = (1 - progress) * 0.6; // Fade out
                    ctx.stroke();
                }
                
                // Inner Core (Hot)
                ctx.globalCompositeOperation = 'lighter';
                ctx.beginPath();
                ctx.moveTo(x, y);
                for (let i = 0; i < len; i++) {
                    ctx.lineTo(trail[i].x, trail[i].y);
                }
                ctx.strokeStyle = '#fca5a5'; // Pale Red Core
                ctx.lineWidth = (op.pIsUlt ? 4 : 2) * op.pScale;
                ctx.globalAlpha = 0.4;
                ctx.stroke();

            } else {
                // --- IMPERIAL TRAIL (Clean, Electric, Additive) ---
                ctx.globalCompositeOperation = 'screen';
                
                ctx.beginPath();
                ctx.moveTo(x, y);
                for (let i = 0; i < trail.length; i++) {
                    ctx.lineTo(trail[i].x, trail[i].y);
                }

                const endX = trail[trail.length-1].x;
                const endY = trail[trail.length-1].y;

                if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(endX) && Number.isFinite(endY)) {
                    const trailGrad = ctx.createLinearGradient(x, y, endX, endY);
                    trailGrad.addColorStop(0, color);
                    trailGrad.addColorStop(0.2, color); 
                    trailGrad.addColorStop(1, 'transparent');

                    ctx.strokeStyle = trailGrad;
                    // Constant Width "Laser" look
                    ctx.lineWidth = (op.pIsUlt ? 10 : 5) * op.pScale;
                    ctx.lineCap = 'butt'; // Sharp ends
                    ctx.lineJoin = 'miter';
                    ctx.globalAlpha = 0.8;
                    ctx.stroke();
                }
                
                // Core bright line (The "Filament")
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = (op.pIsUlt ? 3 : 1.5) * op.pScale;
                ctx.globalAlpha = 0.6;
                ctx.stroke();
            }

            ctx.restore();
        }

        // 2. 主體精靈渲染
        ctx.save();
        ctx.translate(x, y);
        
        // Stretch: Imperial projects are faster/longer visually
        const stretch = isCovenant ? 1.05 : 1.3; 
        
        if (op.pSpin !== 0) {
            ctx.rotate(op.pSpin);
        } else {
            ctx.rotate(angle);
            ctx.scale(stretch, 1.0 / stretch); 
        }

        const img = AssetManager.getProjectile(op.pSkillVis, color);
        const baseScale = op.pScale;
        const finalScale = (op.pIsUlt ? 1.5 : 1.0) * baseScale;

        if (img) {
            // Glow pass
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = isCovenant ? 0.8 : 1.0; // Imperial is brighter
            const bloomScale = isCovenant ? 1.2 : 1.5; // Imperial blooms more
            ctx.drawImage(img, -36 * finalScale * bloomScale, -36 * finalScale * bloomScale, 72 * finalScale * bloomScale, 72 * finalScale * bloomScale);
            
            // Core pass
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
            ctx.drawImage(img, -32 * finalScale, -32 * finalScale, 64 * finalScale, 64 * finalScale);
        } else {
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(0,0, 10 * finalScale, 0, Math.PI*2); ctx.fill();
        }
        
        ctx.restore();

        // 3. 頭部光暈 (Head Flare)
        ctx.save();
        ctx.translate(x, y);
        ctx.globalCompositeOperation = 'lighter';
        
        const flareR = (isCovenant ? 20 : 30) * op.pScale;
        const flare = ctx.createRadialGradient(0,0,0, 0,0, flareR);
        
        if (isCovenant) {
            // Red Core
            flare.addColorStop(0, '#fff');
            flare.addColorStop(0.4, color);
            flare.addColorStop(1, 'transparent');
        } else {
            // Blue/White Star
            flare.addColorStop(0, '#ffffff');
            flare.addColorStop(0.3, color);
            flare.addColorStop(1, 'transparent');
        }
        
        ctx.fillStyle = flare;
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(0,0, flareR, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
};
