/**
 * MaterialPainter — 把 Three.js/GLSL 的六種特效生成手法翻譯成 Canvas 2D
 * -----------------------------------------------------------------------------
 * 對照關係：
 *   GLSL SDF + noise 裁切      → 離屏烘焙 + destination-in 遮罩（bakeIceCrust / bakeScorch）
 *   Ribbon strip 參數化路徑    → 中點位移遞迴 + 多層輝光疊繪（drawRibbon）
 *   三層同心圓管光柱           → createLinearGradient 疊加 + setLineDash 滾動（drawLayeredBeam）
 *   後處理色調分級             → ctx.filter 字串（gradeFilter）
 *
 * 所有數值一律讀 MATERIAL_CONFIG，不在此檔寫死。
 *
 * 注意：destination-in 會影響整個目標 canvas，因此遮罩類效果一律
 * 在離屏 canvas 完成後才 drawImage 回主畫面，絕不直接對主 ctx 操作。
 */

import { createCanvas } from '../CanvasUtils';
import { getGrainTile, variantFor } from './NoiseLib';
import { MATERIAL_CONFIG } from '../../../data/vfx/materialConfig';
import { HexGeometry } from '../utils/HexGeometry';
import type { HexLayout } from '../../../types';


export const MaterialPainter = {

    /**
     * 地形頂面顆粒層。
     * 呼叫前 ctx 的原點必須已經在該格頂面中心（TerrainRenderer 已 translate 好）。
     * 只做一次 clip + drawImage：clip 保證顆粒不溢出六邊形，overlay 保留 theme 色相。
     *
     * @param r      六邊形半徑（含 EXPANSION_BIAS）
     * @param layout hex 排列方向
     * @param q,r2   格座標，用來選變體（確定性）
     */
    paintTerrainGrain(
        ctx: CanvasRenderingContext2D,
        r: number,
        layout: HexLayout,
        q: number,
        r2: number,
    ) {
        const cfg = MATERIAL_CONFIG.terrain.grain;
        if (!MATERIAL_CONFIG.enabled || !cfg.enabled || !Number.isFinite(r) || r <= 0) return;

        const variant = variantFor(q, r2, cfg.variants);
        const tile = getGrainTile(cfg, variant, MATERIAL_CONFIG.maskResolution);

        ctx.save();
        HexGeometry.traceHex(ctx, 0, 0, r, true, layout);
        ctx.clip();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha *= cfg.strength;
        ctx.drawImage(tile, -r, -r, r * 2, r * 2);
        ctx.restore();
    },

    /**
     * 側面垂直岩紋：用同一張顆粒貼圖沿 Y 軸拉長，模擬地層堆疊方向。
     * 呼叫前請先把目標面的路徑 clip 好。
     */
    paintSideGrain(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        variant: number,
    ) {
        const strength = MATERIAL_CONFIG.terrain.sideGrain;
        const cfg = MATERIAL_CONFIG.terrain.grain;
        if (!MATERIAL_CONFIG.enabled || !cfg.enabled || strength <= 0) return;
        if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;

        const tile = getGrainTile(cfg, variant, MATERIAL_CONFIG.maskResolution);
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha *= strength;
        // 橫向壓縮、縱向拉伸 → 顆粒呈垂直流向，讀起來像岩層
        ctx.drawImage(tile, x, y, w, h * 1.6);
        ctx.restore();
    },

    /**
     * 障礙物 sprite 風化。
     * 在 sprite 烘焙階段呼叫一次，執行期零成本。
     * source-atop 只在既有像素上作畫，不會破壞 sprite 的透明輪廓。
     */
    weatherSprite(canvas: HTMLCanvasElement, seedVariant = 0) {
        const cfg = MATERIAL_CONFIG.environment.grain;
        if (!MATERIAL_CONFIG.enabled || !cfg.enabled) return canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const tile = getGrainTile(cfg, seedVariant, MATERIAL_CONFIG.maskResolution);

        // 兩段式：先把顆粒裁成 sprite 的 alpha 形狀（離屏），再以 overlay 疊回。
        // 直接 source-atop 會把中灰「混」進暗部（黑曜石變灰、樹葉變淡），
        // overlay 才是保留原色相、只調明暗的正確混合模式。
        const layer = createCanvas(canvas.width, canvas.height);
        layer.ctx.drawImage(tile, 0, 0, canvas.width, canvas.height);
        layer.ctx.globalCompositeOperation = 'destination-in';
        layer.ctx.drawImage(canvas, 0, 0);

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = cfg.strength;
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
        return canvas;
    },

    /** 色調分級：直接接在最終合成前 */
    gradeFilter(): string {
        const g = MATERIAL_CONFIG.grade;
        if (!MATERIAL_CONFIG.enabled || !g.enabled) return 'none';
        return `contrast(${g.contrast}) saturate(${g.saturate}) brightness(${g.brightness})`;
    },

    /**
     * 角色甲胄材質處理（金屬微顆粒 + 邊緣鏡面高光）
     * @param ctx            目標 canvas context（座標系位於單位原點）
     * @param pathTrace      路徑定義回呼函數（用於精確 clip 至部位輪廓）
     * @param highlightColor 高光色（讀自 RoleAppearance.highlightColor）
     * @param isImperial     是否為帝國陣營（決定高光傾斜角度與合成風格）
     */
    paintArmorSurface(
        ctx: CanvasRenderingContext2D,
        pathTrace: () => void,
        highlightColor: string,
        isImperial: boolean,
    ) {
        const cfg = MATERIAL_CONFIG.unit?.armor;
        if (!MATERIAL_CONFIG.enabled || !cfg || !cfg.enabled) return;

        ctx.save();
        pathTrace();
        ctx.clip();

        // 1. 金屬微顆粒 (Armor Grain Overlay)
        if (cfg.strength > 0) {
            const variant = isImperial ? 0 : 1;
            const tile = getGrainTile({
                enabled: true,
                octaves: 4,
                frequency: 10.0,
                persistence: 0.5,
                lacunarity: 2.0,
                strength: cfg.strength,
                contrast: cfg.contrast,
                variants: 2,
                tintSpread: 0.04,
                edgeAO: 0,
                edgeBand: 0,
            }, variant, MATERIAL_CONFIG.maskResolution);

            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = cfg.strength;
            ctx.drawImage(tile, -80, -80, 160, 160);
        }

        // 2. 邊緣與鏡面高光 (Specular Highlight)
        if (cfg.specular > 0 && highlightColor) {
            ctx.globalCompositeOperation = isImperial ? 'screen' : 'lighter';
            ctx.globalAlpha = cfg.specular;

            if (isImperial) {
                // 帝國陶鋼：左上往右下傾斜的高光帶
                const specGrad = ctx.createLinearGradient(-30, -50, 10, -20);
                specGrad.addColorStop(0, highlightColor);
                specGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.35)');
                specGrad.addColorStop(0.7, 'transparent');
                specGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = specGrad;
                ctx.fillRect(-80, -80, 160, 160);
            } else {
                // 盟約混沌金屬：銳利反向對角燃燒高光
                const specGrad = ctx.createLinearGradient(20, -50, -20, 10);
                specGrad.addColorStop(0, highlightColor);
                specGrad.addColorStop(0.4, 'rgba(255, 120, 80, 0.35)');
                specGrad.addColorStop(0.8, 'transparent');
                specGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = specGrad;
                ctx.fillRect(-80, -80, 160, 160);
            }
        }

        ctx.restore();
    },

    /**
     * Token 棋座烘焙期風化處理（微顆粒 + 鑄造徽章邊緣高光）
     * 執行於 Token Factory 烘焙階段，執行期零開銷。
     */
    weatherToken(canvas: HTMLCanvasElement, highlightColor: string): HTMLCanvasElement {
        const cfg = MATERIAL_CONFIG.unit?.token;
        if (!MATERIAL_CONFIG.enabled || !cfg || !cfg.enabled) return canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const w = canvas.width;
        const h = canvas.height;

        // 1. 微顆粒 (Overlay Grain)
        if (cfg.grainStrength > 0) {
            const tile = getGrainTile({
                enabled: true,
                octaves: 3,
                frequency: 10.0,
                persistence: 0.5,
                lacunarity: 2.0,
                strength: cfg.grainStrength,
                contrast: 0.28,
                variants: 1,
                tintSpread: 0,
                edgeAO: 0,
                edgeBand: 0,
            }, 0, MATERIAL_CONFIG.maskResolution);

            // 離屏遮罩：將顆粒裁切至 Token 像素輪廓
            const layer = createCanvas(w, h);
            layer.ctx.drawImage(tile, 0, 0, w, h);
            layer.ctx.globalCompositeOperation = 'destination-in';
            layer.ctx.drawImage(canvas, 0, 0);

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = cfg.grainStrength;
            ctx.drawImage(layer.canvas, 0, 0);
            ctx.restore();
        }

        // 2. 鑄造徽章高光 (Specular / Edge Glow)
        if (cfg.edgeGlow > 0 && highlightColor) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = 'source-atop';

            const cx = w / 2;
            const cy = h / 2;
            const r = Math.min(cx, cy);
            const grad = ctx.createRadialGradient(
                cx - r * 0.35, cy - r * 0.4, r * 0.05,
                cx, cy, r
            );
            grad.addColorStop(0, highlightColor);
            grad.addColorStop(0.5, 'transparent');

            ctx.fillStyle = grad;
            ctx.globalAlpha = cfg.edgeGlow;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        return canvas;
    },
};
