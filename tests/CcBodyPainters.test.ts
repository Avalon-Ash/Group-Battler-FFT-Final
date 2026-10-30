import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { buildCcBodyEntries, CcBodyStore, type CcBodyManifest, type CcBodyDeps } from '../engine/renderers/units/CcBodyStore';
import { Team } from '../types';
import { getFactionSkin } from '../data/units/factionSkin';

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['SE', 'SW', 'NE', 'NW'] as const;

/** 記錄每個繪圖呼叫與屬性的假 ctx：載入後的合成只能用 drawImage／fillRect／混合模式，不得用 shadowBlur 或漸層。 */
function fakeSurface() {
    const calls: string[] = [];
    const sets: Record<string, unknown[]> = {};
    const made: HTMLCanvasElement[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
        get: (_t, prop: string) => (...args: unknown[]) => { calls.push(prop); return args[0]; },
        set: (_t, prop: string, v) => { (sets[prop] ??= []).push(v); return true; },
    }) as unknown as CanvasRenderingContext2D;
    const make = (w: number, h: number) => {
        const canvas = { width: w, height: h } as HTMLCanvasElement;
        made.push(canvas);
        return { canvas, ctx };
    };
    return { make, calls, sets, made };
}

const frame = (x: number) => ({ x, y: 0, w: 10, h: 12, ax: 5, ay: 10 });
const fakeManifest: CcBodyManifest = {
    version: 1,
    pxPerHex: 192,
    elevationDeg: 30,
    types: {
        SHEEP: { file: 'sheep.webp', maskFile: 'sheep_mask.webp', atlas: { w: 40, h: 12 }, heightHex: 1, frames: { SE: frame(0), SW: frame(10), NE: frame(20), NW: frame(30) } },
        ICE_BLOCK: { file: 'ice_block.webp', atlas: { w: 40, h: 12 }, heightHex: 1.4, frames: { SE: frame(0), SW: frame(10), NE: frame(20), NW: frame(30) } },
    },
};
const fakeImages = { 'sheep.webp': {} as CanvasImageSource, 'sheep_mask.webp': {} as CanvasImageSource, 'ice_block.webp': {} as CanvasImageSource };

describe('CC body atlas (Blender-baked sheep and ice cage)', () => {
    it('the shipped manifest describes four native directions per type, inside the atlas, with a mask for the sheep collar', () => {
        const dir = path.join(ROOT, 'public/assets/cc_bodies');
        const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8')) as CcBodyManifest;
        expect(Object.keys(manifest.types).sort()).toEqual(['ICE_BLOCK', 'SHEEP']);
        expect(manifest.pxPerHex).toBeGreaterThan(0);
        for (const [type, def] of Object.entries(manifest.types)) {
            expect(existsSync(path.join(dir, def!.file)), `${type} atlas file`).toBe(true);
            if (def!.maskFile) expect(existsSync(path.join(dir, def!.maskFile)), `${type} mask file`).toBe(true);
            for (const d of DIRS) {
                const f = def!.frames[d];
                expect(f, `${type} ${d}`).toBeTruthy();
                expect(f.x + f.w, `${type} ${d} width`).toBeLessThanOrEqual(def!.atlas.w);
                expect(f.y + f.h, `${type} ${d} height`).toBeLessThanOrEqual(def!.atlas.h);
                expect(f.ax).toBeGreaterThanOrEqual(0);
                expect(f.ax).toBeLessThanOrEqual(f.w);
                expect(f.ay).toBeGreaterThanOrEqual(0);
                expect(f.ay).toBeLessThanOrEqual(f.h);
            }
        }
        expect(manifest.types.SHEEP!.maskFile).toBeTruthy();
        expect(manifest.types.ICE_BLOCK!.maskFile).toBeUndefined();
    });

    it('builds per-team sheep sheets (collar tinted by FACTION_SKINS) and one silhouette, once, without gradients or shadowBlur', () => {
        const s = fakeSurface();
        const entries = buildCcBodyEntries(fakeManifest, fakeImages, s.make);
        const sheep = entries.SHEEP!;
        expect(sheep.colorByTeam).toHaveLength(2);
        expect(sheep.colorByTeam[Team.BLUE]).not.toBe(sheep.colorByTeam[Team.RED]);
        expect(sheep.silhouette).toBeTruthy();
        expect(s.sets.fillStyle).toContain(getFactionSkin(Team.BLUE).fallbackBodyColor);
        expect(s.sets.fillStyle).toContain(getFactionSkin(Team.RED).fallbackBodyColor);
        expect(s.sets.globalCompositeOperation).toContain('multiply');
        expect(s.sets.globalCompositeOperation).toContain('source-in');
        expect(s.calls).not.toContain('createLinearGradient');
        expect(s.calls).not.toContain('createRadialGradient');
        expect(s.sets.shadowBlur).toBeUndefined();
        // 2 隊 × (合成＋遮罩層) ＋ 剪影 = 5 張離屏畫布；之後執行期不再建立
        expect(s.made).toHaveLength(5);
    });

    it('the ice cage is one shared sheet for both teams and has no silhouette (never drawn as an outline)', () => {
        const s = fakeSurface();
        const ice = buildCcBodyEntries(fakeManifest, fakeImages, s.make).ICE_BLOCK!;
        expect(ice.colorByTeam[Team.BLUE]).toBe(ice.colorByTeam[Team.RED]);
        expect(ice.silhouette).toBeNull();
    });

    it('a missing atlas image leaves that type unavailable (painters then draw the plain unit)', () => {
        const s = fakeSurface();
        const entries = buildCcBodyEntries(fakeManifest, { 'ice_block.webp': fakeImages['ice_block.webp'] }, s.make);
        expect(entries.SHEEP).toBeUndefined();
        expect(entries.ICE_BLOCK).toBeTruthy();
    });

    it('the store loads manifest and images through its dependencies and exposes the pixel scale', async () => {
        const s = fakeSurface();
        const deps: CcBodyDeps = {
            createSurface: s.make,
            fetchManifest: async () => fakeManifest,
            loadImage: async (file) => (fakeImages[file as keyof typeof fakeImages] ?? null) as HTMLImageElement | null,
        };
        const store = new CcBodyStore(deps);
        await store.readyPromise;
        expect(store.get('SHEEP')).toBeTruthy();
        expect(store.get('ICE_BLOCK')).toBeTruthy();
        expect(store.pixelScale).toBeGreaterThan(0);
        const offline = new CcBodyStore({ ...deps, fetchManifest: async () => null });
        await offline.readyPromise;
        expect(offline.get('SHEEP')).toBeNull();
        expect(offline.pixelScale).toBe(0);
    });
});
