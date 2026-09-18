/**
 * MaterialPainter — 把 Three.js/GLSL 的六種特效生成手法翻譯成 Canvas 2D
 * -----------------------------------------------------------------------------
 * 對照關係：
 *   GLSL SDF + noise 裁切      → 離屏烘焙 + destination-in 遮罩（bakeIceCrust / bakeScorch）
 *   Ribbon strip 參數化路徑    → 中點位移遞迴 + 多層輝光疊繪（drawRibbon）
 *   三層同心圓管光柱           → createLinearGradient 疊加 + setLineDash 滾動（drawLayeredBeam）
 *   後處理色調分級             → ctx.filter 字串（gradeFilter）
 *   速度扭曲層                 → 遞減 alpha 殘影（drawMotionTrail）
 *
 * 所有數值一律讀 MATERIAL_CONFIG，不在此檔寫死。
 *
 * 注意：destination-in 會影響整個目標 canvas，因此遮罩類效果一律
 * 在離屏 canvas 完成後才 drawImage 回主畫面，絕不直接對主 ctx 操作。
 */

import { createCanvas } from '../CanvasUtils';
import { applyNoiseMask } from './NoiseLib';
import { MATERIAL_CONFIG } from '../../../data/vfx/materialConfig';
import { HexGeometry } from '../utils/HexGeometry';

const bakeCache = new Map<string, HTMLCanvasElement>();

function bake(key: string, size: number, paint: (ctx: CanvasRenderingContext2D, r: number) => void) {
    const hit = bakeCache.get(key);
    if (hit) return hit;
    const { canvas, ctx } = createCanvas(size, size);
    ctx.translate(size / 2, size / 2);
    paint(ctx, size / 2);
    bakeCache.set(key, canvas);
    return canvas;
}

export function resetMaterialCache() {
    bakeCache.clear();
}

/** 確定性亂數（seed 驅動），避免每帧抖動 */
function rng(seed: number) {
    let s = seed >>> 0 || 1;
    return () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
}

export const MaterialPainter = {
    /** 色調分級：直接接在最終合成前 */
    gradeFilter(): string {
        const g = MATERIAL_CONFIG.grade;
        if (!MATERIAL_CONFIG.enabled || !g.enabled) return 'none';
        return `contrast(${g.contrast}) saturate(${g.saturate}) brightness(${g.brightness})`;
    },

    /**
     * 冰殼：底色六邊形 + 晶稜 + 高光，再用 fbm 遮罩裁出不規則霜面。
     * 取代原本「純色六邊形 + 兩條白橢圓」的平面感。
     */
    bakeIceCrust(size: number, seed = 7): HTMLCanvasElement {
        const c = MATERIAL_CONFIG.ice;
        return bake(`ICE_${size}_${seed}_${c.noise.threshold}_${c.facets}`, size, (ctx, r) => {
            const rand = rng(seed);

            // 1. 霜面底層
            ctx.fillStyle = c.baseColor;
            HexGeometry.traceHex(ctx, 0, 0, r * 0.95, false);
            ctx.fill();

            // 2. 晶稜（由中心放射的稜線，模擬結晶生長方向）
            ctx.strokeStyle = c.edgeColor;
            ctx.lineJoin = 'round';
            for (let i = 0; i < c.facets; i++) {
                const a = (i / c.facets) * Math.PI * 2 + rand() * 0.4;
                const len = r * c.facetLength * (0.6 + rand() * 0.4);
                ctx.lineWidth = 1 + rand() * 1.6;
                ctx.globalAlpha = 0.5 + rand() * 0.4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                let px = 0, py = 0;
                for (let j = 0; j < 3; j++) {
                    const ja = a + (rand() - 0.5) * 0.5;
                    px += Math.cos(ja) * (len / 3);
                    py += Math.sin(ja) * (len / 3);
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }

            // 3. 鏡面高光（少量、偏心，避免對稱的塑膠感）
            ctx.globalAlpha = 1;
            ctx.fillStyle = c.specColor;
            for (let i = 0; i < 3; i++) {
                const ox = (rand() - 0.5) * r * 1.1;
                const oy = (rand() - 0.5) * r * 1.1;
                ctx.globalAlpha = 0.18 + rand() * 0.22;
                ctx.beginPath();
                ctx.ellipse(ox, oy, r * 0.22, r * 0.05, rand() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }

            // 4. 噪聲裁切：霜面不再是完整六邊形，邊緣有結霜的斑駁
            ctx.globalAlpha = 1;
            applyNoiseMask(ctx, 'ice', c.noise, r, true, seed);
        });
    },

    /**
     * 灼痕／熔岩：暗底 + 亮邊裂縫，再用高對比噪聲裁成焦痕。
     */
    bakeScorch(size: number, seed = 11): HTMLCanvasElement {
        const c = MATERIAL_CONFIG.scorch;
        return bake(`SCORCH_${size}_${seed}_${c.noise.threshold}`, size, (ctx, r) => {
            const rand = rng(seed);

            const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
            grad.addColorStop(0, c.emberColor);
            grad.addColorStop(0.35, '#ea580c');
            grad.addColorStop(1, 'rgba(41,20,10,0.9)');
            ctx.fillStyle = grad;
            HexGeometry.traceHex(ctx, 0, 0, r * 0.95, false);
            ctx.fill();

            ctx.strokeStyle = c.emberColor;
            ctx.lineWidth = c.crackWidth;
            ctx.lineCap = 'round';
            for (let i = 0; i < c.crackCount; i++) {
                const a = rand() * Math.PI * 2;
                ctx.globalAlpha = 0.6 + rand() * 0.4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                let px = 0, py = 0;
                for (let j = 0; j < 4; j++) {
                    const ja = a + (rand() - 0.5) * 0.7;
                    px += Math.cos(ja) * (r * 0.22);
                    py += Math.sin(ja) * (r * 0.22);
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
            applyNoiseMask(ctx, 'scorch', c.noise, r, true, seed);
        });
    },

    /**
     * Ribbon：中點位移遞迴產生閃電／束縛鎖鏈路徑。
     * 直接畫在傳入的 ctx（相對座標，起點為原點），不需要遮罩。
     * @param seed 建議用 particle id 雜湊，保證同一發技能路徑穩定
     */
    drawRibbon(
        ctx: CanvasRenderingContext2D,
        toX: number,
        toY: number,
        color: string,
        seed: number,
        widthScale = 1,
    ) {
        const cfg = MATERIAL_CONFIG.lightning.ribbon;
        const rand = rng(seed);

        // 1. 以中點位移產生主路徑
        let pts: { x: number; y: number }[] = [{ x: 0, y: 0 }, { x: toX, y: toY }];
        let disp = cfg.displacement;
        for (let step = 0; step < cfg.subdivisions; step++) {
            const next: { x: number; y: number }[] = [pts[0]];
            for (let i = 0; i < pts.length - 1; i++) {
                const a = pts[i];
                const b = pts[i + 1];
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                // 沿線段法向量偏移
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;
                const off = (rand() - 0.5) * 2 * disp;
                next.push({ x: mx + nx * off, y: my + ny * off });
                next.push(b);
            }
            pts = next;
            disp *= cfg.roughness;
        }

        const stroke = (list: { x: number; y: number }[], w: number, alpha: number, col: string) => {
            ctx.strokeStyle = col;
            ctx.lineWidth = w;
            ctx.globalAlpha = alpha;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(list[0].x, list[0].y);
            for (let i = 1; i < list.length; i++) ctx.lineTo(list[i].x, list[i].y);
            ctx.stroke();
        };

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = color;
        ctx.shadowBlur = cfg.glowBlur;

        // 2. 由粗到細、由色到白疊繪，模擬 GLSL 的能量核心漸層
        for (let l = 0; l < cfg.layers; l++) {
            const t = l / Math.max(1, cfg.layers - 1);
            const w = (cfg.layers - l) * 2.2 * widthScale;
            stroke(pts, w, 0.35 + t * 0.55, t > 0.8 ? '#ffffff' : color);
        }

        // 3. 分岔：短、細、半透明，只從主路徑節點長出
        ctx.shadowBlur = cfg.glowBlur * 0.5;
        for (let i = 2; i < pts.length - 2; i += 2) {
            if (rand() > cfg.branchChance) continue;
            const p = pts[i];
            const q = pts[i + 1];
            const bx = p.x + (q.x - p.x) * cfg.branchScale * 4 + (rand() - 0.5) * 40;
            const by = p.y + (q.y - p.y) * cfg.branchScale * 4 + (rand() - 0.5) * 40;
            stroke([p, { x: bx, y: by }], 1.2 * widthScale, 0.4, color);
        }

        ctx.restore();
    },

    /**
     * 三層同心光管 + 滾動螺旋緞帶。
     * 呼叫端需已 rotate 到光束方向，原點在起點。
     */
    drawLayeredBeam(
        ctx: CanvasRenderingContext2D,
        dist: number,
        width: number,
        color: string,
        now: number,
    ) {
        const cfg = MATERIAL_CONFIG.beam.core;
        const breathe = 1 + Math.sin(now * 12) * cfg.breathe;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < cfg.tubes; i++) {
            const w = width * breathe * Math.pow(cfg.tubeFalloff, i);
            const grad = ctx.createLinearGradient(0, -w, 0, w);
            const inner = i === cfg.tubes - 1 ? '#ffffff' : color;
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.35, color);
            grad.addColorStop(0.5, inner);
            grad.addColorStop(0.65, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.45 + i * 0.2;
            ctx.fillRect(0, -w, dist, w * 2);
        }

        // 螺旋緞帶：虛線沿光束滾動，替代 GLSL 的 UV 位移
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.setLineDash(cfg.dash);
        ctx.lineDashOffset = -now * cfg.scrollSpeed;
        const amp = width * breathe * 0.9;
        for (const sign of [-1, 1]) {
            ctx.beginPath();
            const seg = Math.max(8, Math.floor(dist / 12));
            for (let i = 0; i <= seg; i++) {
                const t = i / seg;
                const x = dist * t;
                const y = Math.sin(t * Math.PI * 4 + now * 8) * amp * sign;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
    },

    /**
     * 殘影拖尾：對同一張貼圖沿速度反方向遞減 alpha 疊繪。
     * 用來近似對方的 velocity distortion pass，不需要位移貼圖。
     */
    drawMotionTrail(
        ctx: CanvasRenderingContext2D,
        img: CanvasImageSource,
        size: number,
        vx: number,
        vy: number,
        baseAlpha: number,
    ) {
        const cfg = MATERIAL_CONFIG.motionTrail;
        if (!MATERIAL_CONFIG.enabled || !cfg.enabled) return;
        const speed = Math.hypot(vx, vy);
        if (speed < 1) return;
        const ux = vx / speed;
        const uy = vy / speed;
        const stride = Math.min(size, speed * cfg.stride * 0.016);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        let a = baseAlpha * cfg.falloff;
        for (let i = 1; i <= cfg.samples; i++) {
            ctx.globalAlpha = a;
            const ox = -ux * stride * i;
            const oy = -uy * stride * i;
            ctx.drawImage(img, ox - size, oy - size, size * 2, size * 2);
            a *= cfg.falloff;
        }
        ctx.restore();
    },
};
