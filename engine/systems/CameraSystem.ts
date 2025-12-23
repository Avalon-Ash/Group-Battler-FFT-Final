
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
    
    // Config
    private maxShakeOffset: number = 12;
    private maxShakeAngle: number = 0.02;
    
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
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    public getTrauma(): number {
        return this.trauma;
    }

    public update(dt: number) {
        // Trauma Decay
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * 1.2);
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
        // Threshold check
        if (this.trauma <= 0.55) return;

        ctx.save();
        
        // Glitch Strips
        const glitchIntensity = this.trauma * 6;
        const strips = Math.floor(Math.min(3, this.trauma * 5));
        
        ctx.globalAlpha = 0.5 * this.trauma;
        
        for(let i=0; i<strips; i++) {
            const y = Math.random() * height;
            const h = Math.random() * 30 + 10;
            const offX = (Math.random() - 0.5) * glitchIntensity * 4;
            
            ctx.drawImage(ctx.canvas, 
                0, y, width, h, 
                offX, y, width, h
            );
        }
        
        // Vignette Tint
        if (this.trauma > 0.8) {
            ctx.globalCompositeOperation = 'overlay';
            const grad = ctx.createRadialGradient(width/2, height/2, height*0.4, width/2, height/2, height);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, `rgba(255, 0, 0, ${this.trauma * 0.15})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
        }
        
        ctx.restore();
    }
}
