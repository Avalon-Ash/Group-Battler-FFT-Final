import { describe, it, expect } from 'vitest';
import { AnnouncerSystem } from '../engine/systems/AnnouncerSystem';
import type { GameEngine } from '../engine/game';
import type { GameEvent } from '../types';
import { KILL_STREAK_WINDOW, KILL_SPREE_MAX_TIER } from '../constants';

/** 單位 id → 陣營（side）；不在表上的 id 代表擊殺者已移出場上 */
function makeEngine(sides: Record<string, number>) {
    return {
        battleTime: 0,
        events: [] as GameEvent[],
        agents: Object.entries(sides).map(([id, side]) => ({ id, side })),
        sessionState: { killStreaks: new Map(), sideKills: new Map(), firstBloodTriggered: false }
    };
}

function kill(announcer: AnnouncerSystem, engine: ReturnType<typeof makeEngine>, killerId: string, t: number): GameEvent[] {
    engine.battleTime = t;
    engine.events = [{ type: 'KILL', pos: { x: 0, y: 0 }, sourceId: killerId }];
    announcer.update(0, engine as unknown as GameEngine);
    return engine.events.slice(1);
}

const spreeValues = (events: GameEvent[]) => events.filter(e => e.type === 'KILL_SPREE').map(e => e.value);
const gap = KILL_STREAK_WINDOW * 2; // 間隔超過短時間連殺窗口，累計仍要延續

describe('AnnouncerSystem KILL_SPREE (cumulative kills per side, audio only)', () => {
    it('first kill of the match is tier 1; each side then announces from its 2nd kill, capped at max tier', () => {
        const announcer = new AnnouncerSystem();
        const engine = makeEngine({ a: 0, a2: 0, b: 1 });

        expect(spreeValues(kill(announcer, engine, 'a', 1))).toEqual([1]);
        expect(spreeValues(kill(announcer, engine, 'b', 1 + gap))).toEqual([]);
        // 同陣營另一個單位接著累計
        expect(spreeValues(kill(announcer, engine, 'a2', 1 + gap * 2))).toEqual([2]);

        const tiers: (number | undefined)[] = [];
        for (let i = 3; i <= KILL_SPREE_MAX_TIER + 2; i++) {
            tiers.push(...spreeValues(kill(announcer, engine, i % 2 ? 'a' : 'a2', 1 + gap * i)));
        }
        expect(tiers).toEqual([3, 4, 5, 6, 7, 7, 7]);
        expect(spreeValues(kill(announcer, engine, 'b', 1 + gap * 20))).toEqual([2]);
    });

    it('every announcer event carries the killer side', () => {
        const announcer = new AnnouncerSystem();
        const engine = makeEngine({ a: 3 });
        const events = [...kill(announcer, engine, 'a', 1), ...kill(announcer, engine, 'a', 2)];
        expect(events.length).toBeGreaterThan(0);
        expect(events.every(e => e.side === 3)).toBe(true);
    });

    it('a killer no longer on the field has no side and adds to no pool', () => {
        const announcer = new AnnouncerSystem();
        const engine = makeEngine({ a: 0 });
        const first = kill(announcer, engine, 'gone', 1);
        expect(first.map(e => e.side)).toEqual([undefined, undefined]);
        expect(engine.sessionState.sideKills.size).toBe(0);
        expect(spreeValues(kill(announcer, engine, 'gone', 1 + gap))).toEqual([]);
    });

    it('short-window multi-kill text stays per unit', () => {
        const announcer = new AnnouncerSystem();
        const engine = makeEngine({ a: 0, a2: 0 });
        kill(announcer, engine, 'a', 1);
        const second = kill(announcer, engine, 'a', 2);
        expect(second.filter(e => e.type === 'KILL_STREAK').map(e => e.text)).toEqual(['DOUBLE KILL']);
        expect(spreeValues(second)).toEqual([2]);
        const teammate = kill(announcer, engine, 'a2', 3);
        expect(teammate.filter(e => e.type === 'KILL_STREAK')).toEqual([]);
    });
});
