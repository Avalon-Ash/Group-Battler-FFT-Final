
// ╔══════════════════════════════════════════════════════════╗
// ║  CameraSystem — 鏡頭控制系統                             ║
// ║  職責：viewport 平移、縮放、目標追蹤、跟隨平滑           ║
// ║  [TODO: CINEMACHINE] 未來支援多目標混合 / 自動構圖        ║
// ╚══════════════════════════════════════════════════════════╝

import { UI_SETTINGS } from '../../constants';
import type { Camera } from '../../types';

export type { Camera };

export class CameraSystem {
    // Current State
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1.0;

    // Target State (Where the director or physics wants to go)
    private targetX: number = 0;
    private targetY: number = 0;
    private targetZoom: number = 1.0;
    private directorZoom: number = 1.0;
    private manualZoom: boolean = false;

    public getTargetZoom(): number { return this.targetZoom; }

    private clampZoom(zoom: number): number {
        return Math.max(UI_SETTINGS.CAMERA_ZOOM.min, Math.min(UI_SETTINGS.CAMERA_ZOOM.max, zoom));
    }

    public resetZoomControl(): void {
        this.manualZoom = false;
        this.targetZoom = this.directorZoom;
    }

    // Physics Parameters (Exposed for UI)
    // Lower stiffness = Heavier, slower camera (Cinematic)
    // Higher stiffness = Snappy, responsive camera (Arcade)
    public followStiffness: number = UI_SETTINGS.CAMERA_STIFFNESS.followDefault;
    public zoomStiffness: number = UI_SETTINGS.CAMERA_STIFFNESS.zoomDefault;
    
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
        if (!this.manualZoom) this.zoom = this.targetZoom = this.clampZoom(zoom);
    }

    public reset() { 
        this.trauma = 0; 
        this.manualOverrideTimer = 0;
        this.isManualControlling = false;
        this.resetZoomControl();
    }

    // 外部 ref 僅為引擎鏡頭快照，不能把舊倍率寫回引擎。
    public sync(camera: Camera) {
        camera.x = this.x;
        camera.y = this.y;
        camera.zoom = this.zoom;
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
        if (!Number.isFinite(targetZoom) || targetZoom <= 0) return;
        this.targetZoom = this.clampZoom(targetZoom);
        this.manualZoom = true;
    }

    // 導播系統的輸入接口
    public setDirectorTarget(x: number, y: number, zoom: number) {
        this.directorZoom = this.clampZoom(zoom);
        // 只有在非手動模式下，導播系統才能控制目標點
        if (this.manualOverrideTimer <= 0) {
            this.isManualControlling = false;
            this.targetX = x;
            this.targetY = y;
            
            // Dead zone：±5% 內的 zoom 變化直接忽略，不觸發追蹤
            if (!this.manualZoom && Math.abs(this.directorZoom - this.targetZoom) > this.targetZoom * 0.05) {
                this.targetZoom = this.directorZoom;
            }
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
        const stiffness = this.manualZoom ? UI_SETTINGS.CAMERA_ZOOM.manualStiffness : this.zoomStiffness;
        const zoomFactor = 1.0 - Math.exp(-stiffness * dt);
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
