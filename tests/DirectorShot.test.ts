import { describe, expect, it } from 'vitest';
import { CameraWindow, FocusBlend, ShotZoomController, fitZoom, measureMembers, shotZoom } from '../engine/presentation/DirectorShot';
import { DIRECTOR_PARAM, UI_SETTINGS } from '../constants';
import type { ShotExtent } from '../types';

const TICK = 1 / 60;
const PHONE = { W: 393, H: 852 };
const DESKTOP = { W: 1920, H: 1080 };
const { UNIT_MARGIN_PX: MARGIN, FRAME_PADDING: PAD, SHOT_RADIUS_PX: RADIUS } = DIRECTOR_PARAM;
const { directorMin: Z_MIN, directorMax: Z_MAX } = UI_SETTINGS.CAMERA_ZOOM;

/** 範圍剛好讓 fitZoom 等於 zoom（手機版面，由寬度決定） */
function extentFor(zoom: number): ShotExtent {
    const half = PHONE.W / 2 / zoom / PAD;
    return { cx: 0, cy: 0, halfW: half, halfH: half };
}

function step(c: ShotZoomController, ext: ShotExtent, seconds: number, screen = PHONE): number[] {
    const out: number[] = [];
    for (let t = 0; t < seconds - 1e-9; t += TICK) out.push(c.update(ext, screen.W, screen.H, TICK));
    return out;
}

describe('measureMembers', () => {
    it('returns null with nobody to frame', () => {
        expect(measureMembers([])).toBeNull();
    });

    it('centres on the weighted centroid and measures to the far edge of each axis', () => {
        const ext = measureMembers([{ x: 0, y: 0, weight: 1 }, { x: 170, y: 340, weight: 0.7 }])!;
        expect(ext.cx).toBeCloseTo(70);
        expect(ext.cy).toBeCloseTo(140);
        expect(ext.halfW).toBeCloseTo(100 + MARGIN);
        expect(ext.halfH).toBeCloseTo(200 + MARGIN);
    });
});

describe('fitZoom', () => {
    it('checks width and height separately: a vertical pair on a portrait screen is not limited by the short side', () => {
        const ext: ShotExtent = { cx: 0, cy: 0, halfW: MARGIN, halfH: 300 + MARGIN };
        expect(fitZoom(ext, PHONE.W, PHONE.H)).toBeCloseTo(PHONE.H / 2 / (ext.halfH * PAD));
        const sideways: ShotExtent = { cx: 0, cy: 0, halfW: 300 + MARGIN, halfH: MARGIN };
        expect(fitZoom(sideways, PHONE.W, PHONE.H)).toBeCloseTo(PHONE.W / 2 / (sideways.halfW * PAD));
    });

    it('stays inside the director zoom range', () => {
        expect(fitZoom({ cx: 0, cy: 0, halfW: 1, halfH: 1 }, PHONE.W, PHONE.H)).toBe(Z_MAX);
        expect(fitZoom({ cx: 0, cy: 0, halfW: 99999, halfH: 99999 }, PHONE.W, PHONE.H)).toBe(Z_MIN);
    });
});

describe('shotZoom', () => {
    it('is half the short side over the shot radius, clamped to the director range', () => {
        expect(shotZoom('CLOSE', PHONE.W, PHONE.H)).toBeCloseTo(PHONE.W / 2 / RADIUS.CLOSE);
        expect(shotZoom('MID', PHONE.W, PHONE.H)).toBeCloseTo(PHONE.W / 2 / RADIUS.MID);
        expect(shotZoom('CLOSE', DESKTOP.W, DESKTOP.H)).toBe(Z_MAX);
        expect(shotZoom('WIDE', 200, 200)).toBe(Z_MIN);
    });
});

describe('ShotZoomController', () => {
    const closeZ = shotZoom('CLOSE', PHONE.W, PHONE.H);
    const midZ = shotZoom('MID', PHONE.W, PHONE.H);
    const wideZ = shotZoom('WIDE', PHONE.W, PHONE.H);
    const tight = extentFor(closeZ * 2);

    it('the first update lands on the tightest shot that fits, with no blend', () => {
        const c = new ShotZoomController();
        expect(c.update(tight, PHONE.W, PHONE.H, TICK)).toBeCloseTo(closeZ);
        expect(c.shot).toBe('CLOSE');
        const c2 = new ShotZoomController();
        expect(c2.update(extentFor(midZ * 1.01), PHONE.W, PHONE.H, TICK)).toBeCloseTo(midZ);
        expect(c2.shot).toBe('MID');
    });

    it('reset forgets the shot, so the next update lands directly again', () => {
        const c = new ShotZoomController();
        step(c, tight, 1);
        c.reset();
        expect(c.update(extentFor(midZ * 1.01), PHONE.W, PHONE.H, TICK)).toBeCloseTo(midZ);
    });

    it('widens only after the subjects stop fitting for the out hold', () => {
        const c = new ShotZoomController();
        step(c, tight, 1);
        const big = extentFor(midZ * 1.01);
        step(c, big, DIRECTOR_PARAM.SHOT_OUT_HOLD_S * 0.5);
        expect(c.shot).toBe('CLOSE');
        expect(c.zoom).toBeCloseTo(closeZ);
        step(c, tight, 0.1);
        step(c, big, DIRECTOR_PARAM.SHOT_OUT_HOLD_S * 0.5);
        expect(c.shot).toBe('CLOSE');
        step(c, big, DIRECTOR_PARAM.SHOT_OUT_HOLD_S + TICK);
        expect(c.shot).toBe('MID');
    });

    it('a subject slightly past the shot stays put until the out margin', () => {
        const c = new ShotZoomController();
        step(c, tight, 1);
        step(c, extentFor(closeZ * DIRECTOR_PARAM.SHOT_OUT_MARGIN * 1.01), 2);
        expect(c.shot).toBe('CLOSE');
        step(c, extentFor(closeZ * DIRECTOR_PARAM.SHOT_OUT_MARGIN * 0.99), DIRECTOR_PARAM.SHOT_OUT_HOLD_S + TICK);
        expect(c.shot).toBe('MID');
    });

    it('one widening is a single monotonic ease that ends on the new shot', () => {
        const c = new ShotZoomController();
        step(c, tight, 1);
        const big = extentFor(midZ * 1.01);
        const zooms = step(c, big, DIRECTOR_PARAM.SHOT_OUT_HOLD_S + DIRECTOR_PARAM.SHOT_OUT_BLEND_S + 2 * TICK);
        for (let i = 1; i < zooms.length; i++) expect(zooms[i]).toBeLessThanOrEqual(zooms[i - 1] + 1e-9);
        expect(zooms.at(-1)).toBeCloseTo(midZ);
        // 緩進緩出：中段比頭尾快
        const moved = zooms.filter(z => z < closeZ - 1e-9);
        const steps = moved.slice(1).map((z, i) => Math.abs(Math.log(z / moved[i])));
        const peak = Math.max(...steps);
        expect(steps[0]).toBeLessThan(peak * 0.5);
        expect(steps.at(-1)!).toBeLessThan(peak * 0.5);
    });

    it('tightens only with the margin, held for the in hold', () => {
        const c = new ShotZoomController();
        step(c, extentFor(midZ * 1.01), 1);
        expect(c.shot).toBe('MID');
        // 剛好放得下特寫但沒有餘裕：不動
        step(c, extentFor(closeZ * 1.01), DIRECTOR_PARAM.SHOT_IN_HOLD_S * 3);
        expect(c.shot).toBe('MID');
        const roomy = extentFor(closeZ * DIRECTOR_PARAM.SHOT_IN_MARGIN * 1.01);
        step(c, roomy, DIRECTOR_PARAM.SHOT_IN_HOLD_S * 0.5);
        expect(c.shot).toBe('MID');
        step(c, extentFor(midZ * 1.01), 0.1);
        step(c, roomy, DIRECTOR_PARAM.SHOT_IN_HOLD_S * 0.5);
        expect(c.shot).toBe('MID');
        step(c, roomy, DIRECTOR_PARAM.SHOT_IN_HOLD_S + TICK);
        expect(c.shot).toBe('CLOSE');
        const zooms = step(c, roomy, DIRECTOR_PARAM.SHOT_IN_BLEND_S + 2 * TICK);
        for (let i = 1; i < zooms.length; i++) expect(zooms[i]).toBeGreaterThanOrEqual(zooms[i - 1] - 1e-9);
        expect(zooms.at(-1)).toBeCloseTo(closeZ);
    });

    it('after a shot change it waits before tightening again, but can still widen', () => {
        const c = new ShotZoomController();
        step(c, tight, 1);
        step(c, extentFor(midZ * 1.01), DIRECTOR_PARAM.SHOT_OUT_HOLD_S + TICK);
        expect(c.shot).toBe('MID');
        step(c, tight, DIRECTOR_PARAM.SHOT_MIN_HOLD_S - TICK * 2);
        expect(c.shot).toBe('MID');
        step(c, extentFor(wideZ * 1.01), DIRECTOR_PARAM.SHOT_OUT_HOLD_S + TICK);
        expect(c.shot).toBe('WIDE');
        step(c, tight, DIRECTOR_PARAM.SHOT_MIN_HOLD_S + DIRECTOR_PARAM.SHOT_IN_HOLD_S + TICK);
        expect(c.shot).toBe('CLOSE');
    });

    it('a subject hovering around a shot boundary does not make the shot flip', () => {
        const c = new ShotZoomController();
        step(c, tight, 1);
        const changes = new Set<string>();
        for (let i = 0; i < 600; i++) {
            // 範圍在特寫邊界兩側晃，每次都短於拉遠的等待
            const ext = extentFor(closeZ * (Math.floor(i / 6) % 2 === 0 ? 0.98 : 1.02));
            c.update(ext, PHONE.W, PHONE.H, TICK);
            changes.add(c.shot);
        }
        expect([...changes]).toEqual(['CLOSE']);
    });

    it('a change during a blend continues from where the zoom is, with no jump', () => {
        const c = new ShotZoomController();
        step(c, tight, 1);
        const big = extentFor(midZ * 1.01);
        const out = step(c, big, DIRECTOR_PARAM.SHOT_OUT_HOLD_S + DIRECTOR_PARAM.SHOT_OUT_BLEND_S * 0.5);
        const huge = extentFor(wideZ * 1.01);
        const more = step(c, huge, DIRECTOR_PARAM.SHOT_OUT_HOLD_S + TICK);
        expect(c.shot).toBe('WIDE');
        const all = [...out, ...more];
        const worst = Math.max(...all.slice(1).map((z, i) => Math.abs(Math.log(z / all[i]))));
        expect(worst).toBeLessThan(0.03);
    });

    it('the wide shot follows a growing extent below its own zoom, at the rate limit', () => {
        const c = new ShotZoomController();
        const desktop = (zoom: number): ShotExtent => {
            const half = DESKTOP.H / 2 / zoom / PAD;
            return { cx: 0, cy: 0, halfW: half, halfH: half };
        };
        const wide = shotZoom('WIDE', DESKTOP.W, DESKTOP.H);
        step(c, desktop(wide * 0.99), 1, DESKTOP);
        expect(c.shot).toBe('WIDE');
        const start = c.zoom;
        expect(start).toBeCloseTo(wide * 0.99);
        const zooms = step(c, desktop(wide * 0.6), 0.5, DESKTOP);
        const limit = DIRECTOR_PARAM.WIDE_ZOOM_RATE_PER_S * TICK + 1e-9;
        const all = [start, ...zooms];
        for (let i = 1; i < all.length; i++) expect(Math.abs(Math.log(all[i] / all[i - 1]))).toBeLessThanOrEqual(limit);
        expect(zooms.at(-1)!).toBeLessThan(start);
    });

    it('tightening compares the unclamped fit: on a desktop the close shot sits at the zoom cap and is still reachable', () => {
        const c = new ShotZoomController();
        const wide = shotZoom('WIDE', DESKTOP.W, DESKTOP.H);
        const half = (zoom: number) => DESKTOP.H / 2 / zoom / PAD;
        step(c, { cx: 0, cy: 0, halfW: half(wide), halfH: half(wide) }, 1, DESKTOP);
        expect(c.shot).toBe('WIDE');
        step(c, { cx: 0, cy: 0, halfW: 100, halfH: 100 }, DIRECTOR_PARAM.SHOT_IN_HOLD_S + DIRECTOR_PARAM.SHOT_IN_BLEND_S + 2 * TICK, DESKTOP);
        expect(c.shot).toBe('CLOSE');
        expect(c.zoom).toBeCloseTo(Z_MAX);
    });

    it('never leaves the director zoom range', () => {
        const c = new ShotZoomController();
        const zooms = [
            ...step(c, { cx: 0, cy: 0, halfW: 99999, halfH: 99999 }, 2),
            ...step(c, { cx: 0, cy: 0, halfW: 1, halfH: 1 }, 2),
        ];
        for (const z of zooms) {
            expect(z).toBeGreaterThanOrEqual(Z_MIN);
            expect(z).toBeLessThanOrEqual(Z_MAX);
        }
    });
});

describe('CameraWindow', () => {
    const zoom = 1;
    const halfX = DIRECTOR_PARAM.WINDOW_X * PHONE.W;
    const halfY = DIRECTOR_PARAM.WINDOW_Y * PHONE.W;

    it('the first update lands on the focus', () => {
        const w = new CameraWindow();
        expect(w.update(100, 200, zoom, PHONE.W, PHONE.H)).toEqual({ x: 100, y: 200 });
    });

    it('does not move while the focus stays inside the window', () => {
        const w = new CameraWindow();
        w.update(0, 0, zoom, PHONE.W, PHONE.H);
        expect(w.update(halfX - 1, -(halfY - 1), zoom, PHONE.W, PHONE.H)).toEqual({ x: 0, y: 0 });
    });

    it('a focus past the edge pushes the camera just enough to keep it on the edge', () => {
        const w = new CameraWindow();
        w.update(0, 0, zoom, PHONE.W, PHONE.H);
        const p = w.update(halfX + 30, -(halfY + 40), zoom, PHONE.W, PHONE.H);
        expect(p.x).toBeCloseTo(30);
        expect(p.y).toBeCloseTo(-40);
        const back = w.update(30 - halfX + 1, -40, zoom, PHONE.W, PHONE.H);
        expect(back).toEqual(p);
    });

    it('the window is in screen space: zooming in makes it smaller in the world', () => {
        const w = new CameraWindow();
        w.update(0, 0, 2, PHONE.W, PHONE.H);
        const p = w.update(halfX, 0, 2, PHONE.W, PHONE.H);
        expect(p.x).toBeCloseTo(halfX / 2);
    });

    it('allows more vertical than horizontal drift, so a hop does not nod the camera', () => {
        expect(DIRECTOR_PARAM.WINDOW_Y).toBeGreaterThan(DIRECTOR_PARAM.WINDOW_X);
    });

    it('reset forgets the position', () => {
        const w = new CameraWindow();
        w.update(0, 0, zoom, PHONE.W, PHONE.H);
        w.reset();
        expect(w.update(500, 500, zoom, PHONE.W, PHONE.H)).toEqual({ x: 500, y: 500 });
    });
});

describe('FocusBlend', () => {
    it('passes the focus through when no switch is running', () => {
        const b = new FocusBlend();
        expect(b.apply(10, 20, TICK)).toEqual({ x: 10, y: 20 });
    });

    it('eases from the old point to the live focus, without a jump, and ends on it', () => {
        const b = new FocusBlend();
        b.begin(0, 0);
        const xs: number[] = [];
        for (let t = 0; t < DIRECTOR_PARAM.SWITCH_BLEND_S + 2 * TICK; t += TICK) xs.push(b.apply(600, 0, TICK).x);
        expect(xs[0]).toBeLessThan(600 * 0.01);
        for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]);
        const worst = Math.max(...xs.slice(1).map((x, i) => x - xs[i]));
        expect(worst).toBeLessThan(600 * 1.5 * TICK / DIRECTOR_PARAM.SWITCH_BLEND_S + 1e-6);
        expect(xs.at(-1)).toBe(600);
        expect(b.apply(650, 0, TICK).x).toBe(650);
    });

    it('a new switch during a blend starts from the point given, and reset ends the blend', () => {
        const b = new FocusBlend();
        b.begin(0, 0);
        b.apply(600, 0, DIRECTOR_PARAM.SWITCH_BLEND_S / 2);
        b.begin(300, 0);
        expect(b.apply(900, 0, TICK).x).toBeLessThan(300 + 600 * 0.01);
        b.reset();
        expect(b.apply(900, 0, TICK).x).toBe(900);
    });
});
