
export interface Camera {
    x: number;
    y: number;
    zoom: number;
}

export class CameraSystem {
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1.0;

    private targetX: number = 0;
    private targetY: number = 0;
    private targetZoom: number = 1.0;

    private readonly PAN_DAMPING = 12.0; 
    private readonly ZOOM_DAMPING = 10.0;
    
    // Trauma System - HARD LOCKED TO ZERO
    private trauma: number = 0;
    private readonly SHAKE_POWER = 0.0;   
    private readonly DECAY_RATE = 10.0;   

    constructor() {}

    public snapTo(x: number, y: number, zoom: number) {
        this.x = this.targetX = x;
        this.y = this.targetY = y;
        this.zoom = this.targetZoom = zoom;
    }

    public reset() { this.trauma = 0; }

    public sync(camera: Camera) {
        this.targetX = camera.x;
        this.targetY = camera.y;
        this.targetZoom = camera.zoom;
    }

    public addTrauma(amount: number) {
        // Logically tracked for logic-driven visuals, but visual impact is 0
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    public getTrauma(): number { return this.trauma; }

    public update(dt: number) {
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * this.DECAY_RATE);
        }
        const panT = 1 - Math.exp(-this.PAN_DAMPING * dt);
        const zoomT = 1 - Math.exp(-this.ZOOM_DAMPING * dt);
        this.x += (this.targetX - this.x) * panT;
        this.y += (this.targetY - this.y) * panT;
        this.zoom += (this.targetZoom - this.zoom) * zoomT;
    }

    public applyTransform(ctx: CanvasRenderingContext2D, width: number, height: number) {
        const cx = width / 2;
        const cy = height / 2;
        const targetTx = cx - this.x * this.zoom;
        const targetTy = cy - this.y * this.zoom;
        ctx.translate(Math.round(targetTx), Math.round(targetTy));
        ctx.scale(this.zoom, this.zoom);
    }
}
