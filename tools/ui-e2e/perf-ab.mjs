/**
 * Render performance A/B experiment (headless Edge/Chrome).
 * Run: `node tools/ui-e2e/perf-ab.mjs`  (env: PERF_SECONDS=6, PERF_DSF=1, PERF_CPU_THROTTLE=4, E2E_BROWSER_PATH=...)
 *
 * Boots the Showcase scene, then toggles individual render features at runtime through the dev-server module
 * instance of MATERIAL_CONFIG / CSS injection and reports rAF frame-time per variant. Used to rank the cost of
 * each feature (tone-grade pass, terrain grain overlay, backdrop-filter glass, matrix rain, ...).
 * Output: tools/ui-e2e/out/perf_ab.json
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
mkdirSync(OUT, { recursive: true });

const SECONDS = Number(process.env.PERF_SECONDS || 6);
const DSF = Number(process.env.PERF_DSF || 1);
const THROTTLE = Number(process.env.PERF_CPU_THROTTLE || 1);

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

const server = await createServer({ server: { port: 3197, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DSF });
const page = await ctx.newPage();
await page.goto(baseUrl, { waitUntil: 'networkidle' });
if (THROTTLE > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
}
await page.waitForTimeout(3000);

const measure = async () => {
    await page.evaluate(() => {
        window.__frames = [];
        window.__stop = false;
        let last = performance.now();
        const loop = (t) => { window.__frames.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
    });
    await page.waitForTimeout(SECONDS * 1000);
    const frames = await page.evaluate(() => { window.__stop = true; return window.__frames.slice(2); });
    const sorted = [...frames].sort((a, b) => a - b);
    const avg = frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length);
    return { fps: +(1000 / avg).toFixed(1), avgMs: +avg.toFixed(2), p95Ms: +(sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(2) };
};

// Each variant is applied cumulatively-independent: we reset to defaults first.
const setCfg = (patch) => page.evaluate(async (p) => {
    const mod = await import('/data/vfx/materialConfig.ts');
    const c = mod.MATERIAL_CONFIG;
    window.__orig ??= { enabled: c.enabled, grade: c.grade.enabled, grain: c.terrain.grain.enabled, side: c.terrain.sideGrain };
    c.enabled = p.enabled ?? window.__orig.enabled;
    c.grade.enabled = p.grade ?? window.__orig.grade;
    c.terrain.grain.enabled = p.grain ?? window.__orig.grain;
    c.terrain.sideGrain = p.side ?? window.__orig.side;
}, patch);

const setCss = (css) => page.evaluate((text) => {
    let el = document.getElementById('__ab_css');
    if (!el) { el = document.createElement('style'); el.id = '__ab_css'; document.head.appendChild(el); }
    el.textContent = text;
}, css);

const results = {};
const variants = [
    ['baseline', {}, ''],
    ['no_tone_grade', { grade: false }, ''],
    ['no_terrain_grain', { grain: false, side: 0 }, ''],
    ['no_grade_no_grain', { grade: false, grain: false, side: 0 }, ''],
    ['no_backdrop_filter', {}, '*{backdrop-filter:none !important;-webkit-backdrop-filter:none !important}'],
];
const setScene = (id) => page.evaluate(async (sid) => {
    const mod = await import('/data/scenes.ts');
    const e = window.__TACTICAL_ENGINE__;
    const s = mod.SCENE_DB.find((x) => x.id === sid);
    e.currentScene = s;
    e.map.rebuildMap(e);
    return mod.SCENE_DB.map((x) => x.id);
}, id);
try {
    // Leave Showcase: manual idle mode keeps the scene fixed (no auto theme cycling).
    await page.getByText('\u555f\u52d5\u6230\u8853\u6a21\u64ec').click();
    await page.waitForTimeout(800);
    const ids = await page.evaluate(async () => (await import('/data/scenes.ts')).SCENE_DB.map((x) => x.id));
    const only = process.env.PERF_SCENES ? process.env.PERF_SCENES.split(',') : ids;
    for (const sid of only) {
        await setScene(sid);
        await page.waitForTimeout(500);
        results[sid] = {};
        // two interleaved rounds to cancel drift
        for (let round = 0; round < 2; round++) {
            for (const [name, cfgPatch, css] of variants) {
                await setCfg(cfgPatch);
                await setCss(css);
                await page.waitForTimeout(400);
                const m = await measure();
                (results[sid][name] ??= []).push(m.avgMs);
            }
        }
        const line = Object.entries(results[sid]).map(([k, v]) => `${k}=${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}ms`).join('  ');
        console.log(sid.padEnd(16), line);
    }
    await setCfg({}); await setCss('');
    writeFileSync(join(OUT, 'perf_ab.json'), JSON.stringify({ dsf: DSF, cpuThrottle: THROTTLE, seconds: SECONDS, results }, null, 2));
} finally {
    await browser.close();
    await server.close();
}