import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/game';
import { Team, Role } from '../types';
import { HexUtils } from '../engine/utils';
import { BLOCK_HEIGHT, PHYSICS, AFTERIMAGE } from '../constants';
import { dashTo } from '../engine/systems/movement/MotionCommands';
import { VisualMath } from '../engine/math/VisualMath';

const HP = 200;

describe('DashMotion (DM2)', () => {
    let engine: GameEngine;

    function spawn(team: Team, q: number, r = 0): Agent {
        const a = engine.agentManager.addAgent(engine, team, q, r, HP, Role.WARRIOR);
        if (!a) throw new Error(`cannot spawn at ${q},${r}`);
        a.maxHp = HP;
        a.hp = HP;
        a.shield = 0;
        return a;
    }

    const setHeight = (q: number, r: number, height: number) => {
        engine.map.heightMap.set(HexUtils.key({ q, r }), height);
    };

    const getWorldHeight = (a: Agent) => {
        const gh = VisualMath.getUnitGroundHeight(a, (q, r) => engine.getTerrainHeight(q, r), engine.mapConfig);
        return gh + a.physics.z;
    };

    beforeEach(() => {
        engine = new GameEngine();
        engine.map.obstacles.clear();
        engine.map.obstaclesHash.clear();
        for (let q = -6; q <= 6; q++) {
            for (let r = -6; r <= 6; r++) {
                setHeight(q, r, 0);
            }
        }
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    it('flat dash has immediate frame-0 burst speed, correct facing, and smooth ease-out', () => {
        const a = spawn(Team.BLUE, 0, 0);
        const startPx = HexUtils.toPx(0, 0, engine.mapConfig);
        const targetPx = HexUtils.toPx(1, 0, engine.mapConfig);
        const totalDist = Math.hypot(targetPx.x - startPx.x, targetPx.y - startPx.y);

        dashTo(a, 1, 0, engine);

        // 1. Frame 0 burst velocity
        const expectedVx = (targetPx.x - startPx.x) * PHYSICS.DASH_BURST_FACTOR;
        expect(a.physics.vx).toBeCloseTo(expectedVx);
        expect(a.physics.vx).toBeGreaterThan(600);
        expect(a.facing).toBe(1);

        // 2. Start visual position matches starting tile
        expect(a.px + a.physics.x).toBeCloseTo(startPx.x);
        expect(a.py + a.physics.y).toBeCloseTo(startPx.y);

        // 3. Step physics and track speed & distance
        let timeTo80Pct = -1;
        const dt = 0.016;
        let maxOvershoot = 0;

        for (let t = 0; t < 1.0; t += dt) {
            engine.physics.update(dt, engine);
            const remainingDist = Math.hypot(a.physics.x, a.physics.y);
            const traveled = totalDist - remainingDist;

            if (traveled >= totalDist * 0.8 && timeTo80Pct < 0) {
                timeTo80Pct = t + dt;
            }

            // After passing target (physics.x > 0 since it approached from negative)
            if (a.physics.x > 0) {
                maxOvershoot = Math.max(maxOvershoot, a.physics.x);
            }
        }

        // 80% displacement completed quickly (~0.128s, <= 0.18s)
        expect(timeTo80Pct).toBeGreaterThan(0);
        expect(timeTo80Pct).toBeLessThan(0.18);

        // Overshoot is negligible (< 0.2 px)
        expect(maxOvershoot).toBeLessThan(0.2);

        // Settles close to goal
        expect(Math.abs(a.physics.x)).toBeLessThan(0.05);
        expect(Math.abs(a.physics.y)).toBeLessThan(0.05);
    });

    it('dash facing flips according to movement direction', () => {
        const a = spawn(Team.BLUE, 1, 0);
        dashTo(a, 0, 0, engine);
        expect(a.facing).toBe(-1);
        expect(a.physics.vx).toBeLessThan(-600);
    });

    it('records start position into trailHistory as the first afterimage point', () => {
        const a = spawn(Team.BLUE, 0, 0);
        const startPx = HexUtils.toPx(0, 0, engine.mapConfig);

        expect(a.trailHistory).toHaveLength(0);

        dashTo(a, 1, 0, engine);

        // Before first physics tick, trailHistory was empty, but speed is high
        expect(a.trailHistory).toHaveLength(0);

        // Run 1 tick
        engine.physics.update(0.016, engine);

        // First point in trailHistory must be the start point
        expect(a.trailHistory.length).toBeGreaterThanOrEqual(1);
        expect(a.trailHistory[0].x).toBeCloseTo(startPx.x, 1);
        expect(a.trailHistory[0].y).toBeCloseTo(startPx.y, 1);
    });

    it('uphill dash forms parabolic jump with continuous world height (no frame-1 teleport to high ground)', () => {
        const a = spawn(Team.BLUE, 0, 0);
        const targetH = BLOCK_HEIGHT * 2; // 48 px
        setHeight(0, 0, 0);
        setHeight(1, 0, targetH);

        const worldHStart = getWorldHeight(a);
        expect(worldHStart).toBe(0);

        dashTo(a, 1, 0, engine);

        // Frame 0 after dashTo:
        // absorbGroundShift sets physics.z = -48
        expect(a.physics.z).toBe(-targetH);
        // World height right after dashTo is STILL 0 (continuous with start)
        const worldHImmediate = getWorldHeight(a);
        expect(worldHImmediate).toBeCloseTo(0);

        // Target upward velocity incorporates uphill difference
        const expectedVz = Math.max(
            PHYSICS.VISUAL_JUMP_DASH,
            Math.sqrt(2 * PHYSICS.GRAVITY * (targetH + PHYSICS.DASH_ARC_HEIGHT))
        );
        expect(a.physics.vz).toBeCloseTo(expectedVz);
        expect(a.physics.vz).toBeGreaterThan(600);

        // Over subsequent ticks: world height must be continuous, no single-tick jump > 20px
        const dt = 0.016;
        let prevWorldH = worldHImmediate;
        let peakWorldH = -Infinity;

        for (let t = 0; t < 1.0; t += dt) {
            engine.physics.update(dt, engine);
            const curWorldH = getWorldHeight(a);
            const delta = Math.abs(curWorldH - prevWorldH);

            // Single frame height delta must be smooth (no 48px jump!)
            expect(delta).toBeLessThan(20);

            peakWorldH = Math.max(peakWorldH, curWorldH);
            prevWorldH = curWorldH;
        }

        // Peak world height must exceed the target terrain height by ~DASH_ARC_HEIGHT (18px)
        expect(peakWorldH).toBeGreaterThan(targetH + 10);
        // Eventually settles on target height
        expect(prevWorldH).toBeCloseTo(targetH, 1);
        expect(a.physics.z).toBeCloseTo(0, 1);
    });

    it('downhill dash absorbs terrain height change across hex boundary (zero single-tick world height drop)', () => {
        const startH = BLOCK_HEIGHT * 2; // 48 px
        setHeight(0, 0, startH);
        setHeight(1, 0, 0);

        const a = spawn(Team.BLUE, 0, 0);
        const worldHStart = getWorldHeight(a);
        expect(worldHStart).toBe(startH);

        dashTo(a, 1, 0, engine);

        const dt = 0.016;
        let prevWorldH = worldHStart;

        for (let t = 0; t < 1.0; t += dt) {
            engine.physics.update(dt, engine);
            const curWorldH = getWorldHeight(a);
            const delta = Math.abs(curWorldH - prevWorldH);

            // Downhill crossing must NOT drop 48px in a single tick!
            // Without boundary absorption, delta would be ~48px.
            expect(delta).toBeLessThan(20);
            prevWorldH = curWorldH;
        }

        // Settles on lower ground (0 px)
        expect(prevWorldH).toBeCloseTo(0, 1);
        expect(a.physics.z).toBeCloseTo(0, 1);
    });
});
