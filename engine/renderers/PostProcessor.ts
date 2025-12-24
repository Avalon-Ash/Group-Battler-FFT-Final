
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

        // 1. Copy current frame to buffer
        // CRITICAL: Clear buffer first to prevent accumulation
        this.tempCtx.clearRect(0, 0, w, h);
        this.tempCtx.drawImage(ctx.canvas, 0, 0, w, h);

        // 2. Chromatic Aberration (Significantly Toned Down)
        // Only apply if trauma is significant (> 0.1) to avoid constant blur
        if (trauma > 0.1) {
            const offset = Math.floor(trauma * 6); // Hard integer offset
            
            if (offset > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.4 * trauma;
                
                // Red Channel Shift
                ctx.drawImage(this.tempCanvas, -offset, 0);
                
                // Blue Channel Shift
                ctx.drawImage(this.tempCanvas, offset, 0);
                
                ctx.restore();
            }
        }

        // 3. Bloom / Glow (Optimized)
        // Instead of heavy blur which causes double-vision/ghosting, 
        // we use a very subtle overlay for brightness only.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // Only bloom really bright parts? 
        // We simulate this by lowering opacity.
        // Removed `filter: blur` because it kills performance and causes ghosting on some high-DPI screens.
        ctx.globalAlpha = 0.15; 
        ctx.drawImage(this.tempCanvas, 0, 0);
        
        // High intensity bloom only on high trauma
        if (trauma > 0.5) {
            ctx.globalAlpha = 0.2 * trauma;
            ctx.drawImage(this.tempCanvas, 0, 0);
        }
        ctx.restore();

        // 4. Vignette (Dark corners) - Helps focus eye
        ctx.save();
        ctx.globalCompositeOperation = 'multiply'; // Multiply is cleaner for vignette
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
    }
}
