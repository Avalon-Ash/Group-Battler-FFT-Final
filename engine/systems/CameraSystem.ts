
export interface Camera {
    x: number;
    y: number;
    zoom: number;
}

export class CameraSystem {
    // Current State
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1.0;

    // Trauma System (0.0 to 1.0)
    private trauma: number = 0;
    
    // Config - SENIOR TA ADJUSTMENT: Values significantly lowered for clarity
    private maxShakeOffset: number = 6;   // Was 12. Subtle thud > Wild shake.
    private maxShakeAngle: number = 0.005; // Was 0.02. Almost no rotation to prevent motion sickness.
    
    // Current Frame Shake Values (Calculated in update)
    private currentShakeX: number = 0;
    private currentShakeY: number = 0;
    private currentShakeRot: number = 0;

    constructor() {}

    public sync(camera: Camera) {
        this.x = camera.x;
        this.y = camera.y;
        this.zoom = camera.zoom;
    }

    public addTrauma(amount: number) {
        // Non-linear addition could be added here, but clamping is fine.
        // We rely on the input side to send smaller values.
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    public getTrauma(): number {
        return this.trauma;
    }

    public update(dt: number) {
        // Trauma Decay - SENIOR TA ADJUSTMENT: Fast recovery (2.0)
        // Snappy impacts are better than lingering wobbles.
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * 2.0);
        }

        // Calculate Shake (Trauma^2)
        const shakeFactor = this.trauma * this.trauma;
        this.currentShakeX = (Math.random() * 2 - 1) * this.maxShakeOffset * shakeFactor;
        this.currentShakeY = (Math.random() * 2 - 1) * this.maxShakeOffset * shakeFactor;
        this.currentShakeRot = (Math.random() * 2 - 1) * this.maxShakeAngle * shakeFactor;
    }

    public applyTransform(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
        ctx.translate(canvasWidth / 2 + this.currentShakeX, canvasHeight / 2 + this.currentShakeY);
        ctx.rotate(this.currentShakeRot);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x - canvasWidth / 2 / this.zoom, -this.y - canvasHeight / 2 / this.zoom);
    }

    public applyPostProcessing(ctx: CanvasRenderingContext2D, width: number, height: number) {
        // Threshold check - SENIOR TA ADJUSTMENT: Only Glitch on MASSIVE hits (>0.75)
        // This keeps the game clean 95% of the time.
        if (this.trauma <= 0.75) return;

        ctx.save();
        
        // Glitch Strips
        const glitchIntensity = this.trauma * 6;
        const strips = Math.floor(Math.min(2, this.trauma * 3)); // Max 2 strips
        
        ctx.globalAlpha = 0.3 * this.trauma; // Lower opacity
        
        for(let i=0; i<strips; i++) {
            const y = Math.random() * height;
            const h = Math.random() * 20 + 5; // Thinner strips
            const offX = (Math.random() - 0.5) * glitchIntensity * 4;
            
            ctx.drawImage(ctx.canvas, 
                0, y, width, h, 
                offX, y, width, h
            );
        }
        
        // Vignette Tint - Subtle
        if (this.trauma > 0.9) {
            ctx.globalCompositeOperation = 'overlay';
            const grad = ctx.createRadialGradient(width/2, height/2, height*0.5, width/2, height/2, height);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, `rgba(255, 0, 0, ${this.trauma * 0.1})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
        }
        
        ctx.restore();
    }
}
