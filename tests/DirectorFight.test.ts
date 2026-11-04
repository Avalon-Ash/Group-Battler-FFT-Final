import { describe, expect, it } from 'vitest';
import { GameEngine, type Agent } from '../engine/game';
import { shotZoom } from '../engine/presentation/DirectorShot';
import { DIRECTOR_PARAM, UI_SETTINGS } from '../constants';
import { Team, Role } from '../types';

const TICK = 1 / 60;
const W = 393;
const H = 852;
const CLOSE_Z = shotZoom('CLOSE', W, H);

function arena() {
    const engine = new GameEngine();
    engine.map.obstacles.clear();
    engine.map.obstaclesHash.clear();
    engine.screenW = W;
    engine.screenH = H;
    let frame = { x: NaN, y: NaN, zoom: NaN };
    engine.bus.on('CAMERA_MOVE', d => { frame = d; });
    let nextQ = 0;
    const add = (team: Team, x: number, y = 0) => {
        const a = engine.agentManager.addAgent(engine, team, nextQ++, 0, 200, Role.WARRIOR)!;
        a.skills = ['BASIC', 'ACTIVE', 'ULT'].map(tag => engine.skillDB.find(s => s.tag === tag)!);
        a.px = x;
        a.py = y;
        return a;
    };
    const run = (seconds: number, each?: (t: number) => void) => {
        const zooms: number[] = [];
        for (let t = 0; t < seconds - 1e-9; t += TICK) {
            each?.(t);
            engine.director.update(engine, TICK);
            zooms.push(frame.zoom);
        }
        return zooms;
    };
    /** 主角鎖定，不讓評分在測試中換人 */
    const lock = (a: Agent) => {
        engine.state.director.targetId = a.id;
        engine.state.director.focusTimer = 1000;
    };
    const cast = (a: Agent, tag: string) => {
        a.castingSkillIdx = a.skills.findIndex(s => s?.tag === tag);
        expect(a.castingSkillIdx).toBeGreaterThanOrEqual(0);
    };
    return { engine, add, run, lock, cast, frame: () => frame };
}

/** 主角和目標相鄰，已經開打 */
function duel() {
    const ctx = arena();
    const blue = ctx.add(Team.BLUE, 0);
    const red = ctx.add(Team.RED, 83);
    blue.target = red;
    red.target = blue;
    ctx.cast(blue, 'BASIC');
    ctx.lock(blue);
    return { ...ctx, blue, red };
}

describe('the camera frames the fight around the anchor', () => {
    it('two adjacent fighters get the close shot', () => {
        const { run } = duel();
        expect(run(1).at(-1)).toBeCloseTo(CLOSE_Z);
    });

    it('an ultimate elsewhere does not move or widen the frame', () => {
        const plain = duel();
        plain.run(2);
        const withUlt = duel();
        const caster = withUlt.add(Team.RED, 1500);
        withUlt.cast(caster, 'ULT');
        caster.targetHex = { q: caster.q, r: caster.r };
        withUlt.lock(withUlt.blue);
        withUlt.run(2);
        expect(withUlt.frame().zoom).toBeCloseTo(plain.frame().zoom);
        expect(withUlt.frame().x).toBeCloseTo(plain.frame().x);
        expect(withUlt.frame().y).toBeCloseTo(plain.frame().y);
    });

    it('a nearby unit with no relation to the fight is not framed', () => {
        const { add, run } = duel();
        const by = add(Team.RED, 300);
        by.isMoving = true;
        expect(run(1).at(-1)).toBeCloseTo(CLOSE_Z);
    });

    it('someone attacking the anchor or its target is framed, unless beyond the fight radius', () => {
        const near = duel();
        const a1 = near.add(Team.RED, 400);
        a1.target = near.blue;
        expect(near.run(2).at(-1)!).toBeLessThan(CLOSE_Z * 0.8);

        const onTarget = duel();
        const a2 = onTarget.add(Team.BLUE, 480);
        a2.target = onTarget.red;
        expect(onTarget.run(2).at(-1)!).toBeLessThan(CLOSE_Z * 0.8);

        const far = duel();
        const a3 = far.add(Team.RED, DIRECTOR_PARAM.FIGHT_RADIUS_PX + 50);
        a3.target = far.blue;
        expect(far.run(2).at(-1)).toBeCloseTo(CLOSE_Z);
    });

    it('a target beyond the fight radius does not drag the frame out', () => {
        const ctx = arena();
        const blue = ctx.add(Team.BLUE, 0);
        const red = ctx.add(Team.RED, DIRECTOR_PARAM.FIGHT_RADIUS_PX + 50);
        blue.target = red;
        ctx.cast(blue, 'BASIC');
        ctx.lock(blue);
        expect(ctx.run(1).at(-1)).toBeCloseTo(CLOSE_Z);
        expect(ctx.frame().x).toBeCloseTo(0);
    });

    it('when the third fighter dies the shot tightens within the hold plus one blend', () => {
        const ctx = duel();
        const attacker = ctx.add(Team.RED, 500);
        attacker.target = ctx.blue;
        expect(ctx.run(2).at(-1)!).toBeLessThan(CLOSE_Z * 0.8);
        attacker.hp = 0;
        const zooms = ctx.run(DIRECTOR_PARAM.SHOT_IN_HOLD_S + DIRECTOR_PARAM.SHOT_IN_BLEND_S + 3 * TICK);
        expect(zooms.at(-1)).toBeCloseTo(CLOSE_Z);
    });

    it('an attacker that flickers on and off its target does not make the zoom pump', () => {
        const ctx = duel();
        const attacker = ctx.add(Team.RED, 400);
        attacker.target = ctx.blue;
        ctx.run(2);
        const zooms = ctx.run(6, (t) => { attacker.target = Math.floor(t / 0.3) % 2 === 0 ? ctx.blue : null; });
        expect(Math.max(...zooms) - Math.min(...zooms)).toBeLessThan(1e-6);
    });

    it('an attacker that really leaves is dropped after the linger', () => {
        const ctx = duel();
        const attacker = ctx.add(Team.RED, 400);
        attacker.target = ctx.blue;
        ctx.run(2);
        attacker.target = null;
        const zooms = ctx.run(DIRECTOR_PARAM.MEMBER_LINGER_S + DIRECTOR_PARAM.SHOT_IN_HOLD_S + DIRECTOR_PARAM.SHOT_IN_BLEND_S + 3 * TICK);
        expect(zooms.at(-1)).toBeCloseTo(CLOSE_Z);
    });

    it('a hop stays inside the camera window, so the camera does not nod', () => {
        const { blue, run, frame } = duel();
        run(1);
        const y = frame().y;
        blue.physics.z = 60;
        run(0.5);
        expect(frame().y).toBe(y);
    });
});

describe('before first contact', () => {
    it('frames everyone, then switches to the fight once anyone acts', () => {
        const ctx = arena();
        const blue = ctx.add(Team.BLUE, 0);
        ctx.add(Team.RED, 1000);
        ctx.lock(blue);
        expect(ctx.run(1).at(-1)!).toBeLessThan(CLOSE_Z * 0.5);
        expect(ctx.frame().x).toBeGreaterThan(200);

        ctx.cast(blue, 'BASIC');
        const zooms = ctx.run(DIRECTOR_PARAM.SHOT_IN_HOLD_S + DIRECTOR_PARAM.SHOT_IN_BLEND_S + 3 * TICK);
        expect(zooms.at(-1)).toBeCloseTo(CLOSE_Z);

        // 只看第一次接戰：之後收招也不會回全景
        blue.castingSkillIdx = -1;
        expect(ctx.run(2).at(-1)).toBeCloseTo(CLOSE_Z);
    });

    it('being hit also counts as contact', () => {
        const ctx = arena();
        const blue = ctx.add(Team.BLUE, 0);
        ctx.add(Team.RED, 1000);
        ctx.lock(blue);
        ctx.run(1);
        blue.view.hitFlashTimer = 0.2;
        const zooms = ctx.run(DIRECTOR_PARAM.SHOT_IN_HOLD_S + DIRECTOR_PARAM.SHOT_IN_BLEND_S + 3 * TICK);
        expect(zooms.at(-1)).toBeCloseTo(CLOSE_Z);
    });
});

describe('switching the anchor', () => {
    function acrossTheMap() {
        const ctx = arena();
        const blue = ctx.add(Team.BLUE, 0);
        const red = ctx.add(Team.RED, 800);
        ctx.cast(blue, 'BASIC');
        ctx.lock(blue);
        ctx.run(1);
        blue.castingSkillIdx = -1;
        return { ...ctx, blue, red };
    }

    it('an ultimate cuts in after ULT_CUT_HOLD_S, other actions wait for MIN_HOLD_S', () => {
        const ctx = acrossTheMap();
        ctx.engine.state.director.focusTimer = DIRECTOR_PARAM.MIN_HOLD_S;
        ctx.cast(ctx.red, 'ULT');
        ctx.run(DIRECTOR_PARAM.ULT_CUT_HOLD_S * 0.5);
        expect(ctx.engine.state.director.targetId).toBe(ctx.blue.id);
        ctx.run(DIRECTOR_PARAM.ULT_CUT_HOLD_S * 0.5 + 2 * TICK);
        expect(ctx.engine.state.director.targetId).toBe(ctx.red.id);

        const other = acrossTheMap();
        other.engine.state.director.focusTimer = DIRECTOR_PARAM.MIN_HOLD_S;
        other.cast(other.red, 'ACTIVE');
        other.run(DIRECTOR_PARAM.ULT_CUT_HOLD_S + 2 * TICK);
        expect(other.engine.state.director.targetId).toBe(other.blue.id);
    });

    it('the focus travels in one eased move, the zoom stays, and the old anchor does not linger in the frame', () => {
        const ctx = acrossTheMap();
        ctx.engine.state.director.focusTimer = 0;
        ctx.cast(ctx.red, 'ACTIVE');
        const xs: number[] = [];
        const zooms = ctx.run(DIRECTOR_PARAM.SWITCH_BLEND_S + 0.1, () => { xs.push(ctx.frame().x); });
        expect(ctx.engine.state.director.targetId).toBe(ctx.red.id);
        const worst = Math.max(...xs.slice(1).map((x, i) => Math.abs(x - xs[i])));
        expect(worst).toBeLessThan(800 * 1.5 * TICK / DIRECTOR_PARAM.SWITCH_BLEND_S + 1);
        expect(Math.max(...zooms) - Math.min(...zooms)).toBeLessThan(1e-6);
        const windowX = DIRECTOR_PARAM.WINDOW_X * W / CLOSE_Z;
        expect(Math.abs(ctx.frame().x - 800)).toBeLessThanOrEqual(windowX + 1);
    });
});

describe('safety', () => {
    it('zoom never jumps while units come and go', () => {
        const ctx = duel();
        const a1 = ctx.add(Team.RED, 500);
        const a2 = ctx.add(Team.RED, -600);
        const zooms = ctx.run(10, (t) => {
            a1.target = Math.floor(t / 1.7) % 2 === 0 ? ctx.blue : null;
            a2.target = Math.floor(t / 2.3) % 2 === 0 ? ctx.blue : null;
        });
        const limit = 1.5 * Math.log(UI_SETTINGS.CAMERA_ZOOM.directorMax / UI_SETTINGS.CAMERA_ZOOM.directorMin) / DIRECTOR_PARAM.SHOT_OUT_BLEND_S * TICK + 1e-9;
        for (let i = 1; i < zooms.length; i++) {
            expect(Math.abs(Math.log(zooms[i] / zooms[i - 1]))).toBeLessThanOrEqual(limit);
        }
    });

    it('reset starts clean: the next frame lands directly and first contact is forgotten', () => {
        const ctx = duel();
        ctx.run(1);
        ctx.engine.director.reset(ctx.engine);
        ctx.blue.castingSkillIdx = -1;
        ctx.blue.target = null;
        ctx.red.target = null;
        ctx.red.px = 1000;
        ctx.lock(ctx.blue);
        const zooms = ctx.run(TICK);
        expect(zooms[0]).toBeLessThan(CLOSE_Z * 0.5);
    });

    it('with nobody eligible the frame stays finite', () => {
        const { blue, red, run, frame } = duel();
        run(0.5);
        blue.hp = 0;
        red.hp = 0;
        run(0.5);
        expect(Number.isFinite(frame().x)).toBe(true);
        expect(Number.isFinite(frame().y)).toBe(true);
        expect(Number.isFinite(frame().zoom)).toBe(true);
    });
});
