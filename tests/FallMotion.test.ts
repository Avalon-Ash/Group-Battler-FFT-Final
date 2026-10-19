import { describe, it, expect } from 'vitest';
import { unitFallProgress, unitFallAlpha } from '../data/units/appearance/fallMotion';
import { UNIT_BODY_MOTION } from '../constants';

describe('unit fall motion (shrink-zone collapse)', () => {
    it('is inactive on the ground and in the air', () => {
        expect(unitFallProgress(0)).toBe(0);
        expect(unitFallProgress(40)).toBe(0);
        expect(unitFallProgress(Number.NaN)).toBe(0);
        expect(unitFallAlpha(0)).toBe(1);
    });

    it('ramps to fully faded before the simulation removes the unit (z < -1000)', () => {
        const half = unitFallProgress(-UNIT_BODY_MOTION.fallFadeDepth / 2);
        expect(half).toBeCloseTo(0.5, 5);
        expect(unitFallAlpha(half)).toBeGreaterThan(0);
        expect(unitFallAlpha(half)).toBeLessThan(1);
        expect(UNIT_BODY_MOTION.fallFadeDepth).toBeLessThan(1000);
        expect(unitFallProgress(-1000)).toBe(1);
        expect(unitFallAlpha(1)).toBe(0);
    });
});
