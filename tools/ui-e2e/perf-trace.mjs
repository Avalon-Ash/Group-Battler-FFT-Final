/**
 * perf-trace.mjs — CDP Tracing for GPU process activity and raster counts.
 * Run: `node tools/ui-e2e/perf-trace.mjs`
 *
 * Captures 3s trace with categories: gpu, disabled-by-default-gpu.service, cc, viz.
 * Summarizes:
 *   - GPU process busy time ratio (%)
 *   - DrawRenderPass / Raster count per frame
 * Output:
 *   - tools/ui-e2e/out/perf_trace_summary.json
 */
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
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
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const SECONDS = Number(process.env.PERF_TRACE_SECONDS || 3);
const isHeadless = process.env.PERF_HEADED !== '1';
const unthrottled = process.env.PERF_UNTHROTTLED !== '0';

const server = await createServer({
    server: { port: 3201, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?quality=0&perf=1`;
const browser = await launchBrowser({ headed: !isHeadless, unthrottled });

const SCENARIOS = ['VOID', 'FOREST', 'ICE', 'MAGMA', 'DESERT', 'manual_battle', 'showcase'];

async function captureTrace(page, scenarioName) {
    const cdp = await page.context().newCDPSession(page);

    const traceEvents = [];
    cdp.on('Tracing.dataCollected', (params) => {
        if (params.value) {
            traceEvents.push(...params.value);
        }
    });

    const tracingCompletePromise = new Promise((resolve) => {
        cdp.once('Tracing.tracingComplete', resolve);
    });

    await cdp.send('Tracing.start', {
        traceConfig: {
            includedCategories: [
                'gpu',
                'disabled-by-default-gpu.service',
                'cc',
                'viz',
            ],
            recordMode: 'recordUntilFull',
        },
    });

    await page.waitForTimeout(SECONDS * 1000);

    await cdp.send('Tracing.end');
    await tracingCompletePromise;

    // Identify GPU thread
    let gpuPid = null;
    for (const ev of traceEvents) {
        if (ev.name === 'process_name' && ev.args?.name === 'GPU Process') {
            gpuPid = ev.pid;
            break;
        }
    }

    const startTs = traceEvents[0]?.ts ?? 0;
    const endTs = traceEvents[traceEvents.length - 1]?.ts ?? startTs;
    const totalTimeUs = Math.max(1, endTs - startTs);

    let gpuDurationUs = 0;
    let frames = 0;
    let drawPasses = 0;
    let rasters = 0;

    for (const ev of traceEvents) {
        if (ev.name === 'Display::DrawAndSwap') {
            frames++;
        }
        if (ev.name === 'DirectRenderer::DrawRenderPass') {
            drawPasses++;
        }
        if (ev.name === 'RasterDecoderImpl::DoRasterCHROMIUM') {
            rasters++;
        }
        if (ev.pid === gpuPid && ev.name === 'Scheduler::RunTask' && typeof ev.dur === 'number') {
            gpuDurationUs += ev.dur;
        }
    }

    const validFrames = Math.max(1, frames);
    const gpuBusyPct = Math.min(100, +((gpuDurationUs / totalTimeUs) * 100).toFixed(1));
    const passesPerFrame = +(drawPasses / validFrames).toFixed(2);
    const rastersPerFrame = +(rasters / validFrames).toFixed(2);
    const fps = +(validFrames / SECONDS).toFixed(1);

    return {
        scenario: scenarioName,
        durationSeconds: SECONDS,
        fps,
        validFrames,
        gpuBusyPct,
        passesPerFrame,
        rastersPerFrame,
        gpuDurationMs: +(gpuDurationUs / 1000).toFixed(1),
    };
}

try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const envInfo = await getEnvInfo(page, unthrottled);
    assertMainGpu(envInfo);

    const summary = [];

    for (const sc of SCENARIOS) {
        process.stdout.write(`Tracing [${sc.padEnd(14)}] for ${SECONDS}s ... `);

        if (sc === 'showcase') {
            await page.goto(baseUrl, { waitUntil: 'networkidle' });
            await page.waitForTimeout(1500);
        } else if (sc === 'manual_battle') {
            await page.goto(baseUrl, { waitUntil: 'networkidle' });
            await page.waitForTimeout(800);
            await prepareManualBattle(page, { boostHp: true });
        } else {
            // Manual idle mode
            await page.getByText(START_TEXT).click().catch(() => {});
            await page.waitForTimeout(300);
            await page.evaluate(async (targetId) => {
                const mod = await import('/data/scenes.ts');
                const e = window.__TACTICAL_ENGINE__;
                const s = mod.SCENE_DB.find((x) => x.id === targetId);
                if (s && e) {
                    e.currentScene = s;
                    e.map.rebuildMap(e);
                }
            }, sc);
            await page.waitForTimeout(600);
        }

        const report = await captureTrace(page, sc);
        summary.push(report);
        console.log(`GPU busy: ${report.gpuBusyPct}% (${report.gpuDurationMs}ms) | FPS: ${report.fps} | Draws/frame: ${report.passesPerFrame} | Rasters/frame: ${report.rastersPerFrame}`);
    }

    const outJson = {
        timestamp: new Date().toISOString(),
        env: envInfo,
        summary,
    };

    const outPath = join(OUT_DIR, 'perf_trace_summary.json');
    writeFileSync(outPath, JSON.stringify(outJson, null, 2));
    console.log(`\nTrace summary written to: ${outPath}\n`);

    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}
