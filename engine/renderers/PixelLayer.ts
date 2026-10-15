/**
 * PixelLayer — 像素世界原型的低解析度離屏畫布（ART_SPEC §12，P0a）
 * -----------------------------------------------------------------------------
 *  - ?pixel=2|3 啟用；世界層畫在 ceil(pW/k)×ceil(pH/k) 的畫布上，再以最近鄰整數倍放大到主畫布。
 *  - 鏡頭平移量對齊到世界像素格（不做次像素移動），特效層用同一組（放大 k 倍的）變換，確保兩層對齊。
 */

import { PIXEL_WORLD } from '../../constants';
import { RenderOp, RenderOpType } from './RenderList';

export function readPixelFactorParam(): number {
    if (typeof location === 'undefined' || !location.search) return 1;
    try {
        const val = new URLSearchParams(location.search).get(PIXEL_WORLD.QUERY_KEY);
        if (val !== null) {
            const parsed = parseInt(val, 10);
            if ((PIXEL_WORLD.ALLOWED_FACTORS as readonly number[]).includes(parsed)) return parsed;
        }
    } catch {
        // 安全忽略無效 URL
    }
    return 1;
}

/**
 * 特效層：空中 VFX 與投射物維持全解析度（本來就排在單位之上，subLayer AIR_VFX）。
 * 地面 VFX、光環、地面殘留留在像素層，才能維持被障礙物／單位遮擋的深度順序。
 * 代價：空中特效不再被更前方的單位或障礙物遮住（ART_SPEC §12 記錄）。
 */
export function isModernLayerOp(op: Pick<RenderOp, 'type' | 'isGround'>): boolean {
    if (op.type === RenderOpType.PROJECTILE) return true;
    return op.type === RenderOpType.VFX && !op.isGround;
}

export class PixelLayer {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    /** 取得（必要時重建）低解析度畫布，已清成背景色、變換已重設。 */
    public begin(pW: number, pH: number, factor: number): CanvasRenderingContext2D | null {
        const w = Math.ceil(pW / factor);
        const h = Math.ceil(pH / factor);
        if (!this.canvas) {
            if (typeof document === 'undefined') return null;
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
        }
        if (!this.ctx) return null;
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
        }
        const ctx = this.ctx;
        ctx.resetTransform();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = PIXEL_WORLD.CLEAR_COLOR;
        ctx.fillRect(0, 0, w, h);
        return ctx;
    }

    /** 把目前變換的平移量捨入到整數低解析度像素（世界像素格對齊）。 */
    public static snapTranslation(ctx: CanvasRenderingContext2D): DOMMatrix {
        const m = ctx.getTransform();
        m.e = Math.round(m.e);
        m.f = Math.round(m.f);
        ctx.setTransform(m);
        return m;
    }

    /** 在主畫布套用「低解析度變換 × k」，讓全解析度層與像素格對齊。 */
    public static applyUpscaled(ctx: CanvasRenderingContext2D, m: DOMMatrix, factor: number): void {
        ctx.setTransform(m.a * factor, m.b * factor, m.c * factor, m.d * factor, m.e * factor, m.f * factor);
    }

    /** 以最近鄰整數倍放大貼回主畫布。 */
    public blit(dst: CanvasRenderingContext2D, factor: number): void {
        if (!this.canvas) return;
        dst.save();
        dst.resetTransform();
        dst.imageSmoothingEnabled = false;
        dst.drawImage(this.canvas, 0, 0, this.canvas.width * factor, this.canvas.height * factor);
        dst.restore();
    }
}
