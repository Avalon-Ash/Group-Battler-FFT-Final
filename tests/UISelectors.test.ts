import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team } from '../types';
import { Agent } from '../engine/core/Agent';
import { UI_SETTINGS } from '../constants';
import {
    clearSelectorCache,
    selectAgentView,
    selectDirectorView,
    selectZoneView,
    selectCameraTuningView,
    selectLogView,
    selectLogs,
    selectGamePlaybackView,
    selectDirectorTargetView,
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
        it('returns stable camera tuning view with values and fallbacks equal to constants', () => {
            const view1 = selectCameraTuningView(engine);
            const view2 = selectCameraTuningView(engine);
            expect(view1).toBe(view2);
            expect(view1.followStiffness).toBe(UI_SETTINGS.CAMERA_STIFFNESS.followDefault);
            expect(view1.zoomStiffness).toBe(UI_SETTINGS.CAMERA_STIFFNESS.zoomDefault);

            // Fallback when engine has no renderer
            const engineWithoutRenderer = {} as unknown as GameEngine;
            const viewFallback = selectCameraTuningView(engineWithoutRenderer);
            expect(viewFallback.followStiffness).toBe(UI_SETTINGS.CAMERA_STIFFNESS.followDefault);
            expect(viewFallback.zoomStiffness).toBe(UI_SETTINGS.CAMERA_STIFFNESS.zoomDefault);
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

    describe('selectDirectorTargetView & per-engine cache isolation', () => {
        it('returns null when director has no target or target agent does not exist', () => {
            engine.state.director.targetId = null;
            expect(selectDirectorTargetView(engine)).toBeNull();

            engine.state.director.targetId = 'non_existent_id';
            expect(selectDirectorTargetView(engine)).toBeNull();
        });

        it('returns stable reference when director target properties do not change', () => {
            const agent = new Agent('dir_agent_1', Team.BLUE, 0, 0, engine.mapConfig);
            agent.hp = 500;
            agent.maxHp = 1000;
            engine.agents = [agent];
            engine.state.director.targetId = agent.id;

            const view1 = selectDirectorTargetView(engine);
            expect(view1).not.toBeNull();
            expect(view1?.id).toBe(agent.id);
            expect(view1?.hp).toBe(500);

            const view2 = selectDirectorTargetView(engine);
            expect(view1).toBe(view2);
        });

        it('per-engine cache isolation: changing engines does not share or collide cached views', () => {
            const engine1 = new GameEngine();
            const engine2 = new GameEngine();
            const agentA = new Agent('agent_A', Team.BLUE, 0, 0, engine1.mapConfig);
            agentA.hp = 300;
            const agentB = new Agent('agent_B', Team.RED, 1, 1, engine2.mapConfig);
            agentB.hp = 700;

            engine1.agents = [agentA];
            engine2.agents = [agentB];
            engine1.state.director.targetId = agentA.id;
            engine2.state.director.targetId = agentB.id;

            const viewA1 = selectDirectorTargetView(engine1);
            const viewB1 = selectDirectorTargetView(engine2);

            expect(viewA1?.id).toBe('agent_A');
            expect(viewA1?.hp).toBe(300);
            expect(viewB1?.id).toBe('agent_B');
            expect(viewB1?.hp).toBe(700);

            // Repeated calls per engine return stable reference for that engine
            const viewA2 = selectDirectorTargetView(engine1);
            expect(viewA2).toBe(viewA1);

            const viewB2 = selectDirectorTargetView(engine2);
            expect(viewB2).toBe(viewB1);
        });

        it('per-engine cache isolation for selectAgentView', () => {
            const engine1 = new GameEngine();
            const engine2 = new GameEngine();
            const agent1 = new Agent('shared_agent', Team.BLUE, 0, 0, engine1.mapConfig);
            agent1.hp = 100;
            const agent2 = new Agent('shared_agent', Team.RED, 2, 2, engine2.mapConfig);
            agent2.hp = 200;

            engine1.agents = [agent1];
            engine2.agents = [agent2];

            const av1 = selectAgentView(engine1, 'shared_agent');
            const av2 = selectAgentView(engine2, 'shared_agent');

            expect(av1?.hp).toBe(100);
            expect(av2?.hp).toBe(200);
            expect(av1).not.toBe(av2);

            const av1Repeat = selectAgentView(engine1, 'shared_agent');
            expect(av1Repeat).toBe(av1);
        });
    });
});
