
export interface Camera {
    x: number;
    y: number;
    zoom: number;
}

export class CameraSystem {
    // Current Visual State (Smoothed)
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1.0;

    // Target State (Synced directly from Input)
    private targetX: number = 0;
    private targetY: number = 0;
    private targetZoom: number = 1.0;

    // Physics Constants
    // Higher damping = Snappier response, less "floaty"
    private readonly PAN_DAMPING = 12.0; 
    private readonly ZOOM_DAMPING = 10.0;
    
    // Trauma System (Screen Shake)
    // Range: 0.0 to 1.0
    private trauma: number = 0;
    // Max pixels to offset during 100% trauma. Kept low to be subtle.
    private readonly SHAKE_POWER = 3.0; 

    constructor() {}

    // Force immediate snap (used on init/resize)
    public snapTo(x: number, y: number, zoom: number) {
        this.x = this.targetX = x;
        this.y = this.targetY = y;
        this.zoom = this.targetZoom = zoom;
    }

    public reset() {
        this.trauma = 0;
    }

    // Sync directly with user input. 
    // Removed 'mapConfig' and 'mapKeys' args as we no longer calculate cinematic centers.
    public sync(camera: Camera) {
        this.targetX = camera.x;
        this.targetY = camera.y;
        this.targetZoom = camera.zoom;
    }

    public addTrauma(amount: number) {
        // Cap trauma to prevent nausea even during intense combat
        // Decay is fast, so this is just instantaneous impact
        this.trauma = Math.min(0.5, this.trauma + amount);
    }

    public getTrauma(): number {
        return this.trauma;
    }

    public update(dt: number) {
        // Fast Trauma Decay (Screen stabilizes quickly)
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * 3.0);
        }

        // Smooth Camera Movement (Spring-like interpolation)
        // Using exponential decay for frame-rate independence
        const panT = 1 - Math.exp(-this.PAN_DAMPING * dt);
        const zoomT = 1 - Math.exp(-this.ZOOM_DAMPING * dt);

        this.x += (this.targetX - this.x) * panT;
        this.y += (this.targetY - this.y) * panT;
        this.zoom += (this.targetZoom - this.zoom) * zoomT;
    }

    public applyTransform(ctx: CanvasRenderingContext2D, width: number, height: number) {
        // Calculate Shake on the fly (Stateless shake prevents permanent drift)
        // Non-linear trauma: square it so small trauma is barely felt
        let sx = 0, sy = 0;
        if (this.trauma > 0) {
            const mag = this.trauma * this.trauma * this.SHAKE_POWER;
            sx = (Math.random() - 0.5) * 2 * mag;
            sy = (Math.random() - 0.5) * 2 * mag;
        }

        const cx = width / 2;
        const cy = height / 2;

        // 1. Shake (Translation Only - No Rotation)
        ctx.translate(sx, sy);
        
        // 2. Camera View Transform (Pivot around screen center)
        ctx.translate(cx, cy);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }
}
