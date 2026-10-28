import { POST_PROCESS } from "../../constants";

import { createCanvas } from "../graphics/CanvasUtils";
import { MaterialPainter } from "../graphics/materials/MaterialPainter";
import { MATERIAL_CONFIG } from "../../data/vfx/materialConfig";
import { isToneGradeEnabled, getQualityTier } from "./RenderQuality";
import { RENDER_QUALITY } from "../../constants";

/** 全畫面濾鏡只在高品質階層套用（RENDER_QUALITY.POST_FX_MAX_TIER） */
function postFxEnabled(): boolean {
    return getQualityTier() <= RENDER_QUALITY.POST_FX_MAX_TIER;
}

export class PostProcessor {
    private tempCanvas: HTMLCanvasElement;
    private tempCtx: CanvasRenderingContext2D;
    
    constructor() {
        const { canvas, ctx } = createCanvas(1, 1);
        this.tempCanvas = canvas;
        this.tempCtx = ctx;
    }

    public apply(ctx: CanvasRenderingContext2D, width: number, height: number, trauma: number, transitionAberration: number = 0) {
        // FLASHING & JITTER REMOVED. 
        // We only support the transition aberration during scene changes.
        if (transitionAberration <= POST_PROCESS.ABERRATION_MIN || !postFxEnabled()) return;

        const w = Math.floor(width);
        const h = Math.floor(height);

        if (this.tempCanvas.width !== w || this.tempCanvas.height !== h) {
            this.tempCanvas.width = w;
            this.tempCanvas.height = h;
        }

        ctx.save();
        ctx.resetTransform();

        this.tempCtx.clearRect(0, 0, w, h);
        this.tempCtx.drawImage(ctx.canvas, 0, 0, w, h);

        if (transitionAberration > POST_PROCESS.ABERRATION_SPLIT_MIN) {
            const offset = Math.floor(transitionAberration * POST_PROCESS.ABERRATION_OFFSET); 
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.drawImage(this.tempCanvas, -offset, 0);
            ctx.drawImage(this.tempCanvas, offset, 0);
            ctx.restore();
        }
        ctx.restore();
    }

    /**
     * [MATERIAL UPGRADE] 色調分級 pass
     * 對應 LinearAbilityCastingThreeJS 的 tone grading post-process（曝光/對比/飽和）。
     * 故意放在世界層結束、HUD 之前，避免 UI 文字跟著變色。
     * 參數一律讀 MATERIAL_CONFIG.grade，可在暫停狀態下即時調整。
     */
    public applyToneGrade(ctx: CanvasRenderingContext2D, width: number, height: number) {
        if (!isToneGradeEnabled()) return;
        if (!MATERIAL_CONFIG.enabled || !MATERIAL_CONFIG.grade.enabled) return;
        const filter = MaterialPainter.gradeFilter();
        if (filter === 'none') return;

        const w = Math.floor(width);
        const h = Math.floor(height);
        if (w <= 0 || h <= 0) return;
        if (this.tempCanvas.width !== w || this.tempCanvas.height !== h) {
            this.tempCanvas.width = w;
            this.tempCanvas.height = h;
        }

        ctx.save();
        ctx.resetTransform();
        this.tempCtx.clearRect(0, 0, w, h);
        this.tempCtx.drawImage(ctx.canvas, 0, 0, w, h);
        ctx.clearRect(0, 0, w, h);
        ctx.filter = filter;
        ctx.drawImage(this.tempCanvas, 0, 0, w, h);
        ctx.filter = 'none';
        ctx.restore();
    }

    public applyFinishBlur(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number) {
        if (progress <= 0) return;
        const w = Math.floor(width);
        const h = Math.floor(height);
        ctx.save();
        ctx.resetTransform();
        if (postFxEnabled()) {
            if (this.tempCanvas.width !== w || this.tempCanvas.height !== h) {
                this.tempCanvas.width = w;
                this.tempCanvas.height = h;
            }
            this.tempCtx.clearRect(0, 0, w, h);
            this.tempCtx.drawImage(ctx.canvas, 0, 0, w, h);

            const blurAmount = Math.floor(progress * 4);
            ctx.filter = `blur(${blurAmount}px) grayscale(${progress * POST_PROCESS.FINISH_GRAYSCALE}%)`;
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(this.tempCanvas, 0, 0, w, h);
            ctx.filter = 'none';
        }

        // 壓暗在所有階層都保留（戰鬥結束的提示）
        ctx.fillStyle = `rgba(0, 0, 0, ${progress * POST_PROCESS.FINISH_DIM_ALPHA})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }
}
