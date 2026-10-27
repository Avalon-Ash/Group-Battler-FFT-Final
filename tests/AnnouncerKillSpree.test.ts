import { describe, it, expect } from 'vitest';
import { AnnouncerSystem } from '../engine/systems/AnnouncerSystem';
import type { GameEngine } from '../engine/game';
import type { GameEvent } from '../types';
import { KILL_STREAK_WINDOW, KILL_SPREE_MAX_TIER } from '../constants';

function makeEngine() {
    return {
        battleTime: 0,
        events: [] as GameEvent[],
        sessionState: { killStreaks: new Map(), firstBloodTriggered: false }
    };
}

function kill(announcer: AnnouncerSystem, engine: ReturnType<typeof makeEngine>, killerId: string, t: number): GameEvent[] {
    engine.battleTime = t;
    engine.events = [{ type: 'KILL', pos: { x: 0, y: 0 }, sourceId: killerId }];
    announcer.update(0, engine as unknown as GameEngine);
    return engine.events.slice(1);
}

const spreeValues = (events: GameEvent[]) => events.filter(e => e.type === 'KILL_SPREE').map(e => e.value);

describe('AnnouncerSystem KILL_SPREE (cumulative kills, audio only)', () => {
    it('first kill of the match is tier 1; each killer then announces from their 2nd kill, capped at max tier', () => {
        const announcer = new AnnouncerSystem();
        const engine = makeEngine();
        const gap = KILL_STREAK_WINDOW * 2; // 間隔超過短時間連殺窗口，累計仍要延續

        expect(spreeValues(kill(announcer, engine, 'a', 1))).toEqual([1]);
        expect(spreeValues(kill(announcer, engine, 'b', 1 + gap))).toEqual([]);
        expect(spreeValues(kill(announcer, engine, 'a', 1 + gap * 2))).toEqual([2]);

        const tiers: (number | undefined)[] = [];
        for (let i = 3; i <= KILL_SPREE_MAX_TIER + 2; i++) {
            tiers.push(...spreeValues(kill(announcer, engine, 'a', 1 + gap * i)));
        }
        expect(tiers).toEqual([3, 4, 5, 6, 7, 7, 7]);
    });

    it('short-window multi-kill text events are unchanged', () => {
        const announcer = new AnnouncerSystem();
        const engine = makeEngine();
        kill(announcer, engine, 'a', 1);
        const second = kill(announcer, engine, 'a', 2);
        expect(second.filter(e => e.type === 'KILL_STREAK').map(e => e.text)).toEqual(['DOUBLE KILL']);
        expect(spreeValues(second)).toEqual([2]);
    });
});
