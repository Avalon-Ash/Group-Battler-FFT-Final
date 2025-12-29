export interface Camera {
    x: number;
    y: number;
    zoom: number;
}

/**
 * 攝像機系統 v28.0 - 物理平滑版
 * 專為解決左鍵拖曳卡頓設計，採用二階阻尼運動
 */
export class CameraSystem {
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1.0;

    private targetX: number = 0;
    private targetY: number = 0;
    private targetZoom: number = 1.0;

    // 動量物理參數
    private vx: number = 0;
    private vy: number = 0;
    private readonly MOMENTUM_FRICTION = 0.92; // 調優後的阻力
    private readonly PAN_DAMPING = 18.0;       // 跟隨靈敏度提升
    private readonly ZOOM_DAMPING = 10.0;

    private trauma: number = 0;
    private readonly DECAY_RATE = 8.0;

    constructor() {}

    public snapTo(x: number, y: number, zoom: number) {
        this.x = this.targetX = x;
        this.y = this.targetY = y;
        this.zoom = this.targetZoom = zoom;
        this.vx = this.vy = 0;
    }

    public reset() { 
        this.trauma = 0; 
        this.vx = this.vy = 0;
    }

    public sync(camera: Camera) {
        // 更新目標位置
        this.targetX = camera.x;
        this.targetY = camera.y;
        this.targetZoom = camera.zoom;
    }

    /**
     * 應用即時位移 (由 Input 調用)
     * 絕對遵守數學引用：dx, dy 為屏幕像素偏移
     */
    public applyPanOffset(dx: number, dy: number) {
        const factor = 1.0 / this.zoom;
        const worldDx = dx * factor;
        const worldDy = dy * factor;

        this.targetX -= worldDx;
        this.targetY -= worldDy;
        
        // 累積動量 (物理滑行基礎)
        this.vx = -worldDx * 0.8;
        this.vy = -worldDy * 0.8;
    }

    public addTrauma(amount: number) {
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    // Fix: Added missing getter for trauma to resolve build error in RenderPipeline
    public getTrauma(): number {
        return this.trauma;
    }

    public update(dt: number) {
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * this.DECAY_RATE);
        }

        // 1. 處理滑動動量
        if (Math.abs(this.vx) > 0.01 || Math.abs(this.vy) > 0.01) {
            this.targetX += this.vx;
            this.targetY += this.vy;
            this.vx *= this.MOMENTUM_FRICTION;
            this.vy *= this.MOMENTUM_FRICTION;
        }

        // 2. 二階阻尼插值 (防止跳格)
        const panT = 1 - Math.exp(-this.PAN_DAMPING * dt);
        const zoomT = 1 - Math.exp(-this.ZOOM_DAMPING * dt);
        
        this.x += (this.targetX - this.x) * panT;
        this.y += (this.targetY - this.y) * panT;
        this.zoom += (this.targetZoom - this.zoom) * zoomT;
    }

    public applyTransform(ctx: CanvasRenderingContext2D, width: number, height: number) {
        const cx = width / 2;
        const cy = height / 2;
        
        let shakeX = 0, shakeY = 0;
        if (this.trauma > 0) {
            const p = this.trauma * this.trauma;
            shakeX = (Math.random() - 0.5) * 50 * p;
            shakeY = (Math.random() - 0.5) * 50 * p;
        }

        const targetTx = cx - (this.x + shakeX) * this.zoom;
        const targetTy = cy - (this.y + shakeY) * this.zoom;
        
        ctx.translate(Math.round(targetTx), Math.round(targetTy));
        ctx.scale(this.zoom, this.zoom);
    }
}