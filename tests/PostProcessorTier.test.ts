import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostProcessor } from '../engine/renderers/PostProcessor';
import { forceSetQualityTier, type QualityTier } from '../engine/renderers/RenderQuality';

function fakeCtx() {
    return {
        canvas: { width: 100, height: 100 },
        save: vi.fn(), restore: vi.fn(), resetTransform: vi.fn(),
        clearRect: vi.fn(), drawImage: vi.fn(), fillRect: vi.fn(),
        filter: 'none', fillStyle: '', globalAlpha: 1,
    };
}

afterEach(() => forceSetQualityTier(0));

describe('PostProcessor quality tiers (RENDER_QUALITY.POST_FX_MAX_TIER)', () => {
    it.each([[0, true], [1, true], [2, false], [3, false]] as [QualityTier, boolean][])(
        'tier %i: full-screen filters %s, finish dim always kept', (tier, filters) => {
            vi.stubGlobal('document', { createElement: () => ({ width: 1, height: 1, getContext: () => fakeCtx() }) });
            forceSetQualityTier(tier);
            const post = new PostProcessor();
            const finish = fakeCtx();
            post.applyFinishBlur(finish as unknown as CanvasRenderingContext2D, 100, 100, 0.5);
            expect(finish.drawImage.mock.calls.length > 0).toBe(filters);
            expect(finish.fillRect).toHaveBeenCalledTimes(1);
            const trans = fakeCtx();
            post.apply(trans as unknown as CanvasRenderingContext2D, 100, 100, 0, 0.5);
            expect(trans.drawImage.mock.calls.length > 0).toBe(filters);
            vi.unstubAllGlobals();
        });
});
