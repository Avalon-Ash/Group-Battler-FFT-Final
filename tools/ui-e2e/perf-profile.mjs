/**
 * Render performance profiler (headless Edge/Chrome + CDP sampling profiler).
 * Run: `node tools/ui-e2e/perf-profile.mjs`   (env: PERF_SECONDS=8, E2E_BROWSER_PATH=...)
 *
 * For each scenario it records: rAF frame-time stats (avg FPS, p50/p95/max ms), the in-game FPS
 * counter, CDP Performance metrics (script/layout/style durations) and a CPU profile aggregated
 * by function and by source file (self time). Results are written to tools/ui-e2e/out/perf_<scenario>.json
 * and the top self-time entries are printed.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
mkdirSync(OUT, { recursive: true });

const SECONDS = Number(process.env.PERF_SECONDS || 8);
const WARMUP_MS = 3000;
// "Start tactical simulation" (escaped so the file is encoding-proof)
const START_TEXT = '\u555f\u52d5\u6230\u8853\u6a21\u64ec';
const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9';

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

const server = await createServer({ server: { port: 3198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const shortUrl = (u) => (u || '').replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, '');

const aggregate = (profile) => {
    const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    const total = profile.timeDeltas.reduce((a, b) => a + b, 0);
    profile.samples.forEach((id, i) => {
        self.set(id, (self.get(id) || 0) + (profile.timeDeltas[i] || 0));
    });
    const byFn = new Map();
    const byFile = new Map();
    for (const [id, t] of self) {
        const n = nodes.get(id);
        const cf = n.callFrame;
        const file = shortUrl(cf.url) || '(native)';
        const key = `${cf.functionName || '(anonymous)'} @ ${file}:${cf.lineNumber + 1}`;
        byFn.set(key, (byFn.get(key) || 0) + t);
        byFile.set(file, (byFile.get(file) || 0) + t);
    }
    const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
        .map(([k, t]) => ({ name: k, ms: +(t / 1000).toFixed(1), pct: +((t / total) * 100).toFixed(1) }));
    return { totalMs: +(total / 1000).toFixed(0), topFunctions: top(byFn, 30), topFiles: top(byFile, 20) };
};

const measureScenario = async (name, prepare) => {
    console.log(`\n== scenario: ${name}`);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await prepare(page);
    await page.waitForTimeout(WARMUP_MS);

    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
    const m0 = await cdp.send('Performance.getMetrics');
    await page.evaluate(() => {
        window.__frames = [];
        let last = performance.now();
        const loop = (t) => { window.__frames.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(loop); };
        requestAnimationFrame(loop);
    });
    await cdp.send('Profiler.start');
    await page.waitForTimeout(SECONDS * 1000);
    const { profile } = await cdp.send('Profiler.stop');
    const m1 = await cdp.send('Performance.getMetrics');
    const frames = await page.evaluate(() => { window.__stop = true; return window.__frames.slice(1); });
    const hudFps = await page.evaluate(() => document.body.innerText.match(/FPS:\s*(\d+)/)?.[1] ?? null);
    const info = await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        const c = document.querySelector('canvas');
        return {
            agents: e?.agents?.length ?? null,
            mapKeys: e?.mapKeys?.size ?? null,
            canvas: c ? { w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight } : null,
            dpr: window.devicePixelRatio,
        };
    });

    const sorted = [...frames].sort((a, b) => a - b);
    const pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
    const avg = frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length);
    const metric = (m, k) => m.metrics.find((x) => x.name === k)?.value ?? 0;
    const delta = (k) => +((metric(m1, k) - metric(m0, k)) * 1000).toFixed(0);
    const result = {
        scenario: name,
        seconds: SECONDS,
        info,
        hudFps,
        rafFps: +(1000 / avg).toFixed(1),
        frameMs: { avg: +avg.toFixed(2), p50: +pick(0.5).toFixed(2), p95: +pick(0.95).toFixed(2), p99: +pick(0.99).toFixed(2), max: +Math.max(...frames).toFixed(1) },
        longFramesOver33ms: frames.filter((f) => f > 33.4).length,
        framesCount: frames.length,
        cdpMs: { script: delta('ScriptDuration'), layout: delta('LayoutDuration'), style: delta('RecalcStyleDuration'), task: delta('TaskDuration') },
        cpu: aggregate(profile),
        errors,
    };
    writeFileSync(join(OUT, `perf_${name}.json`), JSON.stringify(result, null, 2));
    console.log(`rAF ${result.rafFps} fps | frame avg ${result.frameMs.avg}ms p95 ${result.frameMs.p95}ms max ${result.frameMs.max}ms | HUD FPS ${hudFps} | agents ${info.agents} | canvas ${info.canvas?.w}x${info.canvas?.h}`);
    console.log(`CDP ms over ${SECONDS}s: script ${result.cdpMs.script}, layout ${result.cdpMs.layout}, style ${result.cdpMs.style}, task ${result.cdpMs.task}`);
    console.log('top self-time functions:');
    for (const f of result.cpu.topFunctions.slice(0, 18)) console.log(`  ${String(f.pct).padStart(5)}%  ${String(f.ms).padStart(7)}ms  ${f.name}`);
    console.log('top files:');
    for (const f of result.cpu.topFiles.slice(0, 10)) console.log(`  ${String(f.pct).padStart(5)}%  ${f.name}`);
    await ctx.close();
};

try {
    // 1) The game boots into Showcase mode (auto battle + matrix rain overlay).
    await measureScenario('showcase', async () => { /* default boot state */ });
    // 2) Manual mode: random battlefield + running simulation.
    await measureScenario('manual_battle', async (page) => {
        await page.getByText(START_TEXT).click();
        await page.waitForTimeout(600);
        await page.locator(`button[title="${DICE_TITLE}"]`).click();
        await page.waitForTimeout(600);
        await page.evaluate(() => window.__TACTICAL_ENGINE__?.play());
    });
    // 3) Manual mode idle (editor, nothing running) as a baseline of the pure render cost.
    await measureScenario('manual_idle', async (page) => {
        await page.getByText(START_TEXT).click();
        await page.waitForTimeout(600);
    });
} finally {
    await browser.close();
    await server.close();
}
