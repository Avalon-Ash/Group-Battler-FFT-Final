import { describe, it, expect } from 'vitest';
import { VFX_REGISTRY } from '../data/vfx/VFXRegistry';
import { DEATH_VFX } from '../constants';

// VFXPhysics 以 pow(1 - drag, dt * 60) 衰減粒子速度。drag >= 1 時底數 <= 0，
// 非整數指數會得到 NaN → 粒子座標 NaN → RenderList 的排序鍵 NaN → 整個場景的繪製順序被破壞（畫面狂閃）。
// 曾發生：DEATH_VFX.PUFF_DRAG = 1.5（死亡塵煙）。
function collectDrags(node: unknown, path: string, out: { path: string; value: number }[]) {
    if (Array.isArray(node)) {
        node.forEach((v, i) => collectDrags(v, `${path}[${i}]`, out));
    } else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
            if (k === 'drag' && typeof v === 'number') out.push({ path: `${path}.${k}`, value: v });
            else collectDrags(v, `${path}.${k}`, out);
        }
    }
}

describe('particle drag range', () => {
    it('every registry drag is in [0, 1)', () => {
        const drags: { path: string; value: number }[] = [];
        collectDrags(VFX_REGISTRY, 'VFX_REGISTRY', drags);
        expect(drags.length).toBeGreaterThan(0);
        expect(drags.filter(d => !(d.value >= 0 && d.value < 1))).toEqual([]);
    });

    it('DEATH_VFX.PUFF_DRAG is in [0, 1) and yields a finite decay factor', () => {
        expect(DEATH_VFX.PUFF_DRAG).toBeGreaterThanOrEqual(0);
        expect(DEATH_VFX.PUFF_DRAG).toBeLessThan(1);
        for (const dt of [1 / 240, 1 / 144, 1 / 60, 0.0167, 0.05]) {
            expect(Number.isFinite(Math.pow(1 - DEATH_VFX.PUFF_DRAG, dt * 60))).toBe(true);
        }
    });
});
