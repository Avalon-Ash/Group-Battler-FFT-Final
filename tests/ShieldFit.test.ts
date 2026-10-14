import { describe, it, expect } from 'vitest';
import { computeShieldGeometry } from '../engine/renderers/status/painters/ShieldPainter';
import { SHIELD_VISUAL, UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET } from '../constants';

describe('computeShieldGeometry', () => {
    const feetDropY = UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET;

    it('fits the shield to the unit head height plus the margin', () => {
        const geometry = computeShieldGeometry(59);
        expect(geometry.height).toBe(59 + SHIELD_VISUAL.headMargin);
    });

    it('anchors the prism base exactly at the feet (center offset + half height == feet drop)', () => {
        for (const head of [40, 59, 90, 140]) {
            const geometry = computeShieldGeometry(head);
            expect(geometry.centerOffsetY + geometry.height / 2).toBeCloseTo(feetDropY, 6);
        }
    });

    it('scales with taller units (e.g. larger body types) instead of being capped', () => {
        expect(computeShieldGeometry(120).height).toBeGreaterThan(computeShieldGeometry(59).height);
    });

    it('falls back to the default height when the sprite atlas is not ready', () => {
        expect(computeShieldGeometry(null).height).toBe(SHIELD_VISUAL.height);
    });
});
