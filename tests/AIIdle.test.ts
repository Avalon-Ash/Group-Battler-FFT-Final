import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role, NodeState } from '../types';
import { BTActions, BTConditions } from '../engine/ai/BTRegistry';
import { HexUtils } from '../engine/utils';

describe('AIIdle (Task B2: Fix Unit Idle and Targeting Deadlocks in BR)', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    it('falls back to Gap Close when all skills are on cooldown instead of failing Combat', () => {
        engine.play();
        const attacker = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        const target = engine.agentManager.addAgent(engine, Team.RED, 3, 0, 100, Role.WARRIOR);
        if (!attacker || !target) return;

        attacker.target = target;
        // Put all skills on cooldown
        attacker.curCDs = attacker.skills.map(() => 10.0);

        // Tick BT - Combat should succeed by closing gap rather than failing
        const res = attacker.bt.tick(attacker);
        expect(res).not.toBe(NodeState.FAILURE);
    });

    it('does not deadlock when trapped in warning zone; attacks target instead of mutual abort', () => {
        engine.play();
        const attacker = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        const target = engine.agentManager.addAgent(engine, Team.RED, 2, 0, 100, Role.WARRIOR);
        if (!attacker || !target) return;

        attacker.target = target;
        // Mark attacker hex and all neighbors as warning tiles
        engine.map.warningTiles.add(HexUtils.key(attacker));
        for (const n of HexUtils.neighbors(attacker)) {
            engine.map.warningTiles.add(HexUtils.key(n));
        }

        // Test ChaseTarget directly: when trapped in warning zone, it must not return FAILURE
        const chaseAction = BTActions["ChaseTarget"];
        expect(chaseAction).toBeDefined();

        const state = chaseAction(attacker, engine, { slot: 2 });
        // Must be RUNNING or SUCCESS (moving towards or reached target), NEVER FAILURE
        expect(state).not.toBe(NodeState.FAILURE);
    });

    it('does not treat dead or out-of-bounds allies as movement-blocking entities', () => {
        engine.play();
        const mover = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        const deadAlly = engine.agentManager.addAgent(engine, Team.BLUE, 1, 0, 100, Role.WARRIOR);
        if (!mover || !deadAlly) return;

        deadAlly.hp = 0;
        deadAlly.outOfBounds = false;

        // Path mover through the dead ally's hex
        mover.path = [{ q: 1, r: 0 }];
        mover.isMoving = true;
        mover.stuckTicks = 0;

        // Update movement
        engine.movement.updateMovement(mover, 0.05, engine);

        // Stuck ticks should remain 0 because dead ally does not block
        expect(mover.stuckTicks).toBe(0);
    });

    it('rejects enemies whose tile has collapsed as valid targets', () => {
        engine.play();
        const attacker = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        const enemy = engine.agentManager.addAgent(engine, Team.RED, 1, 0, 100, Role.MAGE);
        if (!attacker || !enemy) return;

        expect(engine.movement.targeting.isValidTarget(enemy, engine)).toBe(true);

        // Collapse enemy tile
        engine.map.removeTile(1, 0);

        expect(engine.movement.targeting.isValidTarget(enemy, engine)).toBe(false);

        // HasTarget should detect invalid ground and trigger re-targeting
        attacker.target = enemy;
        const hasTargetCondition = BTConditions["HasTarget"];
        // Since enemy tile is invalid and no other enemies exist, HasTarget returns false
        expect(hasTargetCondition(attacker, engine, {})).toBe(false);
        expect(attacker.target).toBeNull();
    });
});
