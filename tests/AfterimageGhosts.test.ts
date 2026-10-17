import { describe, it, expect } from 'vitest';
import { AFTERIMAGE, VFX_PARAM } from '../constants';
import { computeAfterimageGhosts, createGhostSlots, TrailPoint } from '../engine/renderers/frame/Afterimage';

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
