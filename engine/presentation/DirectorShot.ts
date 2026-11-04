// ╔══════════════════════════════════════════════════════════╗
// ║  DirectorShot — 導播取鏡與鏡頭視窗純計算模組              ║
// ║  職責：計算取景範圍、景別縮放、鏡頭視窗死區與焦點平滑轉場；║
// ║        提供無副作用的純幾何與對數緩動運算。               ║
// ║  [ARCH] 不依賴遊戲引擎與繪製管線；所有縮放比較使用未夾    ║
// ║  的 raw 值避免桌面端縮放上限截斷；景別切換採遲滯防抖。     ║
// ╚══════════════════════════════════════════════════════════╝

import type { ShotExtent, ShotMember, ShotSize } from '../../types';
import { DIRECTOR_PARAM, UI_SETTINGS } from '../../constants';
import { VisualMath } from '../math/VisualMath';

/**
 * 依成員座標與權重計算加權重心，以及擴展至最遠成員邊界的世界空間半寬與半高。
 */
export function measureMembers(members: readonly ShotMember[]): ShotExtent | null {
    if (members.length === 0) return null;

    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;
    for (const m of members) {
        totalWeight += m.weight;
        sumX += m.x * m.weight;
        sumY += m.y * m.weight;
    }

    const cx = sumX / totalWeight;
    const cy = sumY / totalWeight;

    let maxDx = 0;
    let maxDy = 0;
    for (const m of members) {
        const dx = Math.abs(m.x - cx);
        const dy = Math.abs(m.y - cy);
        if (dx > maxDx) maxDx = dx;
        if (dy > maxDy) maxDy = dy;
    }

    return {
        cx,
        cy,
        halfW: maxDx + DIRECTOR_PARAM.UNIT_MARGIN_PX,
        halfH: maxDy + DIRECTOR_PARAM.UNIT_MARGIN_PX,
    };
}

/**
 * 未夾範圍的取景縮放值（供控制器比較門檻使用）。
 */
function rawFitZoom(ext: ShotExtent, W: number, H: number): number {
    const rawX = (W / 2) / (ext.halfW * DIRECTOR_PARAM.FRAME_PADDING);
    const rawY = (H / 2) / (ext.halfH * DIRECTOR_PARAM.FRAME_PADDING);
    return Math.min(rawX, rawY);
}

/**
 * 計算能完整框住範圍的縮放值，夾至導播縮放範圍。
 */
export function fitZoom(ext: ShotExtent, W: number, H: number): number {
    const raw = rawFitZoom(ext, W, H);
    return Math.max(UI_SETTINGS.CAMERA_ZOOM.directorMin, Math.min(UI_SETTINGS.CAMERA_ZOOM.directorMax, raw));
}

/**
 * 給定景別在當前視窗短邊下的基準縮放值，夾至導播縮放範圍。
 */
export function shotZoom(shot: ShotSize, W: number, H: number): number {
    const radius = DIRECTOR_PARAM.SHOT_RADIUS_PX[shot];
    const raw = (Math.min(W, H) / 2) / radius;
    return Math.max(UI_SETTINGS.CAMERA_ZOOM.directorMin, Math.min(UI_SETTINGS.CAMERA_ZOOM.directorMax, raw));
}

/**
 * 景別在給定視窗尺寸下的目標縮放值。
 * CLOSE、MID 為 shotZoom；WIDE 為 min(shotZoom('WIDE'), raw) 再夾至導播縮放範圍。
 */
function targetZoom(shot: ShotSize, raw: number, W: number, H: number): number {
    if (shot === 'CLOSE' || shot === 'MID') {
        return shotZoom(shot, W, H);
    }
    const wideTarget = Math.min(shotZoom('WIDE', W, H), raw);
    return Math.max(UI_SETTINGS.CAMERA_ZOOM.directorMin, Math.min(UI_SETTINGS.CAMERA_ZOOM.directorMax, wideTarget));
}

/**
 * 檢查給定景別是否能放得下未夾縮放值 raw。WIDE 永遠放得下。
 */
function isFitting(shot: ShotSize, raw: number, W: number, H: number): boolean {
    if (shot === 'WIDE') return true;
    return raw >= shotZoom(shot, W, H);
}

/**
 * 依 CLOSE → MID → WIDE 尋找最緊且放得下的景別。
 */
function tightestFittingShot(raw: number, W: number, H: number): ShotSize {
    if (raw >= shotZoom('CLOSE', W, H)) return 'CLOSE';
    if (raw >= shotZoom('MID', W, H)) return 'MID';
    return 'WIDE';
}

/**
 * 尋找比目前景別更緊、且滿足 raw >= shotZoom(s) * SHOT_IN_MARGIN 的最緊景別。
 */
function findTighteningShot(current: ShotSize, raw: number, W: number, H: number): ShotSize | null {
    if (current === 'CLOSE') return null;
    if (raw >= shotZoom('CLOSE', W, H) * DIRECTOR_PARAM.SHOT_IN_MARGIN) {
        return 'CLOSE';
    }
    if (current === 'WIDE' && raw >= shotZoom('MID', W, H) * DIRECTOR_PARAM.SHOT_IN_MARGIN) {
        return 'MID';
    }
    return null;
}

/**
 * 鏡頭死區視窗：焦點在視窗內時鏡頭不動，超出邊緣時推動鏡頭使焦點剛好在邊上。
 */
export class CameraWindow {
    private x: number | null = null;
    private y: number | null = null;

    public reset(): void {
        this.x = null;
        this.y = null;
    }

    public update(fx: number, fy: number, zoom: number, W: number, H: number): { x: number; y: number } {
        if (this.x === null || this.y === null) {
            this.x = fx;
            this.y = fy;
            return { x: this.x, y: this.y };
        }

        const shortSide = Math.min(W, H);
        const halfW = (DIRECTOR_PARAM.WINDOW_X * shortSide) / zoom;
        const halfH = (DIRECTOR_PARAM.WINDOW_Y * shortSide) / zoom;

        if (fx > this.x + halfW) {
            this.x = fx - halfW;
        } else if (fx < this.x - halfW) {
            this.x = fx + halfW;
        }

        if (fy > this.y + halfH) {
            this.y = fy - halfH;
        } else if (fy < this.y - halfH) {
            this.y = fy + halfH;
        }

        return { x: this.x, y: this.y };
    }
}

/**
 * 換焦點時的平滑過渡器：在 SWITCH_BLEND_S 內從起點平滑過渡到即時焦點。
 */
export class FocusBlend {
    private active: boolean = false;
    private fromX: number = 0;
    private fromY: number = 0;
    private elapsed: number = 0;

    public reset(): void {
        this.active = false;
    }

    public begin(fromX: number, fromY: number): void {
        this.active = true;
        this.fromX = fromX;
        this.fromY = fromY;
        this.elapsed = 0;
    }

    public apply(x: number, y: number, dt: number): { x: number; y: number } {
        if (!this.active) {
            return { x, y };
        }

        this.elapsed += dt;
        if (this.elapsed >= DIRECTOR_PARAM.SWITCH_BLEND_S) {
            this.active = false;
            return { x, y };
        }

        const s = VisualMath.smoothstep(0, 1, this.elapsed / DIRECTOR_PARAM.SWITCH_BLEND_S);
        return {
            x: this.fromX + (x - this.fromX) * s,
            y: this.fromY + (y - this.fromY) * s,
        };
    }
}

/**
 * 景別縮放狀態機與平滑控制器。
 */
export class ShotZoomController {
    public shot: ShotSize = 'WIDE';
    public zoom: number = DIRECTOR_PARAM.EMPTY_ZOOM;

    private initialized: boolean = false;
    private outTimer: number = 0;
    private inTimer: number = 0;
    private blend: {
        from: number;
        duration: number;
        elapsed: number;
    } | null = null;

    public reset(): void {
        this.shot = 'WIDE';
        this.zoom = DIRECTOR_PARAM.EMPTY_ZOOM;
        this.initialized = false;
        this.outTimer = 0;
        this.inTimer = 0;
        this.blend = null;
    }

    public update(ext: ShotExtent, W: number, H: number, dt: number): number {
        const raw = rawFitZoom(ext, W, H);

        if (!this.initialized) {
            this.initialized = true;
            this.shot = tightestFittingShot(raw, W, H);
            this.zoom = targetZoom(this.shot, raw, W, H);
            this.outTimer = 0;
            this.inTimer = 0;
            this.blend = null;
            return this.zoom;
        }

        // 拉遠判定：目前景別放不下時累加 outTimer，一放得下就歸零。
        if (!isFitting(this.shot, raw, W, H)) {
            this.inTimer = 0;
            this.outTimer += dt;
            if (this.outTimer >= DIRECTOR_PARAM.SHOT_OUT_HOLD_S) {
                this.shot = tightestFittingShot(raw, W, H);
                this.outTimer = 0;
                this.inTimer = 0;
                this.startBlend(DIRECTOR_PARAM.SHOT_OUT_BLEND_S);
            }
        } else {
            this.outTimer = 0;
            // 拉近判定：找比目前緊的最緊景別且滿足 raw >= shotZoom(s) * SHOT_IN_MARGIN。
            const tighter = findTighteningShot(this.shot, raw, W, H);
            if (tighter !== null) {
                this.inTimer += dt;
                if (this.inTimer >= DIRECTOR_PARAM.SHOT_IN_HOLD_S) {
                    this.shot = tighter;
                    this.outTimer = 0;
                    this.inTimer = 0;
                    this.startBlend(DIRECTOR_PARAM.SHOT_IN_BLEND_S);
                }
            } else {
                this.inTimer = 0;
            }
        }

        const target = targetZoom(this.shot, raw, W, H);

        if (this.blend !== null) {
            this.blend.elapsed += dt;
            if (this.blend.elapsed >= this.blend.duration) {
                this.blend = null;
                this.zoom = target;
            } else {
                const s = VisualMath.smoothstep(0, 1, this.blend.elapsed / this.blend.duration);
                const lnFrom = Math.log(this.blend.from);
                const lnTarget = Math.log(target);
                this.zoom = Math.exp(lnFrom + (lnTarget - lnFrom) * s);
            }
        } else {
            if (this.shot === 'CLOSE' || this.shot === 'MID') {
                this.zoom = target;
            } else {
                const lnCurrent = Math.log(this.zoom);
                const lnTarget = Math.log(target);
                const maxStep = DIRECTOR_PARAM.WIDE_ZOOM_RATE_PER_S * dt;
                const diff = lnTarget - lnCurrent;
                if (Math.abs(diff) <= maxStep) {
                    this.zoom = target;
                } else {
                    this.zoom = Math.exp(lnCurrent + Math.sign(diff) * maxStep);
                }
            }
        }

        this.zoom = Math.max(UI_SETTINGS.CAMERA_ZOOM.directorMin, Math.min(UI_SETTINGS.CAMERA_ZOOM.directorMax, this.zoom));
        return this.zoom;
    }

    private startBlend(duration: number): void {
        this.blend = {
            from: this.zoom,
            duration,
            elapsed: 0,
        };
    }
}
