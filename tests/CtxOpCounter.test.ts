import { describe, it, expect, beforeEach } from 'vitest';
import { CtxOpCounterCollector } from '../engine/renderers/CtxOpCounter';
import { RENDER_PERF } from '../constants';

describe('CtxOpCounterCollector', () => {
    let collector: CtxOpCounterCollector;
    let mockCtx: any;

    beforeEach(() => {
        collector = new CtxOpCounterCollector();
        mockCtx = {
            save: () => {},
            restore: () => {},
            drawImage: () => {},
            fill: () => {},
            stroke: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createPattern: () => null,
            shadowBlur: 0,
            globalCompositeOperation: 'source-over',
            canvas: { width: 800, height: 600 },
        };
    });

    it('returns original context reference when enabled is false', () => {
        collector.setEnabledForTest(false);
        const wrapped = collector.wrapContext(mockCtx as any);
        expect(wrapped).toBe(mockCtx);

        // Does not accumulate
        wrapped.save();
        expect(collector.getCounts().save).toBe(0);
        expect(collector.formatSummary()).toBe('');
    });

    it('intercepts and counts canvas operations when enabled is true', () => {
        collector.setEnabledForTest(true);
        const wrapped = collector.wrapContext(mockCtx as any);
        expect(wrapped).not.toBe(mockCtx);

        collector.beginFrame();

        wrapped.save();
        wrapped.restore();
        wrapped.drawImage({} as any, 0, 0);
        wrapped.fill();
        wrapped.stroke();
        wrapped.createLinearGradient(0, 0, 10, 10);
        wrapped.shadowBlur = 10;
        wrapped.shadowBlur = 0; // 0 should not count
        wrapped.globalCompositeOperation = 'lighter';
        wrapped.globalCompositeOperation = 'lighter'; // identical should not count again

        const latest = collector.getLatestCounts();
        expect(latest.save).toBe(1);
        expect(latest.restore).toBe(1);
        expect(latest.drawImage).toBe(1);
        expect(latest.fill).toBe(1);
        expect(latest.stroke).toBe(1);
        expect(latest.createGradientOrPattern).toBe(1);
        expect(latest.shadowBlur).toBe(1);
        expect(latest.globalCompositeOperation).toBe(1);

        collector.endFrame();

        const ema = collector.getCounts();
        expect(ema.save).toBeCloseTo(0.1, 2);
        expect(collector.formatSummary()).toContain('ops:');
    });

    it('tracks operations grouped by scope', () => {
        collector.setEnabledForTest(true);
        const wrapped = collector.wrapContext(mockCtx as any);

        collector.beginFrame();
        collector.setScope('units');
        wrapped.save();
        wrapped.restore();
        wrapped.shadowBlur = 5;

        collector.setScope('hud');
        wrapped.save();
        wrapped.fill();

        const scopes = collector.getScopeCounts();
        expect(scopes['units'].save).toBe(1);
        expect(scopes['units'].shadowBlur).toBe(1);
        expect(scopes['hud'].save).toBe(1);
        expect(scopes['hud'].fill).toBe(1);
        expect(scopes['hud'].shadowBlur).toBe(0);
    });

    it('has OPS_QUERY_KEY defined in RENDER_PERF', () => {
        expect(RENDER_PERF.OPS_QUERY_KEY).toBe('perfops');
    });
});
