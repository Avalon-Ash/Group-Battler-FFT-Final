import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    terrainSpriteKey,
    createTerrainSpriteStore,
    SurfaceFactory,
    TerrainSpriteEntry,
} from '../engine/renderers/grid/TerrainBlockCache';
import { RENDER_CACHE, TerrainTheme } from '../constants';
import { HexLayout } from '../types';

const mockFactory: SurfaceFactory = (width: number, height: number) => ({
    canvas: { width, height } as unknown as HTMLCanvasElement,
    ctx: {} as unknown as CanvasRenderingContext2D,
});

const makeEntry = (w = 64, h = 64): TerrainSpriteEntry => ({
    canvas: { width: w, height: h } as unknown as HTMLCanvasElement,
    anchorX: w / 2,
    anchorY: h / 2,
    width: w,
    height: h,
});

const theme: TerrainTheme = { top: '#111', sideLight: '#222', sideDark: '#333', detail: '#444', rim: '#555' };
const layout: HexLayout = 'FLAT';

describe('TerrainBlockCache eviction and bake budget', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('on overflow evicts only sprites of other zoom scales instead of flushing everything', () => {
        const store = createTerrainSpriteStore(mockFactory);
        const half = RENDER_CACHE.MAX_TERRAIN_SPRITES / 2;
        const scaleA = RENDER_CACHE.SCALE_STEPS[0];
        const scaleB = RENDER_CACHE.SCALE_STEPS[2];

        // 以 height 與 variant 組出互不相同的鍵，各填滿一半容量
        for (let i = 0; i < half; i++) {
            const h = Math.floor(i / 16) / RENDER_CACHE.HEIGHT_KEY_SCALE;
            store.get(terrainSpriteKey(theme, layout, 'MAGMA', h, i % 16, 0, scaleA), () => makeEntry());
            store.get(terrainSpriteKey(theme, layout, 'MAGMA', h, i % 16, 0, scaleB), () => makeEntry());
        }
        expect(store.size()).toBe(RENDER_CACHE.MAX_TERRAIN_SPRITES);

        const newKey = terrainSpriteKey(theme, layout, 'MAGMA', 90, 0, 0, scaleB);
        store.get(newKey, () => makeEntry());

        const stats = store.getStats();
        expect(stats.evictions).toBe(half);
        expect(stats.clears).toBe(0);
        expect(store.size()).toBe(half + 1);

        // 目前縮放級距的既有 sprite 仍然命中（不需重新烘焙）
        let baked = 0;
        store.get(terrainSpriteKey(theme, layout, 'MAGMA', 0, 0, 0, scaleB), () => {
            baked++;
            return makeEntry();
        });
        expect(baked).toBe(0);
    });

    it('borrows a neighbouring-scale sprite once the per-frame bake budget is spent', () => {
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);

        const store = createTerrainSpriteStore(mockFactory);
        const scaleA = RENDER_CACHE.SCALE_STEPS[0];
        const scaleB = RENDER_CACHE.SCALE_STEPS[2];
        let bakeCount = 0;
        const slowBake = (): TerrainSpriteEntry => {
            bakeCount++;
            clock += RENDER_CACHE.BAKE_BUDGET_MS + 1;
            return makeEntry();
        };

        const first = store.get(terrainSpriteKey(theme, layout, 'MAGMA', 1, 0, 0, scaleA), slowBake);
        expect(bakeCount).toBe(1);

        // 同一幀內預算已用完 → 借用另一縮放級距的同款 sprite，不再烘焙
        const borrowed = store.get(terrainSpriteKey(theme, layout, 'MAGMA', 1, 0, 0, scaleB), slowBake);
        expect(borrowed).toBe(first);
        expect(bakeCount).toBe(1);
        expect(store.getStats().fallbacks).toBe(1);

        // 沒有可借用者時仍必須烘焙（首次載入不可留空）
        store.get(terrainSpriteKey(theme, layout, 'MAGMA', 7, 3, 0, scaleB), slowBake);
        expect(bakeCount).toBe(2);

        // 下一幀（beginFrame）後，原本借用的鍵才真正烘焙
        store.beginFrame();
        const real = store.get(terrainSpriteKey(theme, layout, 'MAGMA', 1, 0, 0, scaleB), slowBake);
        expect(real).not.toBe(first);
        expect(bakeCount).toBe(3);
    });

    it('does not reset the budget mid-frame however long the bakes take', () => {
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        const store = createTerrainSpriteStore(mockFactory);
        const scaleA = RENDER_CACHE.SCALE_STEPS[0];
        const scaleB = RENDER_CACHE.SCALE_STEPS[2];
        const slowBake = (): TerrainSpriteEntry => { clock += 50; return makeEntry(); };
        for (let v = 0; v < 8; v++) store.get(terrainSpriteKey(theme, layout, 'MAGMA', 1, v, 0, scaleA), slowBake);
        store.beginFrame();
        let baked = 0;
        const countBake = (): TerrainSpriteEntry => { baked++; return slowBake(); };
        for (let v = 0; v < 8; v++) store.get(terrainSpriteKey(theme, layout, 'MAGMA', 1, v, 0, scaleB), countBake);
        // 第一塊就超過預算，其餘 7 塊在同一幀內一律借用，不因經過 50 ms 以上而重新開始計算
        expect(baked).toBe(1);
        expect(store.getStats().fallbacks).toBe(7);
    });

    it('over budget: borrows the tile\'s previous sprite, else defers when asked, else bakes', () => {
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        const store = createTerrainSpriteStore(mockFactory);
        const scale = RENDER_CACHE.SCALE_STEPS[1];
        const slowBake = (): TerrainSpriteEntry => { clock += RENDER_CACHE.BAKE_BUDGET_MS + 1; return makeEntry(); };
        const prev = store.get(terrainSpriteKey(theme, layout, 'MAGMA', 1, 0, 0, scale, 0), slowBake)!;

        // 鄰格塌陷改了邊緣遮罩：新鍵在任何級距都沒有，借同一格上一次的 sprite
        const edgeChanged = terrainSpriteKey(theme, layout, 'MAGMA', 1, 0, 0, scale, 5);
        expect(store.get(edgeChanged, slowBake, { tileFallback: prev })).toBe(prev);

        // 轉場中（defer）且無可借用 → null，這幀不畫
        const fresh = terrainSpriteKey(theme, layout, 'MAGMA', 3, 2, 0, scale);
        expect(store.get(fresh, slowBake, { defer: true })).toBeNull();
        expect(store.getStats().deferrals).toBe(1);

        // 非轉場、無可借用 → 照舊強制烘焙
        expect(store.get(fresh, slowBake)).not.toBeNull();
    });
});
