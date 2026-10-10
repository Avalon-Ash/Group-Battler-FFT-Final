import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRenderDpr, getTierScale, setTierScale } from '../engine/renderers/RenderQuality';
import { RENDER_QUALITY } from '../constants';

describe('RenderQuality & getRenderDpr', () => {
    const originalWindow = globalThis.window;

    function setMockDpr(dpr: number | undefined): void {
        if (dpr === undefined) {
            delete (globalThis as { window?: unknown }).window;
            return;
        }
        (globalThis as { window?: unknown }).window = { devicePixelRatio: dpr } as unknown as Window;
    }

    beforeEach(() => {
        setMockDpr(1.0);
        setTierScale(1.0);
    });

    afterEach(() => {
        (globalThis as { window?: unknown }).window = originalWindow;
        setTierScale(1.0);
    });

    it('falls back to DEFAULT_DPR when window is undefined', () => {
        setMockDpr(undefined);
        expect(getRenderDpr()).toBe(RENDER_QUALITY.DEFAULT_DPR);
    });

    it('returns exact devicePixelRatio when within MAX_DPR cap', () => {
        setMockDpr(1.0);
        expect(getRenderDpr()).toBe(1.0);

        setMockDpr(1.5);
        expect(getRenderDpr()).toBe(1.5);

        setMockDpr(2.0);
        expect(getRenderDpr()).toBe(2.0);
    });

    it('clamps devicePixelRatio to RENDER_QUALITY.MAX_DPR when DPR exceeds cap', () => {
        setMockDpr(3.0);
        expect(getRenderDpr()).toBe(RENDER_QUALITY.MAX_DPR);

        setMockDpr(4.0);
        expect(getRenderDpr()).toBe(RENDER_QUALITY.MAX_DPR);
    });

    it('falls back safely to DEFAULT_DPR when devicePixelRatio is 0 or invalid', () => {
        setMockDpr(0);
        expect(getRenderDpr()).toBe(RENDER_QUALITY.DEFAULT_DPR);
    });

    it('scales DPR by tierScale when quality tier scale is adjusted', () => {
        setMockDpr(2.0);

        expect(getTierScale()).toBe(1.0);
        expect(getRenderDpr()).toBe(2.0);

        setTierScale(0.75);
        expect(getTierScale()).toBe(0.75);
        expect(getRenderDpr()).toBe(1.5);

        setTierScale(0.5);
        expect(getTierScale()).toBe(0.5);
        expect(getRenderDpr()).toBe(1.0);
    });
});
