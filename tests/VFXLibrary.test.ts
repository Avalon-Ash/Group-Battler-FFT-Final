import { describe, it, expect } from 'vitest';
import { PART_GALLERY } from '../data/vfx/parts/partGallery';

describe('VFX library part gallery', () => {
    it('one entry per part kind, spec kind matches', () => {
        const kinds = PART_GALLERY.map((e) => e.kind);
        expect(new Set(kinds).size).toBe(kinds.length);
        for (const e of PART_GALLERY) expect(e.spec.kind).toBe(e.kind);
    });
});
