import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import { HexUtils } from '../engine/utils';
import { stopMovement, teleportTo } from '../engine/systems/movement/MotionCommands';

describe('MotionCommands', () => {
    let engine: GameEngine;

    beforeEach(() => { engine = new GameEngine(); });
    afterEach(() => { engine.stop(); engine.clear(); });

    const spawn = () => {
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 100, Role.WARRIOR);
        if (!a) throw new Error('cannot spawn');
        return a;
    };

    it('stopMovement resets path with a NEW array and leaves trajectory intact', () => {
        const a = spawn();
        const route = [{ q: 1, r: 0 }, { q: 2, r: 0 }];
        a.path = route;
        a.trajectory = route; // MovementSystem 起步時兩者共用同一陣列
        a.isMoving = true;

        stopMovement(a);

        expect(a.isMoving).toBe(false);
        expect(a.path).toEqual([]);
        expect(a.path).not.toBe(route);
        expect(a.trajectory).toBe(route);
        expect(a.trajectory).toHaveLength(2);
    });

    it('teleportTo changes hex, snaps px/py and keeps the drawn position (px + physics) continuous', () => {
        const a = spawn();
        a.physics.x = 3;
        a.physics.y = -2;
        const beforeX = a.px + a.physics.x;
        const beforeY = a.py + a.physics.y;

        teleportTo(a, 2, 0, engine);

        const center = HexUtils.toPx(2, 0, engine.mapConfig);
        expect(a.q).toBe(2);
        expect(a.r).toBe(0);
        expect(a.px).toBeCloseTo(center.x);
        expect(a.py).toBeCloseTo(center.y);
        expect(a.px + a.physics.x).toBeCloseTo(beforeX);
        expect(a.py + a.physics.y).toBeCloseTo(beforeY);
        expect(engine.map.getAgentAt(2, 0)).toBe(a);
    });
});
