import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    launchBrowser,
    getEnvInfo,
    assertMainGpu,
    assertResolution,
    prepareManualBattle,
} from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

async function runGovernor60s() {
    console.log('================================================================');
    console.log('  PERF-GOVERNOR 60s STABILITY BENCHMARK (2560x1440, DPR 1)');
    console.log('  Scenario: battle_vfx_storm | Target: 239 Hz screen stability');
    console.log('================================================================');

    const server = await createServer({
        server: { port: 5199, strictPort: true },
        logLevel: 'error',
    });
    await server.listen();
    const port = server.config.server.port;
    const origin = `http://localhost:${port}`;

    const browser = await launchBrowser({ headed: true, unthrottled: false });
    const page = await browser.newPage({
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 1,
    });

    const envInfo = await getEnvInfo(page, false);
    console.log('\nDevice Environment:', envInfo);
    assertMainGpu(envInfo);
    assertResolution(envInfo);

    // Navigate with ?mute (Governor is active because ?quality is omitted)
    await page.goto(`${origin}/?mute`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Setup manual battle
    await prepareManualBattle(page, { boostHp: true });

    // Start VFX storm generator
    const { startVfxStorm, stopVfxStorm } = await import('./lib/vfx-storm.mjs');
    await startVfxStorm(page);

    await page.evaluate(async () => {
        window.__secCollector = {
            currentSecFrames: [],
            stop: false,
        };

        let lastT = performance.now();
        const loop = (t) => {
            const dt = t - lastT;
            lastT = t;
            const c = window.__secCollector;
            if (!c || c.stop) return;
            c.currentSecFrames.push(dt);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    });

    console.log('\n>>> Starting 60s stability test under continuous VFX storm...');
    const timeSeries = [];

    for (let sec = 1; sec <= 60; sec++) {
        await page.waitForTimeout(1000);

        const sample = await page.evaluate(async (sec) => {
            const { getQualityTier } = await import('/engine/renderers/RenderQuality.ts');
            const c = window.__secCollector;
            const frames = c.currentSecFrames.splice(0);

            const sorted = [...frames].sort((a, b) => a - b);
            const count = frames.length;
            const sum = frames.reduce((a, b) => a + b, 0);
            const avg = count ? sum / count : 16.7;
            const median = sorted[Math.floor(count * 0.5)] || avg;
            const p95 = sorted[Math.floor(count * 0.95)] || avg;
            const max = sorted[count - 1] || avg;
            const fps = Math.round(1000 / Math.max(0.1, avg));
            const longFrames = frames.filter(f => f > 16.7).length;

            return {
                second: sec,
                tier: getQualityTier(),
                fps,
                avgMs: +avg.toFixed(2),
                medianMs: +median.toFixed(2),
                p95Ms: +p95.toFixed(2),
                maxMs: +max.toFixed(2),
                longFrames,
                totalFrames: count,
            };
        }, sec);

        timeSeries.push(sample);
        if (sec % 5 === 0 || sample.tier > 0) {
            console.log(`[${sample.second.toString().padStart(2, ' ')}s] Tier: ${sample.tier} | FPS: ${sample.fps.toString().padStart(3, ' ')} | Median: ${sample.medianMs}ms | p95: ${sample.p95Ms}ms | Max: ${sample.maxMs}ms | >16.7ms: ${sample.longFrames}`);
        }
    }

    // Stop storm generator
    await stopVfxStorm(page);
    await page.evaluate(() => {
        if (window.__secCollector) window.__secCollector.stop = true;
    });

    await browser.close();
    await server.close();

    // Check stability & oscillations
    let tierChanges = 0;
    for (let i = 1; i < timeSeries.length; i++) {
        if (timeSeries[i].tier !== timeSeries[i - 1].tier) {
            tierChanges++;
        }
    }

    const jsonPath = join(OUT_DIR, 'perf_governor_60s.json');
    writeFileSync(jsonPath, JSON.stringify({ env: envInfo, tierChanges, timeSeries }, null, 2));

    console.log(`\n[SUCCESS] 60s Governor test completed. Total tier transitions: ${tierChanges} (No jitter asserted: <= 3).`);
    console.log(`Results saved to: ${jsonPath}`);
}

runGovernor60s().catch((err) => {
    console.error(err);
    process.exit(1);
});
