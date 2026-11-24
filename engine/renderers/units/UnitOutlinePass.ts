// ╔══════════════════════════════════════════════════════════╗
// ║  UnitOutlinePass — 單位輪廓光（PLAY 主角的金色描邊）        ║
// ║  職責：本體繪製時記下要描邊的精靈切片與當下畫布變換，       ║
// ║  世界層畫完後在最上面補一圈輪廓（實線＋淡光暈），           ║
// ║  人擠在一起、站在障礙物後面也看得出是哪一隻。               ║
// ║  上游：SpriteUnitRenderer／PolymorphPainter 呼叫 capture；  ║
// ║  RenderPipeline 在 overlay 階段 flush（畫完即清空）。        ║
// ║  [ARCH] 位置不另算：直接用本體畫出來那一刻的變換（含 DPR、  ║
// ║  鏡頭、浮動、傾斜、受擊晃動），所以永遠貼著畫出來的身體；   ║
// ║  不進排序鍵、不改 UnitFrame（RenderSpec §4「玩家單位標示」）。║
// ║  [ARCH] 誰描什麼只在 outlineKindOf；顏色與粗細在 UNIT_OUTLINE。║
// ║  [ARCH] 用剪影圖集（受擊閃白同一份）往外錯位疊出輪廓，再挖掉  ║
// ║  本體，不用 shadowBlur；暫存畫布只依輪廓的螢幕大小配置。     ║
// ╚══════════════════════════════════════════════════════════╝

import type { Agent } from '../../core/Agent';
import { UNIT_OUTLINE, UNIT_OUTLINE_SAMPLES } from '../../../constants';
import { createCanvas } from '../../graphics/CanvasUtils';

type UnitOutlineKind = keyof typeof UNIT_OUTLINE;

/** 這個單位要不要描邊、描哪一種（唯一判斷點）。倒下的單位本體不畫（UnitBodyPainter），不會走到這裡 */
function outlineKindOf(agent: Agent): UnitOutlineKind | null {
    return agent.controller === 'PLAYER' ? 'HERO' : null;
}

interface OutlineCapture {
    kind: UnitOutlineKind;
    image: CanvasImageSource;
    sx: number; sy: number; sw: number; sh: number;
    dx: number; dy: number; dw: number; dh: number;
    m: DOMMatrix;
    alpha: number;
}

/** 方向表：UNIT_OUTLINE_SAMPLES 個單位向量，均勻分布在圓上 */
const DIRS: readonly { x: number; y: number }[] = Array.from({ length: UNIT_OUTLINE_SAMPLES }, (_, i) => {
    const a = (i / UNIT_OUTLINE_SAMPLES) * Math.PI * 2;
    return { x: Math.cos(a), y: Math.sin(a) };
});

class UnitOutlinePassImpl {
    private readonly captures: OutlineCapture[] = [];
    private mask: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
    private ring: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

    /**
     * 本體畫完後呼叫：image 必須是同一切片的剪影圖集（不透明像素＝身體），座標與 drawImage 的參數相同。
     * 不描邊的單位直接返回，熱路徑只有一次判斷。
     */
    public capture(
        ctx: CanvasRenderingContext2D, agent: Agent, image: CanvasImageSource,
        sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number,
    ): void {
        const kind = outlineKindOf(agent);
        if (!kind) return;
        this.captures.push({ kind, image, sx, sy, sw, sh, dx, dy, dw, dh, m: ctx.getTransform(), alpha: ctx.globalAlpha });
    }

    /** 世界層之後、血條之前呼叫，畫完清空（下一幀重新記）；dpr＝畫布像素／CSS px（粗細以 CSS px 定義） */
    public flush(ctx: CanvasRenderingContext2D, dpr: number): void {
        for (const c of this.captures) this.drawOne(ctx, c, dpr);
        this.captures.length = 0;
    }

    private surfaces(w: number, h: number) {
        if (!this.mask || !this.ring) {
            this.mask = createCanvas(w, h);
            this.ring = createCanvas(w, h);
        }
        // 只長不縮：主角在畫面上的大小只隨鏡頭縮放變，配置一次就夠。drawOne 用完都把狀態還原（單位變換、不透明、source-over），這裡只清畫面
        for (const s of [this.mask, this.ring]) {
            if (s.canvas.width < w) s.canvas.width = w;
            if (s.canvas.height < h) s.canvas.height = h;
            s.ctx.clearRect(0, 0, w, h);
        }
        return { mask: this.mask, ring: this.ring };
    }

    private drawOne(ctx: CanvasRenderingContext2D, c: OutlineCapture, dpr: number): void {
        const style = UNIT_OUTLINE[c.kind];
        const width = style.WIDTH_PX * dpr;
        const glow = style.GLOW_WIDTH_PX * dpr;
        const pad = Math.ceil(Math.max(width, glow)) + 1;

        // 切片經變換後的裝置像素外框：中心＋旋轉縮放後的半寬半高
        const { m } = c;
        const cx = c.dx + c.dw / 2, cy = c.dy + c.dh / 2;
        const hx = (Math.abs(m.a) * c.dw + Math.abs(m.c) * c.dh) / 2 + pad;
        const hy = (Math.abs(m.b) * c.dw + Math.abs(m.d) * c.dh) / 2 + pad;
        const ox = Math.floor(m.a * cx + m.c * cy + m.e - hx);
        const oy = Math.floor(m.b * cx + m.d * cy + m.f - hy);
        const w = Math.ceil(2 * hx) + 1;
        const h = Math.ceil(2 * hy) + 1;

        const { mask, ring } = this.surfaces(w, h);

        // 1. 遮罩：剪影切片照本體的變換畫上去，再整片換成輪廓色
        mask.ctx.setTransform(m.a, m.b, m.c, m.d, m.e - ox, m.f - oy);
        mask.ctx.drawImage(c.image, c.sx, c.sy, c.sw, c.sh, c.dx, c.dy, c.dw, c.dh);
        mask.ctx.setTransform(1, 0, 0, 1, 0, 0);
        mask.ctx.globalCompositeOperation = 'source-in';
        mask.ctx.fillStyle = style.COLOR;
        mask.ctx.fillRect(0, 0, w, h);
        mask.ctx.globalCompositeOperation = 'source-over';

        // 2. 輪廓：遮罩往外錯位疊（先淡光暈、再實線），最後挖掉本體
        ring.ctx.globalAlpha = style.GLOW_ALPHA;
        for (const d of DIRS) ring.ctx.drawImage(mask.canvas, 0, 0, w, h, d.x * glow, d.y * glow, w, h);
        ring.ctx.globalAlpha = 1;
        for (const d of DIRS) ring.ctx.drawImage(mask.canvas, 0, 0, w, h, d.x * width, d.y * width, w, h);
        ring.ctx.globalCompositeOperation = 'destination-out';
        ring.ctx.drawImage(mask.canvas, 0, 0, w, h, 0, 0, w, h);
        ring.ctx.globalCompositeOperation = 'source-over';

        // 3. 貼回主畫布（裝置像素座標）
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = c.alpha;
        ctx.drawImage(ring.canvas, 0, 0, w, h, ox, oy, w, h);
        ctx.restore();
    }
}

export const UnitOutlinePass = new UnitOutlinePassImpl();
