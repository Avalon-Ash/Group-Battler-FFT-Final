import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role, BodyTypeId } from '../types';
import { AgentManager } from '../engine/systems/agentManager';
import { resetAgent } from '../engine/core/AgentLifecycle';
import { pickBodyType, resolveBodyType, BODY_TYPE_PROFILE } from '../data/units/appearance/bodyTypes';

describe('Task A2e: BodyType Generation & Editor Integration', () => {
    describe('pickBodyType pure function determinism and distribution', () => {
        it('produces identical output for identical agentId and matchSalt', () => {
            const id = 'BLU-0042';
            const salt = 123456789;
            const res1 = pickBodyType(id, salt);
            const res2 = pickBodyType(id, salt);
            expect(res1).toBe(res2);
        });

        it('never selects disabled body types or body types with 0 weight', () => {
            const customProfiles = {
                MALE: { enabled: true, fallback: null },
                FEMALE: { enabled: false, fallback: 'MALE' }
            } as Record<BodyTypeId, { enabled: boolean; fallback: BodyTypeId | null }>;

            const customWeights = {
                MALE: 1,
                FEMALE: 100 // high weight, but disabled
            } as Record<BodyTypeId, number>;

            for (let i = 0; i < 100; i++) {
                const res = pickBodyType(`BLU-${i}`, 42, customProfiles, customWeights);
                expect(res).toBe('MALE');
            }
        });

        it('distributes between 40% and 60% for 1000 sequential IDs when 2 body types are enabled with equal weight', () => {
            const dualProfiles = {
                MALE: { enabled: true, fallback: null },
                FEMALE: { enabled: true, fallback: null }
            } as Record<BodyTypeId, { enabled: boolean; fallback: BodyTypeId | null }>;

            const equalWeights = {
                MALE: 1,
                FEMALE: 1
            } as Record<BodyTypeId, number>;

            let maleCount = 0;
            const total = 1000;
            const salt = 987654321;

            for (let i = 1; i <= total; i++) {
                const id = `ENT-${i.toString().padStart(4, '0')}`;
                const chosen = pickBodyType(id, salt, dualProfiles, equalWeights);
                if (chosen === 'MALE') maleCount++;
            }

            const pct = (maleCount / total) * 100;
            expect(pct).toBeGreaterThanOrEqual(40);
            expect(pct).toBeLessThanOrEqual(60);
        });

        it('resolveBodyType falls back to MALE when given disabled or undefined body type', () => {
            expect(resolveBodyType(null)).toBe('MALE');
            expect(resolveBodyType(undefined)).toBe('MALE');
            expect(resolveBodyType({ bodyType: undefined })).toBe('MALE');
            // Production enables FEMALE; an explicitly disabled profile still falls back.
            expect(resolveBodyType({ bodyType: 'FEMALE' })).toBe('FEMALE');
            expect(resolveBodyType({ bodyType: 'FEMALE' }, { ...BODY_TYPE_PROFILE, FEMALE: { ...BODY_TYPE_PROFILE.FEMALE, enabled: false } })).toBe('MALE');
        });
    });

    describe('AgentManager and addAgent integration', () => {
        let engine: GameEngine;

        beforeEach(() => {
            engine = new GameEngine();
        });

        it('automatically assigns deterministic bodyType when spawned without override', () => {
            const agent = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0);
            expect(agent).not.toBeNull();
            expect(agent!.bodyType).toBeDefined();
            expect(agent!.bodyType).toBe(pickBodyType(agent!.id, AgentManager.matchSalt));
        });

        it('respects bodyTypeOverride when explicitly specified in addAgent', () => {
            const agent = engine.agentManager.addAgent(engine, Team.RED, 1, 0, 800, Role.TANK, 'FEMALE');
            expect(agent).not.toBeNull();
            expect(agent!.bodyType).toBe('FEMALE');
        });
    });

    describe('UICommandSystem PLACE_AGENT and EDIT_AGENT with bodyType', () => {
        let engine: GameEngine;

        beforeEach(() => {
            engine = new GameEngine();
        });

        it('writes bodyType from PLACE_AGENT command to Agent and saves state', () => {
            engine.bus.emit('UI_COMMAND', {
                type: 'PLACE_AGENT',
                team: Team.BLUE,
                q: -2,
                r: 1,
                hp: 750,
                role: Role.WARRIOR,
                bodyType: 'FEMALE'
            });

            const agent = engine.getAgentAt(-2, 1);
            expect(agent).not.toBeNull();
            expect(agent!.role).toBe(Role.WARRIOR);
            expect(agent!.bodyType).toBe('FEMALE');

            // Verify persistence in reset
            agent!.bodyType = 'MALE';
            resetAgent(agent!, engine.mapConfig);
            expect(agent!.bodyType).toBe('FEMALE');
        });

        it('updates bodyType immediately on EDIT_AGENT command', () => {
            const agent = engine.agentManager.addAgent(engine, Team.BLUE, 0, 1, 600, Role.RANGER);
            expect(agent).not.toBeNull();
            const id = agent!.id;

            engine.bus.emit('UI_COMMAND', {
                type: 'EDIT_AGENT',
                agentId: id,
                bodyType: 'FEMALE'
            });

            expect(agent!.bodyType).toBe('FEMALE');
        });

        it('refreshes AgentManager.matchSalt on RESET_GAME command', () => {
            const oldSalt = AgentManager.matchSalt;
            // Force a small delay or set directly to guarantee a different timestamp
            AgentManager.matchSalt = oldSalt - 1000;
            const customOldSalt = AgentManager.matchSalt;

            engine.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });

            expect(AgentManager.matchSalt).not.toBe(customOldSalt);
        });
    });
});
