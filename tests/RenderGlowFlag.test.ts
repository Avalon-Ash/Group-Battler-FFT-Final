import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    isGlowSpritesEnabled,
    resolveGlowFlag,
    setGlowSpritesEnabledForTest,
    forceSetQualityTier,
} from '../engine/renderers/RenderQuality';

describe('GLOW_SPRITES Quality Flag', () => {
    beforeEach(() => {
        setGlowSpritesEnabledForTest(null);
        forceSetQualityTier(0);
    });

    afterEach(() => {
        setGlowSpritesEnabledForTest(null);
        forceSetQualityTier(0);
    });

    it('is on by default (RENDER_QUALITY.GLOW_SPRITES = true) at every tier', () => {
        for (const tier of [0, 1, 2, 3] as const) {
            forceSetQualityTier(tier);
            expect(isGlowSpritesEnabled()).toBe(true);
        }
    });

    it('resolveGlowFlag: explicit query wins over default and tier', () => {
        expect(resolveGlowFlag('0', true, 3)).toBe(false);
        expect(resolveGlowFlag('false', true, 0)).toBe(false);
        expect(resolveGlowFlag('1', false, 0)).toBe(true);
        expect(resolveGlowFlag('true', false, 0)).toBe(true);
    });

    it('resolveGlowFlag: without query follows default flag, else tier >= 2', () => {
        expect(resolveGlowFlag(null, true, 0)).toBe(true);
        expect(resolveGlowFlag(null, false, 0)).toBe(false);
        expect(resolveGlowFlag(null, false, 1)).toBe(false);
        expect(resolveGlowFlag(null, false, 2)).toBe(true);
        expect(resolveGlowFlag(null, false, 3)).toBe(true);
    });

    it('can be overridden explicitly for testing', () => {
        setGlowSpritesEnabledForTest(true);
        expect(isGlowSpritesEnabled()).toBe(true);

        setGlowSpritesEnabledForTest(false);
        expect(isGlowSpritesEnabled()).toBe(false);
    });
});
