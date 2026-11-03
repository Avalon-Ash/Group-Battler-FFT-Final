import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tileMaskColor } from '../engine/renderers/DrapeHexMask';
import { HexMath } from '../engine/math/HexMath';
import { HexUtils } from '../engine/utils';

/**
 * 逐格貼回只靠矩形外框，所以相鄰格一定要在不同色層：只要有一對同色，就會蓋到鄰格。
 */
describe('GroundDrape stays free of per-tile path clips', () => {
    // iPhone 14 Pro：每幀約 80 次六角路徑裁切就讓 5v5 奧義從 60 掉到約 35 FPS（WORKLOG §2 BH）
    it('never traces a hexagon on the main canvas', () => {
        const source = readFileSync('engine/renderers/GroundDrape.ts', 'utf8');
        expect(source).not.toMatch(/traceHex|HexGeometry/);
    });
});

describe('DrapeHexMask colouring', () => {
    it('never gives two neighbouring tiles the same colour', () => {
        for (let q = -8; q <= 8; q++) {
            for (let r = -8; r <= 8; r++) {
                for (const n of HexUtils.neighbors({ q, r })) {
                    expect(tileMaskColor(n.q, n.r)).not.toBe(tileMaskColor(q, r));
                }
            }
        }
    });

    it('stays in 0..2 for negative coordinates', () => {
        for (let q = -5; q <= 5; q++) {
            for (let r = -5; r <= 5; r++) {
                const c = tileMaskColor(q, r);
                expect(c === 0 || c === 1 || c === 2).toBe(true);
            }
        }
    });

    it.each([
        ['FLAT', [2, -1], 'y'],
        ['FLAT', [0, 3], 'x'],
        ['POINTY', [3, 0], 'y'],
        ['POINTY', [-1, 2], 'x'],
    ] as const)('%s repeat step %j keeps the colour and is axis-aligned', (layout, [dq, dr], flatAxis) => {
        expect(tileMaskColor(dq, dr)).toBe(tileMaskColor(0, 0));
        const p = HexMath.hexToPixel(dq, dr, 0, 0, layout);
        expect(Math.abs(p[flatAxis])).toBeLessThan(1e-9);
    });
});
