import { describe, it, expect } from 'vitest';
import { computeFoundationLevel } from '../engine/renderers/grid/GridCache';
import { terrainSpriteKey, BASE_LEVEL_BIT_SHIFT, BASE_LEVEL_BIT_MASK } from '../engine/renderers/grid/TerrainBlockCache';
import { HexUtils } from '../engine/utils';
import { TERRAIN_SKIN, TERRAIN_THEMES } from '../constants';
import { HexLayout } from '../types';

/** 半徑 n 的大六角島（與 MapGenerator.rebuild 相同的格集合） */
function island(radius: number) {
    const keys = new Set<string>();
    for (let q = -radius; q <= radius; q++) {
        for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) keys.add(`${q},${r}`);
    }
    return keys;
}

function levelsFor(layout: HexLayout, radius: number) {
    const keys = island(radius);
    const cfg = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout };
    const tiles = [...keys].map((k) => {
        const [q, r] = k.split(',').map(Number);
        return { q, r, px: HexUtils.toPx(q, r, cfg).x };
    });
    const minPx = Math.min(...tiles.map((t) => t.px));
    const maxPx = Math.max(...tiles.map((t) => t.px));
    const exists = (q: number, r: number) => keys.has(`${q},${r}`);
    return tiles.map((t) => ({
        ...t,
        level: computeFoundationLevel(t.q, t.r, t.px, layout, exists, (minPx + maxPx) / 2, (maxPx - minPx) / 2),
    }));
}

describe('island foundation (TERRAIN_SKIN.foundation)', () => {
    for (const layout of ['FLAT', 'POINTY'] as HexLayout[]) {
        it(`${layout}: only front-exposed tiles get a level, all within 1..levels`, () => {
            const rows = levelsFor(layout, 6);
            const exposed = rows.filter((t) => t.level > 0);
            expect(exposed.length).toBeGreaterThan(0);
            // 內部格（距中心 < 半徑）一定被前方格包住
            for (const t of rows) {
                if (HexUtils.dist({ q: t.q, r: t.r }, { q: 0, r: 0 }) < 6) expect(t.level).toBe(0);
            }
            for (const t of exposed) {
                expect(t.level).toBeGreaterThanOrEqual(1);
                expect(t.level).toBeLessThanOrEqual(TERRAIN_SKIN.foundation.levels);
            }
        });

        it(`${layout}: deterministic, and the silhouette is not a constant depth`, () => {
            const a = levelsFor(layout, 6).filter((t) => t.level > 0).map((t) => t.level);
            const b = levelsFor(layout, 6).filter((t) => t.level > 0).map((t) => t.level);
            expect(a).toEqual(b);
            expect(new Set(a).size).toBeGreaterThan(2);
        });
    }

    it('levels fit the 4-bit sprite key field', () => {
        expect(TERRAIN_SKIN.foundation.levels).toBeLessThanOrEqual(BASE_LEVEL_BIT_MASK);
    });

    it('baseLevel changes the sprite key without disturbing other fields', () => {
        const theme = TERRAIN_THEMES['VOID'];
        const k0 = terrainSpriteKey(theme, 'FLAT', 'VOID', 48, 3, 0, 1.5, 21, 0);
        const k7 = terrainSpriteKey(theme, 'FLAT', 'VOID', 48, 3, 0, 1.5, 21, 7);
        expect(k7.packedInt).not.toBe(k0.packedInt);
        expect((k7.packedInt >> BASE_LEVEL_BIT_SHIFT) & BASE_LEVEL_BIT_MASK).toBe(7);
        expect(k7.packedInt & ~(BASE_LEVEL_BIT_MASK << BASE_LEVEL_BIT_SHIFT)).toBe(k0.packedInt);
        // 漂浮位移欄位縮小後，±8 px 範圍仍可區分且不溢位到底座欄位
        const kUp = terrainSpriteKey(theme, 'FLAT', 'VOID', 48, 3, 7.5, 1.5, 21, 0);
        const kDown = terrainSpriteKey(theme, 'FLAT', 'VOID', 48, 3, -7.5, 1.5, 21, 0);
        expect(kUp.packedInt).not.toBe(kDown.packedInt);
        expect((kUp.packedInt >> BASE_LEVEL_BIT_SHIFT) & BASE_LEVEL_BIT_MASK).toBe(0);
    });
});
