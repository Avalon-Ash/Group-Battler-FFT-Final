
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
                const scale = 1.0 + shatterProgress * 0.8;
                ctx.scale(scale, scale);
                // 模擬爆炸後的亂流位移
                ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10);
            } else if (d.type === 'SHOUT') {
                // Entry Pop up animation
                const entryDuration = 0.25;
                if (d.time < entryDuration) {
                    const t = d.time / entryDuration;
                    const bounce = Math.sin(t * Math.PI) * 0.2;
                    const s = t * 1.0 + bounce;
                    ctx.scale(s, s);
                }
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

                const w = d.cachedWidth! + 24; 
                const h = d.size + (d.isUlt ? 16 : 10);
                const halfW = w / 2;
                const halfH = h / 2;

                ctx.font = d.isUlt ? `900 italic ${d.size}px "Arial Black", sans-serif` : `bold ${d.size}px "Segoe UI", sans-serif`;

                if (d.isUlt && !d.isShattered) {
                    const pulse = 1 + Math.sin(d.time * 12) * 0.05; 
                    ctx.scale(pulse, pulse);
                }

                if (d.isShattered) {
                    // --- 破棄演出：數位故障 Glitch / RGB Split ---
                    const glitch = Math.random();
                    ctx.globalAlpha = lifePct;
                    
                    // RGB Split 效果
                    ctx.save();
                    ctx.globalCompositeOperation = 'screen';
                    
                    // Red Channel
                    ctx.fillStyle = '#ff0000';
                    ctx.fillText(d.text, (glitch-0.5)*8, (Math.random()-0.5)*4);
                    
                    // Cyan Channel
                    ctx.fillStyle = '#00ffff';
                    ctx.fillText(d.text, (Math.random()-0.5)*8, (glitch-0.5)*4);
                    
                    // Main Shattered Text (White/Grey)
                    ctx.restore();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(d.text, 0, 0);

                    // 繪製破碎的科技背景框
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = lifePct * 0.5;
                    ctx.strokeRect(-halfW - glitch*10, -halfH, w + glitch*20, h);
                    
                    // 靜態雜訊特效
                    if (glitch > 0.7) {
                        ctx.fillStyle = '#fff';
                        for(let i=0; i<3; i++) {
                            ctx.fillRect(-halfW, (Math.random()-0.5)*h, w, 1);
                        }
                    }

                } else {
                    // --- 詠唱演出：科技掃描與脈動 ---
                    // 1. 繪製半透明背景底色
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
                    ctx.fillRect(-halfW, -halfH, w, h);

                    // 2. 科技括號 (Tech Brackets)
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = 2;
                    const glowIntensity = 0.5 + Math.sin(d.time * 8) * 0.3;
                    ctx.globalAlpha = glowIntensity;
                    
                    const bracketSize = 8;
                    ctx.beginPath();
                    // 左括號 [
                    ctx.moveTo(-halfW + bracketSize, -halfH);
                    ctx.lineTo(-halfW, -halfH);
                    ctx.lineTo(-halfW, halfH);
                    ctx.lineTo(-halfW + bracketSize, halfH);
                    // 右括號 ]
                    ctx.moveTo(halfW - bracketSize, -halfH);
                    ctx.lineTo(halfW, -halfH);
                    ctx.lineTo(halfW, halfH);
                    ctx.lineTo(halfW - bracketSize, halfH);
                    ctx.stroke();

                    // 3. 填滿進度與亮色文字
                    ctx.globalAlpha = 1.0;
                    const progress = Math.min(1.0, d.time / d.totalDuration);
                    
                    // 幽靈文字 (底色)
                    ctx.fillStyle = d.color;
                    ctx.globalAlpha = 0.15;
                    ctx.fillText(d.text, 0, 0);

                    if (progress > 0) {
                        ctx.save();
                        const revealW = w * progress;
                        ctx.beginPath();
                        ctx.rect(-halfW, -halfH, revealW, h);
                        ctx.clip();

                        // 填充區背景光暈
                        const grad = ctx.createLinearGradient(-halfW, 0, -halfW + revealW, 0);
                        grad.addColorStop(0, 'rgba(255,255,255,0)');
                        grad.addColorStop(1, d.color + '44');
                        ctx.fillStyle = grad;
                        ctx.fillRect(-halfW, -halfH, revealW, h);

                        ctx.globalAlpha = 1.0;
                        ctx.fillStyle = '#ffffff';
                        ctx.shadowColor = d.color;
                        ctx.shadowBlur = d.isUlt ? 20 : 10;
                        ctx.fillText(d.text, 0, 0);
                        
                        // Scanner Line
                        if (progress < 0.99) {
                            const scanX = -halfW + revealW;
                            ctx.fillStyle = '#fff';
                            ctx.shadowBlur = 15;
                            ctx.shadowColor = '#fff';
                            ctx.fillRect(scanX - 1.5, -halfH + 1, 3, h - 2);
                        }
                        ctx.restore();
                    }
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
