
import { MapConfig, HexUtils } from "../utils";

export interface Camera {
    x: number;
    y: number;
    zoom: number;
}

export class CameraSystem {
    // Current Visual State
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1.0;

    // Target State (The "Attractor")
    private targetX: number = 0;
    private targetY: number = 0;
    private targetZoom: number = 1.0;

    // Cinematic State
    private interestX: number | null = null;
    private interestY: number | null = null;
    private interestTimer: number = 0;

    // Damping: Higher = Snappier (Less "floaty")
    private readonly PAN_DAMPING = 8.0; 
    private readonly ZOOM_DAMPING = 5.0;

    // Trauma System
    private trauma: number = 0;
    private maxShakeOffset: number = 2.0;   // Drastically reduced from 5.0
    private maxShakeAngle: number = 0.002;  // Drastically reduced from 0.01
    
    private currentShakeX: number = 0;
    private currentShakeY: number = 0;
    private currentShakeRot: number = 0;

    constructor() {}

    // Force immediate snap (used on init/resize)
    public snapTo(x: number, y: number, zoom: number) {
        this.x = x;
        this.y = y;
        this.zoom = zoom;
        this.targetX = x;
        this.targetY = y;
        this.targetZoom = zoom;
    }

    public sync(camera: Camera, mapConfig: MapConfig, mapKeys: Set<string>) {
        // If user is manually interacting (inputs changing), cancel cinematic
        const dist = Math.abs(camera.x - this.targetX) + Math.abs(camera.y - this.targetY);
        const isUserMoving = dist > 10; // Threshold

        if (isUserMoving) {
            this.interestTimer = 0; // Cancel cinematic
            this.targetX = camera.x;
            this.targetY = camera.y;
            this.targetZoom = camera.zoom;
        } else if (this.interestTimer > 0 && this.interestX !== null && this.interestY !== null) {
            // --- CINEMATIC GENTLE DRIFT ---
            // Don't center perfectly on the action, just drift slightly towards it
            
            const center = this.getMapCenter(mapConfig, mapKeys);
            
            // Bias: 80% Map Center, 20% Action Point
            const bias = 0.2;
            const destX = center.x + (this.interestX - center.x) * bias;
            const destY = center.y + (this.interestY - center.y) * bias;
            
            this.targetX = destX - (100 / this.zoom); 
            this.targetY = destY;
            this.targetZoom = Math.max(camera.zoom, 1.2); 
        } else {
            // Default: Sync with React State (User Inputs)
            this.targetX = camera.x;
            this.targetY = camera.y;
            this.targetZoom = camera.zoom;
        }
    }

    // NEW: Calculate true visual center of the existing map tiles
    public getMapCenter(mapConfig: MapConfig, mapKeys: Set<string>) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let count = 0;

        mapKeys.forEach(k => {
            const [q, r] = k.split(',').map(Number);
            const p = HexUtils.toPx(q, r, mapConfig);
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
            count++;
        });

        if (count === 0) return { x: 0, y: 0 };

        return {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2
        };
    }

    public setInterestPoint(x: number, y: number, duration: number = 1.5) {
        // Only set interest if not already shaking heavily (combat chaos)
        if (this.trauma < 0.3) {
            this.interestX = x;
            this.interestY = y;
            this.interestTimer = duration;
        }
    }

    public addTrauma(amount: number) {
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    public getTrauma(): number {
        return this.trauma;
    }

    public update(dt: number) {
        if (this.interestTimer > 0) this.interestTimer -= dt;
        
        // Trauma Decay
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * 2.0);
        }

        // Calculate Shake
        const shakeFactor = this.trauma * this.trauma;
        this.currentShakeX = (Math.random() * 2 - 1) * this.maxShakeOffset * shakeFactor;
        this.currentShakeY = (Math.random() * 2 - 1) * this.maxShakeOffset * shakeFactor;
        this.currentShakeRot = (Math.random() * 2 - 1) * this.maxShakeAngle * shakeFactor;

        // Smooth Damping
        const panFactor = 1 - Math.exp(-this.PAN_DAMPING * dt);
        const zoomFactor = 1 - Math.exp(-this.ZOOM_DAMPING * dt);

        this.x += (this.targetX - this.x) * panFactor;
        this.y += (this.targetY - this.y) * panFactor;
        this.zoom += (this.targetZoom - this.zoom) * zoomFactor;
    }

    public applyTransform(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;

        // 1. Shake
        ctx.translate(this.currentShakeX, this.currentShakeY);
        
        // 2. Rotation (Only at high trauma)
        if (this.trauma > 0.5) {
            ctx.translate(cx, cy);
            ctx.rotate(this.currentShakeRot);
            ctx.translate(-cx, -cy);
        }

        // 3. Camera
        // Pivot around screen center
        ctx.translate(cx, cy);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }
}
