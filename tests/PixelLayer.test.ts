import { describe, it, expect, afterEach } from 'vitest';
import { readPixelFactorParam, isModernLayerOp } from '../engine/renderers/PixelLayer';
import { RenderOpType } from '../engine/renderers/RenderList';
import { PIXEL_WORLD } from '../constants';

type LocHolder = { location?: unknown };
const g = globalThis as unknown as LocHolder;
const prev = g.location;

const setSearch = (search: string) => { g.location = { search }; };

describe('PixelLayer', () => {
    afterEach(() => {
        if (prev === undefined) delete g.location; else g.location = prev;
    });

    it('defaults to factor 1 (prototype off) without the query key', () => {
        setSearch('');
        expect(readPixelFactorParam()).toBe(1);
        setSearch('?quality=0');
        expect(readPixelFactorParam()).toBe(1);
    });

    it('accepts only the allowed factors', () => {
        for (const k of PIXEL_WORLD.ALLOWED_FACTORS) {
            setSearch(`?${PIXEL_WORLD.QUERY_KEY}=${k}`);
            expect(readPixelFactorParam()).toBe(k);
        }
        for (const bad of ['0', '1', '4', 'abc', '-2']) {
            setSearch(`?${PIXEL_WORLD.QUERY_KEY}=${bad}`);
            expect(readPixelFactorParam()).toBe(1);
        }
    });

    it('keeps air VFX / projectiles on the full-res layer, ground-sorted ops on the pixel layer', () => {
        expect(isModernLayerOp({ type: RenderOpType.VFX, isGround: false })).toBe(true);
        expect(isModernLayerOp({ type: RenderOpType.PROJECTILE, isGround: false })).toBe(true);
        expect(isModernLayerOp({ type: RenderOpType.VFX, isGround: true })).toBe(false);
        for (const t of [RenderOpType.TERRAIN, RenderOpType.OBSTACLE, RenderOpType.UNIT, RenderOpType.CORPSE, RenderOpType.DECAL, RenderOpType.HAZARD, RenderOpType.OVERLAY, RenderOpType.AURA]) {
            expect(isModernLayerOp({ type: t, isGround: false })).toBe(false);
        }
    });
});
