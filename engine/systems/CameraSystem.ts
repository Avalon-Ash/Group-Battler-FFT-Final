
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
    private readonly PAN_DAMPING = 12.0; 
    private readonly ZOOM_DAMPING = 10.0;
    
    // Trauma System (Non-Nauseating Shake)
    // REBALANCED V2.0: Much tighter, snappier shakes.
    private trauma: number = 0;
    private readonly SHAKE_POWER = 8.0;   // Reduced from 15.0. Max displacement in pixels at 100% trauma.
    private readonly DECAY_RATE = 3.0;    // Increased from 1.2. Recovery speed. Higher = Snappier.

    constructor() {}

    public snapTo(x: number, y: number, zoom: number) {
        this.x = this.targetX = x;
        this.y = this.targetY = y;
        this.zoom = this.targetZoom = zoom;
    }

    public reset() {
        this.trauma = 0;
    }

    public sync(camera: Camera) {
        this.targetX = camera.x;
        this.targetY = camera.y;
        this.targetZoom = camera.zoom;
    }

    public addTrauma(amount: number) {
        // Cap trauma to 1.0 (Full intensity)
        // Soft cap: Adding trauma when already shaking has diminishing returns
        const effectiveAdd = amount * (1.0 - this.trauma * 0.5);
        this.trauma = Math.min(1.0, this.trauma + effectiveAdd);
    }

    public getTrauma(): number {
        return this.trauma;
    }

    public update(dt: number) {
        // 1. Linear Decay
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * this.DECAY_RATE);
        }

        // 2. Smooth Interpolation
        const panT = 1 - Math.exp(-this.PAN_DAMPING * dt);
        const zoomT = 1 - Math.exp(-this.ZOOM_DAMPING * dt);

        this.x += (this.targetX - this.x) * panT;
        this.y += (this.targetY - this.y) * panT;
        this.zoom += (this.targetZoom - this.zoom) * zoomT;
    }

    public applyTransform(ctx: CanvasRenderingContext2D, width: number, height: number) {
        // 1. Calculate Shake Offset
        // Use trauma squared for a more natural impact curve (Square falloff)
        // Low trauma = barely moves. High trauma = kicks hard.
        let sx = 0, sy = 0;
        if (this.trauma > 0) {
            const mag = this.trauma * this.trauma * this.SHAKE_POWER;
            sx = (Math.random() - 0.5) * 2 * mag;
            sy = (Math.random() - 0.5) * 2 * mag;
        }

        const cx = width / 2;
        const cy = height / 2;

        /**
         * STABILIZATION LOGIC:
         * To prevent "pixel crawling" or blur, the final world-to-screen translation
         * must be an integer. We calculate the theoretical offset and snap it.
         */
        const targetTx = cx - this.x * this.zoom + sx;
        const targetTy = cy - this.y * this.zoom + sy;
        
        ctx.translate(Math.round(targetTx), Math.round(targetTy));
        ctx.scale(this.zoom, this.zoom);
        
        // Final matrix is now: Snap(ScreenCenter - WorldPos * Zoom + Shake)
    }
}
