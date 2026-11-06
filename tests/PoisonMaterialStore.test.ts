import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PoisonMaterialStore } from '../engine/renderers/status/PoisonMaterialStore';
import { POISON_MATERIAL as P } from '../data/vfx/statusArt';

// Platform Canvas and task queue stand-ins; the cache and its ownership decisions are real.
class Canvas {
    width = P.cellW;
    height = P.cellH;
    readonly calls: unknown[][] = [];
    readonly context = {
        drawImage: (...args: unknown[]) => { this.calls.push(args); },
        clearRect: () => {},
        getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
    };
    getContext() { return this.context; }
}
const tasks: (() => void)[] = [];
class Channel {
    readonly port1 = { onmessage: null as (() => void) | null, close() {} };
    readonly port2 = { postMessage: () => { tasks.push(() => this.port1.onmessage?.()); }, close() {} };
}
let pool: PoisonMaterialStore;
let created: Canvas[];
const frames = [{ x: 0, y: 0, w: 8, h: 12 }, { x: 12, y: 16, w: 10, h: 14 }];
const rect = { dx: -4, dy: -12, dw: 8, dh: 12, screenScale: 1, localScale: 1 };
let output: Canvas;
let sources: HTMLCanvasElement[];
const draw = (index: number, frame = frames[0], animation = frames) => pool.draw(
    output.context as unknown as CanvasRenderingContext2D, 'appearance-' + index,
    animation, frame, 1, rect, rect.dx, sources[index]);
function pump() { const next = tasks.shift(); expect(next).toBeTypeOf('function'); next!(); }

beforeEach(() => {
    tasks.length = 0; created = []; output = new Canvas();
    sources = Array.from({ length: P.pages + 1 }, () => new Canvas() as unknown as HTMLCanvasElement);
    vi.stubGlobal('document', { createElement: () => { const c = new Canvas(); created.push(c); return c; } });
    vi.stubGlobal('MessageChannel', Channel);
    pool = new PoisonMaterialStore();
});
afterEach(() => { pool.dispose(); tasks.length = 0; vi.unstubAllGlobals(); });

describe('PoisonMaterialStore ownership and missing pages', () => {
    it('never allocates or bakes on a draw miss and serves every pose after complete preparation', () => {
        pool.beginFrame(); expect(draw(0)).toBe(false);
        expect(created).toEqual([]); expect(output.calls).toEqual([]);
        pool.prepare(); expect(tasks).toHaveLength(1); pump();
        expect(created).toHaveLength(2);
        expect(created[0].width * created[0].height * 4).toBe(3145728);
        expect(created[1].width * created[1].height * 4).toBe(49152);
        expect(draw(0)).toBe(true);
        const otherAction = [frames[1]];
        expect(draw(0, frames[1], otherAction)).toBe(true);
        expect(output.calls[1].slice(1, 5)).toEqual([6, 8, 5, 7]);
        expect(created).toHaveLength(2); expect(tasks).toHaveLength(0);
    });
    it('protects pages redrawn every frame and returns an unpainted miss above fixed capacity', () => {
        pool.beginFrame(); for (let i = 0; i < P.pages; i++) expect(draw(i)).toBe(false);
        pool.prepare(); pump();
        for (let tick = 0; tick < 20; tick++) {
            pool.beginFrame();
            for (let i = 0; i < P.pages; i++) expect(draw(i)).toBe(true);
            const count = output.calls.length;
            expect(draw(P.pages)).toBe(false);
            expect(output.calls).toHaveLength(count);
        }
        expect(created).toHaveLength(2);
    });
    it('recycles a page after two inactive frames without evicting the active appearance', () => {
        pool.beginFrame(); for (let i = 0; i < P.pages; i++) draw(i);
        pool.prepare(); pump();
        pool.beginFrame(); expect(draw(0)).toBe(true);
        expect(draw(P.pages)).toBe(false);
        pool.beginFrame(); expect(draw(0)).toBe(true);
        expect(draw(P.pages)).toBe(false);
        pool.prepare(); pump();
        expect(draw(P.pages)).toBe(true); expect(draw(0)).toBe(true);
        expect(draw(1)).toBe(false);
    });
    it('does not expose partially prepared full appearances and retains activity during background work', () => {
        sources[0].width = P.width / P.sourceScale; sources[0].height = P.height / P.pages / P.sourceScale;
        pool.beginFrame(); expect(draw(0)).toBe(false); pool.prepare();
        const tiles = Math.ceil(P.width / P.cellW) * Math.ceil(P.height / P.pages / P.cellH);
        for (let task = 0; task < tiles / P.framesPerTask; task++) {
            pool.beginFrame(); expect(draw(0)).toBe(false); pump();
        }
        expect(draw(0)).toBe(true);
        expect(created[1].calls).toHaveLength(tiles);
        expect(tasks).toHaveLength(0);
    });
});
