import { describe, it, expect } from 'vitest';
import { VFX_REGISTRY } from '../data/vfx/VFXRegistry';
import { ULT_PART_VFX } from '../data/vfx/registry/ult_parts';
import { normalizePartSpec, partBounds } from '../engine/renderers/vfxparts/PartSpec';

const PART_TYPES = new Set(['PART', 'PART_GROUND', 'PART_DEBRIS']);
const maxOf = (v: number | [number, number]) => (typeof v === 'number' ? v : v[1]);

describe('part-based VFX recipes', () => {
    it('every PART* emitter in the registry carries a part spec, and only PART* emitters do', () => {
        for (const asset of Object.values(VFX_REGISTRY)) {
            for (const em of asset.emitters) {
                expect(PART_TYPES.has(em.particleType), `${asset.id}`).toBe(!!em.part);
                if (em.part) expect(partBounds(normalizePartSpec(em.part)).width).toBeGreaterThan(0);
            }
        }
    });

    it('part recipes override the registry entries', () => {
        for (const id of Object.keys(ULT_PART_VFX)) expect(VFX_REGISTRY[id]).toBe(ULT_PART_VFX[id]);
    });

    it('ultimates stay within the 2 s budget and show a faction sigil first (ART_SPEC §6)', () => {
        for (const asset of Object.values(ULT_PART_VFX)) {
            const end = Math.max(...asset.emitters.map((e) => maxOf(e.delay) + maxOf(e.lifetime)));
            expect(end, asset.id).toBeLessThanOrEqual(2.0);
            const first = asset.emitters[0];
            expect(first.part?.kind, asset.id).toBe('sigil');
            expect(maxOf(first.delay)).toBe(0);
        }
    });
});
