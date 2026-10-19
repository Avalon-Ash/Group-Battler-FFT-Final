import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TerrainLoopAtlas, loopFrameIndex } from '../engine/renderers/grid/TerrainLoopAtlas';
import { SurfacePainter } from '../engine/graphics/painters/SurfacePainter';
import { VFXAmbience } from '../engine/systems/vfx/VFXAmbience';
import { VFXStateManager } from '../engine/systems/vfx/state';
import { forceSetQualityTier } from '../engine/renderers/RenderQuality';
import { HEX_SIZE, RENDER_CACHE, VFX_BUDGET } from '../constants';
import type { HexLayout } from '../types';
import {
    GRASS_DETAIL,
    ICE_SHEEN,
    SAND_RIPPLES,
    TERRAIN_AMBIENCE,
    TERRAIN_LIQUID,
    VOID_RUNES,
    WEATHER_AMBIENCE,
    WEATHER_BOUNDS,
    getTerrainAmbience,
    getWeatherAmbience,
} from '../data/vfx/terrainAmbience';

const BIOMES = ['VOID', 'FOREST', 'ICE', 'MAGMA', 'DESERT'];
const WEATHERS = ['SNOW', 'ASH', 'EMBER', 'SPORES', 'SAND', 'VOID'];

/** 遞迴檢查物件內所有數字都是有限值 */
function collectNumbers(value: unknown, out: number[] = []): number[] {
    if (typeof value === 'number') out.push(value);
    else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, out));
    else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectNumbers(v, out));
    return out;
}

describe('TerrainAmbience loop frame index', () => {
    const P = ICE_SHEEN.loop.period;
    const N = ICE_SHEEN.loop.frames;

    it('returns to frame 0 when time crosses the period and never leaves [0, N)', () => {
        expect(loopFrameIndex(0, P, N)).toBe(0);
        expect(loopFrameIndex(P, P, N)).toBe(0);
        expect(loopFrameIndex(P * 7, P, N)).toBe(0);
        expect(loopFrameIndex(P - 1e-9, P, N)).toBe(N - 1);
        expect(loopFrameIndex(P + 1e-9, P, N)).toBe(0);
        for (let t = -50; t < 200; t += 0.0371) {
            const idx = loopFrameIndex(t, P, N);
            expect(Number.isInteger(idx)).toBe(true);
            expect(idx).toBeGreaterThanOrEqual(0);
            expect(idx).toBeLessThan(N);
        }
    });

    it('advances monotonically within a period and wraps exactly once per period', () => {
        let prev = loopFrameIndex(0, P, N);
        let wraps = 0;
        const steps = 5000;
        for (let i = 1; i <= steps; i++) {
            const idx = loopFrameIndex((i / steps) * P * 3 - 1e-9, P, N);
            if (idx < prev) wraps++;
            else expect(idx - prev).toBeLessThanOrEqual(1);
            prev = idx;
        }
        expect(wraps).toBe(2);
    });

    it('handles negative time, NaN and phase offsets without going out of bounds', () => {
        expect(loopFrameIndex(-1e-9, P, N)).toBe(N - 1);
        expect(loopFrameIndex(Number.NaN, P, N)).toBe(0);
        expect(loopFrameIndex(0, P, N, 0.5)).toBe(Math.floor(N / 2));
        expect(loopFrameIndex(0, P, N, 1.25)).toBe(loopFrameIndex(0, P, N, 0.25));
        expect(loopFrameIndex(0, P, N, -0.25)).toBe(loopFrameIndex(0, P, N, 0.75));
    });

    it('uses integer harmonics so first and last frames join seamlessly', () => {
        const harmonics = [
            TERRAIN_LIQUID.drift.harmonic,
            TERRAIN_LIQUID.pulse.harmonic,
            TERRAIN_LIQUID.bubbles.harmonic,
        ];
        for (const k of harmonics) expect(Number.isInteger(k) && k > 0).toBe(true);
        // 冰面反光：週期內滑過一整個 wrap 距離，頭尾位置相差剛好一個 wrap
        expect(ICE_SHEEN.loop.period * 0.5).toBeCloseTo(ICE_SHEEN.slideWrap, 9);
    });
});

describe('TerrainLoopAtlas bakes once per configuration', () => {
    let created = 0;
    let prevDoc: unknown;
    const calls = { clip: 0, drawImage: 0, gradient: 0 };

    const makeCtx = () => {
        const target: Record<string, unknown> = {
            clip: () => { calls.clip++; },
            createLinearGradient: () => { calls.gradient++; return { addColorStop: () => {} }; },
            createRadialGradient: () => { calls.gradient++; return { addColorStop: () => {} }; },
            drawImage: () => { calls.drawImage++; },
            createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        };
        return new Proxy(target, {
            get: (t, prop: string) => (prop in t ? t[prop] : () => {}),
            set: (t, prop: string, v) => { t[prop] = v; return true; },
        });
    };

    beforeEach(() => {
        created = 0;
        calls.clip = 0; calls.drawImage = 0; calls.gradient = 0;
        prevDoc = (globalThis as unknown as { document?: unknown }).document;
        (globalThis as unknown as { document?: unknown }).document = {
            createElement: () => {
                created++;
                return { width: 0, height: 0, getContext: () => makeCtx() };
            },
        };
        TerrainLoopAtlas.reset();
    });

    afterEach(() => {
        (globalThis as unknown as { document?: unknown }).document = prevDoc;
        TerrainLoopAtlas.reset();
    });

    it('ICE: second request for the same layout and size does not redraw', () => {
        const first = TerrainLoopAtlas.getIce('FLAT', HEX_SIZE);
        expect(first.frames.length).toBe(ICE_SHEEN.loop.frames);
        expect(TerrainLoopAtlas.bakeCount).toBe(1);
        const createdAfterFirst = created;
        const second = TerrainLoopAtlas.getIce('FLAT', HEX_SIZE);
        expect(second).toBe(first);
        expect(TerrainLoopAtlas.bakeCount).toBe(1);
        expect(created).toBe(createdAfterFirst);
        TerrainLoopAtlas.getIce('POINTY', HEX_SIZE);
        expect(TerrainLoopAtlas.bakeCount).toBe(2);
    });

    it('FOREST: one composite loop per (color, variant); repeats are free', () => {
        const a = TerrainLoopAtlas.getGrass('#14532d', 0);
        expect(a.frames.length).toBe(GRASS_DETAIL.loop.frames);
        const bakes = TerrainLoopAtlas.bakeCount;
        const createdAfterFirst = created;
        expect(TerrainLoopAtlas.getGrass('#14532d', 0)).toBe(a);
        expect(TerrainLoopAtlas.bakeCount).toBe(bakes);
        expect(created).toBe(createdAfterFirst);
        TerrainLoopAtlas.getGrass('#14532d', 1);
        expect(TerrainLoopAtlas.bakeCount).toBe(bakes + 1);
    });

    it('MAGMA liquid: slots are keyed by color, layout and quantized intensity', () => {
        const layout: HexLayout = 'FLAT';
        const a = TerrainLoopAtlas.getLiquid('#ef4444', layout, 1.0);
        expect(a.sheet.count).toBe(TERRAIN_LIQUID.loop.frames);
        expect(TerrainLoopAtlas.getLiquid('#ef4444', layout, 1.0)).toBe(a);
        // 同一量化步距內的 intensity 共用同一組
        const step = TERRAIN_LIQUID.intensityStep;
        expect(TerrainLoopAtlas.getLiquid('#ef4444', layout, 1.0 - step * 0.2)).toBe(a);
        expect(TerrainLoopAtlas.getLiquidStats()).toEqual({ slots: 1, bakes: 1, hits: 2 });
        expect(TerrainLoopAtlas.getLiquid('#ef4444', layout, 1.0 - step)).not.toBe(a);
        expect(TerrainLoopAtlas.getLiquid('#f97316', layout, 1.0)).not.toBe(a);
        expect(TerrainLoopAtlas.getLiquid('#ef4444', 'POINTY', 1.0)).not.toBe(a);
        expect(TerrainLoopAtlas.getLiquidStats().slots).toBe(4);
    });

    it('MAGMA liquid: slot count never exceeds RENDER_CACHE.LOOP_LIQUID_SLOTS', () => {
        for (let i = 0; i < RENDER_CACHE.LOOP_LIQUID_SLOTS + 5; i++) {
            TerrainLoopAtlas.getLiquid(`#00${(i + 16).toString(16)}00`, 'FLAT', 1.0);
        }
        expect(TerrainLoopAtlas.getLiquidStats().slots).toBe(RENDER_CACHE.LOOP_LIQUID_SLOTS);
    });

    it('runtime painters do one drawImage per call with no clip or gradient', () => {
        const ctx = makeCtx() as unknown as CanvasRenderingContext2D;
        // 先預熱（預渲染階段允許 clip／漸層）
        SurfacePainter.drawIceSheen(ctx, 0, 0, HEX_SIZE, 0, 'FLAT');
        SurfacePainter.drawGrass(ctx, 0, 0, '#14532d', 0, 0);
        SurfacePainter.drawLiquid(ctx, 0, 0, '#ef4444', 0, 1.0, 'FLAT');
        calls.clip = 0; calls.drawImage = 0; calls.gradient = 0;
        const createdBefore = created;
        for (let i = 0; i < 100; i++) {
            SurfacePainter.drawIceSheen(ctx, i, i, HEX_SIZE, i * 0.37, 'FLAT');
            SurfacePainter.drawGrass(ctx, i, i, '#14532d', i * 0.37, 0);
            SurfacePainter.drawLiquid(ctx, i, i, '#ef4444', i * 0.37, 1.0, 'FLAT');
        }
        expect(calls.drawImage).toBe(300);
        expect(calls.clip).toBe(0);
        expect(calls.gradient).toBe(0);
        expect(created).toBe(createdBefore);
    });
});

describe('TerrainAmbience config table', () => {
    it('covers the 5 terrain types and 6 weather types', () => {
        expect(Object.keys(TERRAIN_AMBIENCE).sort()).toEqual([...BIOMES].sort());
        expect(Object.keys(WEATHER_AMBIENCE).sort()).toEqual([...WEATHERS].sort());
        for (const b of BIOMES) expect(getTerrainAmbience(b)).toBe(TERRAIN_AMBIENCE[b as keyof typeof TERRAIN_AMBIENCE]);
        for (const w of WEATHERS) expect(getWeatherAmbience(w)).toBeDefined();
        expect(getTerrainAmbience('NOPE')).toBeUndefined();
        expect(getWeatherAmbience('NONE')).toBeUndefined();
    });

    it('records which details are baked and which are loop animations', () => {
        expect(TERRAIN_AMBIENCE.DESERT.detail.baked).toBe(true);
        expect(TERRAIN_AMBIENCE.VOID.detail.baked).toBe(true);
        expect(TERRAIN_AMBIENCE.FOREST.detail.baked).toBe(false);
        expect(TERRAIN_AMBIENCE.ICE.detail.baked).toBe(false);
        expect(TERRAIN_AMBIENCE.MAGMA.liquid).not.toBeNull();
        expect(VOID_RUNES.variantMask.some(Boolean)).toBe(true);
        expect(VOID_RUNES.variantMask.some((v) => !v)).toBe(true);
        expect(SAND_RIPPLES.variantPhases.length).toBeGreaterThan(0);
    });

    it('has finite numbers everywhere and positive timing / rate values', () => {
        for (const n of collectNumbers([TERRAIN_AMBIENCE, TERRAIN_LIQUID, WEATHER_AMBIENCE, WEATHER_BOUNDS])) {
            expect(Number.isFinite(n)).toBe(true);
        }
        for (const loop of [GRASS_DETAIL.loop, ICE_SHEEN.loop, TERRAIN_LIQUID.loop]) {
            expect(loop.period).toBeGreaterThan(0);
            expect(Number.isInteger(loop.frames) && loop.frames >= 2).toBe(true);
        }
        expect(TERRAIN_LIQUID.intensityStep).toBeGreaterThan(0);
        for (const w of WEATHERS) {
            const cfg = WEATHER_AMBIENCE[w as keyof typeof WEATHER_AMBIENCE];
            expect(cfg.interval).toBeGreaterThan(0);
            expect(Number.isInteger(cfg.maxActive) && cfg.maxActive > 0).toBe(true);
            expect(cfg.size.min).toBeGreaterThan(0);
            expect(cfg.size.spread).toBeGreaterThanOrEqual(0);
            expect(cfg.primaryChance).toBeGreaterThan(0);
            expect(cfg.primaryChance).toBeLessThanOrEqual(1);
            expect(cfg.colors.length).toBeGreaterThanOrEqual(1);
            expect(cfg.colors.length).toBeLessThanOrEqual(2);
            if (cfg.life !== null) expect(cfg.life).toBeGreaterThan(0);
            else expect(cfg.vx.min).toBeGreaterThan(0);
        }
        expect(WEATHER_BOUNDS.pxPerTile).toBeGreaterThan(0);
    });

    it('keeps the drawLiquid signature (ctx, x, y, color, time, intensity, layout?)', () => {
        const typed: (
            ctx: CanvasRenderingContext2D,
            x: number,
            y: number,
            color: string,
            time: number,
            intensity: number,
            layout?: HexLayout
        ) => void = SurfacePainter.drawLiquid;
        expect(typeof typed).toBe('function');
        // layout 有預設值，所以 length 只算前 6 個必填參數
        expect(SurfacePainter.drawLiquid.length).toBe(6);
    });
});

describe('VFXAmbience weather particles', () => {
    afterEach(() => forceSetQualityTier(0));

    const fill = (type: string, seconds: number) => {
        const state = new VFXStateManager();
        const amb = new VFXAmbience();
        const dt = 1 / 120;
        for (let t = 0; t < seconds; t += dt) amb.update(dt, type, state);
        return state;
    };

    it('spawns ATMOSPHERE particles from the config table and never exceeds the cap', () => {
        const state = fill('SNOW', 60);
        const cap = WEATHER_AMBIENCE.SNOW.maxActive;
        expect(state.particles.length).toBe(cap);
        expect(state.particles.every((p) => p.type === 'ATMOSPHERE')).toBe(true);
        // 沒有重複加入同一個粒子物件
        expect(new Set(state.particles).size).toBe(state.particles.length);
    });

    it('scales emission and cap with the quality tier', () => {
        forceSetQualityTier(3);
        const ratio = VFX_BUDGET.TIER_EMISSION_RATIOS[3];
        const state = fill('SNOW', 60);
        expect(state.particles.length).toBe(Math.floor(WEATHER_AMBIENCE.SNOW.maxActive * ratio));
    });

    it('ignores unregistered ambient types', () => {
        expect(fill('NONE', 5).particles.length).toBe(0);
        expect(fill('RAIN', 5).particles.length).toBe(0);
    });

    it('sand particles start at the left edge and live exactly long enough to cross the bounds', () => {
        const state = fill('SAND', 1);
        expect(state.particles.length).toBeGreaterThan(0);
        for (const p of state.particles) {
            expect(p.x).toBe(WEATHER_BOUNDS.offsetX);
            expect(p.life).toBeCloseTo(WEATHER_BOUNDS.fallbackW / p.vx, 9);
        }
    });
});
