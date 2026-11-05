// ╔══════════════════════════════════════════════════════════╗
// ║ PoisonMaterialStore — 固定 3 MiB 毒材質；10 個六幀頁       ║
// ║ [ARCH] draw 只登記／取用，prepare 在 pipeline.update 排程。║
// ║ 每 task 最多兩幀；活躍頁保護、LRU 回收；缺頁畫原人物。    ║
// ║ 不持計時器或模擬資料；唯一 scratch 96×128，hue 在鍵內。   ║
// ╚══════════════════════════════════════════════════════════╝
import { POISON_MATERIAL as P } from '../../../data/vfx/statusArt';
import { spriteAtlasStore, type UnitFrameDef } from '../units/SpriteAtlasStore';
import type { SpriteDrawRect } from '../units/factions/SpriteUnitRenderer';

interface Pose { w: number; h: number }
type MaterialFrame = Pick<UnitFrameDef, 'x' | 'y' | 'w' | 'h'>;
interface Page {
    key: string; frames: readonly MaterialFrame[] | null; mip: number; source: CanvasImageSource | null;
    stamp: number; baked: number; poses: Pose[];
}

class PoisonMaterialStore {
    private readonly pages: Page[] = Array.from({ length: P.pages }, () => ({
        key: '', frames: null, mip: 0, source: null, stamp: -2, baked: 0,
        poses: Array.from({ length: P.framesPerPage }, () => ({ w: 0, h: 0 })),
    }));
    private stamp = 0;
    private image: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private scratch: HTMLCanvasElement | null = null;
    private scratchCtx: CanvasRenderingContext2D | null = null;
    private scheduled = false;

    constructor() {
        spriteAtlasStore.onRelease((key) => {
            for (const page of this.pages) if (page.key === key) { page.frames = null; page.baked = 0; }
        });
    }

    beginFrame(): void { this.stamp++; }

    /** Constant slots; no object, canvas or pixel allocation on a hit OR miss. */
    draw(ctx: CanvasRenderingContext2D, key: string, frames: readonly MaterialFrame[],
        frame: MaterialFrame, mip: number, rect: SpriteDrawRect, dx: number, source: CanvasImageSource | null = null): boolean {
        let chosen = -1;
        let oldest = Infinity;
        for (let i = 0; i < this.pages.length; i++) {
            const p = this.pages[i];
            if (p.key === key && p.frames === frames && p.mip === mip) { chosen = i; break; }
            if (p.stamp < this.stamp - 1 && p.stamp < oldest) { oldest = p.stamp; chosen = i; }
        }
        if (chosen < 0) return false;
        const p = this.pages[chosen];
        if (p.key !== key || p.frames !== frames || p.mip !== mip) {
            p.key = key; p.frames = frames; p.mip = mip; p.source = source; p.baked = 0;
        }
        p.stamp = this.stamp;
        const n = frames.indexOf(frame);
        if (n < 0 || n >= p.baked || !this.image) return false;
        const pose = p.poses[n], slot = chosen * P.framesPerPage + n;
        ctx.drawImage(this.image, slot % P.columns * P.cellW, Math.floor(slot / P.columns) * P.cellH,
            pose.w, pose.h, dx, rect.dy, rect.dw, rect.dh);
        return true;
    }

    /** Called outside draw. No preparation work is done on the render stack. */
    prepare(): void {
        if (this.scheduled || typeof document === 'undefined') return;
        for (const p of this.pages) {
            if (p.frames && p.baked < p.frames.length && p.stamp >= this.stamp - 1) {
                this.scheduled = true;
                setTimeout(this.pump, P.taskDelayMs);
                return;
            }
        }
    }

    private readonly pump = (): void => {
        this.scheduled = false;
        if (!this.image) {
            this.image = document.createElement('canvas');
            this.image.width = P.width; this.image.height = P.height;
            this.ctx = this.image.getContext('2d');
            this.scratch = document.createElement('canvas');
            this.scratch.width = P.cellW; this.scratch.height = P.cellH;
            this.scratchCtx = this.scratch.getContext('2d', { willReadFrequently: true });
        }
        const g = this.scratchCtx, target = this.ctx;
        if (!g || !target || !this.scratch) return;
        let budget: number = P.framesPerTask;
        for (let pageIndex = 0; pageIndex < this.pages.length && budget > 0; pageIndex++) {
            const p = this.pages[pageIndex];
            if (!p.frames || p.stamp < this.stamp - 1) continue;
            const source = p.source ?? spriteAtlasStore.getAtlas(p.key, p.mip);
            if (!source) continue;
            while (p.baked < p.frames.length && p.baked < P.framesPerPage && budget-- > 0) {
                const f = p.frames[p.baked], pose = p.poses[p.baked];
                const k = Math.min(P.sourceScale, P.cellW / f.w, P.cellH / f.h);
                pose.w = Math.ceil(f.w * k); pose.h = Math.ceil(f.h * k);
                g.clearRect(0, 0, P.cellW, P.cellH);
                g.drawImage(source, f.x * p.mip, f.y * p.mip, f.w * p.mip, f.h * p.mip,
                    0, 0, pose.w, pose.h);
                const pixels = g.getImageData(0, 0, pose.w, pose.h), d = pixels.data;
                for (let i = 0; i < d.length; i += P.channels) {
                    if (!d[i + P.channels - 1]) continue;
                    const l = (d[i] * P.luminance[0] + d[i + 1] * P.luminance[1] + d[i + 2] * P.luminance[2]) / P.byteMax;
                    for (let c = 0; c < P.channels - 1; c++) d[i + c] = d[i + c] * (1 - P.mix) + (P.low[c] + l * P.range[c]) * P.mix;
                }
                g.putImageData(pixels, 0, 0);
                const slot = pageIndex * P.framesPerPage + p.baked;
                const x = slot % P.columns * P.cellW, y = Math.floor(slot / P.columns) * P.cellH;
                target.clearRect(x, y, P.cellW, P.cellH);
                target.drawImage(this.scratch, 0, 0, pose.w, pose.h, x, y, pose.w, pose.h);
                p.baked++;
            }
        }
        this.prepare();
    };
}
export const poisonMaterialStore = new PoisonMaterialStore();
