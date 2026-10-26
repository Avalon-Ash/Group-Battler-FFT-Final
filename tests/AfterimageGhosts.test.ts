import { describe, it, expect, afterEach } from 'vitest';
import { AFTERIMAGE, VFX_PARAM } from '../constants';
import { computeAfterimageGhosts, createGhostSlots, TrailPoint } from '../engine/renderers/frame/Afterimage';
import { UnitFrameStore } from '../engine/renderers/frame/UnitFrame';
import { GameEngine } from '../engine/game';
import { Role, Team } from '../types';

const FAST_SQ = (VFX_PARAM.SPEED_TILT_THRESHOLD * 2) ** 2;
const flat = (_x: number, _y: number) => 0;

function line(n: number, stepX: number, y = 100, z = 0): TrailPoint[] {
    // 最舊在前，最後一點＝單位目前位置
    return Array.from({ length: n }, (_, i) => ({ x: i * stepX, y, z, h: 0 }));
}

describe('computeAfterimageGhosts', () => {
    it('maps world trail points to offsets from the current foot', () => {
        const trail = line(12, 10);                       // 最後一點 x=110
        const footX = 110, footY = 100;
        const out = createGhostSlots();
        const n = computeAfterimageGhosts(out, trail, FAST_SQ, footX, footY, 0, flat);
        expect(n).toBeGreaterThan(0);
        // 最近的殘影：往回 STRIDE 個點
        expect(out[0].dx).toBeCloseTo(-10 * AFTERIMAGE.STRIDE);
        expect(out[0].dy).toBeCloseTo(0);
        // 越遠越靠後、越淡
        expect(out[1].dx).toBeLessThan(out[0].dx);
        expect(out[1].alpha).toBeLessThan(out[0].alpha);
    });

    it('uses the render ground height at the ghost, relative to the unit floor (float bob and climbs included)', () => {
        const trail = line(12, 10);
        const footX = 110, footY = 100, groundH = 20;
        // 單位站在高度 20，殘影所在位置的繪製高度 26（漂浮 +6 不影響單位以外的格）
        const out = createGhostSlots();
        computeAfterimageGhosts(out, trail, FAST_SQ, footX, footY, groundH, () => 26);
        // 殘影腳底繪製 Y = 100 - 26；單位 floorY = 100 - 20；差 = -6
        expect(out[0].dy).toBeCloseTo(-6);
    });

    it('carries the ghost physics.z', () => {
        const trail = line(12, 10, 100, 33);
        const out = createGhostSlots();
        computeAfterimageGhosts(out, trail, FAST_SQ, 110, 100, 0, flat);
        expect(out[0].z).toBe(33);
    });

    it('produces nothing below the speed threshold', () => {
        const out = createGhostSlots();
        const slow = (VFX_PARAM.SPEED_TILT_THRESHOLD * 0.9) ** 2;
        expect(computeAfterimageGhosts(out, line(12, 10), slow, 110, 100, 0, flat)).toBe(0);
    });

    it('skips points that sit under the body and never exceeds the slot count', () => {
        const out = createGhostSlots();
        const stationary = line(15, 0.1);                 // 全部疊在本體上
        expect(computeAfterimageGhosts(out, stationary, FAST_SQ, 1.4, 100, 0, flat)).toBe(0);
        const n = computeAfterimageGhosts(out, line(15, 40), FAST_SQ, 560, 100, 0, flat);
        expect(n).toBeLessThanOrEqual(AFTERIMAGE.MAX_GHOSTS);
        expect(out.length).toBe(AFTERIMAGE.MAX_GHOSTS);
    });

    it('does not stack ghosts on the same spot (hovering flyer)', () => {
        const out = createGhostSlots();
        const hover: TrailPoint[] = Array.from({ length: 15 }, () => ({ x: 0, y: 100, z: 40, h: 0 }));
        // 單位剛飛離到 x=80：所有軌跡點都在原地，只能得到一個殘影
        const n = computeAfterimageGhosts(out, hover, FAST_SQ, 80, 100, 0, flat);
        expect(n).toBe(1);
        expect(out[0].dx).toBeCloseTo(-80);
    });

    it('returns 0 for a trail that is too short', () => {
        const out = createGhostSlots();
        expect(computeAfterimageGhosts(out, line(2, 40), FAST_SQ, 40, 100, 0, flat)).toBe(0);
    });
});

describe('UnitFrameStore afterimage linger', () => {
    let engine: GameEngine | undefined;
    afterEach(() => { engine?.stop(); engine?.clear(); });

    function setup(speed = AFTERIMAGE.LINGER_MIN_PEAK_SPEED + 100) {
        engine = new GameEngine();
        engine.map.obstacles.clear();
        engine.map.obstaclesHash.clear();
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 200, Role.WARRIOR)!;
        a.px = 110; a.py = 100;
        a.physics.vx = speed;
        a.trailHistory = line(12, 10, 100, 33);
        const store = new UnitFrameStore();
        const build = (time: number, agents = [a], height = 20) => {
            store.build(agents, () => height, engine!.mapConfig, 0, 'IDLE', undefined, time);
            return store.get(a);
        };
        return { a, store, build };
    }

    it('fades monotonically to zero after LINGER_SEC, and freezes with battle time', () => {
        const { a, build } = setup();
        expect(build(1)!.ghostCount).toBeGreaterThan(0);
        a.physics.vx = 0;
        const start = build(1.1)!.ghosts[0].alpha;
        const half = build(1.1 + AFTERIMAGE.LINGER_SEC / 2)!.ghosts[0].alpha;
        expect(half).toBeCloseTo(start / 2);
        expect(build(1.1 + AFTERIMAGE.LINGER_SEC / 2)!.ghosts[0].alpha).toBe(half);
        expect(build(1.1 + AFTERIMAGE.LINGER_SEC * 0.9)!.ghosts[0].alpha).toBeLessThan(half);
        expect(build(1.1 + AFTERIMAGE.LINGER_SEC + 0.001)!.ghostCount).toBe(0);
    });

    it('keeps world x, drawing y and z fixed when the unit moves and ground height changes', () => {
        const { a, build } = setup();
        const f = build(1)!;
        const x = f.footX + f.ghosts[0].dx;
        const y = f.floorY + f.ghosts[0].dy;
        const z = f.ghosts[0].z;
        a.physics.vx = 0;
        build(1.1);
        a.px += 40; a.py += 25;
        a.trailHistory.length = 0;
        const next = build(1.2, [a], 45)!;
        expect(next.ghostCount).toBeGreaterThan(0);
        expect(next.footX + next.ghosts[0].dx).toBeCloseTo(x);
        expect(next.floorY + next.ghosts[0].dy).toBeCloseTo(y);
        expect(next.ghosts[0].z).toBe(z);
    });

    it('does not linger for a low peak speed trail', () => {
        const { a, build } = setup(AFTERIMAGE.LINGER_MIN_PEAK_SPEED - 1);
        expect(build(1)!.ghostCount).toBeGreaterThan(0);
        a.physics.vx = 0;
        expect(build(1.1)!.ghostCount).toBe(0);
    });

    it('cleans removed state even when the next roster has the same size', () => {
        const { a, store, build } = setup();
        build(1);
        const other = engine!.agentManager.addAgent(engine!, Team.RED, 1, 0, 200, Role.WARRIOR)!;
        build(1.1, [other]);
        expect(store['afterimages'].size).toBe(0);
        a.physics.vx = 0; a.trailHistory.length = 0;
        expect(build(1.2)!.ghostCount).toBe(0);
    });

    it.each(['death', 'fullyDead', 'polymorph', 'drag', 'hidden'] as const)('clears state on %s', kind => {
        const { a, store, build } = setup();
        build(1);
        if (kind === 'death') a.hp = 0;
        if (kind === 'fullyDead') a.fullyDead = true;
        if (kind === 'polymorph') a.view.visualStatus = 'POLYMORPH';
        if (kind === 'drag') a.dragOverQ = 0;
        if (kind === 'hidden') a.outOfBounds = true;
        expect(build(1.1)!.ghostCount).toBe(0);
        expect(store['afterimages'].size).toBe(0);
    });

    it('replaces an old lingering trail when a new burst starts, reusing slots', () => {
        const { a, store, build } = setup();
        build(1);
        const slots = store['afterimages'].get(a)!.slots;
        a.physics.vx = 0; build(1.1);
        a.px += 300;
        a.trailHistory = line(12, 10).map(p => ({ ...p, x: p.x + 300 }));
        a.physics.vx = AFTERIMAGE.LINGER_MIN_PEAK_SPEED + 100;
        build(1.2);
        expect(store['afterimages'].get(a)!.slots).toBe(slots);
        a.physics.vx = 0;
        const f = build(1.3)!;
        expect(f.footX + f.ghosts[0].dx).toBeGreaterThan(300);
        expect(f.ghosts[0].alpha).toBe(AFTERIMAGE.ALPHA_NEAREST);
    });

    it('clears remembered trails when battle time resets', () => {
        const { a, build, store } = setup();
        build(2);
        a.physics.vx = 0;
        build(2.1);
        expect(build(0)!.ghostCount).toBe(0);
        expect(store['afterimages'].size).toBe(0);
    });
});
