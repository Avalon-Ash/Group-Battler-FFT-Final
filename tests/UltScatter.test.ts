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
            isValid: vi.fn(() => true),
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

    describe('clampScatterToMap (UF4: Map Boundary Clamping)', () => {
        it('落在合法地圖格時不改變偏移', () => {
            const target = { x: 100, y: 100, z: 0 };
            const offset = { x: 20, y: 30 };
            const isValidTile = () => true;

            const res = SequenceSystem.clampScatterToMap(target, offset, MAP_CONFIG, isValidTile);
            expect(res.x).toBe(20);
            expect(res.y).toBe(30);
        });

        it('落點在界外時沿中心縮回至合法格子', () => {
            const target = { x: 100, y: 100, z: 0 };
            const offset = { x: 100, y: 100 };
            let callCount = 0;
            // 第一次（原位置）界外，第二次（縮回一次）合法
            const isValidTile = () => {
                callCount++;
                return callCount >= 2;
            };

            const res = SequenceSystem.clampScatterToMap(target, offset, MAP_CONFIG, isValidTile, 0.75, 4);
            expect(res.x).toBeCloseTo(75);
            expect(res.y).toBeCloseTo(75);
        });

        it('多次縮回仍出界時歸零（落在中心）', () => {
            const target = { x: 100, y: 100, z: 0 };
            const offset = { x: 100, y: 100 };
            // 全部界外
            const isValidTile = () => false;

            const res = SequenceSystem.clampScatterToMap(target, offset, MAP_CONFIG, isValidTile, 0.75, 4);
            expect(res.x).toBe(0);
            expect(res.y).toBe(0);
        });

        it('SequenceSystem 派發時自動將出界散布縮回至合法地塊', () => {
            const seqSystem = new SequenceSystem();
            const mockPlayEffect = vi.fn();
            const mockVfx = {
                playEffect: mockPlayEffect,
                state: { cancelUltBySource: vi.fn() },
            } as unknown as Parameters<typeof seqSystem.run>[3];

            // 只有 (0, 0) 是合法格子，其他全界外
            const targetCenterHex = HexUtils.toPx(0, 0, MAP_CONFIG);
            const mockEngine = {
                battleTime: 0,
                agents: [],
                mapConfig: MAP_CONFIG,
                getTerrainHeight: vi.fn(() => 42),
                bus: { emit: vi.fn() },
                isValid: vi.fn((q: number, r: number) => q === 0 && r === 0),
            } as unknown as Parameters<typeof seqSystem.run>[2];

            const seq: VFXSequence = {
                id: 'boundary_test_seq',
                actions: [
                    {
                        type: 'PARTICLE',
                        id: 'FX_STORM_TEST',
                        scatterRings: 6,
                        scatterIndex: 5,
                        scatterCount: 8,
                        delay: 0,
                    },
                ],
            };

            const target = { x: targetCenterHex.x, y: targetCenterHex.y, z: 0 };
            seqSystem.run(seq, target, mockEngine, mockVfx);

            expect(mockPlayEffect).toHaveBeenCalledTimes(1);
            const [, finalX, finalY, finalZ] = mockPlayEffect.mock.calls[0];
            // 應縮回至中心合法格或極靠近中心
            const finalHex = HexUtils.fromPx(finalX, finalY, MAP_CONFIG);
            expect(finalHex.q).toBe(0);
            expect(finalHex.r).toBe(0);
            expect(finalZ).toBe(42 + 5);
        });
    });

    describe('STORM Cadence (UF4: Timing Differentiation)', () => {
        it('rr_u3 設定為 ACCEL 且時序前慢後快、總長不變', async () => {
            const { ULT_VISUALS } = await import('../data/vfx/ult_visuals');
            const { SKILL_SEQUENCES } = await import('../data/vfx/SkillSequences');

            expect(ULT_VISUALS['rr_u3'].cadence).toBe('ACCEL');
            const seq = SKILL_SEQUENCES['rr_u3'];
            const stormActions = seq.actions.filter(a => a.type === 'PARTICLE' && a.scatterCount);
            expect(stormActions.length).toBe(8);

            const delays = stormActions.map(a => a.delay ?? 0);
            const intervals: number[] = [];
            for (let i = 1; i < delays.length; i++) {
                intervals.push(delays[i] - delays[i - 1]);
            }

            // 前面的間隔大於後面的間隔（加速）
            for (let i = 1; i < intervals.length; i++) {
                expect(intervals[i]).toBeLessThanOrEqual(intervals[i - 1] + 1e-6);
            }
            expect(intervals[intervals.length - 1]).toBeLessThan(intervals[0]);

            // 第一擊在 hitAt，最後一擊總時長與原本 (count - 1) * interval 相同
            const nominalSpan = 7 * (ULT_VISUALS['rr_u3'].timing ?? 0.08);
            expect(delays[0]).toBeCloseTo(seq.hitAt);
            expect(delays[delays.length - 1] - delays[0]).toBeCloseTo(nominalSpan);
        });

        it('rb_u5 設定為 CLUSTER 且呈現三擊一組的節奏', async () => {
            const { ULT_VISUALS } = await import('../data/vfx/ult_visuals');
            const { SKILL_SEQUENCES } = await import('../data/vfx/SkillSequences');

            expect(ULT_VISUALS['rb_u5'].cadence).toBe('CLUSTER');
            const seq = SKILL_SEQUENCES['rb_u5'];
            const stormActions = seq.actions.filter(a => a.type === 'PARTICLE' && a.scatterCount);
            expect(stormActions.length).toBe(8);

            const delays = stormActions.map(a => a.delay ?? 0);
            // 第 0, 1, 2 擊（組 0）內部間隔極短
            const intra1 = delays[1] - delays[0];
            const intra2 = delays[2] - delays[1];
            expect(intra1).toBeCloseTo(0.05 * 0.5);
            expect(intra2).toBeCloseTo(0.05 * 0.5);

            // 第 2 到第 3 擊（跨組）有明顯停頓
            const interGroup = delays[3] - delays[2];
            expect(interGroup).toBeGreaterThan(intra1 * 2);
        });

        it('mr_u5 設定為 EVEN 且每擊等間隔', async () => {
            const { ULT_VISUALS } = await import('../data/vfx/ult_visuals');
            const { SKILL_SEQUENCES } = await import('../data/vfx/SkillSequences');

            expect(ULT_VISUALS['mr_u5'].cadence).toBe('EVEN');
            const seq = SKILL_SEQUENCES['mr_u5'];
            const stormActions = seq.actions.filter(a => a.type === 'PARTICLE' && a.scatterCount);
            expect(stormActions.length).toBe(8);

            const delays = stormActions.map(a => a.delay ?? 0);
            const expectedInterval = ULT_VISUALS['mr_u5'].timing ?? 0.08;
            for (let i = 1; i < delays.length; i++) {
                expect(delays[i] - delays[i - 1]).toBeCloseTo(expectedInterval);
            }
        });
    });
});
