import { afterEach, describe, expect, it } from 'vitest';
import { partLight, type PartSpec } from '../engine/renderers/vfxparts/PartSpec';
import { createVFXPartStore, drawPart } from '../engine/renderers/vfxparts/VFXPartStore';
import { setPartLightSink, type PartLightRole, type PartLightSink } from '../engine/renderers/lighting/PartLightSink';
import { VFX_RAMPS, VFX_SOLID_RAMPS, type VFXRampId } from '../data/vfx/parts/vfxPalette';
import { hexToRgbChannels } from '../data/ui/tokens';
import { VFX_PARTS } from '../data/vfx/parts/partConfig';

// ADR 0031：「哪些零件是仿光效」只在 PartSpec.partLight；「貼圖還是光」只在 drawPart，依畫布的角色決定。

const lightRamp = (Object.keys(VFX_RAMPS) as VFXRampId[]).find((r) => !VFX_SOLID_RAMPS.includes(r)) as VFXRampId;
const solidRamp = VFX_SOLID_RAMPS[0];

interface FakeCtx { ctx: CanvasRenderingContext2D; log: string[]; canvas: HTMLCanvasElement }

/** 只記錄呼叫的假 2D context；變換固定是 2 倍縮放加平移 (10, 20) */
function makeCtx(): FakeCtx {
    const log: string[] = [];
    const canvas = { width: 100, height: 100 } as HTMLCanvasElement;
    const target: Record<string, unknown> = {
        globalAlpha: 1, globalCompositeOperation: 'source-over', canvas,
        getTransform: () => ({ a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 }),
    };
    const ctx = new Proxy(target, {
        get(t, prop: string) {
            if (prop in t) return t[prop];
            if (prop.startsWith('create')) return () => ({ addColorStop: () => {} });
            return (...args: unknown[]) => { log.push(`${prop}:${args.slice(3, 5).join(',')}`); };
        },
        set(t, prop: string, v) { t[prop] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, log, canvas };
}

const fakeSurface = (w: number, h: number) => ({ canvas: { width: w, height: h } as HTMLCanvasElement, ctx: makeCtx().ctx });

interface Added { devX: number; devY: number; devRadius: number; ground: boolean; strength: number }

/** 假 sink：worldCanvas 是世界、maskCanvas 是遮罩；cap 盞之後拒收；核心縮放 core */
function makeSink(worldCanvas: HTMLCanvasElement | null, maskCanvas: HTMLCanvasElement | null, cap: number, core: number) {
    const added: Added[] = [];
    let quota = 0;
    const sink: PartLightSink = {
        roleOf: (c): PartLightRole | null => (c === worldCanvas ? 'world' : c === maskCanvas ? 'mask' : null),
        addPartLight: (devX, devY, devRadius, ground, _color, strength) => {
            if (added.length >= cap) return -1;
            added.push({ devX, devY, devRadius, ground, strength });
            quota++;
            return core;
        },
        takeMaskLight: () => (quota-- > 0 ? core : -1),
    };
    return { sink, added };
}

const draws = (log: string[]) => log.filter((m) => m.startsWith('drawImage'));

describe('partLight：仿光效零件只定義在零件表一處', () => {
    it('只有柔邊、加法的 glow 回光，顏色是色階 main', () => {
        const l = partLight({ kind: 'glow', radius: 40, ramp: lightRamp });
        const expected = hexToRgbChannels(VFX_RAMPS[lightRamp].main).split(' ').map((c) => Number(c) / 255);
        expect(l?.radius).toBe(40);
        expect(l?.color).toEqual(expected);
    });

    it('硬光暈、實體色階的 glow、其他零件不是光', () => {
        const others: PartSpec[] = [
            { kind: 'glow', radius: 40, ramp: lightRamp, hard: true },
            { kind: 'glow', radius: 40, ramp: solidRamp },
            { kind: 'ring', radius: 30, thickness: 6, ramp: lightRamp },
            { kind: 'rays', radius: 30, count: 8, ramp: lightRamp },
        ];
        for (const n of others) expect(partLight(n)).toBeNull();
    });
});

describe('drawPart：貼圖還是光只在這裡決定', () => {
    afterEach(() => setPartLightSink(null));
    const store = createVFXPartStore(fakeSurface, () => 0);
    const glow = store.get({ kind: 'glow', radius: 40, ramp: lightRamp });
    const ring = store.get({ kind: 'ring', radius: 30, thickness: 6, ramp: lightRamp });

    it('沒有 sink（打光關閉）照舊貼圖', () => {
        const { ctx, log } = makeCtx();
        drawPart(ctx, glow, 5, 5);
        expect(draws(log)).toHaveLength(1);
    });

    it('世界畫布：登記成光（裝置像素、半徑乘縮放、強度乘不透明度），只畫縮小核心', () => {
        const w = makeCtx();
        const { sink, added } = makeSink(w.canvas, null, 8, 0.5);
        setPartLightSink(sink);
        w.ctx.globalAlpha = 0.5;
        drawPart(w.ctx, glow, 5, 7, { scale: 2, alpha: 0.8 });
        expect(added).toHaveLength(1);
        expect(added[0]).toMatchObject({ devX: 2 * 5 + 10, devY: 2 * 7 + 20, devRadius: (glow.light?.radius ?? 0) * 2 * 2, ground: false });
        // 光的半徑是量化後的零件半徑（painter 的 scale 把它縮回實際大小）
        expect(glow.light?.radius).toBe(glow.width / 2 - VFX_PARTS.PAD);
        expect(added[0].strength).toBeCloseTo(0.4);
        const [img] = draws(w.log);
        expect(img).toBe(`drawImage:${glow.width * 2 * 0.5},${glow.height * 2 * 0.5}`);
        expect(w.ctx.globalAlpha).toBe(0.5);
    });

    it('世界畫布：核心縮放 0 時什麼都不畫；有 scaleY 的是貼地零件', () => {
        const w = makeCtx();
        const { sink, added } = makeSink(w.canvas, null, 8, 0);
        setPartLightSink(sink);
        drawPart(w.ctx, glow, 0, 0, { scaleY: 0.5 });
        expect(added[0].ground).toBe(true);
        expect(draws(w.log)).toHaveLength(0);
    });

    it('排不進上限照舊貼圖；遮罩那一趟照世界那一趟的盞數一一對應', () => {
        const w = makeCtx(), m = makeCtx();
        const { sink, added } = makeSink(w.canvas, m.canvas, 1, 0.5);
        setPartLightSink(sink);
        drawPart(w.ctx, glow, 0, 0);
        drawPart(w.ctx, glow, 0, 0);
        expect(added).toHaveLength(1);
        expect(draws(w.log)).toEqual([`drawImage:${glow.width * 0.5},${glow.height * 0.5}`, `drawImage:${glow.width},${glow.height}`]);
        drawPart(m.ctx, glow, 0, 0);
        drawPart(m.ctx, glow, 0, 0);
        expect(added).toHaveLength(1);
        expect(draws(m.log)).toEqual(draws(w.log));
    });

    it('其他畫布、不是光的零件、改成一般混合的 glow 照舊貼圖', () => {
        const w = makeCtx(), other = makeCtx();
        const { sink, added } = makeSink(w.canvas, null, 8, 0.5);
        setPartLightSink(sink);
        drawPart(other.ctx, glow, 0, 0);
        drawPart(w.ctx, ring, 0, 0);
        drawPart(w.ctx, glow, 0, 0, { blend: 'source-over' });
        expect(added).toHaveLength(0);
        expect(draws(other.log)).toHaveLength(1);
        expect(draws(w.log)).toEqual([`drawImage:${ring.width},${ring.height}`, `drawImage:${glow.width},${glow.height}`]);
    });
});
