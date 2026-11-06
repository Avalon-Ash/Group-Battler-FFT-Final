// ╔══════════════════════════════════════════════════════════╗
// ║ PoisonMaterialStore — 戰鬥固定 8 MiB、八個完整外觀頁。   ║
// ║ [ARCH] draw 只登記／blit；update 排程的 task 分塊準備。   ║
// ║ 全頁完成才顯色，換動作／方向共用同頁；缺頁畫原人物。     ║
// ║ 活躍頁保護；僅回收前兩幀均未取用的頁。無逐幀配置。       ║
// ╚══════════════════════════════════════════════════════════╝
import { POISON_MATERIAL as P, POISON_COMBAT_POOL } from '../../../data/vfx/statusArt';
import { spriteAtlasStore, type UnitFrameDef } from '../units/SpriteAtlasStore';
import type { SpriteDrawRect } from '../units/factions/SpriteUnitRenderer';

type MaterialFrame = Pick<UnitFrameDef, 'x' | 'y' | 'w' | 'h'>;
interface Page {
    key: string; mip: number; source: CanvasImageSource | null;
    stamp: number; scale: number; width: number; height: number; tile: number; ready: boolean;
}
interface PoolLayout {
    readonly width: number; readonly height: number; readonly pages: number; readonly pageColumns: number;
}

export class PoisonMaterialStore {
    private readonly pages: Page[];
    private readonly pageWidth: number;
    private readonly pageHeight: number;
    private cursor = 0;
    private stamp = 0;
    private image: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private scratch: HTMLCanvasElement | null = null;
    private scratchCtx: CanvasRenderingContext2D | null = null;
    private scheduled = false;
    private channel: MessageChannel | null = null;
    private readonly unsubscribe: () => void;

    constructor(private readonly layout: PoolLayout = P) {
        this.pages = Array.from({ length: layout.pages }, () => ({
            key: '', mip: 0, source: null, stamp: P.unusedStamp, scale: 0, width: 0, height: 0, tile: 0, ready: false,
        }));
        this.pageWidth = layout.width / layout.pageColumns;
        this.pageHeight = layout.height / Math.ceil(layout.pages / layout.pageColumns);
        this.unsubscribe = spriteAtlasStore.onRelease((key) => {
            for (const p of this.pages) if (p.key === key) { p.source = null; p.ready = false; p.stamp = P.unusedStamp; }
        });
    }

    dispose(): void { this.unsubscribe(); this.channel?.port1.close(); this.channel?.port2.close(); }
    beginFrame(): void { this.stamp++; }

    draw(ctx: CanvasRenderingContext2D, key: string, frames: readonly MaterialFrame[],
        frame: MaterialFrame, mip: number, rect: SpriteDrawRect, dx: number, source: CanvasImageSource | null = null): boolean {
        if (!frames.includes(frame)) return false;
        const atlas = source ?? spriteAtlasStore.getAtlas(key, mip);
        if (!atlas || !('width' in atlas) || !('height' in atlas) || typeof atlas.width !== 'number' || typeof atlas.height !== 'number') return false;
        let chosen = -1, oldest = Infinity;
        for (let i = 0; i < this.pages.length; i++) {
            const p = this.pages[i];
            if (p.key === key && p.source === atlas && p.mip === mip) { chosen = i; break; }
            if (p.stamp < this.stamp - 1 && p.stamp < oldest) { oldest = p.stamp; chosen = i; }
        }
        if (chosen < 0) return false;
        const p = this.pages[chosen];
        if (p.key !== key || p.source !== atlas || p.mip !== mip) {
            p.key = key; p.mip = mip; p.source = atlas; p.tile = 0; p.ready = false;
            p.scale = Math.min(P.sourceScale / mip, this.pageWidth / atlas.width, this.pageHeight / atlas.height);
            p.width = Math.ceil(atlas.width * p.scale); p.height = Math.ceil(atlas.height * p.scale);
        }
        p.stamp = this.stamp;
        if (!p.ready || !this.image) return false;
        const k = mip * p.scale;
        ctx.drawImage(this.image, chosen % this.layout.pageColumns * this.pageWidth + frame.x * k,
            Math.floor(chosen / this.layout.pageColumns) * this.pageHeight + frame.y * k,
            frame.w * k, frame.h * k, dx, rect.dy, rect.dw, rect.dh);
        return true;
    }

    prepare(): void {
        if (this.scheduled || typeof document === 'undefined') return;
        for (const p of this.pages) if (p.source && !p.ready && p.stamp >= this.stamp - 1) {
            this.scheduled = true;
            if (!this.channel) {
                this.channel = new MessageChannel();
                this.channel.port1.onmessage = this.pump;
            }
            this.channel.port2.postMessage(null);
            return;
        }
    }

    private readonly pump = (): void => {
        this.scheduled = false;
        if (!this.image) {
            this.image = document.createElement('canvas');
            this.image.width = this.layout.width; this.image.height = this.layout.height;
            this.ctx = this.image.getContext('2d');
            this.scratch = document.createElement('canvas');
            this.scratch.width = P.cellW; this.scratch.height = P.cellH;
            this.scratchCtx = this.scratch.getContext('2d', { willReadFrequently: true });
        }
        const g = this.scratchCtx, target = this.ctx;
        if (!g || !target || !this.scratch) return;
        let budget: number = P.framesPerTask;
        for (let visited = 0; visited < this.pages.length && budget > 0; visited++) {
            const index = this.cursor;
            this.cursor = (this.cursor + 1) % this.pages.length;
            const p = this.pages[index];
            if (!p.source || p.ready || p.stamp < this.stamp - 1) continue;
            const columns = Math.ceil(p.width / P.cellW), rows = Math.ceil(p.height / P.cellH);
            while (p.tile < columns * rows && budget > 0) {
                budget--;
                const x = p.tile % columns * P.cellW, y = Math.floor(p.tile / columns) * P.cellH;
                const w = Math.min(P.cellW, p.width - x), h = Math.min(P.cellH, p.height - y);
                g.clearRect(0, 0, P.cellW, P.cellH);
                g.drawImage(p.source, x / p.scale, y / p.scale, w / p.scale, h / p.scale, 0, 0, w, h);
                const pixels = g.getImageData(0, 0, w, h), d = pixels.data;
                for (let i = 0; i < d.length; i += P.channels) {
                    if (!d[i + P.channels - 1]) continue;
                    const l = (d[i] * P.luminance[0] + d[i + 1] * P.luminance[1] + d[i + 2] * P.luminance[2]) / P.byteMax;
                    for (let c = 0; c < P.channels - 1; c++) d[i + c] = d[i + c] * (1 - P.mix) + (P.low[c] + l * P.range[c]) * P.mix;
                }
                g.putImageData(pixels, 0, 0);
                const tx = index % this.layout.pageColumns * this.pageWidth + x;
                const ty = Math.floor(index / this.layout.pageColumns) * this.pageHeight + y;
                target.clearRect(tx, ty, w, h);
                target.drawImage(this.scratch, 0, 0, w, h, tx, ty, w, h);
                p.tile++;
            }
            p.ready = p.tile === columns * rows;
        }
        this.prepare();
    };
}
export const poisonMaterialStore = new PoisonMaterialStore(POISON_COMBAT_POOL);
