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
