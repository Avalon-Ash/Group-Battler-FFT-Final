import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderStatsCollector } from '../engine/renderers/RenderStats';
import { RENDER_PERF } from '../constants';

describe('RenderStatsCollector', () => {
    let stats: RenderStatsCollector;

    beforeEach(() => {
        stats = new RenderStatsCollector();
    });

    it('does not accumulate any timing when enabled is false', () => {
        stats.setEnabled(false);
        expect(stats.enabled).toBe(false);

        stats.begin('world');
        stats.end('world');

        expect(stats.getPhaseMs('world')).toBe(0);
        expect(stats.getLatestMs('world')).toBe(0);
        expect(stats.getPhases()).toEqual([]);
        expect(stats.formatSummary()).toBe('');
    });

    it('tracks phase names and accumulates timings when enabled is true', () => {
        stats.setEnabled(true);
        expect(stats.enabled).toBe(true);

        let mockTime = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

        stats.begin('world');
        mockTime += 12.5;
        stats.end('world');

        expect(stats.getPhases()).toContain('world');
        expect(stats.getLatestMs('world')).toBeCloseTo(12.5, 1);
        expect(stats.getPhaseMs('world')).toBeCloseTo(12.5, 1);
        expect(stats.formatSummary()).toContain('world: 12.50ms');

        vi.restoreAllMocks();
    });

    it('converges EMA towards sustained measured frame durations', () => {
        stats.setEnabled(true);

        let mockTime = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

        // Initial measurement = 10ms
        stats.begin('terrain');
        mockTime += 10;
        stats.end('terrain');
        expect(stats.getPhaseMs('terrain')).toBe(10);

        // Feed sustained 20ms steps
        for (let i = 0; i < 50; i++) {
            stats.begin('terrain');
            mockTime += 20;
            stats.end('terrain');
        }

        // With alpha 0.1, after 50 iterations, (1 - 0.1)^50 = 0.005, so it should be within 0.1ms of 20
        expect(stats.getPhaseMs('terrain')).toBeGreaterThan(19.8);
        expect(stats.getPhaseMs('terrain')).toBeLessThanOrEqual(20);

        vi.restoreAllMocks();
    });

    it('contains expected standard phases in RENDER_PERF constants', () => {
        expect(RENDER_PERF.QUERY_KEY).toBe('perf');
        expect(RENDER_PERF.EMA_ALPHA).toBeGreaterThan(0);
        expect(RENDER_PERF.EMA_ALPHA).toBeLessThan(1);
        expect(RENDER_PERF.PHASES).toContain('background');
        expect(RENDER_PERF.PHASES).toContain('world');
        expect(RENDER_PERF.PHASES).toContain('post');
        expect(RENDER_PERF.PHASES).toContain('overlay');
    });
});
