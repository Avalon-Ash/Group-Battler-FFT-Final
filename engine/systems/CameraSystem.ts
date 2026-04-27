
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

    // Target State (Where the director or physics wants to go)
    private targetX: number = 0;
    private targetY: number = 0;
    private targetZoom: number = 1.0;

    // Physics Parameters (Exposed for UI)
    // Lower stiffness = Heavier, slower camera (Cinematic)
    // Higher stiffness = Snappy, responsive camera (Arcade)
    public followStiffness: number = 0.25; // Default lowered from 3.0 for cinematic feel
    public zoomStiffness: number = 0.6;   // Default lowered from 2.0
    
    // Mode Control
    private manualOverrideTimer: number = 0; // 手動操作後的冷卻時間
    private isManualControlling: boolean = false;

    private trauma: number = 0;
    private readonly DECAY_RATE = 8.0;

    constructor() {}

    // 初始化或瞬間跳轉
    public snapTo(x: number, y: number, zoom: number) {
        this.x = this.targetX = x;
        this.y = this.targetY = y;
        this.zoom = this.targetZoom = zoom;
    }

    public reset() { 
        this.trauma = 0; 
        this.manualOverrideTimer = 0;
    }

    // 外部同步 (React State -> Engine)
    public sync(camera: Camera) {
        if (this.isManualControlling) {
            this.targetX = camera.x;
            this.targetY = camera.y;
            this.targetZoom = camera.zoom;
        }
    }

    // 當玩家拖曳畫面時呼叫
    public applyPanOffset(dx: number, dy: number) {
        this.isManualControlling = true;
        this.manualOverrideTimer = 2.0; // 手動操作後，暫停導播 2 秒

        const factor = 1.0 / this.zoom;
        const worldDx = dx * factor;
        const worldDy = dy * factor;

        // 直接操縱：立即更新位置以達到跟手感
        this.x -= worldDx;
        this.y -= worldDy;
        this.targetX = this.x;
        this.targetY = this.y;
    }

    public applyZoom(targetZoom: number) {
        this.targetZoom = targetZoom;
        this.manualOverrideTimer = 1.0; 
    }

    // 導播系統的輸入接口
    public setDirectorTarget(x: number, y: number, zoom: number) {
        // 只有在非手動模式下，導播系統才能控制目標點
        if (this.manualOverrideTimer <= 0) {
            this.isManualControlling = false;
            this.targetX = x;
            this.targetY = y;
            this.targetZoom = zoom;
        }
    }

    public addTrauma(amount: number) {
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    public getTrauma(): number {
        return this.trauma;
    }

    public update(dt: number) {
        // 1. Trauma Decay
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * this.DECAY_RATE);
        }

        // 2. Manual Timer Decay
        if (this.manualOverrideTimer > 0) {
            this.manualOverrideTimer -= dt;
            if (this.manualOverrideTimer <= 0) {
                this.isManualControlling = false;
            }
        }

        // 3. Cinematic Smoothing (Exponential Interpolation)
        // 使用 dt 相關的 Lerp 公式: Current += (Target - Current) * (1 - exp(-speed * dt))
        // 這保證了 Frame Rate 獨立性且極度平滑

        // Position Smoothing
        // 使用 this.followStiffness 參數控制速度
        const panFactor = 1.0 - Math.exp(-this.followStiffness * dt);
        this.x += (this.targetX - this.x) * panFactor;
        this.y += (this.targetY - this.y) * panFactor;

        // Zoom Smoothing (Slower)
        const zoomFactor = 1.0 - Math.exp(-this.zoomStiffness * dt);
        this.zoom += (this.targetZoom - this.zoom) * zoomFactor;
    }

    public applyTransform(ctx: CanvasRenderingContext2D, width: number, height: number) {
        const cx = width / 2;
        const cy = height / 2;
        
        let shakeX = 0, shakeY = 0;
        if (this.trauma > 0) {
            const p = this.trauma * this.trauma;
            const maxShake = 30 * this.zoom; 
            const angle = Math.random() * Math.PI * 2;
            shakeX = Math.cos(angle) * maxShake * p;
            shakeY = Math.sin(angle) * maxShake * p;
        }

        const targetTx = cx - (this.x + shakeX) * this.zoom;
        const targetTy = cy - (this.y + shakeY) * this.zoom;
        
        ctx.translate(targetTx, targetTy); 
        ctx.scale(this.zoom, this.zoom);
    }
}
