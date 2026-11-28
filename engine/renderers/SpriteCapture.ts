// ╔══════════════════════════════════════════════════════════╗
// ║  SpriteCapture — 「這個 painter 會貼哪幾張圖」的唯一查詢口  ║
// ║  職責：painter 貼精靈時呼叫 blit（取代 ctx.drawImage）；    ║
// ║        平常照常畫，畫在擷取畫布上時改成記下來：來源圖、來源 ║
// ║        矩形、局部目的矩形、當下的畫布變換與不透明度。       ║
// ║  上游：SpriteUnitRenderer／PolymorphPainter 的剪影分支、    ║
// ║        RenderDispatcher 的 OBSTACLE（本體與加法疊層）。     ║
// ║        讀者：lighting/LightingPass（幾何遮罩由 GL 畫，      ║
// ║        docs/plans/gpu-geo-mask.md）。                       ║
// ║  [ARCH] 位置、旋轉、縮放、淡入淡出都不在這裡算：擷取時就是  ║
// ║        painter 自己那一串 translate／scale／rotate 跑一次， ║
// ║        數字只存在 painter 裡（RenderSpec §1 尾段）。         ║
// ║  [ARCH] 擷取畫布是 1×1，只累積變換，從不點陣化；不是 blit   ║
// ║        的繪製（路徑、備援圓形）畫在它上面等於沒畫。         ║
// ║  [ARCH] 不 import WebGL、不讀 LIGHTING（進入點）。           ║
// ╚══════════════════════════════════════════════════════════╝

/** 一次被擷取的貼圖。sw < 0＝整張圖（drawImage 的五參數形式）；矩陣 a..f 是 drawImage 當下的畫布變換（裝置像素） */
export interface CapturedBlit {
    image: CanvasImageSource;
    sx: number; sy: number; sw: number; sh: number;
    dx: number; dy: number; dw: number; dh: number;
    a: number; b: number; c: number; d: number; e: number; f: number;
    alpha: number;
    /** 當下的混合模式是 lighter（加法） */
    additive: boolean;
}

/** 整張圖的來源寬（sw）標記 */
const WHOLE_IMAGE = -1;

class SpriteCaptureImpl {
    private ctx: CanvasRenderingContext2D | null = null;
    private recording = false;
    private readonly pool: CapturedBlit[] = [];
    private count = 0;

    /** 貼一張圖的切片（同 drawImage 九參數）；在擷取畫布上時只記下來 */
    public blit(ctx: CanvasRenderingContext2D, image: CanvasImageSource,
        sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
        if (this.recording && ctx === this.ctx) this.record(ctx, image, sx, sy, sw, sh, dx, dy, dw, dh);
        else ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    /** 貼整張圖（同 drawImage 五參數） */
    public blitWhole(ctx: CanvasRenderingContext2D, image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void {
        if (this.recording && ctx === this.ctx) this.record(ctx, image, 0, 0, WHOLE_IMAGE, WHOLE_IMAGE, dx, dy, dw, dh);
        else ctx.drawImage(image, dx, dy, dw, dh);
    }

    /**
     * 開始擷取：回傳擷取畫布（變換設成 base、不透明、source-over）。呼叫端把它交給 painter，畫完呼叫 end。
     * 不能巢狀；擷取結果在下一次 begin 之前有效。
     */
    public begin(base: DOMMatrixReadOnly): CanvasRenderingContext2D {
        if (!this.ctx) {
            const c = document.createElement('canvas');
            c.width = c.height = 1;
            const ctx = c.getContext('2d');
            if (!ctx) throw new Error('canvas2d');
            this.ctx = ctx;
        }
        const ctx = this.ctx;
        ctx.setTransform(base.a, base.b, base.c, base.d, base.e, base.f);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        this.count = 0;
        this.recording = true;
        return ctx;
    }

    /** 結束擷取，回傳擷取到幾張（at(0..n-1)） */
    public end(): number {
        this.recording = false;
        return this.count;
    }

    public at(i: number): CapturedBlit {
        return this.pool[i];
    }

    /** sw < 0 表示整張圖 */
    public isWhole(b: CapturedBlit): boolean {
        return b.sw === WHOLE_IMAGE;
    }

    private record(ctx: CanvasRenderingContext2D, image: CanvasImageSource,
        sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void {
        let b = this.pool[this.count];
        const m = ctx.getTransform();
        if (!b) {
            b = { image, sx, sy, sw, sh, dx, dy, dw, dh, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, alpha: 1, additive: false };
            this.pool.push(b);
        }
        this.count++;
        b.image = image; b.sx = sx; b.sy = sy; b.sw = sw; b.sh = sh; b.dx = dx; b.dy = dy; b.dw = dw; b.dh = dh;
        b.a = m.a; b.b = m.b; b.c = m.c; b.d = m.d; b.e = m.e; b.f = m.f;
        b.alpha = ctx.globalAlpha;
        b.additive = ctx.globalCompositeOperation === 'lighter';
    }
}

export const SpriteCapture = new SpriteCaptureImpl();
