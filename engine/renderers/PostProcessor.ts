
import { createCanvas } from "../graphics/CanvasUtils";
import { MaterialPainter } from "../graphics/materials/MaterialPainter";
import { MATERIAL_CONFIG } from "../../data/vfx/materialConfig";

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
        if (transitionAberration <= 0.01) return;

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

        if (transitionAberration > 0.05) {
            const offset = Math.floor(transitionAberration * 15.0); 
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
        if (this.tempCanvas.width !== w || this.tempCanvas.height !== h) {
            this.tempCanvas.width = w;
            this.tempCanvas.height = h;
        }
        ctx.save();
        ctx.resetTransform();
        this.tempCtx.clearRect(0, 0, w, h);
        this.tempCtx.drawImage(ctx.canvas, 0, 0, w, h);
        
        const blurAmount = Math.floor(progress * 4);
        ctx.filter = `blur(${blurAmount}px) grayscale(${progress * 50}%)`;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(this.tempCanvas, 0, 0, w, h);
        ctx.filter = 'none';
        
        ctx.fillStyle = `rgba(0, 0, 0, ${progress * 0.6})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }
}
