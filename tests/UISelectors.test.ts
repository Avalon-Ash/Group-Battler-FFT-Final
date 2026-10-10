import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import { Agent } from '../engine/core/Agent';
import {
    clearSelectorCache,
    selectAgentView,
    selectDirectorView,
    selectZoneView,
    selectCameraTuningView,
    selectLogView,
    selectLogs,
    selectGamePlaybackView,
} from '../engine/systems/ui/selectors';
import { EngineViewTicker } from '../hooks/useEngineView';

describe('UISelectors & EngineViewTicker', () => {
    let engine: GameEngine;

    beforeEach(() => {
        clearSelectorCache();
        engine = new GameEngine();
    });

    describe('selectAgentView reference stability', () => {
        it('returns identical reference when agent data does not change', () => {
            const agent = new Agent('agent_stable_1', Team.BLUE, 0, 0, engine.mapConfig);
            agent.hp = 1000;
            agent.maxHp = 1000;
            engine.agents = [agent];

            const view1 = selectAgentView(engine, 'agent_stable_1');
            const view2 = selectAgentView(engine, 'agent_stable_1');

            expect(view1).not.toBeNull();
            expect(view1).toBe(view2); // Strict reference equality
        });

        it('returns new reference when agent property mutates', () => {
            const agent = new Agent('agent_mut_1', Team.RED, 1, 1, engine.mapConfig);
            agent.hp = 800;
            engine.agents = [agent];

            const view1 = selectAgentView(engine, 'agent_mut_1');

            // Mutate HP
            agent.hp = 750;
            const view2 = selectAgentView(engine, 'agent_mut_1');

            expect(view1).not.toBeNull();
            expect(view2).not.toBeNull();
            expect(view1).not.toBe(view2); // Reference updated
            expect(view2!.hp).toBe(750);
        });

        it('returns null for non-existent or null agentId', () => {
            expect(selectAgentView(engine, null)).toBeNull();
            expect(selectAgentView(engine, 'non_existent')).toBeNull();
        });
    });

    describe('selectDirectorView reference stability', () => {
        it('returns identical reference when director state is untouched', () => {
            const view1 = selectDirectorView(engine);
            const view2 = selectDirectorView(engine);
            expect(view1).toBe(view2);
        });

        it('returns new reference when director enabled state mutates', () => {
            const view1 = selectDirectorView(engine);
            engine.director.enabled = !engine.director.enabled;
            const view2 = selectDirectorView(engine);
            expect(view1).not.toBe(view2);
        });
    });

    describe('selectZoneView reference stability', () => {
        it('returns identical reference when zone parameters are untouched', () => {
            const view1 = selectZoneView(engine);
            const view2 = selectZoneView(engine);
            expect(view1).toBe(view2);
        });

        it('returns new reference when safeRadius changes', () => {
            const view1 = selectZoneView(engine);
            engine.zones.safeRadius = 5;
            const view2 = selectZoneView(engine);
            expect(view1).not.toBe(view2);
            expect(view2.currentRadius).toBe(5);
        });
    });

    describe('selectCameraTuningView & selectLogView & selectGamePlaybackView', () => {
        it('returns stable camera tuning view', () => {
            const view1 = selectCameraTuningView(engine);
            const view2 = selectCameraTuningView(engine);
            expect(view1).toBe(view2);
        });

        it('returns stable log view until a new log is pushed', () => {
            const view1 = selectLogView(engine);
            const view2 = selectLogView(engine);
            expect(view1).toBe(view2);

            engine.log(null, 'SYSTEM', '測試日誌', null, '詳細資訊');
            const view3 = selectLogView(engine);
            expect(view3).not.toBe(view1);
            expect(view3.totalCount).toBe(view1.totalCount + 1);
        });

        it('selectLogs is an exact alias for selectLogView', () => {
            expect(selectLogs).toBe(selectLogView);
            const view = selectLogs(engine);
            expect(view).toBe(selectLogView(engine));
        });

        it('returns stable playback view', () => {
            const view1 = selectGamePlaybackView(engine);
            const view2 = selectGamePlaybackView(engine);
            expect(view1).toBe(view2);
        });
    });

    describe('EngineViewTicker lifecycle', () => {
        it('starts running when first subscriber joins and stops when all leave', () => {
            const ticker = new EngineViewTicker();
            expect(ticker.isRunning).toBe(false);
            expect(ticker.activeSubscriberCount).toBe(0);

            let tickCalls1 = 0;
            const unsub1 = ticker.subscribe(() => {
                tickCalls1++;
            });

            expect(ticker.isRunning).toBe(true);
            expect(ticker.activeSubscriberCount).toBe(1);

            let tickCalls2 = 0;
            const unsub2 = ticker.subscribe(() => {
                tickCalls2++;
            });
            expect(ticker.activeSubscriberCount).toBe(2);

            // Manual tick test
            ticker.tick();
            expect(tickCalls1).toBe(1);
            expect(tickCalls2).toBe(1);

            // First unsubscribes, ticker still running
            unsub1();
            expect(ticker.activeSubscriberCount).toBe(1);
            expect(ticker.isRunning).toBe(true);

            // Second unsubscribes, ticker stops immediately
            unsub2();
            expect(ticker.activeSubscriberCount).toBe(0);
            expect(ticker.isRunning).toBe(false);
        });
    });
});
