import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GameEngine, type Agent } from '../engine/game';
import { CameraTargetGroup } from '../engine/presentation/CameraTargetGroup';
import { DirectorRoster } from '../engine/presentation/DirectorRoster';
import { DIRECTOR_PARAM } from '../constants';
import { Team, Role } from '../types';

const TICK = 1 / 60;

function arena() {
    const engine = new GameEngine();
    engine.map.obstacles.clear();
    engine.map.obstaclesHash.clear();
    const add = (team: Team, q: number) => {
        const a = engine.agentManager.addAgent(engine, team, q, 0, 200, Role.WARRIOR)!;
        a.skills = ['BASIC', 'ACTIVE', 'ULT'].map(tag => engine.skillDB.find(s => s.tag === tag)!);
        return a;
    };
    return { engine, add };
}

function skillIndex(a: Agent, tag: string): number {
    const idx = a.skills.findIndex(s => s?.tag === tag);
    expect(idx).toBeGreaterThanOrEqual(0);
    return idx;
}

describe('DirectorRoster', () => {
    const always = () => true;

    it('ranks by score, and ties stay in the order units entered the list', () => {
        const { add } = arena();
        const blue = add(Team.BLUE, 0);
        const red = add(Team.RED, 4);
        const roster = new DirectorRoster();
        red.isMoving = true;
        roster.update([blue, red], TICK, always);
        blue.isMoving = true;
        roster.update([blue, red], TICK, always);
        expect(roster.ranked.map(e => e.agent)).toEqual([red, blue]);

        blue.castingSkillIdx = skillIndex(blue, 'ACTIVE');
        roster.update([blue, red], TICK, always);
        expect(roster.ranked[0].agent).toBe(blue);
    });

    it('team and id give no bonus', () => {
        const { add } = arena();
        const blue = add(Team.BLUE, 0);
        const red = add(Team.RED, 4);
        blue.isMoving = red.isMoving = true;
        const roster = new DirectorRoster();
        roster.update([red, blue], TICK, always);
        expect(roster.scoreOf(blue.id)).toBe(roster.scoreOf(red.id));
        expect(roster.ranked[0].agent).toBe(red);
    });

    it('a score decays after the action ends, then the unit leaves the list', () => {
        const { add } = arena();
        const blue = add(Team.BLUE, 0);
        const roster = new DirectorRoster();
        blue.castingSkillIdx = skillIndex(blue, 'ULT');
        roster.update([blue], TICK, always);
        expect(roster.scoreOf(blue.id)).toBe(DIRECTOR_PARAM.ULT_SCORE);

        blue.castingSkillIdx = -1;
        roster.update([blue], 1, always);
        expect(roster.scoreOf(blue.id)).toBe(DIRECTOR_PARAM.ULT_SCORE - DIRECTOR_PARAM.SCORE_DECAY_PER_S);

        roster.update([blue], DIRECTOR_PARAM.ULT_SCORE / DIRECTOR_PARAM.SCORE_DECAY_PER_S, always);
        expect(roster.ranked).toEqual([]);
    });

    it('drops units that can no longer be shown', () => {
        const { add } = arena();
        const blue = add(Team.BLUE, 0);
        blue.isMoving = true;
        const roster = new DirectorRoster();
        roster.update([blue], TICK, always);
        roster.update([blue], TICK, () => false);
        expect(roster.ranked).toEqual([]);
    });
});

describe('CameraTargetGroup', () => {
    it('a member that stops being wanted lingers, then fades out without a zoom jump', () => {
        const group = new CameraTargetGroup();
        const settle = () => { group.want('near', 0, 0, 1, 100); group.want('far', 800, 0, 1, 100); group.advance(10); };
        settle();
        let prev = group.solve(1000, 1000).zoom;
        let biggest = 0;
        let ticks = 0;
        while (group.size > 1 && ticks++ < 600) {
            group.want('near', 0, 0, 1, 100);
            group.advance(TICK);
            const { zoom } = group.solve(1000, 1000);
            biggest = Math.max(biggest, Math.abs(Math.log(zoom / prev)));
            prev = zoom;
        }
        expect(group.size).toBe(1);
        expect(ticks).toBeGreaterThan(DIRECTOR_PARAM.LINGER_S / TICK);
        // 舊做法收招那一 tick 就跳約 ln(3)≈1.1；這裡只驗沒有跳變，速度上限另外在導播端
        expect(biggest).toBeLessThan(0.1);
    });

    it('a low-weight far member cannot set the zoom alone', () => {
        const near = new CameraTargetGroup();
        near.want('a', 0, 0, 1, 100);
        near.advance(10);
        const withFar = new CameraTargetGroup();
        withFar.want('a', 0, 0, 1, 100);
        withFar.want('far', 800, 0, DIRECTOR_PARAM.TOP_WEIGHT, 60);
        withFar.advance(10);
        const equalFar = new CameraTargetGroup();
        equalFar.want('a', 0, 0, 1, 100);
        equalFar.want('far', 800, 0, 1, 60);
        equalFar.advance(10);
        const z = (g: CameraTargetGroup) => g.solve(1000, 1000).zoom;
        expect(z(withFar)).toBeLessThanOrEqual(z(near));
        expect(z(withFar)).toBeGreaterThan(z(equalFar));
    });
});

describe('DirectorSystem target', () => {
    it('holds the anchor for the minimum time, then a clearly higher score takes over', () => {
        const { engine, add } = arena();
        const blue = add(Team.BLUE, 0);
        const red = add(Team.RED, 4);
        blue.isMoving = true;
        engine.director.update(engine, TICK);
        expect(engine.state.director.targetId).toBe(blue.id);

        red.castingSkillIdx = skillIndex(red, 'ACTIVE');
        engine.director.update(engine, TICK);
        expect(engine.state.director.targetId).toBe(blue.id);

        for (let t = 0; t < DIRECTOR_PARAM.MIN_HOLD_S + TICK; t += TICK) engine.director.update(engine, TICK);
        expect(engine.state.director.targetId).toBe(red.id);
    });

    it('a small lead does not take over: the sticky score keeps the anchor', () => {
        const { engine, add } = arena();
        const blue = add(Team.BLUE, 0);
        const red = add(Team.RED, 4);
        blue.isMoving = true;
        engine.director.update(engine, TICK);
        red.isMoving = true;
        red.castingSkillIdx = skillIndex(red, 'BASIC');
        for (let t = 0; t < DIRECTOR_PARAM.MIN_HOLD_S * 2; t += TICK) engine.director.update(engine, TICK);
        expect(engine.state.director.targetId).toBe(blue.id);
    });

    it('a dead anchor is replaced at once', () => {
        const { engine, add } = arena();
        const blue = add(Team.BLUE, 0);
        const red = add(Team.RED, 4);
        blue.isMoving = true;
        engine.director.update(engine, TICK);
        blue.hp = 0;
        engine.director.update(engine, TICK);
        expect(engine.state.director.targetId).toBe(red.id);
    });

    it('zoom sent to the camera never exceeds the rate limit when casters come and go', () => {
        const { engine, add } = arena();
        const blue = add(Team.BLUE, 0);
        const red = add(Team.RED, 6);
        blue.castingSkillIdx = skillIndex(blue, 'ULT');
        const zooms: number[] = [];
        engine.bus.on('CAMERA_MOVE', d => { zooms.push(d.zoom); });
        for (let i = 0; i < 600; i++) {
            red.castingSkillIdx = i % 120 < 60 ? skillIndex(red, 'ULT') : -1;
            engine.director.update(engine, TICK);
        }
        const limit = DIRECTOR_PARAM.ZOOM_RATE_PER_S * TICK + 1e-9;
        for (let i = 1; i < zooms.length; i++) {
            expect(Math.abs(Math.log(zooms[i] / zooms[i - 1]))).toBeLessThanOrEqual(limit);
        }
    });
});

describe('Camera snaps stay out of the running battle', () => {
    it('a resolution change from the quality tier does not recentre the camera', () => {
        const source = readFileSync('hooks/useGameLoop.ts', 'utf8');
        expect(source.match(/resizeCallbackRef\.current\(/g)).toHaveLength(1);
    });
});
