
import { HUDSystem } from "../../presentation/hud";
import { TEXT_PAINTER_COLORS, SHOUT_GLOW, TEXT_BREAK_JITTER, TEXT_ANIM } from "../../../constants";
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

/** 確定性雜湊 [0,1)：依文字存活時間（與 TEXT_BREAK_JITTER 同一個式子），取代每幀 Math.random */
function jitterHash(t: number): number {
    return Math.abs(Math.sin(t * TEXT_BREAK_JITTER.HASH_FREQ) * TEXT_BREAK_JITTER.HASH_SCALE) % 1;
}

export const TextPainter = {
    
    drawFloatingText(ctx: CanvasRenderingContext2D, hud: HUDSystem) {
        const textCount = hud.damageNumbers.length;
        if (textCount === 0) return;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        // [PERF5] 光暈 sprite 的烘焙縮放（相機縮放 × DPR，量化），每次呼叫算一次
        const glowScale = quantizeDeviceScale(ctx);

        const A = TEXT_ANIM;
        hud.damageNumbers.forEach(d => {
            if (!d.active) return;

            const lifePct = d.life / d.maxLife;
            if (lifePct <= A.CULL_PCT) return;

            const alpha = d.isShattered ? lifePct : (lifePct < A.FADE_IN_PCT ? lifePct / A.FADE_IN_PCT : 1.0);
            ctx.globalAlpha = alpha;
            
            ctx.save();
            ctx.translate(d.x, d.y);
            
            if (d.rotation !== 0) ctx.rotate(d.rotation);

            if (d.isShattered) {
                const shatterProgress = 1 - lifePct;
                const scale = 1.0 + shatterProgress * A.SHATTER_GROW;
                ctx.scale(scale, scale);
                // 爆炸後的亂流位移（確定性雜湊）
                ctx.translate((jitterHash(d.time) - 0.5) * A.SHATTER_JITTER, (jitterHash(d.time + 1) - 0.5) * A.SHATTER_JITTER);
            } else if (d.type === 'SHOUT') {
                // Entry Pop up animation
                if (d.time < A.SHOUT_POP_SEC) {
                    const t = d.time / A.SHOUT_POP_SEC;
                    const s = t + Math.sin(t * Math.PI) * A.SHOUT_POP_BOUNCE;
                    ctx.scale(s, s);
                }
                const floatY = Math.sin(d.time * A.SHOUT_FLOAT_FREQ) * A.SHOUT_FLOAT_AMP;
                ctx.translate(0, floatY);
            }

            if (d.type === 'KILL_STREAK') {
                const pop = Math.min(1, (1 - lifePct) * A.KILL_POP_SPEED);
                const pulse = 1 + Math.sin(lifePct * A.KILL_PULSE_FREQ) * A.KILL_PULSE_AMP;
                const scale = pop * pulse * A.KILL_SCALE;
                ctx.scale(scale, scale);
                ctx.font = fontFor('KILL', d.size);

                ctx.lineWidth = A.KILL_STROKE_W;
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

                const w = d.cachedWidth! + A.SHOUT_PAD_X;
                const h = d.size + (d.isUlt ? A.SHOUT_PAD_Y_ULT : A.SHOUT_PAD_Y_CAST);
                const halfW = w / 2;
                const halfH = h / 2;

                ctx.font = shoutFont;

                if (d.isUlt && !d.isShattered) {
                    const pulse = 1 + Math.sin(d.time * A.ULT_PULSE_FREQ) * A.ULT_PULSE_AMP;
                    ctx.scale(pulse, pulse);
                }

                if (d.isShattered) {
                    if (d.shatterType === 'SUCCESS') {
                        // --- 釋放演出：能量昇華 (Ascension) ---
                        const progress = 1 - lifePct;
                        ctx.globalAlpha = lifePct;
                        
                        // 1. 文字閃光並輕微縮放 (減少到 1.2x 避免躁訊)
                        const s = 1.0 + progress * A.SUCCESS_GROW;
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
                        ctx.lineWidth = A.SUCCESS_LINE_W * lifePct;
                        ctx.beginPath();
                        ctx.moveTo(-halfW * (1 + progress * A.SUCCESS_LINE_SPREAD), 0);
                        ctx.lineTo(halfW * (1 + progress * A.SUCCESS_LINE_SPREAD), 0);
                        ctx.stroke();

                    } else {
                        // --- 中斷演出：投影失真（ART_SPEC §13）---
                        // 陣營色錯位抖動，確定性雜湊（依存活時間），不每幀呼叫 Math.random
                        const J = TEXT_BREAK_JITTER;
                        const h1 = jitterHash(d.time);
                        const h2 = jitterHash(d.time + 1);
                        ctx.globalAlpha = lifePct;
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.fillStyle = d.color;
                        ctx.fillText(d.text, (h1 - 0.5) * J.X, (h2 - 0.5) * J.Y);
                        ctx.fillText(d.text, (h2 - 0.5) * J.X, (h1 - 0.5) * J.Y);
                        ctx.restore();
                        ctx.fillStyle = TEXT_PAINTER_COLORS.WHITE;
                        ctx.fillText(d.text, 0, 0);
                    }

                } else {
                    // --- 詠唱演出：科技掃描與脈動 ---
                    // 1. 繪製半透明背景底色
                    ctx.fillStyle = TEXT_PAINTER_COLORS.TECH_BG;
                    ctx.fillRect(-halfW, -halfH, w, h);

                    // 2. 科技括號 (Tech Brackets)
                    ctx.strokeStyle = d.color;
                    ctx.lineWidth = A.BRACKET_W;
                    ctx.globalAlpha = A.BRACKET_GLOW_BASE + Math.sin(d.time * A.BRACKET_GLOW_FREQ) * A.BRACKET_GLOW_AMP;
                    const bracketSize = A.BRACKET;
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
                    ctx.globalAlpha = A.GHOST_ALPHA;
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
                        if (progress < A.SCAN_DONE) {
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
                ctx.lineWidth = A.NUMBER_STROKE_W;
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
