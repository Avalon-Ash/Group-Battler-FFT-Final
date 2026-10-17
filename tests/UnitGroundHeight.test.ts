import { describe, it, expect } from 'vitest';
import { VisualMath } from '../engine/math/VisualMath';
import { MapSystem } from '../engine/systems/map';
import { UNIT_STEP_BLEND } from '../constants';
import { HexUtils, type MapConfig } from '../engine/utils';
import { MotionEngine } from '../engine/systems/movement/MotionEngine';
import type { SpatialProvider } from '../types';
import type { Agent, GameEngine } from '../engine/game';

// 腳下地面高度（VisualMath.getUnitGroundHeight）是繪製、血條、狀態圖示、投射物錨點的唯一定義。
// 移動中的單位視覺位置在 moveProgress = 0.5 越過格界，邏輯格到 1.0 才切換：
// 上坡時腳必須在越界前升到目標高度，否則會陷進較高的柱子（曾發生）。

const HEIGHTS: Record<string, number> = { '0,0': 48, '1,0': 120, '2,0': 0 };
const heightAt = (q: number, r: number) => HEIGHTS[`${q},${r}`] ?? 0;

const REST = { px: 0, py: 0, physics: { x: 0, y: 0 } } as Pick<Agent, 'px' | 'py' | 'physics'>;

function walker(q: number, r: number, nextQ: number, nextR: number, t: number) {
    return { q, r, isMoving: true, path: [{ q: nextQ, r: nextR }], moveProgress: t, ...REST };
}

describe('getUnitGroundHeight', () => {
    it('equals the logical hex height when not moving', () => {
        expect(VisualMath.getUnitGroundHeight({ q: 0, r: 0, isMoving: false, path: [], moveProgress: 0, ...REST }, heightAt)).toBe(48);
        expect(VisualMath.getUnitGroundHeight({ q: 0, r: 0, isMoving: true, path: [], moveProgress: 0.7, ...REST }, heightAt)).toBe(48);
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

describe('getUnitGroundHeight follows the hex the sprite is actually over', () => {
    const cfg: MapConfig = { w: 8, h: 8, offsetX: 0, offsetY: 0, layout: 'POINTY' };
    // 被擊退／瞬移後精靈在 (1,0)（高 120），邏輯格是 (0,0)（高 48）
    const at = (q: number, r: number) => HexUtils.toPx(q, r, cfg);
    const idleAt = (q: number, r: number, px: number, py: number) => ({ q, r, isMoving: false, path: [], moveProgress: 0, px, py, physics: { x: 0, y: 0 } }) as Pick<Agent, 'q' | 'r' | 'isMoving' | 'path' | 'moveProgress' | 'px' | 'py' | 'physics'>;

    it('is not lowered below the tile the sprite stands over (displaced by a hit)', () => {
        const home = at(0, 0), over = at(1, 0);
        const a = idleAt(0, 0, over.x, over.y);
        expect(VisualMath.getUnitGroundHeight(a, heightAt, cfg)).toBe(120);
        // physics 位移同樣算在內
        const b = idleAt(0, 0, home.x, home.y);
        b.physics = { x: over.x - home.x, y: over.y - home.y } as Agent['physics'];
        expect(VisualMath.getUnitGroundHeight(b, heightAt, cfg)).toBe(120);
    });

    it('stays at the logical height at rest, and does not drop onto a lower neighbour', () => {
        const home = at(1, 0), lower = at(2, 0);
        expect(VisualMath.getUnitGroundHeight(idleAt(1, 0, home.x, home.y), heightAt, cfg)).toBe(120);
        expect(VisualMath.getUnitGroundHeight(idleAt(1, 0, lower.x, lower.y), heightAt, cfg)).toBe(120);
    });
});

describe('MotionEngine stops stepping toward a tile that no longer exists', () => {
    const cfg: MapConfig = { w: 8, h: 8, offsetX: 0, offsetY: 0, layout: 'POINTY' };
    const makeSpatial = (valid: (q: number, r: number) => boolean) => ({
        isValid: valid,
        getMapConfig: () => cfg,
        updateAgentPosition: (a: Agent, q: number, r: number) => { a.q = q; a.r = r; },
        getTerrainHeight: heightAt,
    }) as unknown as SpatialProvider;
    const makeWalker = (path: { q: number; r: number }[], progress: number) => ({
        q: 0, r: 0, px: 0, py: 0, facing: 1, path, trajectory: path, isMoving: true, moveProgress: progress,
        moveSpeed: 1, moveSpeedMult: 1, movementType: 0, hp: 100, trailHistory: [], physics: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 },
    }) as unknown as Agent;

    it('cancels the move when the next hex was removed mid-step (path and isMoving are owned here)', () => {
        const a = makeWalker([{ q: 1, r: 0 }], 0.6);
        MotionEngine.updateMovement(a, 0.016, makeSpatial((q) => q !== 1));
        expect(a.isMoving).toBe(false);
        expect(a.path).toEqual([]);
        expect(a.moveProgress).toBe(0);
        expect(a.q).toBe(0);
    });

    it('cancels at the hex it just reached when the following hex is gone', () => {
        const a = makeWalker([{ q: 1, r: 0 }, { q: 2, r: 0 }], 0.99);
        MotionEngine.updateMovement(a, 0.1, makeSpatial((q) => q !== 2));
        expect(a.q).toBe(1);
        expect(a.isMoving).toBe(false);
        expect(a.path).toEqual([]);
    });

    it('keeps walking when the next hex is valid', () => {
        const a = makeWalker([{ q: 1, r: 0 }], 0.2);
        MotionEngine.updateMovement(a, 0.016, makeSpatial(() => true));
        expect(a.isMoving).toBe(true);
        expect(a.path.length).toBe(1);
    });
});
