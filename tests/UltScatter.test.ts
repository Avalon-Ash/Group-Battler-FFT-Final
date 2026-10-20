import { describe, it, expect, vi } from 'vitest';
import { SequenceSystem } from '../engine/presentation/visuals/SequenceSystem';
import { HexUtils } from '../engine/utils';
import { VisualMath } from '../engine/math/VisualMath';
import type { MapConfig } from '../types';
import type { VFXSequence } from '../types/VFXSchema';

const MAP_CONFIG: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: 'POINTY' };

describe('UltScatter (UA6: Deterministic Sunflower Scatter for STORM)', () => {
    it('同一組參數兩次結果完全相同（確定性）', () => {
        const rings = 4;
        const count = 10;
        const pass1 = [];
        const pass2 = [];

        for (let k = 0; k < count; k++) {
            pass1.push(SequenceSystem.computeScatterOffset(rings, k, count, MAP_CONFIG));
            pass2.push(SequenceSystem.computeScatterOffset(rings, k, count, MAP_CONFIG));
        }

        expect(pass1).toEqual(pass2);
    });

    it('所有落點在 scatterRings 圈內（邊界約束）', () => {
        const testRingCases = [1, 2, 3, 4, 8, 10];
        const testCountCases = [5, 8, 10, 16];

        for (const rings of testRingCases) {
            const p0 = HexUtils.toPx(0, 0, MAP_CONFIG);
            const pR = HexUtils.toPx(rings, 0, MAP_CONFIG);
            const maxRadiusPx = Math.hypot(pR.x - p0.x, pR.y - p0.y);

            for (const count of testCountCases) {
                for (let k = 0; k < count; k++) {
                    const pt = SequenceSystem.computeScatterOffset(rings, k, count, MAP_CONFIG);
                    const dist = Math.hypot(pt.x, pt.y);
                    expect(dist).toBeLessThanOrEqual(maxRadiusPx + 1e-4);
                }
            }
        }
    });

    it('scatterRings = 0 時落點就是中心（單體或無散布）', () => {
        const count = 8;
        for (let k = 0; k < count; k++) {
            const pt = SequenceSystem.computeScatterOffset(0, k, count, MAP_CONFIG);
            expect(pt.x).toBe(0);
            expect(pt.y).toBe(0);
        }
    });

    it('count 個落點彼此不重疊（最小間距 > 0）', () => {
        const testCounts = [4, 8, 10, 16];
        const rings = 3;

        for (const count of testCounts) {
            const points = [];
            for (let k = 0; k < count; k++) {
                points.push(SequenceSystem.computeScatterOffset(rings, k, count, MAP_CONFIG));
            }

            let minDist = Infinity;
            for (let i = 0; i < points.length; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
                    if (d < minDist) minDist = d;
                }
            }

            expect(minDist).toBeGreaterThan(1.0); // 至少大於 1 px 間距
        }
    });

    it('SequenceSystem 派發時依落點所在格重算地面高度 z', () => {
        const seqSystem = new SequenceSystem();

        const mockPlayEffect = vi.fn();
        const mockVfx = {
            playEffect: mockPlayEffect,
            state: { cancelUltBySource: vi.fn() },
        } as unknown as Parameters<typeof seqSystem.run>[3];

        const mockEngine = {
            battleTime: 0,
            agents: [],
            mapConfig: MAP_CONFIG,
            getTerrainHeight: vi.fn((q: number, r: number) => {
                // 不同格給不同高度
                return 100 + (q * 10) + r;
            }),
            bus: { emit: vi.fn() },
        } as unknown as Parameters<typeof seqSystem.run>[2];

        const seq: VFXSequence = {
            id: 'test_storm_seq',
            actions: [
                {
                    type: 'PARTICLE',
                    id: 'FX_STORM_TEST',
                    scatterRings: 3,
                    scatterIndex: 2,
                    scatterCount: 8,
                    delay: 0,
                },
            ],
        };

        const target = { x: 200, y: 150, z: 50 };
        seqSystem.run(seq, target, mockEngine, mockVfx);

        expect(mockPlayEffect).toHaveBeenCalledTimes(1);
        const [id, finalX, finalY, finalZ, , groundZ] = mockPlayEffect.mock.calls[0];
        expect(id).toBe('FX_STORM_TEST');

        // 計算期望的偏移與所在格高度
        const expectedOffset = SequenceSystem.computeScatterOffset(3, 2, 8, MAP_CONFIG);
        const expX = target.x + expectedOffset.x;
        const expY = target.y + expectedOffset.y;
        expect(finalX).toBeCloseTo(expX);
        expect(finalY).toBeCloseTo(expY);

        const hex = HexUtils.fromPx(expX, expY, MAP_CONFIG);
        const expectedTerrainH = 100 + (hex.q * 10) + hex.r;
        expect(finalZ).toBe(expectedTerrainH + 5);
        expect(groundZ).toBe(finalZ - VisualMath.Z_LAYERS.DECAL);
    });
});
