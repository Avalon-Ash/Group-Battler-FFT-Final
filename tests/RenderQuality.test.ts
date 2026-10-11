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
                startupGraceS: 0,
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
                startupGraceS: 0,
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
                startupGraceS: 0,
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

        it('ignores every frame during the startup grace period (JIT warm-up / sprite baking)', () => {
            const gov = createQualityGovernor({
                startupGraceS: 5,
                downMs: 19,
                downHoldS: 2.0,
                initialTier: 0,
                pinnedTier: null,
            });
            // 4.9 s of terrible frames inside the grace window: must not downgrade.
            for (let i = 0; i < 98; i++) gov.feedFrame(40, 0.05);
            expect(gov.getTier()).toBe(0);
            // After the grace window the same frames do count.
            for (let i = 0; i < 60; i++) gov.feedFrame(40, 0.05);
            expect(gov.getTier()).toBe(1);
        });

        it('recovers on a 60 Hz display: upgrade is decided by work time, not by the vsync-pinned frame interval', () => {
            const gov = createQualityGovernor({
                startupGraceS: 0,
                upMs: 9,
                upHoldS: 12.0,
                downMs: 19,
                downHoldS: 2.0,
                cooldownS: 15.0,
                initialTier: 2,
                pinnedTier: null,
            });
            // Frame interval is 16.7 ms (vsync), but the main thread only works 5 ms per frame.
            for (let i = 0; i < 1000; i++) gov.feedFrame(16.7, 0.0167, 5); // ~16.7 s > upHoldS
            expect(gov.getTier()).toBeLessThan(2);
        });

        it('does NOT upgrade when work time alone is not low, even if the interval is steady', () => {
            const gov = createQualityGovernor({
                startupGraceS: 0,
                upMs: 9,
                upHoldS: 12.0,
                downMs: 19,
                downHoldS: 2.0,
                cooldownS: 15.0,
                initialTier: 2,
                pinnedTier: null,
            });
            for (let i = 0; i < 2000; i++) gov.feedFrame(16.7, 0.0167, 14);
            expect(gov.getTier()).toBe(2);
        });

        it('backs off (doubles the upgrade cooldown) when an upgrade is immediately undone', () => {
            const gov = createQualityGovernor({
                startupGraceS: 0,
                upMs: 9,
                upHoldS: 2.0,
                downMs: 19,
                downHoldS: 1.0,
                cooldownS: 4.0,
                maxUpBackoff: 4,
                initialTier: 1,
                pinnedTier: null,
            });
            // Fast frames -> upgrade 1 -> 0 once the cooldown allows it.
            let guard = 0;
            while (gov.getTier() === 1 && guard++ < 2000) gov.feedFrame(8, 0.05, 5);
            expect(gov.getTier()).toBe(0);
            // The upgrade was wrong: slow frames push it straight back to 1 (backoff level 1 => cooldown 8 s).
            guard = 0;
            while (gov.getTier() === 0 && guard++ < 2000) gov.feedFrame(30, 0.05, 25);
            expect(gov.getTier()).toBe(1);
            // 5 s of fast frames: would have upgraded under the plain 4 s cooldown, but not with the doubled one.
            for (let i = 0; i < 100; i++) gov.feedFrame(8, 0.05, 5);
            expect(gov.getTier()).toBe(1);
            // Eventually it does recover.
            guard = 0;
            while (gov.getTier() === 1 && guard++ < 2000) gov.feedFrame(8, 0.05, 5);
            expect(gov.getTier()).toBe(0);
        });
        it('ignores frames longer than ignoreFrameMs (stalls/background)', () => {
            const gov = createQualityGovernor({
                startupGraceS: 0,
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
                startupGraceS: 0,
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
                startupGraceS: 0,
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
