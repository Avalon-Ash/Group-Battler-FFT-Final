/**
 * perf-headed.mjs — Real-browser (headed) performance benchmark.
 * Run: `npm run perf:headed`
 *
 * Measures:
 *   - 5 idle terrain scenes (VOID, FOREST, ICE, MAGMA, DESERT)
 *   - manual_battle (units real battle, sustained combat)
 *   - showcase (Showcase cycling + matrix rain, transition frames isolated)
 *
 * Measures 3 interleaved rounds per scenario.
 * Collects both unthrottled throughput (--disable-frame-rate-limit --disable-gpu-vsync)
 * and vsync-capped performance.
 *
 * Output:
 *   - tools/ui-e2e/out/perf_headed.json
 *   - Markdown summary table printed to console
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
    measureScenarioFrames,
} from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const SECONDS_PER_SCENARIO = Number(process.env.PERF_SECONDS || 6);
const ROUNDS = Number(process.env.PERF_ROUNDS || 3);
const isHeadless = process.env.PERF_HEADLESS === '1';
const runUnthrottled = process.env.PERF_UNTHROTTLED !== '0';
const skipVsync = process.env.PERF_SKIP_VSYNC === '1';

const SCENE_IDS = ['VOID', 'FOREST', 'ICE', 'MAGMA', 'DESERT'];
const ALL_SCENARIOS = [...SCENE_IDS, 'manual_battle', 'showcase'];

function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 !== 0 ? s[mid] : +( (s[mid - 1] + s[mid]) / 2 ).toFixed(2);
}

// Start Vite server once
const server = await createServer({
    server: { port: 3195, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?quality=0&perf=1&mute`;

/**
 * Execute measurement session in a browser instance.
 */
async function runSession({ unthrottled = true } = {}) {
    const sessionLabel = unthrottled ? 'Unthrottled (Throughput)' : 'Vsync (Display-Locked)';
    console.log(`\n================================================================`);
    console.log(`  STARTING SESSION: ${sessionLabel.toUpperCase()}`);
    console.log(`================================================================\n`);

    const browser = await launchBrowser({
        headed: !isHeadless,
        unthrottled,
    });

    try {
        const ctx = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 1,
        });
        const page = await ctx.newPage();

        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500);

        const envInfo = await getEnvInfo(page, unthrottled);
        assertMainGpu(envInfo);

        // Map of scenario -> array of round results
        const rawResults = {};
        for (const s of ALL_SCENARIOS) {
            rawResults[s] = [];
        }

        // Interleaved execution: Round 1 (all scenarios) -> Round 2 -> Round 3
        for (let round = 1; round <= ROUNDS; round++) {
            console.log(`\n--- [${sessionLabel}] Round ${round}/${ROUNDS} (Interleaved) ---`);

            for (const scenario of ALL_SCENARIOS) {
                process.stdout.write(`  Measuring [${scenario.padEnd(14)}] ... `);

                if (scenario === 'showcase') {
                    // Navigate fresh to showcase mode
                    await page.goto(baseUrl, { waitUntil: 'networkidle' });
                    await page.waitForTimeout(1500);
                } else if (scenario === 'manual_battle') {
                    // Fresh manual battle with ongoing units
                    await page.goto(baseUrl, { waitUntil: 'networkidle' });
                    await page.waitForTimeout(800);
                    await prepareManualBattle(page, { boostHp: true });
                } else {
                    // One of 5 idle scenes
                    // Ensure manual idle mode
                    await page.getByText('START SIMULATION').click().catch(() => {});
                    await page.waitForTimeout(300);
                    await page.evaluate(async (targetId) => {
                        const mod = await import('/data/scenes.ts');
                        const e = window.__TACTICAL_ENGINE__;
                        const s = mod.SCENE_DB.find((x) => x.id === targetId);
                        if (s && e) {
                            e.currentScene = s;
                            e.map.rebuildMap(e);
                        }
                    }, scenario);
                    await page.waitForTimeout(600);
                }

                const data = await measureScenarioFrames(page, {
                    scenarioName: scenario,
                    durationSeconds: SECONDS_PER_SCENARIO,
                });

                rawResults[scenario].push(data);
                const transMsg = data.transitionCount > 0 ? ` [discarded ${data.transitionCount} trans frames]` : '';
                console.log(`avg: ${data.avgMs.toFixed(2)}ms (${data.fps} FPS) | p95: ${data.p95Ms.toFixed(2)}ms${transMsg}`);
            }
        }

        // Summarize per scenario
        const summarized = ALL_SCENARIOS.map((name) => {
            const list = rawResults[name];
            const avgList = list.map((x) => x.avgMs);
            const medAvg = median(avgList);
            const minAvg = Math.min(...avgList);
            const maxAvg = Math.max(...avgList);
            const fps = +(1000 / Math.max(0.1, medAvg)).toFixed(1);
            const medP95 = median(list.map((x) => x.p95Ms));

            // Aggregate phases
            const phaseKeys = list[0]?.phases ? Object.keys(list[0].phases) : [];
            const aggregatedPhases = {};
            for (const pk of phaseKeys) {
                const values = list.map((x) => x.phases[pk] ?? 0);
                aggregatedPhases[pk] = median(values);
            }

            const totalUsedFrames = list.reduce((a, b) => a + b.count, 0);
            const totalDiscardedFrames = list.reduce((a, b) => a + (b.transitionCount || 0), 0);

            return {
                name,
                medianAvgMs: medAvg,
                minAvgMs: minAvg,
                maxAvgMs: maxAvg,
                fps,
                p95Ms: medP95,
                phases: aggregatedPhases,
                totalUsedFrames,
                totalDiscardedFrames,
                rounds: list,
            };
        });

        await ctx.close();
        await browser.close();

        return {
            unthrottled,
            envInfo,
            summarized,
        };
    } catch (err) {
        await browser.close();
        throw err;
    }
}

try {
    let unthrottledSession = null;
    let vsyncSession = null;

    if (runUnthrottled) {
        unthrottledSession = await runSession({ unthrottled: true });
    }

    if (!skipVsync) {
        vsyncSession = await runSession({ unthrottled: false });
    }

    const primaryEnv = unthrottledSession?.envInfo || vsyncSession?.envInfo;

    console.log('\n================================================================');
    console.log('               PERFORMANCE MEASUREMENT ENVIRONMENT              ');
    console.log('================================================================');
    console.log(`• Device Pixel Ratio (DPR) : ${primaryEnv.dpr}`);
    console.log(`• Screen Resolution         : ${primaryEnv.screen[0]} × ${primaryEnv.screen[1]}`);
    console.log(`• Viewport Size            : ${primaryEnv.viewport[0]} × ${primaryEnv.viewport[1]}`);
    console.log(`• GPU Renderer (Diagnostic) : ${primaryEnv.gpu}`);
    console.log(`• Estimated Refresh Rate   : ${vsyncSession?.envInfo?.estimatedRefreshRate ? `${vsyncSession.envInfo.estimatedRefreshRate} Hz` : 'N/A'}`);
    console.log(`• Execution Mode           : ${isHeadless ? 'Headless' : 'Headed'}`);
    console.log(`• Rounds / Duration        : ${ROUNDS} rounds × ${SECONDS_PER_SCENARIO}s per scenario`);
    console.log('================================================================\n');

    // Build Markdown Output Table
    let md = '';
    md += '### 真機／Headed 效能量測基準表 (3 輪交錯中位數)\n\n';
    md += `> **環境資訊**：DPR ${primaryEnv.dpr} | 解析度 ${primaryEnv.screen[0]}×${primaryEnv.screen[1]} | 模式: ${isHeadless ? 'Headless' : 'Headed'}\n`;
    md += `> **GPU**: \`${primaryEnv.gpu}\`\n`;
    if (vsyncSession?.envInfo?.estimatedRefreshRate) {
        md += `> **螢幕更新率推估**: ~${vsyncSession.envInfo.estimatedRefreshRate} Hz\n`;
    }
    md += '\n';

    md += '| 場景 / 模式 | 取消限制 中位數 (min~max) | 取消限制 FPS | Vsync 中位數 (FPS) | World (JS) | Post (JS) | HUD (JS) | 備註 / 捨棄幀 |\n';
    md += '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |\n';

    for (const name of ALL_SCENARIOS) {
        const u = unthrottledSession?.summarized.find((x) => x.name === name);
        const v = vsyncSession?.summarized.find((x) => x.name === name);

        const uCol = u ? `**${u.medianAvgMs.toFixed(2)} ms** (${u.minAvgMs.toFixed(2)}~${u.maxAvgMs.toFixed(2)})` : '-';
        const uFps = u ? `${u.fps} FPS` : '-';
        const vCol = v ? `${v.medianAvgMs.toFixed(2)} ms (${v.fps} FPS)` : '-';

        const phases = u?.phases || v?.phases || {};
        const world = phases['world'] !== undefined ? `${phases['world'].toFixed(3)}ms` : '-';
        const post = phases['post'] !== undefined ? `${phases['post'].toFixed(3)}ms` : '-';
        const hud = phases['overlay+hud'] !== undefined ? `${phases['overlay+hud'].toFixed(3)}ms` : '-';

        let note = '';
        if (name === 'showcase' && u?.totalDiscardedFrames > 0) {
            note = `交戰幀 ${u.totalUsedFrames}，捨棄轉場幀 ${u.totalDiscardedFrames}`;
        }

        md += `| **\`${name}\`** | ${uCol} | ${uFps} | ${vCol} | ${world} | ${post} | ${hud} | ${note} |\n`;
    }

    console.log('\n' + md);

    const outJson = {
        timestamp: new Date().toISOString(),
        env: {
            ...primaryEnv,
            estimatedRefreshRate: vsyncSession?.envInfo?.estimatedRefreshRate ?? null,
        },
        rounds: ROUNDS,
        secondsPerScenario: SECONDS_PER_SCENARIO,
        unthrottled: unthrottledSession?.summarized ?? null,
        vsync: vsyncSession?.summarized ?? null,
        // Backward-compatible results array
        results: (unthrottledSession?.summarized || vsyncSession?.summarized || []).map((x) => ({
            name: x.name,
            avgMs: x.medianAvgMs,
            fps: x.fps,
            p95Ms: x.p95Ms,
            phases: x.phases,
        })),
        markdown: md,
    };

    const outPath = join(OUT_DIR, 'perf_headed.json');
    writeFileSync(outPath, JSON.stringify(outJson, null, 2));
    console.log(`\nResults written to: ${outPath}\n`);

} finally {
    await server.close();
}
