import { describe, it, expect, vi } from 'vitest';

// 光束一律掛零件：零件烘焙要 DOM canvas，本測試只看座標空間，關掉烘焙（同 RngSplit.test.ts）
vi.mock('../engine/renderers/vfxparts/VFXPartStore', async (orig) => ({
    ...(await orig<typeof import('../engine/renderers/vfxparts/VFXPartStore')>()),
    vfxPartStore: { get: () => undefined },
}));
import { VFXSystem } from '../engine/presentation/vfx';
import { ISO_SCALE_Y } from '../constants';

// 粒子的 p.y 是「未投影 Y」（螢幕 Y / ISO_SCALE_Y），VFXRenderer 提交時乘回（RenderSpec §3）。
// playBeam 曾直接存螢幕 Y，光束整條畫在 0.5 倍 Y 的位置：起終點離投影中心 42～59 px（高低差／飛行最明顯）。
describe('beam particle coordinate space', () => {
    it('stores the anchor y unprojected and keeps screen-space endpoints for the painter', () => {
        const vfx = new VFXSystem();
        const start = { x: 120, y: 260, z: 140 };
        const end = { x: 300, y: 340, z: 60 };
        vfx.playBeam('GENERIC_BEAM', start, end, '#fff', 0.4);
        const p = vfx.state.particles[vfx.state.particles.length - 1];
        expect(p.y * ISO_SCALE_Y).toBeCloseTo(start.y, 6); // 提交後的足跡 Y＝起點螢幕 Y
        expect(p.sy).toBe(start.y);
        expect(p.ty).toBe(end.y);
    });
});
