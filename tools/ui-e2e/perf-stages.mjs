/**
 * Diagnostic tool to measure per-phase render timing (RenderStats + drawWorld breakdown).
 * Measures for:
 *   1) showcase (auto battle + matrix rain)
 *   2) manual_battle (random battlefield + battle running)
 *   3) manual_idle (manual editor mode, idle)
 */
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    launchBrowser,
    getEnvInfo,
    assertMainGpu,
    prepareManualBattle,
    START_TEXT,
} from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');

const isHeadless = process.env.PERF_HEADED !== '1';
const unthrottled = process.env.PERF_UNTHROTTLED !== '0';

const server = await createServer({ server: { port: 3199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?perf&quality=0`;
const browser = await launchBrowser({ headed: !isHeadless, unthrottled });

const measurePhases = async (name, prepare) => {
    console.log(`\n== Measuring render phases: ${name} ==`);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const envInfo = await getEnvInfo(page, unthrottled);
    assertMainGpu(envInfo);

    await prepare(page);
    await page.waitForTimeout(2000);

    // Instrument drawWorld in page context
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

const allResults = {};
try {
    allResults['showcase'] = await measurePhases('showcase', async () => {});
    allResults['manual_battle'] = await measurePhases('manual_battle', async (page) => {
        await prepareManualBattle(page, { boostHp: true });
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
