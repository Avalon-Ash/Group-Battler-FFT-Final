import { describe, it, expect, vi } from 'vitest';
import { HexUtils } from '../engine/utils';
import { EventPool } from '../engine/events/GameEventPool';
import { EventBus } from '../engine/events/EventBus';
import { Selector, Sequence, Condition, Action } from '../engine/behaviorTree';
import { Agent } from '../engine/core/Agent';
import { EffectSystem } from '../engine/systems/status/EffectSystem';
import type { GameEngine } from '../engine/game';
import { NodeState, Team } from '../types';
import { DEFAULT_HEX_LAYOUT } from '../constants';

const MAP = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };

describe('HexUtils', () => {
    it('hash / unhash round-trips (including negatives)', () => {
        for (const [q, r] of [[0, 0], [3, -2], [-5, 7], [11, 10]]) {
            expect(HexUtils.unhash(HexUtils.hash(q, r))).toEqual({ q, r });
        }
    });
    it('key rounds coordinates', () => {
        expect(HexUtils.key({ q: 1.2, r: -2.6 })).toBe('1,-3');
    });
    it('has 6 neighbors, all at distance 1', () => {
        const origin = { q: 2, r: 2 };
        const ns = HexUtils.neighbors(origin);
        expect(ns).toHaveLength(6);
        ns.forEach(n => expect(HexUtils.dist(origin, n)).toBe(1));
    });
    it('range(n) returns 3n(n+1)+1 cells', () => {
        expect(HexUtils.range({ q: 0, r: 0 }, 2)).toHaveLength(19);
    });
});

describe('GameEventPool', () => {
    it('REGRESSION: HIT_FX keeps absorbed (shield spark depends on it)', () => {
        const e = EventPool.get('HIT_FX', { x: 1, y: 2 }, { value: 50, absorbed: 12, text: 'FX' });
        expect(e.absorbed).toBe(12);
        expect(e.pos).toEqual({ x: 1, y: 2 });
        EventPool.release(e);
        const e2 = EventPool.get('HIT_FX', { x: 0, y: 0 });
        expect(e2.absorbed).toBeUndefined();
    });
});

describe('EventBus', () => {
    it('delivers payloads to subscribers and supports off()', () => {
        const bus = new EventBus();
        const fn = vi.fn();
        bus.on('CAMERA_SHAKE', fn);
        bus.emit('CAMERA_SHAKE', { intensity: 0.3 });
        bus.off('CAMERA_SHAKE', fn);
        bus.emit('CAMERA_SHAKE', { intensity: 0.9 });
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith({ intensity: 0.3 });
    });
});

describe('BehaviorTree', () => {
    const agent = new Agent('BT', Team.BLUE, 0, 0, MAP);
    it('Selector returns first non-failure; Sequence stops at first non-success', () => {
        const order: string[] = [];
        const act = (name: string, r: NodeState) => new Action(name, () => { order.push(name); return r; });
        const sel = new Selector('s').add(act('a', NodeState.FAILURE)).add(act('b', NodeState.SUCCESS)).add(act('c', NodeState.SUCCESS));
        expect(sel.tick(agent)).toBe(NodeState.SUCCESS);
        expect(order).toEqual(['a', 'b']);

        order.length = 0;
        const seq = new Sequence('q').add(act('x', NodeState.SUCCESS)).add(act('y', NodeState.FAILURE)).add(act('z', NodeState.SUCCESS));
        expect(seq.tick(agent)).toBe(NodeState.FAILURE);
        expect(order).toEqual(['x', 'y']);
    });
    it('Condition maps boolean to SUCCESS/FAILURE', () => {
        expect(new Condition('t', () => true).tick(agent)).toBe(NodeState.SUCCESS);
        expect(new Condition('f', () => false).tick(agent)).toBe(NodeState.FAILURE);
    });
});

describe('EffectSystem DoT / HoT', () => {
    const stubEngine = () => ({ events: [], log: () => {} }) as unknown as GameEngine;
    const make = () => { const a = new Agent('E', Team.BLUE, 0, 0, MAP); a.hp = a.maxHp = 100; return a; };

    it('DoT deals dotDmg per second, shield absorbs first', () => {
        const fx = new EffectSystem();
        const a = make();
        a.dotTimer = 5; a.dotDmg = 10; a.shield = 4;
        fx.update(a, 1, stubEngine());
        expect(a.shield).toBe(0);
        expect(a.hp).toBeCloseTo(94, 5);
        expect(a.dotTimer).toBe(4);
    });

    it('HoT heals but never exceeds maxHp', () => {
        const fx = new EffectSystem();
        const a = make();
        a.hp = 95; a.hotTimer = 5; a.hotVal = 20;
        fx.update(a, 1, stubEngine());
        expect(a.hp).toBe(100);
    });

    it('dead / banished agents are skipped', () => {
        const fx = new EffectSystem();
        const a = make();
        a.banished = true; a.dotTimer = 5; a.dotDmg = 50;
        fx.update(a, 1, stubEngine());
        expect(a.hp).toBe(100);
    });
});
