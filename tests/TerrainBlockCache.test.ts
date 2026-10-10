import { describe, it, expect, beforeEach } from 'vitest';
import {
    quantizeRenderScale,
    terrainSpriteKey,
    createTerrainSpriteStore,
    SurfaceFactory,
    TerrainSpriteEntry,
} from '../engine/renderers/grid/TerrainBlockCache';
import { RENDER_CACHE, TerrainTheme } from '../constants';
import { HexLayout } from '../types';
import { MATERIAL_CONFIG } from '../data/vfx/materialConfig';

describe('TerrainBlockCache', () => {
    const mockFactory: SurfaceFactory = (width: number, height: number) => ({
        canvas: { width, height } as unknown as HTMLCanvasElement,
        ctx: {} as unknown as CanvasRenderingContext2D,
    });

    const createDummyEntry = (w = 64, h = 64): TerrainSpriteEntry => ({
        canvas: { width: w, height: h } as unknown as HTMLCanvasElement,
        anchorX: w / 2,
        anchorY: h / 2,
        width: w,
        height: h,
    });

    const dummyTheme: TerrainTheme = {
        top: '#111111',
        sideLight: '#222222',
        sideDark: '#333333',
        detail: '#444444',
        rim: '#555555',
    };

    const dummyLayout: HexLayout = 'FLAT';

    describe('quantizeRenderScale', () => {
        it('quantizes scales upward according to RENDER_CACHE.SCALE_STEPS', () => {
            const steps = RENDER_CACHE.SCALE_STEPS; // [1, 1.5, 2, 3, 4]
            expect(quantizeRenderScale(0.2, steps)).toBe(1);
            expect(quantizeRenderScale(0.999, steps)).toBe(1);
            expect(quantizeRenderScale(1.0, steps)).toBe(1);
            expect(quantizeRenderScale(1.01, steps)).toBe(1.5);
            expect(quantizeRenderScale(1.5, steps)).toBe(1.5);
            expect(quantizeRenderScale(1.51, steps)).toBe(2);
            expect(quantizeRenderScale(2.0, steps)).toBe(2);
            expect(quantizeRenderScale(2.1, steps)).toBe(3);
            expect(quantizeRenderScale(3.0, steps)).toBe(3);
            expect(quantizeRenderScale(3.2, steps)).toBe(4);
            expect(quantizeRenderScale(4.0, steps)).toBe(4);
            expect(quantizeRenderScale(5.5, steps)).toBe(4); // Clamps to max step
        });
    });

    describe('terrainSpriteKey & float quantization', () => {
        it('produces identical packed keys for identical parameters', () => {
            const k1 = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 3, 0.5, 1.5);
            const k2 = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 3, 0.5, 1.5);

            expect(k1.theme).toBe(k2.theme);
            expect(k1.layout).toBe(k2.layout);
            expect(k1.type).toBe(k2.type);
            expect(k1.packedInt).toBe(k2.packedInt);
        });

        it('produces distinct packed keys for different parameters', () => {
            const base = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 3, 0.5, 1.5);

            const diffHeight = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 3, 3, 0.5, 1.5);
            expect(diffHeight.packedInt).not.toBe(base.packedInt);

            const diffVariant = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 4, 0.5, 1.5);
            expect(diffVariant.packedInt).not.toBe(base.packedInt);

            const diffScale = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 3, 0.5, 2);
            expect(diffScale.packedInt).not.toBe(base.packedInt);

            const diffFloat = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 3, 1.0, 1.5);
            expect(diffFloat.packedInt).not.toBe(base.packedInt);
        });

        it('quantizes floating offsets properly into discrete steps', () => {
            // FLOAT_STEP is 0.5
            // 0.24 / 0.5 = 0.48 -> rounds to 0
            // 0.26 / 0.5 = 0.52 -> rounds to 1
            const kFloor = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 0, 0.24, 1);
            const kCeil = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 0, 0.26, 1);
            expect(kFloor.packedInt).not.toBe(kCeil.packedInt);

            // 0.49 and 0.51 both round to 1 (offset = 0.5)
            const k49 = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 0, 0.49, 1);
            const k51 = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 0, 0.51, 1);
            expect(k49.packedInt).toBe(k51.packedInt);

            // 0.74 vs 0.76 round to 1 vs 2 (offset = 0.5 vs 1.0)
            const k74 = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 0, 0.74, 1);
            const k76 = terrainSpriteKey(dummyTheme, dummyLayout, 'void', 2, 0, 0.76, 1);
            expect(k74.packedInt).not.toBe(k76.packedInt);
        });
    });

    describe('createTerrainSpriteStore', () => {
        let store: ReturnType<typeof createTerrainSpriteStore>;

        beforeEach(() => {
            store = createTerrainSpriteStore(mockFactory);
        });

        it('bakes only once for 100 requests of identical key (hit rate)', () => {
            let bakeCount = 0;
            const key = terrainSpriteKey(dummyTheme, dummyLayout, 'normal', 0, 0, 0, 1);

            for (let i = 0; i < 100; i++) {
                const entry = store.get(key, () => {
                    bakeCount++;
                    return createDummyEntry();
                });
                expect(entry).toBeDefined();
            }

            expect(bakeCount).toBe(1);
            expect(store.size()).toBe(1);
        });

        it('clears and rebuilds when exceeding MAX_TERRAIN_SPRITES capacity', () => {
            let bakeCount = 0;

            // Insert MAX_TERRAIN_SPRITES distinct keys
            for (let i = 0; i < RENDER_CACHE.MAX_TERRAIN_SPRITES; i++) {
                const key = terrainSpriteKey(dummyTheme, dummyLayout, `tile_${i}`, 0, 0, 0, 1);
                store.get(key, () => {
                    bakeCount++;
                    return createDummyEntry();
                });
            }

            expect(store.size()).toBe(RENDER_CACHE.MAX_TERRAIN_SPRITES);
            expect(bakeCount).toBe(RENDER_CACHE.MAX_TERRAIN_SPRITES);

            // 513th item should flush store and set size to 1
            const overflowKey = terrainSpriteKey(dummyTheme, dummyLayout, 'overflow', 999, 0, 0, 1);
            store.get(overflowKey, () => {
                bakeCount++;
                return createDummyEntry();
            });

            expect(store.size()).toBe(1);
            expect(bakeCount).toBe(RENDER_CACHE.MAX_TERRAIN_SPRITES + 1);
        });

        it('clears store when MATERIAL_CONFIG signature changes', () => {
            const key = terrainSpriteKey(dummyTheme, dummyLayout, 'normal', 0, 0, 0, 1);
            store.get(key, () => createDummyEntry());
            expect(store.size()).toBe(1);

            const origStrength = MATERIAL_CONFIG.terrain.grain.strength;
            try {
                // Mutate material config parameter
                MATERIAL_CONFIG.terrain.grain.strength = origStrength + 0.15;

                // get() checks signature and clears
                let rebakeCalled = false;
                store.get(key, () => {
                    rebakeCalled = true;
                    return createDummyEntry();
                });

                expect(rebakeCalled).toBe(true);
                expect(store.size()).toBe(1);
            } finally {
                MATERIAL_CONFIG.terrain.grain.strength = origStrength;
            }
        });
    });
});
