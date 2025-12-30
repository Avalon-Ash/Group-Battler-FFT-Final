
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

    private vx: number = 0;
    private vy: number = 0;
    private readonly MOMENTUM_FRICTION = 0.92;
    private readonly PAN_DAMPING = 18.0;
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
        this.targetX = camera.x;
        this.targetY = camera.y;
        this.targetZoom = camera.zoom;
    }

    public applyPanOffset(dx: number, dy: number) {
        const factor = 1.0 / this.zoom;
        const worldDx = dx * factor;
        const worldDy = dy * factor;

        // 更新目標位置
        this.targetX -= worldDx;
        this.targetY -= worldDy;
        
        // UX 優化：手動拖曳時採用「直接操縱」(Direct Manipulation)
        // 強制將當前位置同步為目標位置，消除 Lerp 帶來的阻尼感與延遲
        this.x = this.targetX;
        this.y = this.targetY;

        // 歸零慣性，防止拖曳停止後發生意外漂移
        this.vx = 0;
        this.vy = 0;
    }

    public addTrauma(amount: number) {
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    public getTrauma(): number {
        return this.trauma;
    }

    public update(dt: number) {
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * this.DECAY_RATE);
        }

        // 僅在非手動拖曳時應用慣性物理 (例如後續新增的拋擲效果)
        if (Math.abs(this.vx) > 0.01 || Math.abs(this.vy) > 0.01) {
            this.targetX += this.vx;
            this.targetY += this.vy;
            this.vx *= this.MOMENTUM_FRICTION;
            this.vy *= this.MOMENTUM_FRICTION;
        }

        const panT = 1 - Math.exp(-this.PAN_DAMPING * dt);
        const zoomT = 1 - Math.exp(-this.ZOOM_DAMPING * dt);
        
        // 平滑插值：主要用於程式化鏡頭移動 (Focus) 或 Zoom
        // 對於 applyPanOffset 觸發的操作，因 x 已等於 targetX，此行無影響
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
