
import { HUDSystem } from "../../systems/hud";

export const TextPainter = {
    
    drawFloatingText(ctx: CanvasRenderingContext2D, hud: HUDSystem) {
        hud.damageNumbers.forEach(d => {
            if (!d.active) return;

            const lifePct = d.life / d.maxLife;
            // Shattered text fades faster visually
            const alpha = d.isShattered ? lifePct : (lifePct < 0.3 ? lifePct / 0.3 : 1.0);
            
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0; 
            
            // Save state for rotation transformation if needed
            ctx.save();
            ctx.translate(d.x, d.y);
            
            // Apply shatter rotation
            if (d.rotation !== 0) ctx.rotate(d.rotation);

            // Apply shatter scale (Explode outwards)
            if (d.isShattered) {
                const shatterProgress = 1 - lifePct;
                const scale = 1.0 + shatterProgress * 0.6; // Scale up to 1.6x
                ctx.scale(scale, scale);
                // Glitch offset for shattered text
                ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4);
            } else if (d.type === 'SHOUT') {
                // Active Shout Float Animation (Magical Levitation)
                const floatY = Math.sin(d.time * 6) * 3;
                ctx.translate(0, floatY);
            }

            if (d.type === 'KILL_STREAK') {
                // (Kill Streak logic remains same)
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

            } else if (d.type === 'SHOUT') {
                if (d.isUlt) {
                    // --- ULTIMATE CASTING VISUAL ---
                    const scale = 1 + (1 - lifePct) * 0.1; 
                    ctx.scale(scale, scale);
                    ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                    const textMetrics = ctx.measureText(d.text);
                    const w = textMetrics.width / 2 + 35; // Wider for cinematic feel
                    const h = d.size + 14;

                    if (d.isShattered) {
                        // ... Shattered Ult (Dark, broken) ...
                        const bgGrad = ctx.createLinearGradient(-w - 20, 0, w + 20, 0);
                        bgGrad.addColorStop(0, 'rgba(0,0,0,0)');
                        bgGrad.addColorStop(0.5, 'rgba(50, 20, 20, 0.4)');
                        bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = bgGrad;
                        ctx.fillRect(-w - 20, -h/2, w*2 + 40, h);
                        
                        ctx.fillStyle = '#94a3b8';
                        ctx.fillText(d.text, 0, 0);
                        
                        ctx.strokeStyle = '#ef4444';
                        ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(-w, -h/2); ctx.lineTo(0, -h/2); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(w, h/2); ctx.lineTo(0, h/2); ctx.stroke();
                    } else {
                        // ... Active Ult (Energy Filling) ...
                        
                        // 1. Cinematic Bar Background
                        const bgGrad = ctx.createLinearGradient(-w - 40, 0, w + 40, 0);
                        bgGrad.addColorStop(0, 'transparent');
                        bgGrad.addColorStop(0.2, 'rgba(0,0,0,0.8)'); 
                        bgGrad.addColorStop(0.8, 'rgba(0,0,0,0.8)');
                        bgGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = bgGrad;
                        ctx.fillRect(-w - 40, -h/2 - 4, w*2 + 80, h + 8);

                        // 2. Glowing Borders
                        const pulse = 0.5 + Math.sin(d.time * 10) * 0.5;
                        ctx.strokeStyle = d.color;
                        ctx.lineWidth = 1 + pulse;
                        ctx.shadowColor = d.color;
                        ctx.shadowBlur = 10 * pulse;
                        
                        ctx.beginPath();
                        ctx.moveTo(-w - 10, -h/2); ctx.lineTo(w + 10, -h/2);
                        ctx.moveTo(-w - 10, h/2); ctx.lineTo(w + 10, h/2);
                        ctx.stroke();
                        ctx.shadowBlur = 0; 

                        // 3. Brackets
                        ctx.fillStyle = d.color;
                        ctx.font = `20px sans-serif`;
                        ctx.fillText("✦", -w - 20 - (pulse * 2), 1);
                        ctx.fillText("✦", w + 20 + (pulse * 2), 1);

                        // 4. TEXT FILLING LOGIC
                        ctx.font = `900 italic ${d.size}px "Arial Black", sans-serif`;
                        
                        // A. Draw Empty Text (Dim)
                        ctx.fillStyle = 'rgba(255,255,255,0.2)';
                        ctx.fillText(d.text, 0, 0);

                        // B. Calculate Fill Progress
                        // time is elapsed, totalDuration is total cast time.
                        const progress = Math.min(1.0, d.time / d.totalDuration);
                        const fillWidth = (w * 2 - 20) * progress; // Approximate text width coverage
                        const startX = -w + 10;

                        // C. Draw Filled Text (Bright) with Clipping
                        ctx.save();
                        ctx.beginPath();
                        // Define clipping rectangle from Left to Right based on progress
                        ctx.rect(startX, -h, fillWidth, h*2);
                        ctx.clip();

                        // Gradient Text
                        const textGrad = ctx.createLinearGradient(0, -h/2, 0, h/2);
                        textGrad.addColorStop(0, '#ffffff');
                        textGrad.addColorStop(0.5, d.color);
                        textGrad.addColorStop(1, d.color);
                        
                        ctx.shadowColor = d.color;
                        ctx.shadowBlur = 15;
                        ctx.fillStyle = textGrad;
                        ctx.fillText(d.text, 0, 0);
                        
                        // Draw "Energy Edge" line
                        if (progress < 1.0) {
                            ctx.shadowBlur = 5;
                            ctx.shadowColor = '#fff';
                            ctx.fillStyle = '#fff';
                            const edgeX = startX + fillWidth;
                            // Draw a thin vertical glow line at the edge
                            ctx.fillRect(edgeX - 1, -h/2, 2, h);
                        }
                        
                        ctx.restore();
                    }

                } else {
                    // --- NORMAL CAST VISUAL ---
                    ctx.font = `bold ${d.size}px "Segoe UI", sans-serif`;
                    const textMetrics = ctx.measureText(d.text);
                    const padX = 14;
                    const padY = 8;
                    const w = textMetrics.width;
                    const h = d.size;
                    
                    if (d.isShattered) {
                        ctx.fillStyle = 'rgba(30, 30, 30, 0.4)'; 
                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(-w/2 - padX, -h/2 - padY, w + padX*2, h + padY*2, 8);
                        else ctx.rect(-w/2 - padX, -h/2 - padY, w + padX*2, h + padY*2);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255,50,50,0.1)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        ctx.fillStyle = '#94a3b8'; 
                        ctx.fillText(d.text, 0, 0);
                    } else {
                        // Magic Box Background
                        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                        
                        // Border
                        const pulse = 0.5 + Math.sin(d.time * 8) * 0.5;
                        ctx.strokeStyle = d.color;
                        ctx.shadowColor = d.color;
                        ctx.shadowBlur = 5 + pulse * 5;
                        ctx.lineWidth = 1.5;

                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(-w/2 - padX, -h/2 - padY, w + padX*2, h + padY*2, 6);
                        else ctx.rect(-w/2 - padX, -h/2 - padY, w + padX*2, h + padY*2);
                        ctx.fill();
                        ctx.stroke();
                        ctx.shadowBlur = 0;

                        // FILLING TEXT LOGIC
                        // A. Empty Text
                        ctx.fillStyle = 'rgba(255,255,255,0.3)'; 
                        ctx.fillText(d.text, 0, 0);

                        // B. Filled Text (Masked)
                        const progress = Math.min(1.0, d.time / d.totalDuration);
                        const boxW = w + padX*2;
                        const fillW = boxW * progress;
                        const startX = -boxW/2;

                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(startX, -h, fillW, h*2);
                        ctx.clip();

                        ctx.shadowColor = d.color;
                        ctx.shadowBlur = 8;
                        ctx.fillStyle = '#ffffff'; // Bright filled text
                        ctx.fillText(d.text, 0, 0);
                        
                        // Edge Glint
                        if (progress < 1.0) {
                            ctx.fillStyle = '#ffffff';
                            ctx.shadowBlur = 10;
                            ctx.fillRect(startX + fillW - 2, -h, 2, h*2);
                        }

                        ctx.restore();
                    }
                }

            } else {
                // DAMAGE / HEAL / CC
                ctx.font = `900 ${d.size}px "Segoe UI", sans-serif`;
                
                // Outline to make it readable on any background
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
