import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/game';
import { Team, Role } from '../types';
import type { Skill } from '../types';
import { HexUtils } from '../engine/utils';
import { BLOCK_HEIGHT, PHYSICS, AFTERIMAGE } from '../constants';
import { dashTo, lungeToward } from '../engine/systems/movement/MotionCommands';
import { VisualMath } from '../engine/math/VisualMath';
import { SkillExecutor } from '../engine/systems/combat/SkillExecutor';

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

    describe('Melee Lunge (DM3)', () => {
        const makeSkill = (overrides: Partial<Skill> = {}): Skill => ({
            id: 'test_skill',
            name: 'Test Skill',
            desc: 'Test',
            role: Role.WARRIOR,
            tag: 'ACTIVE',
            range: 1,
            cast: 0,
            cd: 5,
            cost: 0,
            gain: 0,
            type: 'SINGLE',
            power: 100,
            color: '#ff0000',
            visual: 'SLASH',
            projectileSpeed: 0,
            ...overrides,
        });

        it('basic melee attack triggers lunge with peak displacement in 6~15 px and stays in same hex', () => {
            const source = spawn(Team.BLUE, 0, 0);
            const target = spawn(Team.RED, 1, 0);
            source.target = target;

            const basicSkill = makeSkill({ tag: 'BASIC', range: 1, power: 100 });
            const executor = new SkillExecutor();
            executor.executeInstantSkill(source, basicSkill, engine);

            expect(source.physics.vx).toBeGreaterThan(400);

            let peakDisp = 0;
            const dt = 0.016;
            for (let t = 0; t < 1.0; t += dt) {
                engine.physics.update(dt, engine);
                const disp = Math.hypot(source.physics.x, source.physics.y);
                peakDisp = Math.max(peakDisp, disp);

                const currentHex = HexUtils.fromPx(source.px + source.physics.x, source.py + source.physics.y, engine.mapConfig);
                expect(currentHex.q + 0).toBe(0);
                expect(currentHex.r + 0).toBe(0);
            }

            // Peak displacement within 6~15 px (nominal ~8.8 px)
            expect(peakDisp).toBeGreaterThanOrEqual(6);
            expect(peakDisp).toBeLessThanOrEqual(15);

            // Springs back to rest
            expect(Math.hypot(source.physics.x, source.physics.y)).toBeLessThan(0.1);
        });

        it('active melee skill triggers stronger lunge with peak displacement in 6~15 px', () => {
            const source = spawn(Team.BLUE, 0, 0);
            const target = spawn(Team.RED, 1, 0);
            source.target = target;

            const activeSkill = makeSkill({ tag: 'ACTIVE', range: 2, power: 250 });
            const executor = new SkillExecutor();
            executor.executeInstantSkill(source, activeSkill, engine);

            expect(source.physics.vx).toBeGreaterThan(500);

            let peakDisp = 0;
            const dt = 0.016;
            for (let t = 0; t < 1.0; t += dt) {
                engine.physics.update(dt, engine);
                const disp = Math.hypot(source.physics.x, source.physics.y);
                peakDisp = Math.max(peakDisp, disp);

                const currentHex = HexUtils.fromPx(source.px + source.physics.x, source.py + source.physics.y, engine.mapConfig);
                expect(currentHex.q + 0).toBe(0);
                expect(currentHex.r + 0).toBe(0);
            }

            // Peak displacement within 6~15 px (nominal ~11.2 px)
            expect(peakDisp).toBeGreaterThanOrEqual(6);
            expect(peakDisp).toBeLessThanOrEqual(15);
            expect(Math.hypot(source.physics.x, source.physics.y)).toBeLessThan(0.1);
        });

        it('point-blank DASH (stepsTaken === 0) falls back to active lunge', () => {
            const source = spawn(Team.BLUE, 0, 0);
            const target = spawn(Team.RED, 1, 0);
            source.target = target;

            // Target (1, 0) is occupied by target, so planDashPath cannot enter (stepsTaken = 0)
            const dashSkill = makeSkill({ effectType: 'DASH', range: 1, power: 150 });
            const executor = new SkillExecutor();
            executor.executeInstantSkill(source, dashSkill, engine);

            // Must have lunged forward without changing logical tile
            expect(source.q).toBe(0);
            expect(source.r).toBe(0);
            expect(source.physics.vx).toBeGreaterThan(500);

            let peakDisp = 0;
            const dt = 0.016;
            for (let t = 0; t < 1.0; t += dt) {
                engine.physics.update(dt, engine);
                peakDisp = Math.max(peakDisp, Math.hypot(source.physics.x, source.physics.y));

                const currentHex = HexUtils.fromPx(source.px + source.physics.x, source.py + source.physics.y, engine.mapConfig);
                expect(currentHex.q + 0).toBe(0);
                expect(currentHex.r + 0).toBe(0);
            }

            expect(peakDisp).toBeGreaterThanOrEqual(6);
            expect(peakDisp).toBeLessThanOrEqual(15);
            expect(Math.hypot(source.physics.x, source.physics.y)).toBeLessThan(0.1);
        });

        it('consecutive lunge triggers do not stack velocity beyond speed cap', () => {
            const source = spawn(Team.BLUE, 0, 0);
            const target = spawn(Team.RED, 1, 0);
            source.target = target;

            const activeSkill = makeSkill({ tag: 'ACTIVE', range: 1, power: 200 });
            const executor = new SkillExecutor();

            // Trigger 5 times in rapid succession
            for (let i = 0; i < 5; i++) {
                executor.executeInstantSkill(source, activeSkill, engine);
            }

            // Velocity must be capped at LUNGE_SPEED_ACTIVE, not 5 * 540
            expect(source.physics.vx).toBeLessThanOrEqual(PHYSICS.LUNGE_SPEED_ACTIVE + 1);

            let peakDisp = 0;
            const dt = 0.016;
            for (let t = 0; t < 1.0; t += dt) {
                engine.physics.update(dt, engine);
                peakDisp = Math.max(peakDisp, Math.hypot(source.physics.x, source.physics.y));

                const currentHex = HexUtils.fromPx(source.px + source.physics.x, source.py + source.physics.y, engine.mapConfig);
                expect(currentHex.q + 0).toBe(0);
                expect(currentHex.r + 0).toBe(0);
            }

            expect(peakDisp).toBeLessThanOrEqual(15);
        });

        it('ranged skills and self skills (range === 0) do not trigger lunge', () => {
            const source = spawn(Team.BLUE, 0, 0);
            const target = spawn(Team.RED, 3, 0);
            source.target = target;
            const executor = new SkillExecutor();

            // 1. Ranged projectile skill
            const rangedSkill = makeSkill({ range: 3, projectileSpeed: 600, power: 100 });
            executor.executeInstantSkill(source, rangedSkill, engine);
            expect(source.physics.vx).toBe(0);
            expect(source.physics.vy).toBe(0);

            // 2. Self skill (range === 0)
            const selfSkill = makeSkill({ range: 0, power: 0, type: 'SINGLE' });
            executor.executeInstantSkill(source, selfSkill, engine);
            expect(source.physics.vx).toBe(0);
            expect(source.physics.vy).toBe(0);

            // 3. Far range beam (range > 2)
            const beamSkill = makeSkill({ range: 4, projectileSpeed: 0, power: 100 });
            executor.executeInstantSkill(source, beamSkill, engine);
            expect(source.physics.vx).toBe(0);
            expect(source.physics.vy).toBe(0);
        });
    });
});

