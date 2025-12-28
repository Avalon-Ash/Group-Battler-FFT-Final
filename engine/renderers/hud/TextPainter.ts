
import { HUDSystem } from "../../systems/hud";

export const TextPainter = {
    
    drawFloatingText(ctx: CanvasRenderingContext2D, hud: HUDSystem) {
        hud.damageNumbers.forEach(d => {
            if (!d.active) return;

            const lifePct = d.life / d.maxLife;
            const alpha = lifePct < 0.3 ? lifePct / 0.3 : 1.0;
            
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0; 
            
            if (d.type === 'KILL_STREAK') {
                ctx.save();
                ctx.translate(d.x, d.y);
                const pop = Math.min(1, (1 - lifePct) * 5); 
                const pulse = 1 + Math.sin(lifePct * 10) * 0.1;
                const scale = pop * pulse * 1.5; 
                ctx.scale(scale, scale);
                ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                
                const grad = ctx.createLinearGradient(0, -d.size/2, 0, d.size/2);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.5, d.color);
                grad.addColorStop(1, '#000000');
                
                ctx.lineWidth = 4;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#000';
                ctx.strokeText(d.text, 0, 0);
                ctx.fillStyle = grad;
                ctx.fillText(d.text, 0, 0);
                ctx.restore();

            } else if (d.type === 'SHOUT') {
                if (d.isUlt) {
                    const scale = 1 + (1 - lifePct) * 0.1; 
                    ctx.save();
                    ctx.translate(d.x, d.y);
                    ctx.scale(scale, scale);
                    ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                    const textMetrics = ctx.measureText(d.text);
                    const w = textMetrics.width / 2 + 25;
                    const h = d.size + 12;

                    const bgGrad = ctx.createLinearGradient(-w - 20, 0, w + 20, 0);
                    bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
                    bgGrad.addColorStop(0.3, 'rgba(2, 6, 23, 0.85)'); 
                    bgGrad.addColorStop(0.7, 'rgba(2, 6, 23, 0.85)');
                    bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    
                    ctx.fillStyle = bgGrad;
                    ctx.fillRect(-w - 20, -h/2, w*2 + 40, h);
                    
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = alpha * 0.8;
                    
                    ctx.beginPath(); ctx.moveTo(-w, -h/2); ctx.lineTo(w, -h/2); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-w * 0.8, h/2); ctx.lineTo(w * 0.8, h/2); ctx.stroke();
                    
                    ctx.globalAlpha = alpha;
                    ctx.shadowColor = d.color; ctx.shadowBlur = 15;
                    ctx.fillStyle = '#fff';
                    ctx.fillText(d.text, 0, 0);
                    ctx.restore();
                } else {
                    ctx.font = `bold ${d.size}px "Segoe UI", sans-serif`;
                    const textMetrics = ctx.measureText(d.text);
                    const padX = 12;
                    const padY = 6;
                    const w = textMetrics.width;
                    const h = d.size;
                    
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; 
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(d.x - w/2 - padX, d.y - h/2 - padY, w + padX*2, h + padY*2, 8);
                    else ctx.rect(d.x - w/2 - padX, d.y - h/2 - padY, w + padX*2, h + padY*2);
                    ctx.fill();
                    
                    ctx.strokeStyle = `rgba(255,255,255,0.15)`;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    ctx.shadowColor = d.color; ctx.shadowBlur = 8;
                    ctx.fillStyle = '#fff'; 
                    ctx.fillText(d.text, d.x, d.y);
                    ctx.shadowBlur = 0;
                }

            } else {
                // DAMAGE / HEAL / CC
                ctx.font = `900 ${d.size}px "Segoe UI", sans-serif`;
                
                // Outline to make it readable on any background
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0,0,0,0.8)';
                ctx.strokeText(d.text, d.x, d.y);
                
                ctx.fillStyle = d.color; 
                ctx.fillText(d.text, d.x, d.y);
            }
            
            ctx.globalAlpha = 1.0;
        });
    }
};
