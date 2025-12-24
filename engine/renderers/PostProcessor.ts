
import { createCanvas } from "../graphics/CanvasUtils";

export class PostProcessor {
    private tempCanvas: HTMLCanvasElement;
    private tempCtx: CanvasRenderingContext2D;
    
    constructor() {
        const { canvas, ctx } = createCanvas(1, 1);
        this.tempCanvas = canvas;
        this.tempCtx = ctx;
    }

    public apply(ctx: CanvasRenderingContext2D, width: number, height: number, trauma: number) {
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
        
        // RESET TRANSFORM: We want to work in pure physical pixels 1:1
        // This eliminates any "Ghosting" caused by slight offsets in scale or translation
        ctx.resetTransform();

        // 1. Copy current frame to buffer
        this.tempCtx.clearRect(0, 0, w, h);
        this.tempCtx.drawImage(ctx.canvas, 0, 0, w, h);

        // 2. Chromatic Aberration (Significantly Toned Down)
        if (trauma > 0.1) {
            const offset = Math.floor(trauma * 4); // Smaller offset
            
            if (offset > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.3 * trauma;
                
                // Red Channel Shift
                ctx.drawImage(this.tempCanvas, -offset, 0);
                
                // Blue Channel Shift
                ctx.drawImage(this.tempCanvas, offset, 0);
                
                ctx.restore();
            }
        }

        // 3. Bloom / Glow (Optimized)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Very subtle bloom to avoid "Double Vision"
        ctx.globalAlpha = 0.1; 
        ctx.drawImage(this.tempCanvas, 0, 0);
        
        // High intensity bloom only on high trauma
        if (trauma > 0.5) {
            ctx.globalAlpha = 0.2 * trauma;
            ctx.drawImage(this.tempCanvas, 0, 0);
        }
        ctx.restore();

        // 4. Vignette (Dark corners)
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        const rad = Math.max(w, h) * 0.8;
        const vig = ctx.createRadialGradient(w/2, h/2, rad * 0.6, w/2, h/2, rad);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,10,20,0.5)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // 5. White Flash (Explosion impact)
        if (trauma > 0.8) {
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = `rgba(255,255,255,${(trauma - 0.8)})`;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // RESTORE STATE: Go back to DPR scaled context for UI drawing
        ctx.restore();
    }
}
