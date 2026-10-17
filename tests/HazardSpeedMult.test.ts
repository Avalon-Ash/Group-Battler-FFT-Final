import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import type { SpatialHazard } from '../types';
import { COMBAT_PARAM } from '../constants';
import { getHazardSpeedMult } from '../engine/systems/HazardSystem';

const hazard = (type: SpatialHazard['type'], team: Team, cells: { q: number; r: number }[], extra: Partial<SpatialHazard> = {}): SpatialHazard => ({
    id: 'h', type, cells, duration: 10, sourceId: 'src', team, color: '#fff', power: 0, tickInterval: 1, lastTickTime: 0, ...extra,
});

describe('getHazardSpeedMult (hazard slows are computed, never written into the agent)', () => {
    let engine: GameEngine;
    beforeEach(() => { engine = new GameEngine(); });
    afterEach(() => { engine.stop(); engine.clear(); });

    const spawn = () => {
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        if (!a) throw new Error('cannot spawn');
        return a;
    };

    it('is 1 with no hazards and for hazards the unit is not in', () => {
        const a = spawn();
        expect(getHazardSpeedMult(a, [], engine.mapConfig)).toBe(1);
        expect(getHazardSpeedMult(a, [hazard('ICE', Team.RED, [{ q: 3, r: 0 }])], engine.mapConfig)).toBe(1);
    });

    it('slows inside an enemy ICE or GRAVITY cell, ignores friendly hazards', () => {
        const a = spawn();
        const here = [{ q: a.q, r: a.r }];
        expect(getHazardSpeedMult(a, [hazard('ICE', Team.RED, here)], engine.mapConfig)).toBe(COMBAT_PARAM.ICE_SPEED_REDUCTION);
        expect(getHazardSpeedMult(a, [hazard('GRAVITY', Team.RED, here)], engine.mapConfig)).toBe(COMBAT_PARAM.GRAVITY_SPEED_REDUCTION);
        expect(getHazardSpeedMult(a, [hazard('ICE', Team.BLUE, here)], engine.mapConfig)).toBe(1);
        expect(getHazardSpeedMult(a, [hazard('FIRE', Team.RED, here)], engine.mapConfig)).toBe(1);
    });

    it('takes the strongest slow when several apply', () => {
        const a = spawn();
        const here = [{ q: a.q, r: a.r }];
        const m = getHazardSpeedMult(a, [hazard('ICE', Team.RED, here), hazard('GRAVITY', Team.RED, here)], engine.mapConfig);
        expect(m).toBe(Math.min(COMBAT_PARAM.ICE_SPEED_REDUCTION, COMBAT_PARAM.GRAVITY_SPEED_REDUCTION));
    });

    it('slows inside the GRAVITY pull radius even outside its cells, and recovers outside', () => {
        const a = spawn();
        const near = hazard('GRAVITY', Team.RED, [{ q: 5, r: 0 }], { centerQ: a.q + 1, centerR: a.r, pullRadius: 10000 });
        expect(getHazardSpeedMult(a, [near], engine.mapConfig)).toBe(COMBAT_PARAM.GRAVITY_SPEED_REDUCTION);
        const far = hazard('GRAVITY', Team.RED, [{ q: 5, r: 0 }], { centerQ: a.q + 1, centerR: a.r, pullRadius: 1 });
        expect(getHazardSpeedMult(a, [far], engine.mapConfig)).toBe(1);
    });

    it('MovementSystem applies it each tick without touching moveSpeedMult', () => {
        const a = spawn();
        a.moveSpeed = 2;
        a.moveSpeedMult = 1;
        a.path = [{ q: 1, r: 0 }];
        a.isMoving = true;
        engine.state.spatialHazards.push(hazard('ICE', Team.RED, [{ q: a.q, r: a.r }]));

        engine.movement.updateMovement(a, 0.1, engine);

        expect(a.moveSpeedMult).toBe(1);
        expect(a.moveProgress).toBeCloseTo(2 * COMBAT_PARAM.ICE_SPEED_REDUCTION * 0.1);
    });
});
