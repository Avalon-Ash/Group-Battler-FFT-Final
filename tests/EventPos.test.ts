// GameEvent.pos.z 只有一種意思：世界高度（engine/events/EventPos.ts、RenderSpec §3）。
import { describe, it, expect } from 'vitest';
import { unitEventPos, hexEventPos, pointEventPos } from '../engine/events/EventPos';
import { EventPool } from '../engine/events/GameEventPool';
import { EventVFXMapper } from '../engine/systems/visuals/EventVFXMapper';
import { Agent } from '../engine/core/Agent';
import { HexUtils, type MapConfig } from '../engine/utils';
import type { GameEngine } from '../engine/game';
import { Team } from '../types';
import { VISUAL_ANCHORS } from '../constants';

const MAP: MapConfig = { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' };
const HEIGHTS: Record<string, number> = { '1,1': 72 };
const heightAt = (q: number, r: number) => HEIGHTS[`${q},${r}`] ?? 0;
const stubEngine = (agents: Agent[] = []) => ({ mapConfig: MAP, getTerrainHeight: heightAt, agents }) as unknown as GameEngine;

describe('EventPos helpers', () => {
    it('unitEventPos z = ground height + airborne physics.z, xy include physics offset', () => {
        const a = new Agent('U', Team.BLUE, 1, 1, MAP);
        a.physics.x = 5;
        a.physics.y = -3;
        a.physics.z = 10;
        const p = unitEventPos(a, stubEngine());
        expect(p.z).toBe(72 + 10);
        expect(p.x).toBeCloseTo(a.px + 5, 6);
        expect(p.y).toBeCloseTo(a.py - 3, 6);
    });

    it('hexEventPos is the hex center at the tile top height', () => {
        const c = HexUtils.toPx(1, 1, MAP);
        expect(hexEventPos(1, 1, stubEngine())).toEqual({ x: c.x, y: c.y, z: 72 });
    });

    it('pointEventPos carries no z', () => {
        const p = pointEventPos(3, 4);
        expect(p).toEqual({ x: 3, y: 4 });
        expect('z' in p).toBe(false);
    });

    it('EventPool keeps z and drops it on reuse when absent', () => {
        const withZ = EventPool.get('DAMAGE', { x: 1, y: 2, z: 7 });
        expect(withZ.pos.z).toBe(7);
        EventPool.release(withZ);
        const without = EventPool.get('DAMAGE', { x: 1, y: 2 });
        expect(without.pos.z).toBeUndefined();
    });
});

describe('EventVFXMapper.resolvePoint with absolute pos.z', () => {
    it('a dead target resolves above the tile top (z not double-counted with terrain)', () => {
        const dead = new Agent('D', Team.RED, 1, 1, MAP);
        dead.hp = 0;
        const engine = stubEngine([dead]);
        const pos = unitEventPos(dead, engine);
        const out = new EventVFXMapper().resolvePoint(pos, dead.id, engine);
        expect(out.z).toBe(72 + VISUAL_ANCHORS.CENTER_OFFSET);
    });

    it('without z, the hex height is used for both dead and non-agent points', () => {
        const dead = new Agent('D', Team.RED, 1, 1, MAP);
        dead.hp = 0;
        const engine = stubEngine([dead]);
        const c = HexUtils.toPx(1, 1, MAP);
        const flat = pointEventPos(c.x, c.y);
        expect(new EventVFXMapper().resolvePoint(flat, dead.id, engine).z).toBe(72 + VISUAL_ANCHORS.CENTER_OFFSET);
        expect(new EventVFXMapper().resolvePoint(flat, undefined, engine).z).toBe(72);
    });
});
