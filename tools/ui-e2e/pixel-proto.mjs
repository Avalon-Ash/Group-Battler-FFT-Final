// P0a pixel-world prototype: screenshots of 5 biomes (terrain only) + one battle frame at ?pixel=1/2/3,
// plus main-thread draw cost per config (RenderPipeline.draw self time, vsync-independent).
// Usage: node tools/ui-e2e/pixel-proto.mjs [--factors=1,2,3] [--seconds=4]
// Output: tools/ui-e2e/out/pixel/<biome>_k<k>.png, battle_k<k>.png, pixel_cost.json
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT, prepareManualBattle } from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(here, 'out', 'pixel');
mkdirSync(outDir, { recursive: true });
const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const FACTORS = arg('factors', '1,2,3').split(',').map(Number);
const SECONDS = Number(arg('seconds', '4'));
const BIOMES = ['VOID', 'FOREST', 'ICE', 'MAGMA', 'DESERT'];
const W = 1920, H = 1080;

const server = await createServer({ root, server: { port: 3211, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await launchBrowser({ headed: true, unthrottled: true });

const sampleDraw = (page, sec) => page.evaluate((s) => new Promise((res) => {
    window.__drawMs = [];
    setTimeout(() => {
        const d = window.__drawMs.slice(3).sort((a, b) => a - b);
        const p = (q) => d[Math.min(d.length - 1, Math.floor(q * (d.length - 1)))];
        res({ n: d.length, median: +p(0.5).toFixed(3), p99: +p(0.99).toFixed(3) });
    }, s * 1000);
}), sec);

const results = {};
for (const k of FACTORS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://localhost:${port}/?quality=0&mute&pixel=${k}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(async () => {
        const rp = (await import('/engine/renderers/RenderPipeline.ts')).RenderPipeline;
        const od = rp.prototype.draw;
        window.__drawMs = [];
        rp.prototype.draw = function (...a) {
            const t0 = performance.now(); const r = od.apply(this, a); window.__drawMs.push(performance.now() - t0); return r;
        };
    });
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(800);
    results[k] = {};
    for (const biome of BIOMES) {
        await page.evaluate(async (id) => {
            const mod = await import('/data/scenes.ts');
            const e = window.__TACTICAL_ENGINE__;
            e.currentScene = mod.SCENE_DB.find((x) => x.id === id);
            e.map.rebuildMap(e);
        }, biome);
        await page.waitForTimeout(2500);
        results[k][biome] = await sampleDraw(page, SECONDS);
        await page.screenshot({ path: join(outDir, `${biome}_k${k}.png`) });
    }
    await prepareManualBattle(page);
    await page.waitForTimeout(4000);
    results[k].battle = await sampleDraw(page, SECONDS);
    await page.screenshot({ path: join(outDir, `battle_k${k}.png`) });
    const probe = await page.evaluate(() => ({ agents: window.__TACTICAL_ENGINE__?.agents?.length ?? 0, running: !!window.__TACTICAL_ENGINE__?.isRunning }));
    results[k].probe = probe;
    results[k].errors = errors;
    console.log(`k=${k}`, JSON.stringify(results[k]));
    await ctx.close();
}
writeFileSync(join(outDir, 'pixel_cost.json'), JSON.stringify(results, null, 2));
await browser.close();
await server.close();
