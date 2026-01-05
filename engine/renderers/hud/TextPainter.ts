
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
                // 模擬爆炸後的亂流位移
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

                // 視覺參數：虛像化設計 (Holographic Design)
                // 寬度稍微加寬以容納括號
                const w = d.cachedWidth! + 24; 
                const h = d.size + (d.isUlt ? 16 : 10);
                const halfW = w / 2;
                const halfH = h / 2;

                ctx.font = d.isUlt ? `900 italic ${d.size}px "Arial Black", sans-serif` : `bold ${d.size}px "Segoe UI", sans-serif`;

                if (d.isUlt) {
                    const scale = 1 + (1 - lifePct) * 0.1; 
                    ctx.scale(scale, scale);
                }

                if (d.isShattered) {
                    // 破碎狀態：灰色空殼，無光效
                    ctx.fillStyle = 'rgba(30, 30, 30, 0.6)'; 
                    ctx.fillRect(-halfW, -halfH, w, h);
                    ctx.strokeStyle = 'rgba(255,50,50,0.3)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-halfW, -halfH, w, h);
                    ctx.fillStyle = '#94a3b8'; 
                    ctx.fillText(d.text, 0, 0);
                } else {
                    // --- 1. 繪製科技括號 (Tech Brackets) ---
                    // 不再繪製笨重的實心黑底，改用輕量級邊框
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = 0.8;
                    
                    const bracketSize = 6;
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

                    // --- 2. 繪製幽靈底字 (The Ghost) ---
                    // 代表未充能的部分，半透明，顯示結構
                    ctx.fillStyle = d.color;
                    ctx.globalAlpha = 0.2; // Dim Ghost
                    ctx.fillText(d.text, 0, 0);

                    // --- 3. 繪製實像填充 (The Fill) ---
                    // 使用 Clip Mask 模擬「文字被填滿」的效果
                    const progress = Math.min(1.0, d.time / d.totalDuration);
                    
                    if (progress > 0.01) {
                        ctx.save();
                        
                        // 定義裁切區域 (從左至右掃描)
                        const revealW = w * progress;
                        ctx.beginPath();
                        // 裁切區需稍微寬一點覆蓋文字邊緣
                        ctx.rect(-halfW, -halfH, revealW, h);
                        ctx.clip();

                        // 繪製亮色文字 (Fully Opaque)
                        ctx.globalAlpha = 1.0;
                        ctx.fillStyle = '#ffffff'; // 核心亮白
                        
                        // 讓實像文字帶有技能顏色的光暈 (取代漸層)
                        ctx.shadowColor = d.color;
                        ctx.shadowBlur = d.isUlt ? 15 : 8;
                        
                        ctx.fillText(d.text, 0, 0);
                        
                        // --- 4. 掃描線 (Scanner Line) ---
                        // 在裁切邊緣繪製一條高亮線，增加數據傳輸感
                        const scanX = -halfW + revealW;
                        // 只有當進度未完成時才畫掃描線
                        if (progress < 0.98) {
                            ctx.shadowBlur = 5;
                            ctx.shadowColor = '#fff';
                            ctx.fillStyle = '#fff';
                            ctx.fillRect(scanX - 1, -halfH + 2, 2, h - 4);
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
