import { describe, it, expect } from 'vitest';
import { VFX_PARTS } from '../data/vfx/parts/partConfig';
import { VFX_RAMPS, VFX_NEUTRALS } from '../data/vfx/parts/vfxPalette';
import {
    type PartSpec, normalizePartSpec, partKey, partBounds, partBlend, frameCountForTier,
    quantizeSize, quantizeSeed, boltPolyline, createPartRng,
} from '../engine/renderers/vfxparts/PartSpec';
import { createVFXPartStore, drawPart, partFrameAt } from '../engine/renderers/vfxparts/VFXPartStore';

/** 只記錄呼叫的假 2D context：所有方法皆為 no-op，漸層物件可加色標。 */
function makeFakeCtx(log: string[] = []): CanvasRenderingContext2D {
    const gradient = { addColorStop: () => {} };
    const target: Record<string, unknown> = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
    return new Proxy(target, {
        get(t, prop: string) {
            if (prop in t) return t[prop];
            if (prop.startsWith('create')) return () => gradient;
            return (...args: unknown[]) => { log.push(prop); return args.length ? undefined : undefined; };
        },
        set(t, prop: string, v) { t[prop] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
}

const fakeSurface = (w: number, h: number) => ({
    canvas: { width: w, height: h } as HTMLCanvasElement,
    ctx: makeFakeCtx(),
});

const ALL_SPECS: PartSpec[] = [
    { kind: 'glow', radius: 30, ramp: 'LION_HOLY' },
    { kind: 'ring', radius: 30, thickness: 6, ramp: 'ASH_FIRE', roughness: 1, seed: 2 },
    { kind: 'slashArc', radius: 40, arcDeg: 130, thickness: 10, ramp: 'LION_PHYSICAL' },
    { kind: 'rays', radius: 40, count: 12, ramp: 'LION_HOLY', lengthJitter: 0.5 },
    { kind: 'bolt', length: 90, branches: 3, ramp: 'LION_LIGHTNING', seed: 1 },
    { kind: 'flame', height: 60, ramp: 'ASH_FIRE', jagged: true },
    { kind: 'smoke', radius: 30, color: 'ASH', roughness: 1 },
    { kind: 'shard', size: 14, shape: 'crystal', ramp: 'LION_ICE' },
    { kind: 'shard', size: 14, shape: 'hex', ramp: 'LION_HOLY' },
    { kind: 'shard', size: 14, shape: 'rock', ramp: 'ASH_PHYSICAL' },
    { kind: 'shard', size: 14, shape: 'bone', ramp: 'ASH_PHYSICAL' },
    { kind: 'sigil', radius: 40, emblem: 'sun', ramp: 'LION_HOLY' },
    { kind: 'sigil', radius: 40, emblem: 'lionShield', ramp: 'LION_ARCANE' },
    { kind: 'sigil', radius: 40, emblem: 'hornSkull', ramp: 'ASH_FIRE' },
    { kind: 'sigil', radius: 40, emblem: 'invTriangle', ramp: 'ASH_VOID' },
    { kind: 'pillar', width: 30, height: 90, ramp: 'LION_HOLY' },
    { kind: 'spark', length: 40, ramp: 'LION_LIGHTNING' },
    { kind: 'droplet', size: 14, ramp: 'ASH_BLOOD' },
];

describe('VFX part palette', () => {
    it('every ramp and neutral is a #rrggbb color', () => {
        for (const ramp of Object.values(VFX_RAMPS)) {
            for (const c of [ramp.core, ramp.main, ramp.dark]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
        }
        for (const c of Object.values(VFX_NEUTRALS)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    });
});

describe('PartSpec quantization', () => {
    it('quantizes sizes up to the next step and clamps at the top', () => {
        expect(quantizeSize(30)).toBe(32);
        expect(quantizeSize(32)).toBe(32);
        expect(quantizeSize(9999)).toBe(VFX_PARTS.SIZE_STEPS[VFX_PARTS.SIZE_STEPS.length - 1]);
    });

    it('limits seeds to SEED_VARIANTS', () => {
        expect(quantizeSeed(VFX_PARTS.SEED_VARIANTS + 1)).toBe(1);
        expect(quantizeSeed(undefined)).toBe(0);
    });

    it('nearby parameters share one cache key', () => {
        const a = normalizePartSpec({ kind: 'ring', radius: 29, thickness: 5, ramp: 'LION_HOLY', roughness: 0.05 });
        const b = normalizePartSpec({ kind: 'ring', radius: 31, thickness: 6, ramp: 'LION_HOLY', roughness: 0.1 });
        expect(partKey(a, 1)).toBe(partKey(b, 1));
        const c = normalizePartSpec({ kind: 'ring', radius: 31, thickness: 6, ramp: 'ASH_FIRE' });
        expect(partKey(a, 1)).not.toBe(partKey(c, 1));
    });

    it('cache key includes frame count but no time', () => {
        const n = normalizePartSpec({ kind: 'flame', height: 60, ramp: 'ASH_FIRE' });
        expect(partKey(n, 8)).not.toBe(partKey(n, 4));
        expect(partKey(n, 8)).not.toMatch(/(^|\|)(time|t)=/);
    });

    it('lower tiers keep at least MIN_FRAMES and static parts stay single-frame', () => {
        expect(frameCountForTier('flame', 0)).toBe(VFX_PARTS.FRAMES.flame);
        expect(frameCountForTier('flame', 3)).toBeLessThan(VFX_PARTS.FRAMES.flame);
        expect(frameCountForTier('bolt', 3)).toBeGreaterThanOrEqual(VFX_PARTS.MIN_FRAMES);
        expect(frameCountForTier('glow', 3)).toBe(1);
    });

    it('light parts are additive; smoke, droplets, rock and bone are not (ART_SPEC §10-4)', () => {
        expect(partBlend(normalizePartSpec({ kind: 'glow', radius: 10, ramp: 'LION_HOLY' }))).toBe('lighter');
        expect(partBlend(normalizePartSpec({ kind: 'smoke', radius: 10, color: 'ASH' }))).toBe('source-over');
        expect(partBlend(normalizePartSpec({ kind: 'droplet', size: 10, ramp: 'ASH_BLOOD' }))).toBe('source-over');
        expect(partBlend(normalizePartSpec({ kind: 'shard', size: 10, shape: 'rock', ramp: 'ASH_PHYSICAL' }))).toBe('source-over');
        expect(partBlend(normalizePartSpec({ kind: 'shard', size: 10, shape: 'crystal', ramp: 'LION_ICE' }))).toBe('lighter');
    });

    it('solid ramps (blood, poison, abyss) never use additive blending', () => {
        expect(partBlend(normalizePartSpec({ kind: 'slashArc', radius: 40, arcDeg: 120, thickness: 10, ramp: 'ASH_BLOOD' }))).toBe('source-over');
        expect(partBlend(normalizePartSpec({ kind: 'glow', radius: 40, ramp: 'ASH_VOID' }))).toBe('source-over');
        expect(partBlend(normalizePartSpec({ kind: 'slashArc', radius: 40, arcDeg: 120, thickness: 10, ramp: 'ASH_FIRE' }))).toBe('lighter');
    });

    it('seeds that do not change the shape do not split the cache', () => {
        const ringKey = (seed: number) => partKey(normalizePartSpec({ kind: 'ring', radius: 30, thickness: 6, ramp: 'LION_HOLY', seed }), 1);
        expect(ringKey(1)).toBe(ringKey(2));
        const roughKey = (seed: number) => partKey(normalizePartSpec({ kind: 'ring', radius: 30, thickness: 6, ramp: 'ASH_FIRE', roughness: 1, seed }), 1);
        expect(roughKey(1)).not.toBe(roughKey(2));
        const crystalKey = (seed: number) => partKey(normalizePartSpec({ kind: 'shard', size: 10, shape: 'crystal', ramp: 'LION_ICE', seed }), 1);
        expect(crystalKey(1)).toBe(crystalKey(3));
    });

    it('bounds contain the anchor for every part', () => {
        for (const spec of ALL_SPECS) {
            const b = partBounds(normalizePartSpec(spec));
            expect(b.width).toBeGreaterThan(0);
            expect(b.height).toBeGreaterThan(0);
            expect(b.anchorX).toBeGreaterThanOrEqual(0);
            expect(b.anchorX).toBeLessThanOrEqual(b.width);
            expect(b.anchorY).toBeGreaterThanOrEqual(0);
            expect(b.anchorY).toBeLessThanOrEqual(b.height);
        }
    });
});

describe('bolt geometry', () => {
    it('is deterministic per seed, starts at the top and lands on the impact point', () => {
        const a = boltPolyline(100, 3);
        expect(boltPolyline(100, 3)).toEqual(a);
        expect(boltPolyline(100, 4)).not.toEqual(a);
        expect(a[0]).toEqual([0, 0]);
        expect(a[a.length - 1]).toEqual([0, 100]);
        for (const [x] of a) expect(Math.abs(x)).toBeLessThan(100 * VFX_PARTS.BOLT.WIDTH_RATIO);
    });

    it('part rng is deterministic and in [0,1)', () => {
        const r1 = createPartRng(7), r2 = createPartRng(7);
        for (let i = 0; i < 50; i++) {
            const v = r1();
            expect(v).toBe(r2());
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });
});

describe('VFXPartStore', () => {
    it('bakes every part kind without throwing, at BAKE_SCALE resolution', () => {
        const store = createVFXPartStore(fakeSurface, () => 0);
        for (const spec of ALL_SPECS) {
            const s = store.get(spec);
            expect(s.frames.length).toBe(frameCountForTier(spec.kind, 0));
            expect(s.frames[0].width).toBe(Math.ceil(s.width * VFX_PARTS.BAKE_SCALE));
        }
    });

    it('caches by quantized parameters (hit on repeat, miss on new tier frame count)', () => {
        let tier = 0;
        const store = createVFXPartStore(fakeSurface, () => tier);
        const spec: PartSpec = { kind: 'flame', height: 60, ramp: 'ASH_FIRE' };
        const a = store.get(spec);
        expect(store.get({ ...spec, height: 62 })).toBe(a);
        expect(store.stats()).toMatchObject({ hits: 1, misses: 1 });
        tier = 3;
        const b = store.get(spec);
        expect(b).not.toBe(a);
        expect(b.frames.length).toBeLessThan(a.frames.length);
        // 循環週期不因降階改變
        expect(b.frames.length / b.fps).toBeCloseTo(a.frames.length / a.fps);
    });

    it('tracks bytes and stays within MAX_BYTES', () => {
        const store = createVFXPartStore(fakeSurface, () => 0);
        for (let i = 0; i < 40; i++) store.get({ kind: 'flame', height: 256, ramp: i % 2 ? 'ASH_FIRE' : 'LION_HOLY', jagged: i % 4 < 2 });
        for (const ramp of Object.keys(VFX_RAMPS) as Array<keyof typeof VFX_RAMPS>) store.get({ kind: 'glow', radius: 256, ramp });
        expect(store.bytes()).toBeLessThanOrEqual(VFX_PARTS.MAX_BYTES);
        expect(store.bytes()).toBeGreaterThan(0);
    });

    it('evicts least-recently-used entries beyond MAX_ENTRIES', () => {
        const store = createVFXPartStore(fakeSurface, () => 0);
        const first: PartSpec = { kind: 'glow', radius: 4, ramp: 'LION_HOLY' };
        store.get(first);
        const ramps = Object.keys(VFX_RAMPS) as Array<keyof typeof VFX_RAMPS>;
        let n = 0;
        outer: for (const ramp of ramps) {
            // 小尺寸避免先觸發位元組預算，只測條目上限
            for (let count = 3; count <= 32; count++) {
                for (const radius of [4, 8]) {
                    store.get({ kind: 'rays', radius, count, ramp });
                    store.get(first); // 保持最近使用
                    if (++n > VFX_PARTS.MAX_ENTRIES + 5) break outer;
                }
            }
        }
        expect(store.size()).toBe(VFX_PARTS.MAX_ENTRIES);
        expect(store.stats().evictions).toBeGreaterThan(0);
        const misses = store.stats().misses;
        store.get(first);
        expect(store.stats().misses).toBe(misses);
    });
});

describe('drawPart', () => {
    it('restores alpha and blend, and only draws images', () => {
        const store = createVFXPartStore(fakeSurface, () => 0);
        const sprite = store.get({ kind: 'slashArc', radius: 40, arcDeg: 120, thickness: 10, ramp: 'LION_PHYSICAL' });
        const log: string[] = [];
        const ctx = makeFakeCtx(log);
        ctx.globalAlpha = 0.8;
        drawPart(ctx, sprite, 10, 20, { alpha: 0.5, rotation: 0.3 });
        expect(ctx.globalAlpha).toBe(0.8);
        expect(ctx.globalCompositeOperation).toBe('source-over');
        expect(log.filter((m) => m === 'drawImage')).toHaveLength(1);
        for (const banned of ['createRadialGradient', 'createLinearGradient', 'arc', 'fill', 'stroke', 'clip']) {
            expect(log).not.toContain(banned);
        }
    });

    it('frame selection loops', () => {
        const store = createVFXPartStore(fakeSurface, () => 0);
        const sprite = store.get({ kind: 'flame', height: 60, ramp: 'ASH_FIRE' });
        const n = sprite.frames.length;
        expect(partFrameAt(sprite, 0, 10)).toBe(0);
        expect(partFrameAt(sprite, n / 10, 10)).toBe(0);
        expect(partFrameAt(sprite, 0.1, 10)).toBe(1);
    });
});
