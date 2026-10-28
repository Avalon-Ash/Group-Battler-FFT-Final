import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../engine/game';
import { Agent } from '../engine/core/Agent';
import { HexUtils } from '../engine/utils';
import { resetRandomSource, seedSimulation, setRandomSource } from '../engine/math/rng';
import { Team } from '../types';

function hexagon(radius: number): string[] {
    const keys: string[] = [];
    for (let q = -radius; q <= radius; q++) {
        for (let r = -radius; r <= radius; r++) {
            if (HexUtils.dist({ q, r }, { q: 0, r: 0 }) <= radius) keys.push(`${q},${r}`);
        }
    }
    return keys;
}

function setup(keys: string[], minRadius: number): GameEngine {
    const engine = new GameEngine();
    engine.agents = [];
    engine.map.resetData();
    for (const key of keys) {
        const [q, r] = key.split(',').map(Number);
        engine.map.registerTile(q, r);
    }
    engine.zones.reset(engine);
    engine.zoneConfig = { enabled: true, initialRadius: 12, shrinkInterval: 1, minRadius };
    return engine;
}

// Independent reachability oracle for the surviving map.
function componentSizes(keys: Set<string>): number[] {
    const unseen = new Set(keys);
    const sizes: number[] = [];
    while (unseen.size) {
        const queue = [unseen.values().next().value!];
        unseen.delete(queue[0]);
        for (let head = 0; head < queue.length; head++) {
            const [q, r] = queue[head].split(',').map(Number);
            for (const n of HexUtils.neighbors({ q, r })) {
                const key = HexUtils.key(n);
                if (unseen.delete(key)) queue.push(key);
            }
        }
        sizes.push(queue.length);
    }
    return sizes;
}

afterEach(() => {
    resetRandomSource();
    vi.restoreAllMocks();
});

describe('zone shrink warnings', () => {
    it('alerts only newly warned occupants and keeps warnings stable between transitions', () => {
        const engine = setup(hexagon(2), 1);
        const outer = new Agent('outer', Team.BLUE, 2, 0, engine.mapConfig);
        const inner = new Agent('inner', Team.BLUE, 1, 0, engine.mapConfig);
        engine.agents = [outer, inner];
        engine.zones.update(0, engine);
        expect(outer.forceAiUpdate).toBe(true);
        expect(inner.forceAiUpdate).toBe(false);
        const clear = vi.spyOn(engine.map.warningTiles, 'clear');
        const add = vi.spyOn(engine.map.warningTiles, 'add');
        for (let frame = 0; frame < 10; frame++) {
            outer.forceAiUpdate = false;
            engine.zones.update(0.01, engine);
            expect(outer.forceAiUpdate).toBe(false);
        }
        expect(clear).not.toHaveBeenCalled();
        expect(add).not.toHaveBeenCalled();
        engine.agents = [inner];
        engine.zones.shrinkTimer = 0;
        engine.zones.update(0, engine);
        engine.zones.update(0, engine);
        expect(inner.forceAiUpdate).toBe(true);
        inner.forceAiUpdate = false;
        engine.zones.update(0.01, engine);
        expect(inner.forceAiUpdate).toBe(false);
    });

    it('keeps a final target for the whole interval and alerts its occupant once', () => {
        const engine = setup(['0,0', '1,0', '2,0'], 3);
        setRandomSource(() => 0);
        const a = new Agent('a', Team.BLUE, 0, 0, engine.mapConfig);
        engine.agents = [a];
        engine.zones.update(0, engine);
        expect(engine.map.warningTiles).toEqual(new Set(['0,0']));
        expect(a.forceAiUpdate).toBe(true);
        for (let i = 0; i < 10; i++) {
            a.forceAiUpdate = false;
            engine.zones.update(0.01, engine);
            expect(a.forceAiUpdate).toBe(false);
            expect(engine.map.warningTiles).toEqual(new Set(['0,0']));
        }
    });
});

describe('zone shrink termination and final topology', () => {
    it.each([0, 1, 3, 10])('retains one tile and triggers Last Stand once for minRadius=%s', minRadius => {
        const keys = hexagon(3);
        const engine = setup(keys, minRadius);
        const lastStand = vi.fn();
        engine.bus.on('LAST_STAND_TRIGGERED', lastStand);
        for (let tick = 0; tick < keys.length + 5; tick++) {
            engine.zones.update(1, engine);
            expect(engine.map.mapKeys.size).toBeGreaterThanOrEqual(1);
        }
        expect(engine.map.mapKeys.size).toBe(1);
        expect(engine.state.isLastStand).toBe(true);
        expect(lastStand).toHaveBeenCalledTimes(1);
        expect(HexUtils.key(engine.state.finalHex!)).toBe([...engine.map.mapKeys][0]);
    });

    it('switches to single-tile collapse when the whole layer would empty a corridor', () => {
        const engine = setup(['0,0', '1,0', '2,0', '3,0'], 0);
        engine.zones.update(1, engine);
        expect(engine.map.mapKeys.size).toBe(3);
    });

    it('removes only exterior non-articulation tiles and repeats for the same seed', () => {
        // Two blobs joined by a thin corridor; naive random removal can cut the bridge.
        const keys = [...hexagon(1), '2,0', '3,0', '4,0', '5,0', '5,1', '4,1'];
        const run = () => {
            const engine = setup(keys, 10);
            seedSimulation(123);
            const removed: string[] = [];
            while (engine.map.mapKeys.size > 1) {
                engine.zones.update(0, engine);
                const target = [...engine.map.warningTiles][0];
                const [q, r] = target.split(',').map(Number);
                expect(HexUtils.neighbors({ q, r }).some(n => !engine.map.mapKeys.has(HexUtils.key(n)))).toBe(true);
                const before = engine.map.mapKeys.size;
                engine.zones.update(1, engine);
                expect(engine.map.mapKeys.size).toBe(before - 1);
                expect(componentSizes(engine.map.mapKeys)).toEqual([before - 1]);
                removed.push(target);
            }
            return removed;
        };
        expect(run()).toEqual(run());
    });

    it('uses the largest surviving component when no removal can connect a disconnected map', () => {
        const engine = setup(['0,0', '1,0', '2,0', '10,0', '11,0'], 10);
        const log = vi.spyOn(engine, 'log');
        engine.zones.update(1, engine);
        expect(Math.max(...componentSizes(engine.map.mapKeys))).toBe(3);
        expect(log.mock.calls.filter(call => call[2] === '縮圈連通退路')).toHaveLength(1);
    });
});
