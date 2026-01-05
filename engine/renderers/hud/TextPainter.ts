
import { HUDSystem } from "../../systems/hud";

export const TextPainter = {
    
    drawFloatingText(ctx: CanvasRenderingContext2D, hud: HUDSystem) {
        const textCount = hud.damageNumbers.length;
        if (textCount === 0) return;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0; 

        hud.damageNumbers.forEach(d => {
            if (!d.active) return;

            const lifePct = d.life / d.maxLife;
            // Early cull for nearly invisible text
            if (lifePct <= 0.05) return;

            const alpha = d.isShattered ? lifePct : (lifePct < 0.3 ? lifePct / 0.3 : 1.0);
            ctx.globalAlpha = alpha;
            
            ctx.save();
            ctx.translate(d.x, d.y);
            
            if (d.rotation !== 0) ctx.rotate(d.rotation);

            if (d.isShattered) {
                const shatterProgress = 1 - lifePct;
                const scale = 1.0 + shatterProgress * 0.6;
                ctx.scale(scale, scale);
                ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4);
            } else if (d.type === 'SHOUT') {
                const floatY = Math.sin(d.time * 6) * 3;
                ctx.translate(0, floatY);
            }

            if (d.type === 'KILL_STREAK') {
                const pop = Math.min(1, (1 - lifePct) * 5); 
                const pulse = 1 + Math.sin(lifePct * 10) * 0.1;
                const scale = pop * pulse * 1.5; 
                ctx.scale(scale, scale);
                ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                
                ctx.lineWidth = 4;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#000';
                ctx.strokeText(d.text, 0, 0);
                ctx.fillStyle = d.color;
                ctx.fillText(d.text, 0, 0);

            } else if (d.type === 'SHOUT') {
                // [OPTIMIZATION] Cache Width
                if (d.cachedWidth === undefined) {
                    ctx.font = d.isUlt ? `900 italic ${d.size}px "Arial Black", sans-serif` : `bold ${d.size}px "Segoe UI", sans-serif`;
                    d.cachedWidth = ctx.measureText(d.text).width;
                }

                const w = d.isUlt ? (d.cachedWidth! + 40) : (d.cachedWidth! + 20);
                const h = d.size + (d.isUlt ? 16 : 10);
                const halfW = w / 2;
                const halfH = h / 2;

                ctx.font = d.isUlt ? `900 italic ${d.size}px "Arial Black", sans-serif` : `bold ${d.size}px "Segoe UI", sans-serif`;

                if (d.isUlt) {
                    const scale = 1 + (1 - lifePct) * 0.1; 
                    ctx.scale(scale, scale);
                }

                if (d.isShattered) {
                    // 破碎狀態
                    ctx.fillStyle = 'rgba(30, 30, 30, 0.6)'; 
                    ctx.fillRect(-halfW, -halfH, w, h);
                    ctx.strokeStyle = 'rgba(255,50,50,0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-halfW, -halfH, w, h);
                    ctx.fillStyle = '#94a3b8'; 
                    ctx.fillText(d.text, 0, 0);
                } else {
                    // --- 簡約風格 (Clean Style) ---
                    // 黑色半透明底，帶有技能顏色的邊框，無進度條干擾
                    
                    // Background
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; 
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(-halfW, -halfH, w, h, 4);
                    else ctx.rect(-halfW, -halfH, w, h);
                    ctx.fill();

                    // Border
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = d.isUlt ? 2 : 1;
                    ctx.globalAlpha = 0.8;
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;

                    // Text
                    ctx.fillStyle = '#ffffff';
                    if (d.isUlt) {
                        ctx.shadowColor = d.color;
                        ctx.shadowBlur = 10;
                    }
                    ctx.fillText(d.text, 0, 0);
                    ctx.shadowBlur = 0;
                }

            } else {
                ctx.font = `900 ${d.size}px "Segoe UI", sans-serif`;
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0,0,0,0.8)';
                ctx.strokeText(d.text, 0, 0);
                ctx.fillStyle = d.color; 
                ctx.fillText(d.text, 0, 0);
            }
            
            ctx.restore();
            ctx.globalAlpha = 1.0;
        });
    }
};
