import { describe, it, expect } from 'vitest';
import { computeEdgeMask, getEdgeTable } from '../engine/systems/grid/GridCache';
import { terrainSpriteKey, EDGE_MASK_BIT_SHIFT } from '../engine/renderers/grid/TerrainBlockCache';
import { HexMath } from '../engine/math/HexMath';
import { BLOCK_HEIGHT, RENDER_CACHE, TERRAIN_THEMES } from '../constants';
import { HexLayout } from '../types';

const LAYOUTS: HexLayout[] = ['FLAT', 'POINTY'];
const HIGH = 2 * BLOCK_HEIGHT;

/** 以高度表建立 heightAt；表中沒有的格視為不存在 */
function makeHeightAt(cells: Record<string, number>) {
    return (q: number, r: number): number | undefined => cells[`${q},${r}`];
}

/** 以中心 (0,0) 與六個鄰格建立高度表 */
function ringMap(centerH: number, neighborH: (dir: number) => number | undefined): Record<string, number> {
    const cells: Record<string, number> = { '0,0': centerH };
    HexMath.directions.forEach((d, i) => {
        const h = neighborH(i);
        if (h !== undefined) cells[`${d.q},${d.r}`] = h;
    });
    return cells;
}

const bitsOf = (edges: number[]) => edges.reduce((m, e) => m | (1 << e), 0);

describe('edge table derivation (HexMath.neighbors x HexUtils.toPx)', () => {
    // 獨立幾何推導（不經過被測程式）：HexMath.directions 順序為 (1,0) (1,-1) (0,-1) (-1,0) (-1,1) (0,1)
    // FLAT：頂點角 0°,60°..；邊 i 中點角 = 30°+60i（螢幕 y 向下）。
    //   (1,0) 右下 → 邊0；(1,-1) 右上 → 邊5；(0,-1) 正上 → 邊4；(-1,0) 左上 → 邊3；(-1,1) 左下 → 邊2；(0,1) 正下 → 邊1
    // POINTY：頂點角 30°,90°..；邊 i 中點角 = 60°+60i。
    //   (1,0) 正右 → 邊5；(1,-1) 右上 → 邊4；(0,-1) 左上 → 邊3；(-1,0) 正左 → 邊2；(-1,1) 左下 → 邊1；(0,1) 右下 → 邊0
    const expectedDirToEdge: Record<HexLayout, number[]> = {
        FLAT: [0, 5, 4, 3, 2, 1],
        POINTY: [5, 4, 3, 2, 1, 0],
    };

    it.each(LAYOUTS)('%s: edge -> neighbor direction matches independent geometry', (layout) => {
        const table = getEdgeTable(layout);
        const dirToEdge = new Array(6).fill(-1);
        table.edgeToDir.forEach((dir, edge) => { dirToEdge[dir] = edge; });
        expect(dirToEdge).toEqual(expectedDirToEdge[layout]);
    });

    it('front edges (screen normal y >= 0): FLAT = {0,1,2}, POINTY = {0,1,2,5}', () => {
        const front = (layout: HexLayout) => getEdgeTable(layout).edgeIsFront
            .map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
        expect(front('FLAT')).toEqual([0, 1, 2]);
        expect(front('POINTY')).toEqual([0, 1, 2, 5]);
    });
});

describe('computeEdgeMask', () => {
    it.each(LAYOUTS)('%s: flat ground interior tile has mask 0', (layout) => {
        const heightAt = makeHeightAt(ringMap(0, () => 0));
        expect(computeEdgeMask(0, 0, 0, layout, heightAt)).toBe(0);
    });

    it.each(LAYOUTS)('%s: isolated high tile -> all front bits set, all back bits clear', (layout) => {
        const table = getEdgeTable(layout);
        const heightAt = makeHeightAt(ringMap(HIGH, () => 0));
        const mask = computeEdgeMask(0, 0, HIGH, layout, heightAt);
        const frontBits = bitsOf(table.edgeIsFront.map((f, i) => (f ? i : -1)).filter((i) => i >= 0));
        expect(mask).toBe(frontBits);
        for (let i = 0; i < 6; i++) {
            if (!table.edgeIsFront[i]) expect((mask >> i) & 1).toBe(0);
        }
    });

    it.each(LAYOUTS)('%s: low tile surrounded by high tiles -> front bits clear, back bits set', (layout) => {
        const table = getEdgeTable(layout);
        const heightAt = makeHeightAt(ringMap(0, () => HIGH));
        const mask = computeEdgeMask(0, 0, 0, layout, heightAt);
        const backBits = bitsOf(table.edgeIsFront.map((f, i) => (!f ? i : -1)).filter((i) => i >= 0));
        expect(mask).toBe(backBits);
    });

    it('missing neighbour on a front edge is a cliff; on a back edge it is not', () => {
        for (const layout of LAYOUTS) {
            const table = getEdgeTable(layout);
            const mask = computeEdgeMask(0, 0, 0, layout, makeHeightAt({ '0,0': 0 }));
            for (let i = 0; i < 6; i++) expect((mask >> i) & 1).toBe(table.edgeIsFront[i] ? 1 : 0);
        }
    });

    it('height difference below minStep does not count', () => {
        const heightAt = makeHeightAt(ringMap(0, () => BLOCK_HEIGHT - 1));
        expect(computeEdgeMask(0, 0, 0, 'FLAT', heightAt)).toBe(0);
    });

    // 不對稱案例：只有一個方向有落差，證明「邊 <-> 方向」的對應是對的（預期值來自上面的獨立幾何推導）
    it('FLAT asymmetric: only the (1,0) neighbour (lower right) is lower -> exactly edge 0', () => {
        const heightAt = makeHeightAt(ringMap(HIGH, (dir) => (dir === 0 ? 0 : HIGH)));
        expect(computeEdgeMask(0, 0, HIGH, 'FLAT', heightAt)).toBe(1 << 0);
    });
    it('FLAT asymmetric: only the (0,-1) neighbour (straight up) is higher -> exactly edge 4', () => {
        const heightAt = makeHeightAt(ringMap(0, (dir) => (dir === 2 ? HIGH : 0)));
        expect(computeEdgeMask(0, 0, 0, 'FLAT', heightAt)).toBe(1 << 4);
    });
    it('POINTY asymmetric: only the (1,0) neighbour (straight right) is lower -> exactly edge 5', () => {
        const heightAt = makeHeightAt(ringMap(HIGH, (dir) => (dir === 0 ? 0 : HIGH)));
        expect(computeEdgeMask(0, 0, HIGH, 'POINTY', heightAt)).toBe(1 << 5);
    });
    it('POINTY asymmetric: only the (0,-1) neighbour (upper left) is higher -> exactly edge 3', () => {
        const heightAt = makeHeightAt(ringMap(0, (dir) => (dir === 2 ? HIGH : 0)));
        expect(computeEdgeMask(0, 0, 0, 'POINTY', heightAt)).toBe(1 << 3);
    });
});

describe('terrainSpriteKey edge mask packing', () => {
    const theme = TERRAIN_THEMES['VOID'];
    const scale = RENDER_CACHE.SCALE_STEPS[2];

    it('different masks give different keys; same inputs give the same key', () => {
        const seen = new Set<number>();
        for (let m = 0; m < 64; m++) {
            const k = terrainSpriteKey(theme, 'FLAT', 'VOID', 2, 3, 0.5, scale, m);
            expect(k.packedInt).toBe(terrainSpriteKey(theme, 'FLAT', 'VOID', 2, 3, 0.5, scale, m).packedInt);
            seen.add(k.packedInt);
        }
        expect(seen.size).toBe(64);
    });

    it('mask occupies bits 25-30 only; other fields unpack unchanged; stays within 31 bits', () => {
        const base = terrainSpriteKey(theme, 'FLAT', 'VOID', 48, 5, 1.5, scale, 0).packedInt;
        for (let m = 0; m < 64; m++) {
            const p = terrainSpriteKey(theme, 'FLAT', 'VOID', 48, 5, 1.5, scale, m).packedInt;
            expect(EDGE_MASK_BIT_SHIFT).toBe(25);
            expect((p >> 25) & 63).toBe(m);
            expect(p & ((1 << 25) - 1)).toBe(base & ((1 << 25) - 1));
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThan(2 ** 31);
        }
    });

    it('mask defaults to 0 (existing callers keep their keys)', () => {
        expect(terrainSpriteKey(theme, 'FLAT', 'VOID', 2, 3, 0, 1).packedInt)
            .toBe(terrainSpriteKey(theme, 'FLAT', 'VOID', 2, 3, 0, 1, 0).packedInt);
    });
});
