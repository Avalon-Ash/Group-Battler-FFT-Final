import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    getRenderDpr,
    getTierScale,
    getQualityTier,
    isToneGradeEnabled,
    setQualityTier,
    forceSetQualityTier,
    setPinnedTier,
    createQualityGovernor,
} from '../engine/renderers/RenderQuality';
import { RENDER_QUALITY } from '../constants';

describe('RenderQuality & createQualityGovernor', () => {
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
        setPinnedTier(null);
        forceSetQualityTier(0);
    });

    afterEach(() => {
        (globalThis as { window?: unknown }).window = originalWindow;
        setPinnedTier(null);
        forceSetQualityTier(0);
    });

    describe('getRenderDpr & tier properties', () => {
        it('maps quality tier to tone grade and tier scale correctly', () => {
            forceSetQualityTier(0);
            expect(getQualityTier()).toBe(0);
            expect(isToneGradeEnabled()).toBe(true);
            expect(getTierScale()).toBe(1.0);

            forceSetQualityTier(1);
            expect(getQualityTier()).toBe(1);
            expect(isToneGradeEnabled()).toBe(false);
            expect(getTierScale()).toBe(1.0);

            forceSetQualityTier(2);
            expect(getQualityTier()).toBe(2);
            expect(isToneGradeEnabled()).toBe(false);
            expect(getTierScale()).toBe(0.75);

            forceSetQualityTier(3);
            expect(getQualityTier()).toBe(3);
            expect(isToneGradeEnabled()).toBe(false);
            expect(getTierScale()).toBe(0.5);
        });

        it('multiplies capped DPR by tierScale in getRenderDpr()', () => {
            setMockDpr(2.0); // Capped at MAX_DPR = 2.0

            forceSetQualityTier(0);
            expect(getRenderDpr()).toBe(2.0);

            forceSetQualityTier(1);
            expect(getRenderDpr()).toBe(2.0);

            forceSetQualityTier(2);
            expect(getRenderDpr()).toBe(1.5); // 2.0 * 0.75

            forceSetQualityTier(3);
            expect(getRenderDpr()).toBe(1.0); // 2.0 * 0.5
        });

        it('clamps devicePixelRatio above MAX_DPR before applying tierScale', () => {
            setMockDpr(3.5); // Raw DPR 3.5 -> clamped to 2.0

            forceSetQualityTier(0);
            expect(getRenderDpr()).toBe(2.0);

            forceSetQualityTier(2);
            expect(getRenderDpr()).toBe(1.5);
        });
    });

    describe('Adaptive Quality Governor logic', () => {
        it('downgrades tiers when frame time sustained above downMs for downHoldS', () => {
            const gov = createQualityGovernor({
                downMs: 19,
                downHoldS: 2.0,
                initialTier: 0,
                pinnedTier: null,
            });

            expect(gov.getTier()).toBe(0);

            // Feed 25ms frames for 1.5s (step = 0.05s) -> 30 frames
            for (let i = 0; i < 30; i++) {
                gov.feedFrame(25, 0.05);
            }
            expect(gov.getTier()).toBe(0); // Not reached 2.0s hold yet

            // Feed another 12 frames (0.6s) -> total 2.1s > 2.0s
            for (let i = 0; i < 12; i++) {
                gov.feedFrame(25, 0.05);
            }
            expect(gov.getTier()).toBe(1);

            // Continue feeding 25ms frames for another 2.1s (42 frames * 0.05s)
            for (let i = 0; i < 42; i++) {
                gov.feedFrame(25, 0.05);
            }
            expect(gov.getTier()).toBe(2);

            // Another 2.1s -> Tier 3
            for (let i = 0; i < 42; i++) {
                gov.feedFrame(25, 0.05);
            }
            expect(gov.getTier()).toBe(3);
        });

        it('does not downgrade below Tier 3', () => {
            const gov = createQualityGovernor({
                downMs: 19,
                downHoldS: 2.0,
                initialTier: 3,
                pinnedTier: null,
            });

            expect(gov.getTier()).toBe(3);

            // Feed 50ms frames for 10 seconds
            for (let i = 0; i < 200; i++) {
                gov.feedFrame(50, 0.05);
            }
            expect(gov.getTier()).toBe(3);
        });

        it('respects cooldown before allowing upgrades', () => {
            const gov = createQualityGovernor({
                upMs: 13,
                upHoldS: 12.0,
                downMs: 19,
                downHoldS: 2.0,
                cooldownS: 15.0,
                initialTier: 0,
                pinnedTier: null,
            });

            // Trigger a downgrade from 0 -> 1
            for (let i = 0; i < 45; i++) {
                gov.feedFrame(30, 0.05);
            }
            expect(gov.getTier()).toBe(1);

            // Immediately feed fast frames (10ms, 0.05s step) for 13 seconds (260 frames)
            // upHold (13s) > upHoldS (12s), but cooldown (13s) < cooldownS (15s)
            for (let i = 0; i < 260; i++) {
                gov.feedFrame(10, 0.05);
            }
            expect(gov.getTier()).toBe(1); // Blocked by cooldown!

            // Advance past 15s cooldown (another 3 seconds = 60 frames)
            for (let i = 0; i < 60; i++) {
                gov.feedFrame(10, 0.05);
            }
            expect(gov.getTier()).toBe(0); // Upgraded to 0!
        });

        it('ignores frames longer than ignoreFrameMs (stalls/background)', () => {
            const gov = createQualityGovernor({
                ignoreFrameMs: 250,
                downMs: 19,
                downHoldS: 2.0,
                initialTier: 0,
                pinnedTier: null,
            });

            // Feed 10 massive stalls of 800ms
            for (let i = 0; i < 10; i++) {
                gov.feedFrame(800, 0.8);
            }
            expect(gov.getTier()).toBe(0);
            expect(gov.getAvgMs()).toBe(0); // Never recorded into window
        });

        it('does not change tier when pinned via pinnedTier', () => {
            const gov = createQualityGovernor({
                initialTier: 0,
                pinnedTier: 2,
            });

            expect(gov.isPinned()).toBe(true);
            expect(gov.getTier()).toBe(2);

            // Feed 60s of very slow frames
            for (let i = 0; i < 600; i++) {
                gov.feedFrame(50, 0.1);
            }
            expect(gov.getTier()).toBe(2);

            // Feed 60s of very fast frames
            for (let i = 0; i < 600; i++) {
                gov.feedFrame(5, 0.1);
            }
            expect(gov.getTier()).toBe(2);
        });

        it('prevents jitter when frame times oscillate within hysteresis band (13ms..19ms)', () => {
            const gov = createQualityGovernor({
                upMs: 13,
                downMs: 19,
                downHoldS: 2.0,
                upHoldS: 12.0,
                initialTier: 1,
                pinnedTier: null,
            });

            // Feed 500 frames oscillating between 14ms and 18ms (25 seconds)
            for (let i = 0; i < 500; i++) {
                const ms = (i % 2 === 0) ? 14 : 18;
                gov.feedFrame(ms, 0.05);
            }

            expect(gov.getTier()).toBe(1); // Never fluctuates
        });
    });
});
