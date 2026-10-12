/**
 * perf-frames.mjs — 幀時間分佈量測工具 (2560×1440 headed, RTX 4070)
 * 
 * 量測情境：
 *   1) battle_calm: 5v5 持續交戰 (HP 調高，無特效風暴)
 *   2) battle_vfx_storm: 5v5 特效壓力情境 (全場各類特效齊發)
 *   3) showcase: 展示模式 (純交戰區間，排除轉場幀)
 * 
 * 執行規格：
 *   - 2560×1440, DPR 1, headed, 主螢幕 (RTX 4070)
 *   - 20 秒 × 3 輪交錯
 *   - 輸出：median, p90, p95, p99, max, 1% low FPS, >8.4ms / >16.7ms 幀數, 長幀歸因, GC 次數與耗時
 *   - 輸出檔：tools/ui-e2e/out/perf_frames.json
 */

import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    launchBrowser,
    getEnvInfo,
    assertMainGpu,
    assertResolution,
    prepareManualBattle,
    assertAgents,
} from './lib/perf-common.mjs';
import { startVfxStorm, stopVfxStorm } from './lib/vfx-storm.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const DURATION_SECONDS = Number(process.env.PERF_FRAMES_SECONDS || 20);
const ROUNDS = Number(process.env.PERF_ROUNDS || 3);
const isHeadless = process.env.PERF_HEADLESS === '1';
const SCENARIOS = ['battle_calm', 'battle_vfx_storm', 'showcase'];

function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : +((s[mid - 1] + s[mid]) / 2).toFixed(2);
}

function calcPercentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
    return +sorted[idx].toFixed(2);
}

function calcStats(frames) {
    if (!frames.length) {
        return {
            count: 0,
            avg: 0,
            fps: 0,
            median: 0,
            p90: 0,
            p95: 0,
            p99: 0,
            max: 0,
            onePercentLowFps: 0,
            over8_4ms: 0,
            over16_7ms: 0,
        };
    }

    const sorted = [...frames].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = +(sum / sorted.length).toFixed(2);
    const fps = +(1000 / Math.max(0.1, avg)).toFixed(1);

    const count1pct = Math.max(1, Math.floor(sorted.length * 0.01));
    const worst1pct = sorted.slice(sorted.length - count1pct);
    const avgWorst1pct = worst1pct.reduce((a, b) => a + b, 0) / worst1pct.length;
    const onePercentLowFps = +(1000 / Math.max(0.1, avgWorst1pct)).toFixed(1);

    const over8_4ms = sorted.filter(f => f > 8.4).length;
    const over16_7ms = sorted.filter(f => f > 16.7).length;

    return {
        count: sorted.length,
        avg,
        fps,
        median: +calcPercentile(sorted, 0.50),
        p90: +calcPercentile(sorted, 0.90),
        p95: +calcPercentile(sorted, 0.95),
        p99: +calcPercentile(sorted, 0.99),
        max: +sorted[sorted.length - 1].toFixed(2),
        onePercentLowFps,
        over8_4ms,
        over16_7ms,
    };
}

// Start Vite server
const server = await createServer({
    server: { port: 3197, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?quality=0&mute`;

console.log('================================================================');
console.log('  PERF-FRAMES BENCHMARK (2560x1440, DPR 1, RTX 4070)');
console.log(`  Duration per run: ${DURATION_SECONDS}s | Rounds: ${ROUNDS} (Interleaved)`);
console.log('================================================================\n');

const browser = await launchBrowser({
    headed: !isHeadless,
    unthrottled: false,
    extraArgs: ['--window-size=2560,1440'],
});

const ctx = await browser.newContext({
    viewport: { width: 2560, height: 1440 },
    deviceScaleFactor: 1,
});
const page = await ctx.newPage();

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const envInfo = await getEnvInfo(page, false);
console.log('Device Environment:', {
    gpu: envInfo.gpu,
    dpr: envInfo.dpr,
    viewport: envInfo.viewport,
    screen: envInfo.screen,
    refreshRate: envInfo.estimatedRefreshRate,
});

assertMainGpu(envInfo);
assertResolution(envInfo);

// Setup page in-browser frame collector and PerformanceObservers on every page navigation
await page.addInitScript(() => {
    window.__perfFrameHarness = {
        active: false,
        scenario: '',
        frames: [],
        transitionFrames: [],
        startMarkUs: 0,
        renderStatsHistory: [],
        loafEntries: [],
        longTasks: [],
    };

    try {
        const loafObs = new PerformanceObserver((list) => {
            if (!window.__perfFrameHarness?.active) return;
            for (const entry of list.getEntries()) {
                window.__perfFrameHarness.loafEntries.push({
                    startTime: entry.startTime,
                    duration: entry.duration,
                    renderStart: entry.renderStart,
                    styleAndLayoutStart: entry.styleAndLayoutStart,
                });
            }
        });
        loafObs.observe({ type: 'long-animation-frame', buffered: true });
    } catch {
        // unsupported in older engines
    }

    try {
        const ltObs = new PerformanceObserver((list) => {
            if (!window.__perfFrameHarness?.active) return;
            for (const entry of list.getEntries()) {
                window.__perfFrameHarness.longTasks.push({
                    startTime: entry.startTime,
                    duration: entry.duration,
                });
            }
        });
        ltObs.observe({ type: 'longtask', buffered: true });
    } catch {
        // fallback
    }

    let lastRafTime = performance.now();
    const loop = (t) => {
        const dt = t - lastRafTime;
        lastRafTime = t;

        const h = window.__perfFrameHarness;
        if (h && h.active) {
            const e = window.__TACTICAL_ENGINE__;
            let isTrans = false;
            if (h.scenario === 'showcase') {
                isTrans = (e?.renderer?.pipeline?.transitionPhase !== 'IDLE') || (e?.agents?.length === 0);
            }

            if (isTrans) {
                h.transitionFrames.push(dt);
            } else {
                h.frames.push({
                    t,
                    dt,
                });
            }
        }
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
});

async function runScenarioMeasurement(scenario, round) {
    console.log(`\n>>> [Round ${round}/${ROUNDS}] Measuring [${scenario}] for ${DURATION_SECONDS}s ...`);

    if (scenario === 'showcase') {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
            window.__TACTICAL_ENGINE__?.bus?.emit('UI_COMMAND', { type: 'SET_SHOWCASE_MODE', enabled: true });
        });
        await page.waitForTimeout(1000);
    } else {
        // Prepare battle with boosted HP
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await prepareManualBattle(page, { boostHp: true });
        await assertAgents(page, 2);

        if (scenario === 'battle_vfx_storm') {
            await startVfxStorm(page);
            await page.waitForTimeout(800);
        }
    }

    // CDP Session for tracing
    const cdp = await page.context().newCDPSession(page);
    const traceEvents = [];
    cdp.on('Tracing.dataCollected', (p) => {
        if (p.value) traceEvents.push(...p.value);
    });
    const tracingDone = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));

    // Reset harness & record perf mark
    await page.evaluate((sc) => {
        window.__perfFrameHarness.scenario = sc;
        window.__perfFrameHarness.frames = [];
        window.__perfFrameHarness.transitionFrames = [];
        window.__perfFrameHarness.active = true;
        performance.mark('PERF_SAMPLE_START');
    }, scenario);

    // Start CDP Tracing
    await cdp.send('Tracing.start', {
        traceConfig: {
            includedCategories: [
                'v8.gc',
                'devtools.timeline',
                'gpu',
                'viz',
            ],
            recordMode: 'recordUntilFull',
        },
    });

    // Wait measurement duration
    await page.waitForTimeout(DURATION_SECONDS * 1000);

    // Stop recording in page
    const pageData = await page.evaluate(async () => {
        window.__perfFrameHarness.active = false;
        performance.mark('PERF_SAMPLE_END');

        let phases = {};
        try {
            const { RenderStats } = await import('/engine/renderers/RenderStats.ts');
            for (const p of RenderStats.getPhases()) {
                phases[p] = +RenderStats.getPhaseMs(p).toFixed(3);
            }
        } catch {}

        return {
            frames: window.__perfFrameHarness.frames.slice(2), // drop warm-up
            transCount: window.__perfFrameHarness.transitionFrames.length,
            loafEntries: window.__perfFrameHarness.loafEntries,
            longTasks: window.__perfFrameHarness.longTasks,
            phases,
        };
    });

    // Stop CDP tracing
    await cdp.send('Tracing.end');
    await tracingDone;
    await cdp.detach();

    if (scenario === 'battle_vfx_storm') {
        await stopVfxStorm(page);
    }

    // Trace event analysis: Find PERF_SAMPLE_START timestamp
    let startTraceTs = 0;
    for (const ev of traceEvents) {
        if (ev.name === 'PERF_SAMPLE_START' || (ev.name === 'TimeStamp' && ev.args?.data?.message === 'PERF_SAMPLE_START')) {
            startTraceTs = ev.ts;
            break;
        }
    }
    if (!startTraceTs && traceEvents.length > 0) {
        startTraceTs = traceEvents[0].ts;
    }

    // Analyze GC events from trace
    let minorGcCount = 0;
    let minorGcDurUs = 0;
    let majorGcCount = 0;
    let majorGcDurUs = 0;

    const timelineEvents = [];

    for (const ev of traceEvents) {
        if (ev.name === 'MinorGC' || ev.name === 'v8.gc.MinorGC') {
            minorGcCount++;
            minorGcDurUs += (ev.dur || 0);
        } else if (ev.name === 'MajorGC' || ev.name === 'v8.gc.MajorGC') {
            majorGcCount++;
            majorGcDurUs += (ev.dur || 0);
        }

        if (ev.dur && ev.ts >= startTraceTs) {
            timelineEvents.push(ev);
        }
    }

    const totalGcCount = minorGcCount + majorGcCount;
    const totalGcDurMs = +((minorGcDurUs + majorGcDurUs) / 1000).toFixed(2);
    const avgGcDurMs = totalGcCount > 0 ? +(totalGcDurMs / totalGcCount).toFixed(2) : 0;

    const dtArray = pageData.frames.map(f => f.dt);
    const stats = calcStats(dtArray);

    // Attribute long frames (> 16.7 ms and > 8.4 ms)
    const longFrames = pageData.frames.filter(f => f.dt > 8.4);
    const frameAttributions = [];

    const baseFrameT = pageData.frames[0]?.t || 0;

    for (const lf of longFrames) {
        const frameStartUs = startTraceTs + (lf.t - baseFrameT - lf.dt) * 1000;
        const frameEndUs = startTraceTs + (lf.t - baseFrameT) * 1000;

        let frameGcUs = 0;
        let frameLayoutUs = 0;
        let framePaintUs = 0;
        let frameScriptUs = 0;

        for (const ev of timelineEvents) {
            const evStart = ev.ts;
            const evEnd = ev.ts + (ev.dur || 0);
            if (evEnd < frameStartUs || evStart > frameEndUs) continue;

            const overlap = Math.min(evEnd, frameEndUs) - Math.max(evStart, frameStartUs);
            if (overlap <= 0) continue;

            if (ev.name === 'MinorGC' || ev.name === 'MajorGC') {
                frameGcUs += overlap;
            } else if (ev.name === 'Layout' || ev.name === 'UpdateLayoutTree') {
                frameLayoutUs += overlap;
            } else if (ev.name === 'Paint' || ev.name === 'CompositeLayers') {
                framePaintUs += overlap;
            } else if (ev.name === 'FunctionCall' || ev.name === 'EvaluateScript') {
                frameScriptUs += overlap;
            }
        }

        const gcMs = +(frameGcUs / 1000).toFixed(2);
        const layoutMs = +(frameLayoutUs / 1000).toFixed(2);
        const paintMs = +(framePaintUs / 1000).toFixed(2);

        let primaryCause = 'Canvas Render / VFX Script';
        if (gcMs > 3.0) primaryCause = `GC (${gcMs}ms)`;
        else if (layoutMs > 2.0) primaryCause = `Layout (${layoutMs}ms)`;
        else if (paintMs > 2.0) primaryCause = `Paint/Composite (${paintMs}ms)`;

        frameAttributions.push({
            dt: +lf.dt.toFixed(2),
            primaryCause,
            gcMs,
            layoutMs,
            paintMs,
        });
    }

    return {
        scenario,
        round,
        stats,
        gc: {
            totalCount: totalGcCount,
            minorCount: minorGcCount,
            majorCount: majorGcCount,
            totalDurationMs: totalGcDurMs,
            avgDurationMs: avgGcDurMs,
        },
        phases: pageData.phases,
        longFramesCount: longFrames.length,
        topLongFrames: frameAttributions.sort((a, b) => b.dt - a.dt).slice(0, 5),
    };
}

// Interleaved Execution
const allRuns = {};
for (const s of SCENARIOS) {
    allRuns[s] = [];
}

for (let round = 1; round <= ROUNDS; round++) {
    console.log(`\n================================================================`);
    console.log(`  STARTING INTERLEAVED ROUND ${round}/${ROUNDS}`);
    console.log(`================================================================`);

    for (const scenario of SCENARIOS) {
        const result = await runScenarioMeasurement(scenario, round);
        allRuns[scenario].push(result);
    }
}

await browser.close();
await server.close();

// Aggregate results across rounds
const summary = {};

for (const s of SCENARIOS) {
    const runs = allRuns[s];
    const medians = runs.map(r => r.stats.median);
    const p90s = runs.map(r => r.stats.p90);
    const p95s = runs.map(r => r.stats.p95);
    const p99s = runs.map(r => r.stats.p99);
    const maxs = runs.map(r => r.stats.max);
    const onePctLows = runs.map(r => r.stats.onePercentLowFps);
    const fpss = runs.map(r => r.stats.fps);
    const over8_4s = runs.map(r => r.stats.over8_4ms);
    const over16_7s = runs.map(r => r.stats.over16_7ms);
    const gcCounts = runs.map(r => r.gc.totalCount);
    const gcDurs = runs.map(r => r.gc.totalDurationMs);

    summary[s] = {
        medianMs: +median(medians).toFixed(2),
        p90Ms: +median(p90s).toFixed(2),
        p95Ms: +median(p95s).toFixed(2),
        p99Ms: +median(p99s).toFixed(2),
        maxMs: +Math.max(...maxs).toFixed(2),
        fps: +median(fpss).toFixed(1),
        onePercentLowFps: +median(onePctLows).toFixed(1),
        over8_4msTotal: over8_4s.reduce((a, b) => a + b, 0),
        over16_7msTotal: over16_7s.reduce((a, b) => a + b, 0),
        avgGcCount: +(gcCounts.reduce((a, b) => a + b, 0) / ROUNDS).toFixed(1),
        avgGcDurationMs: +(gcDurs.reduce((a, b) => a + b, 0) / ROUNDS).toFixed(2),
        runs,
    };
}

const outputData = {
    timestamp: new Date().toISOString(),
    env: {
        gpu: envInfo.gpu,
        dpr: envInfo.dpr,
        viewport: envInfo.viewport,
        screen: envInfo.screen,
        refreshRate: envInfo.estimatedRefreshRate,
        windowSizeRequirementMet: true,
    },
    config: {
        durationSeconds: DURATION_SECONDS,
        rounds: ROUNDS,
        scenarios: SCENARIOS,
    },
    summary,
};

const jsonPath = join(OUT_DIR, 'perf_frames.json');
writeFileSync(jsonPath, JSON.stringify(outputData, null, 2), 'utf-8');
console.log(`\n[SUCCESS] Results written to ${jsonPath}\n`);

// Print Markdown Summary Table
console.log('### 幀時間分佈與長幀歸因基準表 (2560×1440 @ 239 Hz, DPR 1, RTX 4070)\n');
console.log('| 情境 | Median (ms) | p90 (ms) | p95 (ms) | p99 (ms) | Max (ms) | 1% Low FPS | FPS (avg) | >8.4ms 幀數 | >16.7ms 幀數 | GC 次數/耗時 |');
console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

for (const s of SCENARIOS) {
    const sm = summary[s];
    console.log(`| **${s}** | ${sm.medianMs} | ${sm.p90Ms} | ${sm.p95Ms} | ${sm.p99Ms} | ${sm.maxMs} | **${sm.onePercentLowFps}** | ${sm.fps} | ${sm.over8_4msTotal} | **${sm.over16_7msTotal}** | ${sm.avgGcCount} 次 / ${sm.avgGcDurationMs}ms |`);
}

console.log('\n### 長幀前 5 名歸因拆解 (Top Slow Frames)\n');
for (const s of SCENARIOS) {
    console.log(`#### [${s}]`);
    const allTop = summary[s].runs.flatMap(r => r.topLongFrames).sort((a, b) => b.dt - a.dt).slice(0, 5);
    if (!allTop.length) {
        console.log('  無 >8.4ms 長幀。\n');
    } else {
        for (const f of allTop) {
            console.log(`  - ${f.dt} ms: 主要成因 = ${f.primaryCause} (GC: ${f.gcMs}ms, Layout: ${f.layoutMs}ms, Paint: ${f.paintMs}ms)`);
        }
        console.log('');
    }
}
