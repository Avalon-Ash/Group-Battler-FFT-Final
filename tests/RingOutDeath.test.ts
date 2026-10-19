import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import { HexUtils } from '../engine/utils';
import { PHYSICS } from '../constants';

describe('RingOutDeath (Task B1: Unified Ring-Out Death & Residual Cleanup)', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    it('kills unit on collapsing tile, unregisters from map, and removes from engine.agents within DEATH_ANIM_DURATION', () => {
        engine.play();
        // Spawn active combatants on safe tiles so the match continues running
        engine.agentManager.addAgent(engine, Team.BLUE, 2, 2, 100, Role.WARRIOR);
        engine.agentManager.addAgent(engine, Team.RED, -2, -2, 100, Role.WARRIOR);

        const agent = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        expect(agent).not.toBeNull();
        if (!agent) return;

        expect(engine.agents).toContain(agent);
        expect(engine.map.getAgentAt(0, 0)).toBe(agent);
        expect(engine.map.agentMap.get(HexUtils.hash(0, 0))).toBe(agent);

        let diedEventCount = 0;
        let resetEventCount = 0;
        engine.bus.on('AGENT_DIED', () => { diedEventCount++; });
        engine.bus.on('AGENT_RESET', () => { resetEventCount++; });

        // Trigger ring-out death via unified gateway
        agent.hp = 0;
        agent.banished = false;
        engine.agentManager.handleDeadState(agent, engine, '墜落出局', 'RING_OUT');
        agent.physics.z = 0;
        agent.physics.vz = -(PHYSICS.SAFE_FALL_VELOCITY * 0.6);
        engine.map.removeTile(0, 0);

        // Invariant 1: Map occupancy cleared immediately
        expect(engine.map.getAgentAt(0, 0)).toBeUndefined();
        expect(engine.map.agentMap.has(HexUtils.hash(0, 0))).toBe(false);

        // Invariant 2: Events emitted exactly once
        expect(diedEventCount).toBe(1);
        expect(resetEventCount).toBe(1);

        // Invariant 3: Idempotent - duplicate call does not emit again
        engine.agentManager.handleDeadState(agent, engine, '墜落出局', 'RING_OUT');
        expect(diedEventCount).toBe(1);
        expect(resetEventCount).toBe(1);

        // Step engine ticks until agent falls out of bounds (z < -1000) or deathTimer exceeds DEATH_ANIM_DURATION
        for (let i = 0; i < 60; i++) {
            engine.tick(0.05);
            if (!engine.agents.includes(agent)) break;
        }

        // Invariant 4: Fully removed from engine.agents
        expect(engine.agents.includes(agent)).toBe(false);
    });

    it('correctly handles banished agent when ground collapses', () => {
        engine.play();
        engine.agentManager.addAgent(engine, Team.BLUE, 2, 2, 100, Role.WARRIOR);
        engine.agentManager.addAgent(engine, Team.RED, -2, -2, 100, Role.WARRIOR);

        const agent = engine.agentManager.addAgent(engine, Team.RED, 1, 0, 100, Role.MAGE);
        expect(agent).not.toBeNull();
        if (!agent) return;

        agent.banished = true;
        agent.effects.BANISH.remaining = 5.0;

        // Tile collapses under banished agent
        agent.hp = 0;
        agent.banished = false;
        engine.agentManager.handleDeadState(agent, engine, '墜落出局', 'RING_OUT');
        agent.physics.z = 0;
        agent.physics.vz = -(PHYSICS.SAFE_FALL_VELOCITY * 0.6);
        engine.map.removeTile(1, 0);

        expect(agent.banished).toBe(false);
        expect(agent.hp).toBe(0);
        expect(engine.map.getAgentAt(1, 0)).toBeUndefined();
        expect(engine.map.agentMap.has(HexUtils.hash(1, 0))).toBe(false);

        // Step ticks until removed
        for (let i = 0; i < 120; i++) {
            engine.tick(0.05);
            if (!engine.agents.includes(agent)) break;
        }

        expect(engine.agents.includes(agent)).toBe(false);
    });

    it('freezes dead agents on valid ground while allowing dead agents without ground to fall', () => {
        engine.play();
        const landAgent = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        const voidAgent = engine.agentManager.addAgent(engine, Team.RED, 1, 0, 100, Role.WARRIOR);
        if (!landAgent || !voidAgent) return;

        // Kill landAgent on valid tile
        landAgent.hp = 0;
        engine.agentManager.handleDeadState(landAgent, engine);

        // Kill voidAgent and remove its tile
        voidAgent.hp = 0;
        engine.agentManager.handleDeadState(voidAgent, engine, '墜落出局', 'RING_OUT');
        voidAgent.physics.z = 0;
        voidAgent.physics.vz = -(PHYSICS.SAFE_FALL_VELOCITY * 0.6);
        engine.map.removeTile(1, 0);

        expect(engine.map.isValid(0, 0)).toBe(true);
        expect(engine.map.isValid(1, 0)).toBe(false);

        // Advance 2 ticks
        engine.tick(0.05);
        engine.tick(0.05);

        // Land agent stays at z = 0 (frozen)
        expect(landAgent.physics.z).toBe(0);
        expect(landAgent.physics.vz).toBe(0);

        // Void agent falls downwards
        expect(voidAgent.physics.z).toBeLessThan(0);
        expect(voidAgent.physics.vz).toBeLessThan(-(PHYSICS.SAFE_FALL_VELOCITY * 0.6));
    });
});
