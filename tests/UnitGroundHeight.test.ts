import { describe, it, expect } from 'vitest';
import { VisualMath } from '../engine/math/VisualMath';
import { MapSystem } from '../engine/systems/map';
import { UNIT_STEP_BLEND } from '../constants';
import type { Agent, GameEngine } from '../engine/game';

// 腳下地面高度（VisualMath.getUnitGroundHeight）是繪製、血條、狀態圖示、投射物錨點的唯一定義。
// 移動中的單位視覺位置在 moveProgress = 0.5 越過格界，邏輯格到 1.0 才切換：
// 上坡時腳必須在越界前升到目標高度，否則會陷進較高的柱子（曾發生）。

const HEIGHTS: Record<string, number> = { '0,0': 48, '1,0': 120, '2,0': 0 };
const heightAt = (q: number, r: number) => HEIGHTS[`${q},${r}`] ?? 0;

function walker(q: number, r: number, nextQ: number, nextR: number, t: number) {
    return { q, r, isMoving: true, path: [{ q: nextQ, r: nextR }], moveProgress: t };
}

describe('getUnitGroundHeight', () => {
    it('equals the logical hex height when not moving', () => {
        expect(VisualMath.getUnitGroundHeight({ q: 0, r: 0, isMoving: false, path: [], moveProgress: 0 }, heightAt)).toBe(48);
        expect(VisualMath.getUnitGroundHeight({ q: 0, r: 0, isMoving: true, path: [], moveProgress: 0.7 }, heightAt)).toBe(48);
    });

    it('stepping up never leaves the feet below the hex they are over', () => {
        for (let t = 0; t <= 1.0001; t += 0.01) {
            const h = VisualMath.getUnitGroundHeight(walker(0, 0, 1, 0, t), heightAt);
            const overHex = t < 0.5 ? 48 : 120;
            expect(h).toBeGreaterThanOrEqual(overHex - 1e-9);
        }
    });

    it('stepping down never leaves the feet below the hex they are over', () => {
        for (let t = 0; t <= 1.0001; t += 0.01) {
            const h = VisualMath.getUnitGroundHeight(walker(1, 0, 2, 0, t), heightAt);
            const overHex = t < 0.5 ? 120 : 0;
            expect(h).toBeGreaterThanOrEqual(overHex - 1e-9);
        }
    });

    it('reaches the destination height at arrival and is monotonic', () => {
        expect(VisualMath.getUnitGroundHeight(walker(0, 0, 1, 0, 1), heightAt)).toBeCloseTo(120, 9);
        expect(VisualMath.getUnitGroundHeight(walker(1, 0, 2, 0, 1), heightAt)).toBeCloseTo(0, 9);
        let prev = -Infinity;
        for (let t = 0; t <= 1.0001; t += 0.02) {
            const h = VisualMath.getUnitGroundHeight(walker(0, 0, 1, 0, t), heightAt);
            expect(h).toBeGreaterThanOrEqual(prev - 1e-9);
            prev = h;
        }
    });

    it('keeps the blend window ordered around the hex boundary', () => {
        expect(UNIT_STEP_BLEND.RISE_END).toBeLessThanOrEqual(0.5);
        expect(UNIT_STEP_BLEND.FALL_START).toBeGreaterThanOrEqual(0.5);
        expect(UNIT_STEP_BLEND.RISE_START).toBeLessThan(UNIT_STEP_BLEND.RISE_END);
        expect(UNIT_STEP_BLEND.FALL_START).toBeLessThan(UNIT_STEP_BLEND.FALL_END);
    });
});

describe('MapSystem.updateAgentPosition z compensation', () => {
    const engine = { isRunning: true, getTerrainHeight: heightAt } as unknown as GameEngine;
    const makeAgent = (q: number, r: number, over: Partial<Agent>) => ({
        q, r, px: 0, py: 0, isMoving: false, path: [], moveProgress: 0, physics: { z: 0 }, ...over,
    }) as unknown as Agent;

    it('a walking step does not add a z offset (ground height is already continuous)', () => {
        const map = new MapSystem();
        for (const [from, to] of [[[0, 0], [1, 0]], [[1, 0], [2, 0]]]) {
            const a = makeAgent(from[0], from[1], { isMoving: true, path: [{ q: to[0], r: to[1] }], moveProgress: 1.02 });
            map.updateAgentPosition(a, to[0], to[1], engine);
            expect(a.physics.z).toBeCloseTo(0, 9);
            expect(a.q).toBe(to[0]);
        }
    });

    it('a teleport keeps the feet continuous by absorbing the height difference into z', () => {
        const map = new MapSystem();
        const a = makeAgent(1, 0, {});
        map.updateAgentPosition(a, 2, 0, engine);
        expect(a.physics.z).toBeCloseTo(120, 9);
        const b = makeAgent(0, 0, {});
        map.updateAgentPosition(b, 1, 0, engine);
        expect(b.physics.z).toBeCloseTo(-72, 9);
    });
});
