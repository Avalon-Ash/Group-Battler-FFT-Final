import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Role, Team } from '../types';
import { UI_SETTINGS } from '../constants';
import { Agent } from '../engine/core/Agent';

describe('UICommandSystem', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
    });

    describe('SET_DIRECTOR_ENABLED', () => {
        it('toggles director enabled flag', () => {
            engine.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: false });
            expect(engine.director.enabled).toBe(false);

            engine.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: true });
            expect(engine.director.enabled).toBe(true);
        });
    });

    describe('SET_ZONE_CONFIG', () => {
        it('updates valid zone configuration', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'SET_ZONE_CONFIG',
                config: {
                    enabled: false,
                    initialRadius: 8,
                    shrinkInterval: 15,
                    minRadius: 2,
                },
            });
            expect(engine.zoneConfig.enabled).toBe(false);
            expect(engine.zoneConfig.initialRadius).toBe(8);
            expect(engine.zoneConfig.shrinkInterval).toBe(15);
            expect(engine.zoneConfig.minRadius).toBe(2);
        });

        it('clamps out-of-range zone parameters', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'SET_ZONE_CONFIG',
                config: {
                    initialRadius: 999, // clamp to UI_SETTINGS.ZONE_INITIAL_RADIUS.max
                    shrinkInterval: 0,   // clamp to 1
                    minRadius: -5,       // clamp to 0
                },
            });
            expect(engine.zoneConfig.initialRadius).toBe(UI_SETTINGS.ZONE_INITIAL_RADIUS.max);
            expect(engine.zoneConfig.shrinkInterval).toBe(1);
            expect(engine.zoneConfig.minRadius).toBe(0);
        });
    });

    describe('EDIT_AGENT', () => {
        let testAgent: Agent;

        beforeEach(() => {
            testAgent = new Agent('agent_test_1', Team.BLUE, 0, 0, engine.mapConfig);
            testAgent.role = Role.WARRIOR;
            testAgent.maxHp = 1000;
            testAgent.hp = 800;
            testAgent.maxMp = 100;
            testAgent.mp = 50;
            engine.agents = [testAgent];
        });

        it('edits role, hp, maxHp, maxMp', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'EDIT_AGENT',
                agentId: 'agent_test_1',
                role: Role.MAGE,
                maxHp: 1200,
                hp: 1100,
                maxMp: 200,
            });

            expect(testAgent.role).toBe(Role.MAGE);
            expect(testAgent.maxHp).toBe(1200);
            expect(testAgent.hp).toBe(1100);
            expect(testAgent.maxMp).toBe(200);
        });

        it('clamps hp to maxHp when maxHp is lowered or hp is over maxHp', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'EDIT_AGENT',
                agentId: 'agent_test_1',
                maxHp: 500,
            });
            expect(testAgent.maxHp).toBe(500);
            expect(testAgent.hp).toBe(500);

            engine.bus.emit('UI_COMMAND', {
                type: 'EDIT_AGENT',
                agentId: 'agent_test_1',
                hp: 9999,
            });
            expect(testAgent.hp).toBe(500);

            engine.bus.emit('UI_COMMAND', {
                type: 'EDIT_AGENT',
                agentId: 'agent_test_1',
                hp: -50,
            });
            expect(testAgent.hp).toBe(0);
        });

        it('safely handles non-existent agentId', () => {
            expect(() => {
                engine.bus.emit('UI_COMMAND', {
                    type: 'EDIT_AGENT',
                    agentId: 'non_existent_id',
                    role: Role.TANK,
                });
            }).not.toThrow();
        });
    });

    describe('REBUILD_AGENT_AI', () => {
        it('rebuilds agent behavior tree and emits AGENT_RESET', () => {
            const agent = new Agent('agent_ai_test', Team.RED, 1, 1, engine.mapConfig);
            agent.role = Role.RANGER;
            engine.agents = [agent];

            let resetAgentId: string | null = null;
            engine.bus.on('AGENT_RESET', (data) => {
                resetAgentId = data.agentId;
            });

            engine.bus.emit('UI_COMMAND', {
                type: 'REBUILD_AGENT_AI',
                agentId: 'agent_ai_test',
            });

            expect(agent.bt).toBeDefined();
            expect(resetAgentId).toBe('agent_ai_test');
        });
    });

    describe('RESET_GAME, PAUSE_GAME, RESUME_GAME, SET_TIME_SCALE', () => {
        it('emits GAME_RESET event on RESET_GAME', () => {
            let resetTriggered = false;
            engine.bus.on('GAME_RESET', () => {
                resetTriggered = true;
            });

            engine.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });
            expect(resetTriggered).toBe(true);
        });

        it('controls engine running state', () => {
            engine.bus.emit('UI_COMMAND', { type: 'PAUSE_GAME' });
            expect(engine.isRunning).toBe(false);

            engine.bus.emit('UI_COMMAND', { type: 'RESUME_GAME' });
            expect(engine.isRunning).toBe(true);
        });

        it('clamps and updates timeScale', () => {
            engine.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: 2.5 });
            expect(engine.state.time.targetTimeScale).toBe(2.5);

            engine.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: 99 });
            expect(engine.state.time.targetTimeScale).toBe(UI_SETTINGS.TIME_SCALE.max);

            engine.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: 0.01 });
            expect(engine.state.time.targetTimeScale).toBe(UI_SETTINGS.TIME_SCALE.min);
        });
    });

    describe('PLACE_AGENT and REMOVE_AGENT_AT', () => {
        it('places agent on valid empty hex and configures stats/role', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: 0,
                r: 0,
                hp: 850,
                role: Role.MAGE,
            });

            const agent = engine.getAgentAt(0, 0);
            expect(agent).toBeDefined();
            expect(agent?.team).toBe(Team.BLUE);
            expect(agent?.role).toBe(Role.MAGE);
            expect(agent?.hp).toBe(850);
            expect(agent?.maxHp).toBe(850);
            expect(agent?.initialState.role).toBe(Role.MAGE);
            expect(agent?.initialState.maxHp).toBe(850);
        });

        it('ignores placement if hex is out of bounds or occupied', () => {
            // Already has agent at (0, 0)
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: 0,
                r: 0,
            });
            const firstAgent = engine.getAgentAt(0, 0);
            expect(firstAgent).toBeDefined();

            // Attempt to place second agent on same hex
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.RED,
                q: 0,
                r: 0,
            });
            expect(engine.getAgentAt(0, 0)?.id).toBe(firstAgent?.id);

            // Attempt to place on out of bounds hex
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: 999,
                r: 999,
            });
            expect(engine.agents.length).toBe(1);

            // Attempt to place on non-finite coordinates
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: NaN,
                r: 0,
            });
            expect(engine.agents.length).toBe(1);
        });

        it('ignores placement on hex with obstacle', () => {
            engine.map.setObstacle(1, 0, 'WALL');
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: 1,
                r: 0,
            });
            expect(engine.getAgentAt(1, 0)).toBeUndefined();
        });

        it('removes agent at specified hex', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.RED,
                q: 0,
                r: 0,
            });
            expect(engine.getAgentAt(0, 0)).toBeDefined();

            engine.bus.emit('UI_COMMAND', {
                type: 'REMOVE_AGENT_AT',
                q: 0,
                r: 0,
            });
            expect(engine.getAgentAt(0, 0)).toBeUndefined();
        });

        it('safely handles REMOVE_AGENT_AT on empty or invalid hex', () => {
            expect(() => {
                engine.bus.emit('UI_COMMAND', { type: 'REMOVE_AGENT_AT', q: 0, r: 0 });
                engine.bus.emit('UI_COMMAND', { type: 'REMOVE_AGENT_AT', q: 999, r: 999 });
                engine.bus.emit('UI_COMMAND', { type: 'REMOVE_AGENT_AT', q: NaN, r: 0 });
            }).not.toThrow();
        });
    });

    describe('SET_OBSTACLE and REMOVE_OBSTACLE', () => {
        it('sets and removes obstacles on valid hexes', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'SET_OBSTACLE',
                q: 1,
                r: 0,
                obstacleType: 'PILLAR',
            });
            expect(engine.hasObstacle(1, 0)).toBe(true);
            expect(engine.map.obstacles.get('1,0')).toBe('PILLAR');

            engine.bus.emit('UI_COMMAND', {
                type: 'REMOVE_OBSTACLE',
                q: 1,
                r: 0,
            });
            expect(engine.hasObstacle(1, 0)).toBe(false);
        });

        it('does not place obstacle on a hex occupied by an agent', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: 0,
                r: 0,
            });
            expect(engine.getAgentAt(0, 0)).toBeDefined();

            engine.bus.emit('UI_COMMAND', {
                type: 'SET_OBSTACLE',
                q: 0,
                r: 0,
                obstacleType: 'WALL',
            });
            expect(engine.hasObstacle(0, 0)).toBe(false);
        });

        it('safely handles SET_OBSTACLE/REMOVE_OBSTACLE on invalid hexes', () => {
            expect(() => {
                engine.bus.emit('UI_COMMAND', { type: 'SET_OBSTACLE', q: 999, r: 999 });
                engine.bus.emit('UI_COMMAND', { type: 'REMOVE_OBSTACLE', q: 999, r: 999 });
                engine.bus.emit('UI_COMMAND', { type: 'SET_OBSTACLE', q: NaN, r: 0 });
            }).not.toThrow();
        });
    });

    describe('MOVE_AGENT', () => {
        it('moves agent to valid empty hex and updates coordinates and pixels', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: 0,
                r: 0,
            });
            const agent = engine.getAgentAt(0, 0)!;
            expect(agent).toBeDefined();

            // Simulate drag preview having changed px/py and dragOverQ/R
            agent.px = 999;
            agent.py = 999;
            agent.dragOverQ = 1;
            agent.dragOverR = 0;

            engine.bus.emit('UI_COMMAND', {
                type: 'MOVE_AGENT',
                agentId: agent.id,
                q: 1,
                r: 0,
            });

            expect(agent.q).toBe(1);
            expect(agent.r).toBe(0);
            expect(agent.dragOverQ).toBeNull();
            expect(agent.dragOverR).toBeNull();
            expect(engine.getAgentAt(1, 0)?.id).toBe(agent.id);
            expect(engine.getAgentAt(0, 0)).toBeUndefined();
        });

        it('restores preview coordinates to original hex when move target is invalid or blocked', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: 0,
                r: 0,
            });
            const agent = engine.getAgentAt(0, 0)!;
            const originalPx = agent.px;
            const originalPy = agent.py;

            // Target has obstacle
            engine.map.setObstacle(1, 0, 'WALL');

            // Simulate drag preview
            agent.px = 555;
            agent.py = 666;
            agent.dragOverQ = 1;
            agent.dragOverR = 0;

            engine.bus.emit('UI_COMMAND', {
                type: 'MOVE_AGENT',
                agentId: agent.id,
                q: 1,
                r: 0,
            });

            // Must NOT have moved, and preview MUST be restored to original px/py
            expect(agent.q).toBe(0);
            expect(agent.r).toBe(0);
            expect(agent.px).toBe(originalPx);
            expect(agent.py).toBe(originalPy);
            expect(agent.dragOverQ).toBeNull();
            expect(agent.dragOverR).toBeNull();

            // Try out of bounds target
            agent.px = 888;
            agent.py = 999;
            engine.bus.emit('UI_COMMAND', {
                type: 'MOVE_AGENT',
                agentId: agent.id,
                q: 999,
                r: 999,
            });
            expect(agent.q).toBe(0);
            expect(agent.r).toBe(0);
            expect(agent.px).toBe(originalPx);
            expect(agent.py).toBe(originalPy);
            expect(agent.dragOverQ).toBeNull();
            expect(agent.dragOverR).toBeNull();
        });

        it('safely ignores unknown agentId', () => {
            expect(() => {
                engine.bus.emit('UI_COMMAND', {
                    type: 'MOVE_AGENT',
                    agentId: 'non_existent_agent',
                    q: 0,
                    r: 0,
                });
            }).not.toThrow();
        });
    });

    describe('START_GAME, STOP_GAME, CLEAR_BOARD, RANDOMIZE_MAP', () => {
        it('starts and stops game execution', () => {
            expect(engine.isRunning).toBe(false);

            engine.bus.emit('UI_COMMAND', { type: 'START_GAME' });
            expect(engine.isRunning).toBe(true);

            engine.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
            expect(engine.isRunning).toBe(false);
        });

        it('clears the board via CLEAR_BOARD', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: 0,
                r: 0,
            });
            engine.map.setObstacle(1, 0, 'WALL');
            expect(engine.agents.length).toBe(1);
            expect(engine.hasObstacle(1, 0)).toBe(true);

            engine.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD' });
            expect(engine.agents.length).toBe(0);
            expect(engine.hasObstacle(1, 0)).toBe(false);
        });

        it('randomizes map with bounded width, height, and layout', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'RANDOMIZE_MAP',
                w: 999, // Should clamp to UI_SETTINGS.MAP_WIDTH.max
                h: -10, // Should clamp to UI_SETTINGS.MAP_HEIGHT.min
                layout: 'POINTY',
            });

            expect(engine.mapConfig.w).toBe(UI_SETTINGS.MAP_WIDTH.max);
            expect(engine.mapConfig.h).toBe(UI_SETTINGS.MAP_HEIGHT.min);
            expect(engine.mapConfig.layout).toBe('POINTY');
        });
    });

    describe('Unknown and Malformed Commands', () => {
        it('ignores unknown or malformed commands without throwing', () => {
            expect(() => {
                engine.bus.emit('UI_COMMAND', { type: 'UNKNOWN_CMD' } as unknown as import('../types').UICommand);
                engine.bus.emit('UI_COMMAND', null as unknown as import('../types').UICommand);
                engine.bus.emit('UI_COMMAND', undefined as unknown as import('../types').UICommand);
            }).not.toThrow();
        });
    });
});
