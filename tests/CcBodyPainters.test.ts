import { describe, it, expect } from 'vitest';
import { bakeSheep } from '../engine/renderers/units/painters/PolymorphPainter';
import { bakeIceBlock, ICE_BLOCK_BOX } from '../engine/renderers/units/painters/FrozenPainter';
import { SHEEP_BODY, ICE_BLOCK } from '../data/units/appearance/ccBody';

/** 記錄每個繪圖呼叫與屬性的假 ctx：烘焙只能用 fill／stroke／drawImage，不得用 shadowBlur 或漸層。 */
function fakeSurface() {
    const calls: string[] = [];
    const sets: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
        get: (_t, prop: string) => (...args: unknown[]) => { calls.push(prop); return args[0]; },
        set: (_t, prop: string) => { sets.push(prop); return true; },
    }) as unknown as CanvasRenderingContext2D;
    const make = (w: number, h: number) => ({ canvas: { width: w, height: h } as HTMLCanvasElement, ctx });
    return { make, calls, sets };
}

describe('CC body painters (polymorph sheep, frozen ice block)', () => {
    it('sheep bakes a color canvas and a silhouette at bakeScale resolution, without gradients or shadowBlur', () => {
        const s = fakeSurface();
        const sprite = bakeSheep('#123456', s.make);
        expect(sprite.color.width).toBe(Math.ceil(SHEEP_BODY.boxW * SHEEP_BODY.bakeScale));
        expect(sprite.color.height).toBe(Math.ceil(SHEEP_BODY.boxH * SHEEP_BODY.bakeScale));
        expect(sprite.silhouette.width).toBe(sprite.color.width);
        expect(s.calls).not.toContain('createLinearGradient');
        expect(s.calls).not.toContain('createRadialGradient');
        expect(s.sets).not.toContain('shadowBlur');
        expect(s.calls.filter((c) => c === 'ellipse' || c === 'arc').length).toBeGreaterThan(SHEEP_BODY.wool.length);
    });

    it('sheep geometry stays inside the bake box with room for the outline', () => {
        const o = SHEEP_BODY.outlineWidth;
        for (const p of SHEEP_BODY.wool) {
            expect(p.x - p.r - o).toBeGreaterThanOrEqual(0);
            expect(p.x + p.r + o).toBeLessThanOrEqual(SHEEP_BODY.boxW);
            expect(p.y - p.r - o).toBeGreaterThanOrEqual(0);
            expect(p.y + p.r + o).toBeLessThanOrEqual(SHEEP_BODY.groundY);
        }
        expect(SHEEP_BODY.head.x + SHEEP_BODY.head.rx + o).toBeLessThanOrEqual(SHEEP_BODY.boxW);
        expect(SHEEP_BODY.groundY + o).toBeLessThanOrEqual(SHEEP_BODY.boxH);
    });

    it('ice block bakes once at box size, from the shared LION_ICE ramp, without gradients or shadowBlur', () => {
        const s = fakeSurface();
        const c = bakeIceBlock(s.make);
        expect(c.width).toBe(Math.ceil(ICE_BLOCK_BOX.w * ICE_BLOCK.bakeScale));
        expect(c.height).toBe(Math.ceil(ICE_BLOCK_BOX.h * ICE_BLOCK.bakeScale));
        expect(s.calls).not.toContain('createLinearGradient');
        expect(s.sets).not.toContain('shadowBlur');
        expect(ICE_BLOCK_BOX.groundY).toBeLessThan(ICE_BLOCK_BOX.h);
    });
});
