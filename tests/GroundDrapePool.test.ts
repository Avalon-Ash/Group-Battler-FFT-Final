import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GroundDrapeLayer } from '../engine/renderers/GroundDrape';
import { GROUND_DRAPE } from '../constants';
import type { RenderOp } from '../engine/renderers/RenderList';
import type { Agent } from '../engine/core/Agent';

// 遮罩是另一個模組的快取，這裡只數平面自己的畫布
vi.mock('../engine/renderers/DrapeHexMask', () => ({ applyHexMask: () => true, tileMaskColor: () => 0 }));

interface FakeCanvas { width: number; height: number; getContext: () => unknown }

const noopCtx = (): unknown => new Proxy({}, {
    get: (_t, prop) => (prop === 'getTransform' ? () => ({ a: 2, b: 0 }) : () => undefined),
    set: () => true,
});

describe('GroundDrape plane surfaces', () => {
    let created: FakeCanvas[] = [];
    const agent = {} as Agent;
    const painter = vi.fn();
    const op = { z: 0, tsize: 48, th: 0, ty: 0, y: 0, tx: 0, tq: 0, tr: 0 } as unknown as RenderOp;
    const ctx = noopCtx() as CanvasRenderingContext2D;

    beforeEach(() => {
        created = [];
        vi.stubGlobal('document', {
            createElement: () => {
                const c: FakeCanvas = { width: 0, height: 0, getContext: noopCtx };
                created.push(c);
                return c;
            },
        });
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    /** 一幀：planeCount 個懸空平面，前面先排 leading 個貼頂面特效，讓平面落在不同的登記位置 */
    function frame(layer: GroundDrapeLayer, leading: number, planeCount: number): void {
        layer.begin();
        for (let i = 0; i < leading; i++) layer.addPainted(painter, agent, 0, 0, 40);
        for (let i = 0; i < planeCount; i++) layer.addPlane(painter, agent, 0, 0, 40, 10, 5, 5);
        layer.drawOnTile(ctx, op, 0, 0, 'FLAT_TOPPED' as never, 0);
    }

    const planeCanvases = () => created.filter(c => c.width > 0).length;

    it('a plane that moves to another slot reuses its surface instead of opening a new one', () => {
        const layer = new GroundDrapeLayer();
        frame(layer, 0, 1);
        frame(layer, 1, 1);
        const settled = created.length;
        for (let i = 0; i < 40; i++) frame(layer, i % 8, 1);
        expect(created.length).toBe(settled);
    });

    it('the number of surfaces follows how many planes are up at once', () => {
        const single = new GroundDrapeLayer();
        frame(single, 0, 1);
        const one = created.length;
        created = [];
        const triple = new GroundDrapeLayer();
        frame(triple, 0, 3);
        expect(created.length).toBeGreaterThan(one);
        expect(created.length).toBeLessThanOrEqual(one * 3);
    });

    it('surfaces nobody used for a whole trim period are released', () => {
        const layer = new GroundDrapeLayer();
        frame(layer, 0, 3);
        expect(planeCanvases()).toBeGreaterThan(0);
        for (let i = 0; i < GROUND_DRAPE.CANVAS_TRIM_FRAMES * 2 + 1; i++) frame(layer, 0, 0);
        expect(planeCanvases()).toBe(0);
    });
});
