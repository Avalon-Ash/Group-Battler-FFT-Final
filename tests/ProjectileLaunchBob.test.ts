import { describe, it, expect } from 'vitest';
import { VisualMath } from '../engine/math/VisualMath';
import { FLOAT_BOB } from '../constants';

// RenderSpec §5: the launch cell's float bob is applied at launch and fades to 0 by FLOAT_BOB.LAUNCH_FADE_T
describe('VisualMath.floatLaunchWeight', () => {
    it('is 1 at launch and 0 from the fade point on', () => {
        expect(VisualMath.floatLaunchWeight(0)).toBe(1);
        expect(VisualMath.floatLaunchWeight(FLOAT_BOB.LAUNCH_FADE_T)).toBe(0);
        expect(VisualMath.floatLaunchWeight(1)).toBe(0);
    });

    it('falls monotonically in between', () => {
        let prev = 1;
        for (let t = 0.05; t < FLOAT_BOB.LAUNCH_FADE_T; t += 0.05) {
            const w = VisualMath.floatLaunchWeight(t);
            expect(w).toBeLessThan(prev);
            expect(w).toBeGreaterThanOrEqual(0);
            prev = w;
        }
    });
});
