import { describe, it, expect } from 'vitest';
import { riseOffsetAt, partAnimEase } from '../engine/presentation/vfx/partAnimEase';
import { VFXPhysics } from '../engine/presentation/vfx/VFXPhysics';
import { VFXStateManager } from '../engine/presentation/vfx/state';

const newParticle = () => new VFXStateManager().getParticle();

// 零件高度路徑（PartAnim.rise，ULT-V01）：關鍵影格內插與 VFXPhysics 的套用
describe('PartAnim.rise', () => {
    const keys = [{ at: 0, z: 100 }, { at: 0.4, z: 150 }, { at: 0.5, z: 0, ease: 'in' as const }, { at: 1, z: 0 }];

    it('clamps before the first and after the last key, and hits every key exactly', () => {
        expect(riseOffsetAt(keys, -1)).toBe(100);
        expect(riseOffsetAt(keys, 0)).toBe(100);
        expect(riseOffsetAt(keys, 0.4)).toBeCloseTo(150, 9);
        expect(riseOffsetAt(keys, 0.5)).toBeCloseTo(0, 9);
        expect(riseOffsetAt(keys, 2)).toBe(0);
        expect(riseOffsetAt([], 0.5)).toBe(0);
    });

    it('uses the target key ease for each segment', () => {
        // 0.4→0.5 是 ease in（慢起快收）：段中點仍接近起點高度
        const mid = riseOffsetAt(keys, 0.45);
        expect(mid).toBeCloseTo(150 + (0 - 150) * partAnimEase(0.5, 'in'), 9);
        expect(mid).toBeGreaterThan(75);
    });

    it('drives particle z from spawnZ by life progress instead of integrating vz', () => {
        const p = newParticle();
        p.type = 'PART';
        p.partAnim = { rise: keys };
        p.spawnZ = 20;
        p.vz = 999;
        p.maxLife = 1;
        p.life = 0.6; // 進度 0.4
        VFXPhysics.update(p, 1 / 60);
        expect(p.z).toBeCloseTo(170, 6);
    });

    it('ground-anchored particles add the offset to the current ground height', () => {
        const p = newParticle();
        p.type = 'PART';
        p.partAnim = { rise: keys };
        p.groundAnchored = true;
        p.spawnZ = 0;
        p.maxLife = 1;
        p.life = 1; // 進度 0
        VFXPhysics.update(p, 1 / 60, () => ({ height: 48, isValid: true }));
        expect(p.z).toBeCloseTo(148, 6);
    });
});
