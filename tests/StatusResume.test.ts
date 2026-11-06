import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser, type Page } from 'playwright-core';
import { POISON_COMBAT_POOL } from '../data/vfx/statusArt';

let server: ViteDevServer;
let browser: Browser;
let page: Page;
declare global {
    interface Window {
        __statusTestModules: {
            Pool: typeof import('../engine/renderers/status/PoisonMaterialStore').PoisonMaterialStore;
            layout: typeof POISON_COMBAT_POOL;
            getStatusIconUrl: typeof import('../hooks/adapters/statusIcon').getStatusIconUrl;
            StatusStripPainter: typeof import('../engine/renderers/hud/StatusStripPainter').StatusStripPainter;
            Agent: typeof import('../engine/core/Agent').Agent;
            Team: typeof import('../types').Team;
        };
    }
}
beforeAll(async () => {
    server = await createServer({ cacheDir: 'tools/ui-e2e/out/status_ui/test-vite', server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
    await server.listen();
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    page = await browser.newPage();
    await page.goto(server.resolvedUrls!.local[0], { waitUntil: 'networkidle' });
    await page.addScriptTag({ type: 'module', content: `
        import {PoisonMaterialStore as Pool} from '/engine/renderers/status/PoisonMaterialStore.ts';
        import {POISON_COMBAT_POOL as layout} from '/data/vfx/statusArt.ts';
        import {getStatusIconUrl} from '/hooks/adapters/statusIcon.ts';
        import {StatusStripPainter} from '/engine/renderers/hud/StatusStripPainter.ts';
        import {Agent} from '/engine/core/Agent.ts';
        import {Team} from '/types.ts';
        window.__statusTestModules = {Pool,layout,getStatusIconUrl,StatusStripPainter,Agent,Team};
    ` });
    await page.waitForFunction(() => Boolean(window.__statusTestModules));
}, 30000);
afterAll(async () => { await browser?.close(); await server?.close(); });

describe('combat status resources in real Canvas2D', () => {
    it('serves eight complete appearances without evicting live pages, then recycles only an inactive page', async () => {
        const result = await page.evaluate(async () => {
            const { Pool, layout } = window.__statusTestModules;
            const pool = new Pool(layout);
            const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
            const ctx = canvas.getContext('2d')!;
            const sources = Array.from({ length: 9 }, () => {
                const source = document.createElement('canvas'); source.width = 128; source.height = 128;
                const g = source.getContext('2d')!; g.fillStyle = 'rgb(100, 35, 45)'; g.fillRect(0, 0, 128, 128);
                return source;
            });
            const frames = [{ x: 0, y: 0, w: 16, h: 16 }], otherFrames = [{ x: 32, y: 32, w: 16, h: 16 }];
            const rect = { dx: 0, dy: 0, dw: 16, dh: 16, screenScale: 1, localScale: 1 };
            const draw = (index: number, turn = false) => {
                const sequence = turn ? otherFrames : frames;
                return pool.draw(ctx, 'test-appearance-' + index, sequence, sequence[0], 1, rect, 0, sources[index]);
            };
            try {
                pool.beginFrame();
                const cold = sources.slice(0, 8).map((_, index) => draw(index));
                const beforePreparationAlpha = ctx.getImageData(0, 0, 1, 1).data[3];
                let warmed = false;
                for (let tick = 0; tick < 120 && !warmed; tick++) {
                    pool.beginFrame(); warmed = sources.slice(0, 8).map((_, index) => draw(index)).every(Boolean);
                    pool.prepare(); await new Promise(resolve => setTimeout(resolve, 2));
                }
                const activeHits: boolean[] = [], saturation: boolean[] = [];
                for (let tick = 0; tick < 30; tick++) {
                    pool.beginFrame();
                    for (let index = 0; index < 8; index++) activeHits.push(draw(index, tick % 2 === 0));
                    saturation.push(draw(8));
                }
                const greenPixel = Array.from(ctx.getImageData(0, 0, 1, 1).data);
                pool.beginFrame(); for (let index = 0; index < 7; index++) draw(index);
                pool.beginFrame(); for (let index = 0; index < 7; index++) draw(index);
                const replacementCold = draw(8); pool.prepare();
                await new Promise(resolve => setTimeout(resolve, 10));
                const replacementHot = draw(8), protectedHits = Array.from({ length: 7 }, (_, index) => draw(index));
                const evictedMiss = draw(7);
                return { cold, beforePreparationAlpha, warmed, activeHits, saturation, greenPixel, replacementCold, replacementHot, protectedHits, evictedMiss };
            } finally { pool.dispose(); }
        });
        expect(POISON_COMBAT_POOL.width * POISON_COMBAT_POOL.height * 4).toBe(8388608);
        expect(result.cold).toEqual(Array(8).fill(false));
        expect(result.beforePreparationAlpha).toBe(0);
        expect(result.warmed).toBe(true);
        expect(result.activeHits).toEqual(Array(240).fill(true));
        expect(result.saturation).toEqual(Array(30).fill(false));
        expect(result.greenPixel).toEqual([82, 75, 40, 255]);
        expect(result.replacementCold).toBe(false);
        expect(result.replacementHot).toBe(true);
        expect(result.protectedHits).toEqual(Array(7).fill(true));
        expect(result.evictedMiss).toBe(false);
    }, 30000);

    it('centres the existing glyphs only for Inspector and leaves strip pixels identical', async () => {
        const result = await page.evaluate(async () => {
            const { getStatusIconUrl, StatusStripPainter, Agent, Team } = window.__statusTestModules;
            const agent = new Agent('icons', Team.BLUE, 0, 0, { w: 8, h: 8, offsetX: 0, offsetY: 0, layout: 'FLAT' });
            Object.assign(agent.effects.DOT, { remaining: 2, max: 5, value: 5, tag: 'POISON' });
            const strip = document.createElement('canvas'); strip.width = strip.height = 120;
            const g = strip.getContext('2d')!;
            StatusStripPainter.draw(g, agent, 60, 70, 1);
            const before = strip.toDataURL(), icons = [];
            for (const key of ['DOT', 'POISON', 'BURN', 'ROOT', 'REGEN', 'SHIELD'] as const) {
                const image = new Image(); image.src = getStatusIconUrl(key); await image.decode();
                const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
                const ctx = c.getContext('2d')!; ctx.drawImage(image, 0, 0);
                const data = ctx.getImageData(0, 0, c.width, c.height).data;
                let ink = 0;
                for (let y = 10; y < c.height - 10; y++) for (let x = 10; x < c.width - 10; x++) {
                    const i = (y * c.width + x) * 4;
                    if (Math.max(data[i], data[i + 1], data[i + 2]) > 55) ink++;
                }
                icons.push({ key, ink });
            }
            g.clearRect(0, 0, 120, 120); StatusStripPainter.draw(g, agent, 60, 70, 1);
            return { icons, unchanged: before === strip.toDataURL() };
        });
        expect(result.unchanged).toBe(true);
        expect(result.icons.map(icon => icon.key)).toEqual(['DOT', 'POISON', 'BURN', 'ROOT', 'REGEN', 'SHIELD']);
        for (const icon of result.icons) expect(icon.ink, icon.key).toBeGreaterThan(20);
    });
});
