import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SpriteCapture } from '../engine/renderers/SpriteCapture';

// SpriteCapture：painter 貼精靈的唯一出口。平常照畫；畫在擷取畫布上時只記下切片、目的矩形、變換、不透明度。

interface M { a: number; b: number; c: number; d: number; e: number; f: number }
const mul = (m: M, n: M): M => ({
    a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f,
});

/** 只追蹤變換與狀態的假 2D context；drawImage 記在 draws */
function fakeCtx() {
    let m: M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const stack: { m: M; alpha: number; op: string }[] = [];
    const draws: unknown[][] = [];
    const ctx = {
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        setTransform(a: number, b: number, c: number, d: number, e: number, f: number) { m = { a, b, c, d, e, f }; },
        getTransform: () => ({ ...m }),
        translate(x: number, y: number) { m = mul(m, { a: 1, b: 0, c: 0, d: 1, e: x, f: y }); },
        scale(x: number, y: number) { m = mul(m, { a: x, b: 0, c: 0, d: y, e: 0, f: 0 }); },
        rotate(r: number) { m = mul(m, { a: Math.cos(r), b: Math.sin(r), c: -Math.sin(r), d: Math.cos(r), e: 0, f: 0 }); },
        save() { stack.push({ m, alpha: ctx.globalAlpha, op: ctx.globalCompositeOperation }); },
        restore() { const s = stack.pop(); if (s) { m = s.m; ctx.globalAlpha = s.alpha; ctx.globalCompositeOperation = s.op; } },
        drawImage(...args: unknown[]) { draws.push(args); },
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, draws };
}

const image = { width: 64, height: 32 } as unknown as CanvasImageSource;
/** SpriteCapture 第一次 begin 時建一次擷取畫布（模組單例），所以整個檔共用同一個假 context */
const captureCtx = fakeCtx();
const realDocument = (globalThis as { document?: unknown }).document;

beforeAll(() => {
    (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => captureCtx.ctx }) };
});
afterAll(() => {
    (globalThis as { document?: unknown }).document = realDocument;
});

describe('SpriteCapture', () => {
    it('畫在一般畫布上照常 drawImage，不記錄', () => {
        const { ctx, draws } = fakeCtx();
        SpriteCapture.blit(ctx, image, 1, 2, 3, 4, 5, 6, 7, 8);
        SpriteCapture.blitWhole(ctx, image, 5, 6, 7, 8);
        expect(draws).toEqual([[image, 1, 2, 3, 4, 5, 6, 7, 8], [image, 5, 6, 7, 8]]);
    });

    it('擷取畫布上記下切片、局部矩形、painter 那一串變換與不透明度，不畫', () => {
        const base = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 } as DOMMatrixReadOnly;
        const c = SpriteCapture.begin(base);
        // painter 自己的變換：平移、縮放、旋轉、半透明，再貼一塊切片；之後貼整張圖
        c.save();
        c.translate(5, 6);
        c.scale(0.5, 0.5);
        c.rotate(Math.PI / 2);
        c.globalAlpha *= 0.25;
        SpriteCapture.blit(c, image, 1, 2, 3, 4, -8, -16, 16, 32);
        c.restore();
        SpriteCapture.blitWhole(c, image, 0, 0, 64, 32);
        expect(SpriteCapture.end()).toBe(2);
        expect(captureCtx.draws).toEqual([]);

        const first = SpriteCapture.at(0);
        expect([first.sx, first.sy, first.sw, first.sh, first.dx, first.dy, first.dw, first.dh]).toEqual([1, 2, 3, 4, -8, -16, 16, 32]);
        expect(SpriteCapture.isWhole(first)).toBe(false);
        expect(first.a).toBeCloseTo(0);
        expect(first.b).toBeCloseTo(1);
        expect(first.c).toBeCloseTo(-1);
        expect(first.d).toBeCloseTo(0);
        expect([first.e, first.f]).toEqual([20, 32]);
        expect(first.alpha).toBe(0.25);

        const second = SpriteCapture.at(1);
        expect(SpriteCapture.isWhole(second)).toBe(true);
        expect(second.alpha).toBe(1);
        expect([second.a, second.e, second.f]).toEqual([2, 10, 20]);
    });

    it('end 之後同一個畫布再貼也不記錄（照常畫）', () => {
        const c = SpriteCapture.begin({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as DOMMatrixReadOnly);
        expect(SpriteCapture.end()).toBe(0);
        const before = captureCtx.draws.length;
        SpriteCapture.blit(c, image, 0, 0, 1, 1, 0, 0, 1, 1);
        expect(captureCtx.draws.length).toBe(before + 1);
    });
});
