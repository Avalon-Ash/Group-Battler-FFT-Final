/**
 * Diagnostic tool to measure per-phase render timing (RenderStats + drawWorld breakdown).
 * Measures for:
 *   1) showcase (auto battle + matrix rain)
 *   2) manual_battle (random battlefield + battle running)
 *   3) manual_idle (manual editor mode, idle)
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found.');
};

const server = await createServer({ server: { port: 3199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?perf&quality=0`;
const browser = await launchBrowser();

const measurePhases = async (name, prepare) => {
    console.log(`\n== Measuring render phases: ${name} ==`);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await prepare(page);
    await page.waitForTimeout(2000);

    // Instrument drawWorld in page context
    await page.evaluate(() => {
        const eng = window.__TACTICAL_ENGINE__;
        if (!eng || !eng.renderer) return;
        const pipeline = eng.renderer.pipeline;
        if (!pipeline) return;

        window.__worldStats = {
            submit: [],
            sort: [],
            dispatch: [],
            silhouetteAndStatus: [],
            total: []
        };

        const origDrawWorld = pipeline.drawWorld.bind(pipeline);
        pipeline.drawWorld = function(ctx, engine, camera, highlight, hoveredHex, hoveredSkill, t, dt) {
            const startAll = performance.now();
            this.renderList.reset();

            if (this._terrainHEngine !== engine || !this._cachedTerrainH) {
                this._terrainHEngine = engine;
                this._cachedTerrainH = (q, r) => this.renderer.grid.getTerrainHeight(q, r, engine);
            }
            const terrainH = this._cachedTerrainH;

            const dpr = 1; // from RenderQuality in quality=0
            const lW = ctx.canvas.width / dpr;
            const lH = ctx.canvas.height / dpr;

            const tSubmit0 = performance.now();
            this.renderer.grid.submitRenderables(this.renderList, engine, hoveredHex, hoveredSkill, highlight, engine.projectiles, this.transitionT, this.transitionPhase, t);
            this._viewportScratch.width = lW;
            this._viewportScratch.height = lH;
            this._viewportScratch.camera = camera;
            this.renderer.vfxRenderer.submitRenderables(this.renderList, engine, this.renderer.vfx, terrainH, engine.mapConfig, this.transitionT, this.transitionPhase, this._viewportScratch);
            this.renderer.unit.submitRenderables(this.renderList, engine.agents, terrainH, t, highlight, engine.mapConfig, this.transitionT, this.transitionPhase, dt);
            const tSubmit1 = performance.now();

            this.renderList.sort();
            const tSort1 = performance.now();

            for (let i = 0; i < this.renderList.count; i++) {
                this.renderer.pipeline ? null : null;
                // Dispatch directly
                const op = this.renderList.ops[i];
                // Using RenderDispatcher via global or this.renderer
                // RenderDispatcher is exported or we can call original sub-dispatch
            }
            // For safety, let's keep original drawWorld logic intact!
        };
    });

    // Instead of re-implementing drawWorld, monkey-patch the 3 phases directly on the renderer subsystems!
    await page.evaluate(() => {
        const eng = window.__TACTICAL_ENGINE__;
        const r = eng.renderer;
        const pipeline = r.pipeline;

        window.__subStats = {
            submitTimes: [],
            sortTimes: [],
            dispatchTimes: [],
            hudTimes: [],
            rAFDt: []
        };

        let lastRaf = performance.now();
        const rAfLoop = (now) => {
            window.__subStats.rAFDt.push(now - lastRaf);
            lastRaf = now;
            if (!window.__stopSubStats) requestAnimationFrame(rAfLoop);
        };
        requestAnimationFrame(rAfLoop);

        // Patch renderList.sort
        const origSort = pipeline.renderList.sort.bind(pipeline.renderList);
        pipeline.renderList.sort = function() {
            const t0 = performance.now();
            origSort();
            const t1 = performance.now();
            window.__subStats.sortTimes.push(t1 - t0);
        };

        // Time submit: wrap submitRenderables of grid, vfx, unit
        let submitStart = 0;
        const origGridSubmit = r.grid.submitRenderables.bind(r.grid);
        r.grid.submitRenderables = function(...args) {
            submitStart = performance.now();
            return origGridSubmit(...args);
        };

        const origUnitSubmit = r.unit.submitRenderables.bind(r.unit);
        r.unit.submitRenderables = function(...args) {
            const ret = origUnitSubmit(...args);
            const submitEnd = performance.now();
            if (submitStart > 0) {
                window.__subStats.submitTimes.push(submitEnd - submitStart);
                submitStart = 0;
            }
            return ret;
        };
    });

    // Run for 5 seconds
    await page.waitForTimeout(5000);

    const stats = await page.evaluate(async () => {
        window.__stopSubStats = true;
        const { RenderStats } = await import('/engine/renderers/RenderStats.ts');
        const phases = {};
        for (const p of RenderStats.getPhases()) {
            phases[p] = +RenderStats.getPhaseMs(p).toFixed(3);
        }
        const avg = (arr) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3) : 0;
        const sub = window.__subStats || {};
        return {
            summary: RenderStats.formatSummary(),
            phases,
            worldSubPhases: {
                submitMs: avg(sub.submitTimes || []),
                sortMs: avg(sub.sortTimes || []),
                // world total - (submit + sort) = dispatch + status
                dispatchAndOcclusionMs: +Math.max(0, (phases['world'] || 0) - avg(sub.submitTimes || []) - avg(sub.sortTimes || [])).toFixed(3)
            },
            rAFAvgMs: avg(sub.rAFDt?.slice(5) || [])
        };
    });

    console.log('Result:', JSON.stringify(stats, null, 2));
    writeFileSync(join(OUT, `perf_phases_${name}.json`), JSON.stringify(stats, null, 2));
    await ctx.close();
    return stats;
};

const START_TEXT = '\u555f\u52d5\u6230\u8853\u6a21\u64ec';
const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9';

const allResults = {};
try {
    allResults['showcase'] = await measurePhases('showcase', async () => {});
    allResults['manual_battle'] = await measurePhases('manual_battle', async (page) => {
        await page.getByText(START_TEXT).click();
        await page.waitForTimeout(600);
        await page.locator(`button[title="${DICE_TITLE}"]`).click();
        await page.waitForTimeout(600);
        await page.evaluate(() => window.__TACTICAL_ENGINE__?.play());
    });
    allResults['manual_idle'] = await measurePhases('manual_idle', async (page) => {
        await page.getByText(START_TEXT).click();
        await page.waitForTimeout(600);
    });
    writeFileSync(join(OUT, `perf_phases_all.json`), JSON.stringify(allResults, null, 2));
} finally {
    await browser.close();
    await server.close();
}
