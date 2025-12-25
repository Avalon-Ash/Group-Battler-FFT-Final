
import { createCanvas } from "../graphics/CanvasUtils";

export class PostProcessor {
    private tempCanvas: HTMLCanvasElement;
    private tempCtx: CanvasRenderingContext2D;
    
    constructor() {
        const { canvas, ctx } = createCanvas(1, 1);
        this.tempCanvas = canvas;
        this.tempCtx = ctx;
    }

    public apply(ctx: CanvasRenderingContext2D, width: number, height: number, trauma: number, transitionAberration: number = 0) {
        const totalAberration = Math.max(trauma, transitionAberration);
        
        // PERF: Early exit if nothing exciting is happening
        if (totalAberration <= 0.01) return;

        // Ensure strictly integer dimensions to avoid sub-pixel blurring
        const w = Math.floor(width);
        const h = Math.floor(height);

        // Resize buffer if needed
        if (this.tempCanvas.width !== w || this.tempCanvas.height !== h) {
            this.tempCanvas.width = w;
            this.tempCanvas.height = h;
        }

        // SAVE STATE: We are likely in a DPR-scaled context
        ctx.save();
        
        // RESET TRANSFORM: Work in pure physical pixels
        ctx.resetTransform();

        // 1. Copy current frame to buffer
        this.tempCtx.clearRect(0, 0, w, h);
        this.tempCtx.drawImage(ctx.canvas, 0, 0, w, h);

        // 2. Chromatic Aberration (Shift RGB Channels)
        // Triggered by Trauma OR Map Transition
        if (totalAberration > 0.1) {
            const offset = Math.floor(totalAberration * 8.0); // Up to 8px split
            
            if (offset > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                
                // Opacity increases with intensity
                ctx.globalAlpha = 0.4 * totalAberration;
                
                // Red Channel Shift
                ctx.drawImage(this.tempCanvas, -offset, 0);
                
                // Blue Channel Shift
                ctx.drawImage(this.tempCanvas, offset, 0);
                
                ctx.restore();
            }
        }

        // 3. Bloom / Glow (Optimized)
        if (totalAberration > 0.3) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.2 * totalAberration; 
            ctx.drawImage(this.tempCanvas, 0, 0);
            ctx.restore();
        }

        // 4. Vignette (Dark corners)
        if (trauma > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'multiply';
            const rad = Math.max(w, h) * 0.8;
            const vig = ctx.createRadialGradient(w/2, h/2, rad * 0.6, w/2, h/2, rad);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, `rgba(0,10,20,${trauma * 0.8})`);
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // 5. White Flash (Explosion impact)
        if (trauma > 0.8) {
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = `rgba(255,255,255,${(trauma - 0.8)})`;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // RESTORE STATE: Go back to DPR scaled context
        ctx.restore();
    }

    // New: Game Over Blur Effect (Frosted Glass)
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

        // 1. Copy scene to buffer
        this.tempCtx.clearRect(0, 0, w, h);
        this.tempCtx.drawImage(ctx.canvas, 0, 0, w, h);

        // 2. Draw Back with Blur Filter
        const blurAmount = Math.floor(progress * 10);
        ctx.filter = `blur(${blurAmount}px)`;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(this.tempCanvas, 0, 0, w, h);
        ctx.filter = 'none';

        // 3. Frosted Glass Overlay (White Tint)
        ctx.fillStyle = `rgba(255, 255, 255, ${progress * 0.2})`;
        ctx.fillRect(0, 0, w, h);

        ctx.restore();
    }
}
