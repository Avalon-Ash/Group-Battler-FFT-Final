
import { HUDSystem } from "../../systems/hud";
import { TEXT_PAINTER_COLORS, SHOUT_GLOW } from "../../../constants";
import { GlowTextCache, quantizeDeviceScale } from "./GlowTextCache";
import { createUnitGradientCache } from "../UnitGradientCache";

// [PERF5] 字型字串依字級快取，避免每幀每條文字組合樣板字串
type FontKind = 'ULT' | 'CAST' | 'KILL' | 'NUMBER';
const fontCache: Record<FontKind, Map<number, string>> = {
    ULT: new Map(), CAST: new Map(), KILL: new Map(), NUMBER: new Map(),
};
function fontFor(kind: FontKind, size: number): string {
    const m = fontCache[kind];
    let f = m.get(size);
    if (f === undefined) {
        if (kind === 'ULT' || kind === 'KILL') f = `900 italic ${size}px "Arial Black", sans-serif`;
        else if (kind === 'CAST') f = `bold ${size}px "Segoe UI", sans-serif`;
        else f = `900 ${size}px "Segoe UI", sans-serif`;
        m.set(size, f);
    }
    return f;
}

// [PERF5] 詠唱條填充漸層：單位區間 (0→1)，繪製時 scale 到 revealW（與每幀 createLinearGradient 等價）
const revealGradients = createUnitGradientCache((ctx, color) => {
    const grad = ctx.createLinearGradient(0, 0, 1, 0);
    grad.addColorStop(0, TEXT_PAINTER_COLORS.GRAD_TRANSPARENT);
    grad.addColorStop(1, color + '44');
    return grad;
});

export const TextPainter = {
    
    drawFloatingText(ctx: CanvasRenderingContext2D, hud: HUDSystem) {
        const textCount = hud.damageNumbers.length;
        if (textCount === 0) return;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        // [PERF5] 光暈 sprite 的烘焙縮放（相機縮放 × DPR，量化），每次呼叫算一次
        const glowScale = quantizeDeviceScale(ctx);

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
                ctx.font = fontFor('KILL', d.size);

                ctx.lineWidth = 4;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = TEXT_PAINTER_COLORS.KILL_STREAK_STROKE;
                ctx.strokeText(d.text, 0, 0);
                ctx.fillStyle = d.color;
                ctx.fillText(d.text, 0, 0);

            } else if (d.type === 'SHOUT') {
                // [OPTIMIZATION] Cache Width
                const shoutFont = fontFor(d.isUlt ? 'ULT' : 'CAST', d.size);
                if (d.cachedWidth === undefined) {
                    ctx.font = shoutFont;
                    d.cachedWidth = ctx.measureText(d.text).width;
                }

                const w = d.cachedWidth! + 24; 
                const h = d.size + (d.isUlt ? 16 : 10);
                const halfW = w / 2;
                const halfH = h / 2;

                ctx.font = shoutFont;

                if (d.isUlt && !d.isShattered) {
                    const pulse = 1 + Math.sin(d.time * 12) * 0.05; 
                    ctx.scale(pulse, pulse);
                }

                if (d.isShattered) {
                    if (d.shatterType === 'SUCCESS') {
                        // --- 釋放演出：能量昇華 (Ascension) ---
                        const progress = 1 - lifePct;
                        ctx.globalAlpha = lifePct;
                        
                        // 1. 文字閃光並輕微縮放 (減少到 1.2x 避免躁訊)
                        const s = 1.0 + progress * 0.2;
                        ctx.scale(s, s);
                        
                        // [PERF5] 預烘焙光暈文字取代 shadowBlur（模糊量依壽命量化）
                        const blurStep = SHOUT_GLOW.SUCCESS_BLUR_STEP;
                        const successBlur = Math.round(SHOUT_GLOW.SUCCESS_BLUR * lifePct / blurStep) * blurStep;
                        if (successBlur > 0) {
                            const glowText = GlowTextCache.getText(d.text, shoutFont, d.size, TEXT_PAINTER_COLORS.WHITE, d.color, successBlur, glowScale);
                            ctx.drawImage(glowText.canvas, glowText.x, glowText.y, glowText.w, glowText.h);
                        } else {
                            ctx.fillStyle = TEXT_PAINTER_COLORS.WHITE;
                            ctx.fillText(d.text, 0, 0);
                        }

                        // 2. 輕量化的橫向擴散線條
                        ctx.strokeStyle = TEXT_PAINTER_COLORS.WHITE;
                        ctx.lineWidth = 2 * lifePct;
                        ctx.beginPath();
                        ctx.moveTo(-halfW * (1 + progress * 0.5), 0);
                        ctx.lineTo(halfW * (1 + progress * 0.5), 0);
                        ctx.stroke();

                    } else {
                        // --- 破棄演出：數位故障 Glitch / RGB Split ---
                        const glitch = Math.random();
                        ctx.globalAlpha = lifePct;
                        
                        // RGB Split 效果
                        ctx.save();
                        ctx.globalCompositeOperation = 'screen';
                        
                        // Red Channel
                        ctx.fillStyle = TEXT_PAINTER_COLORS.GLITCH_RED;
                        ctx.fillText(d.text, (glitch-0.5)*8, (Math.random()-0.5)*4);
                        
                        // Cyan Channel
                        ctx.fillStyle = TEXT_PAINTER_COLORS.GLITCH_CYAN;
                        ctx.fillText(d.text, (Math.random()-0.5)*8, (glitch-0.5)*4);
                        
                        // Main Shattered Text (White/Grey)
                        ctx.restore();
                        ctx.fillStyle = TEXT_PAINTER_COLORS.WHITE;
                        ctx.fillText(d.text, 0, 0);

                        // 繪製破碎的科技背景框
                        ctx.strokeStyle = TEXT_PAINTER_COLORS.GLITCH_FRAME;
                        ctx.lineWidth = 2;
                        ctx.globalAlpha = lifePct * 0.5;
                        ctx.strokeRect(-halfW - glitch*10, -halfH, w + glitch*20, h);
                        
                        // 靜態雜訊特效
                        if (glitch > 0.7) {
                            ctx.fillStyle = TEXT_PAINTER_COLORS.WHITE;
                            for(let i=0; i<3; i++) {
                                ctx.fillRect(-halfW, (Math.random()-0.5)*h, w, 1);
                            }
                        }
                    }

                } else {
                    // --- 詠唱演出：科技掃描與脈動 ---
                    // 1. 繪製半透明背景底色
                    ctx.fillStyle = TEXT_PAINTER_COLORS.TECH_BG;
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

                        // 填充區背景光暈（[PERF5] 快取單位漸層，scale 到 revealW）
                        ctx.save();
                        ctx.translate(-halfW, 0);
                        ctx.scale(revealW, 1);
                        ctx.fillStyle = revealGradients.get(ctx, d.color);
                        ctx.fillRect(0, -halfH, 1, h);
                        ctx.restore();

                        // [PERF5] 預烘焙光暈文字取代 shadowBlur
                        ctx.globalAlpha = 1.0;
                        const castBlur = d.isUlt ? SHOUT_GLOW.ULT_BLUR : SHOUT_GLOW.CAST_BLUR;
                        const glowText = GlowTextCache.getText(d.text, shoutFont, d.size, TEXT_PAINTER_COLORS.WHITE, d.color, castBlur, glowScale);
                        ctx.drawImage(glowText.canvas, glowText.x, glowText.y, glowText.w, glowText.h);

                        // Scanner Line（[PERF5] 預烘焙光暈矩形）
                        if (progress < 0.99) {
                            const scanX = -halfW + revealW;
                            const scanW = SHOUT_GLOW.SCAN_WIDTH;
                            const scan = GlowTextCache.getRect(scanW, h - 2, TEXT_PAINTER_COLORS.WHITE, SHOUT_GLOW.SCAN_BLUR, glowScale);
                            ctx.drawImage(scan.canvas, scanX - scanW / 2 + scan.x, -halfH + 1 + scan.y, scan.w, scan.h);
                        }
                        ctx.restore();
                    }
                }

            } else {
                ctx.font = fontFor('NUMBER', d.size);
                ctx.lineWidth = 3;
                ctx.strokeStyle = TEXT_PAINTER_COLORS.STROKE_SHADOW;
                ctx.strokeText(d.text, 0, 0);
                ctx.fillStyle = d.color; 
                ctx.fillText(d.text, 0, 0);
            }
            
            ctx.restore();
            ctx.globalAlpha = 1.0;
        });
    }
};
