import { describe, it, expect } from 'vitest';
import { HexGeometry } from '../engine/graphics/utils/HexGeometry';
import { VFX_PARTS } from '../data/vfx/parts/partConfig';
import { emblemCounterRotation, type PartSpec } from '../engine/renderers/vfxparts/PartSpec';
import { createVFXPartStore } from '../engine/renderers/vfxparts/VFXPartStore';
import { PartPainter } from '../engine/presentation/vfx/renderers/painters/PartPainter';
import { ISO_SCALE_Y } from '../constants';
import type { Particle } from '../engine/presentation/vfx/state';

const fakeSurface = () => {
    const ctx = new Proxy({} as Record<string, unknown>, {
        get: (t, p: string) => (p in t ? t[p] : p.startsWith('create') ? () => ({ addColorStop: () => {} }) : () => undefined),
        set: (t, p: string, v) => { t[p] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { canvas: { width: 8, height: 8 } as HTMLCanvasElement, ctx };
};

describe('HexGeometry layout angle', () => {
    it('layoutAngle: FLAT = 0, POINTY = PI/6, and matches getVertices', () => {
        expect(HexGeometry.layoutAngle('FLAT')).toBe(0);
        expect(HexGeometry.layoutAngle('POINTY')).toBeCloseTo(Math.PI / 6, 12);
        for (const layout of ['FLAT', 'POINTY'] as const) {
            const v = HexGeometry.getVertices(10, false, layout)[0];
            expect(Math.atan2(v.y, v.x)).toBeCloseTo(HexGeometry.layoutAngle(layout), 12);
        }
    });

    it('alignRotation: baked flat-top hexes stay put on FLAT, turn PI/6 on POINTY', () => {
        expect(HexGeometry.alignRotation('FLAT', VFX_PARTS.HEX.ANGLE_OFFSET_RAD)).toBe(0);
        expect(HexGeometry.alignRotation('POINTY', VFX_PARTS.HEX.ANGLE_OFFSET_RAD)).toBeCloseTo(Math.PI / 6, 12);
        expect(HexGeometry.alignRotation('POINTY', Math.PI / 6)).toBe(0);
    });

    it('rotating a flat-top hex by alignRotation reproduces the POINTY vertex set', () => {
        const rot = HexGeometry.alignRotation('POINTY');
        const flat = HexGeometry.getVertices(10, false, 'FLAT');
        const pointy = HexGeometry.getVertices(10, false, 'POINTY');
        flat.forEach((v, i) => {
            const x = v.x * Math.cos(rot) - v.y * Math.sin(rot);
            const y = v.x * Math.sin(rot) + v.y * Math.cos(rot);
            expect(x).toBeCloseTo(pointy[i].x, 9);
            expect(y).toBeCloseTo(pointy[i].y, 9);
        });
    });
});

describe('ground part layout alignment', () => {
    it('emblemCounterRotation only affects upright emblems and is 0 on FLAT', () => {
        const sigil = (emblem: 'sun' | 'lionShield' | 'hornSkull' | 'invTriangle'): PartSpec => ({ kind: 'sigil', radius: 64, emblem, ramp: 'LION_HOLY' });
        const rot = HexGeometry.alignRotation('POINTY');
        expect(emblemCounterRotation(sigil('lionShield'), 0)).toBe(0);
        expect(emblemCounterRotation(sigil('sun'), rot)).toBe(0);
        for (const e of ['lionShield', 'hornSkull', 'invTriangle'] as const) {
            expect(emblemCounterRotation(sigil(e), rot)).toBeCloseTo(-rot, 12);
        }
        expect(emblemCounterRotation({ kind: 'ring', radius: 32, thickness: 4, ramp: 'LION_HOLY' }, rot)).toBe(0);
    });

    it('part store: FLAT shares one sprite; POINTY bakes a separate upright-emblem sprite only for directional sigils', () => {
        const store = createVFXPartStore(fakeSurface, () => 0);
        const rot = HexGeometry.alignRotation('POINTY');
        const shield: PartSpec = { kind: 'sigil', radius: 64, emblem: 'lionShield', ramp: 'LION_HOLY' };
        const sun: PartSpec = { kind: 'sigil', radius: 64, emblem: 'sun', ramp: 'LION_HOLY' };
        expect(store.get(shield, 0)).toBe(store.get(shield));
        expect(store.get(shield, rot)).not.toBe(store.get(shield, 0));
        expect(store.get(shield, rot)).toBe(store.get(shield, rot));
        expect(store.get(sun, rot)).toBe(store.get(sun, 0));
    });

    const drawn = (type: string, layout: 'FLAT' | 'POINTY') => {
        const store = createVFXPartStore(fakeSurface, () => 0);
        const calls: Array<[string, number[]]> = [];
        const ctx = new Proxy({ globalAlpha: 1, globalCompositeOperation: 'source-over' } as Record<string, unknown>, {
            get: (t, p: string) => (p in t ? t[p] : (...a: number[]) => { calls.push([p, a]); }),
            set: (t, p: string, v) => { t[p] = v; return true; },
        }) as unknown as CanvasRenderingContext2D;
        const p = { type, part: store.get({ kind: 'ring', radius: 32, thickness: 4, ramp: 'LION_HOLY' }), rotation: 0.25, life: 1, maxLife: 1 } as unknown as Particle;
        PartPainter.draw(ctx, p, 10, 20, 0.5, layout);
        return calls;
    };

    it('PartPainter: PART_GROUND adds the layout rotation after the iso squash; billboards never rotate for layout', () => {
        const rot = (calls: Array<[string, number[]]>) => calls.find(([n]) => n === 'rotate')?.[1][0];
        expect(rot(drawn('PART_GROUND', 'FLAT'))).toBeCloseTo(0.25, 12);
        expect(rot(drawn('PART_GROUND', 'POINTY'))).toBeCloseTo(0.25 + Math.PI / 6, 12);
        expect(rot(drawn('PART', 'POINTY'))).toBeCloseTo(0.25, 12);
        const names = drawn('PART_GROUND', 'POINTY').map(([n]) => n);
        expect(names.indexOf('scale')).toBeLessThan(names.indexOf('rotate'));
        expect(drawn('PART_GROUND', 'POINTY').find(([n]) => n === 'scale')?.[1]).toEqual([1, ISO_SCALE_Y]);
    });
});
