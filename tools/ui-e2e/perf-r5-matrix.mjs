/**
 * perf-r5-matrix.mjs
 * Measure Showcase mode across quality tiers 0, 1, 2 with 3 interleaved rounds on primary GPU.
 */
import { createServer } from 'vite';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, getEnvInfo, assertMainGpu } from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
mkdirSync(OUT, { recursive: true });

const server = await createServer({
    server: { port: 3190, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];

const browser = await launchBrowser({ headed: true, unthrottled: true });

const measureTier = async (tier) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}?quality=${tier}&perf`, { waitUntil: 'networkidle' });
    const envInfo = await getEnvInfo(page, true);
    assertMainGpu(envInfo);

    await page.waitForTimeout(1000);
    const result = await page.evaluate(async () => {
        return new Promise((resolve) => {
            const d = [];
            let last = performance.now();
            const start = last;
            const frame = (now) => {
                d.push(now - last);
                last = now;
                if (now - start < 3000) {
                    requestAnimationFrame(frame);
                } else {
                    const clean = d.slice(5);
                    clean.sort((a, b) => a - b);
                    const median = clean[Math.floor(clean.length / 2)];
                    const avg = clean.reduce((a, b) => a + b, 0) / clean.length;
                    resolve({ median, avg, min: clean[0], max: clean[clean.length - 1], count: clean.length });
                }
            };
            requestAnimationFrame(frame);
        });
    });

    await ctx.close();
    return result;
};

try {
    console.log('== MEASURING SHOWCASE QUALITY TIERS (0, 1, 2) OVER 3 INTERLEAVED ROUNDS ==\n');
    const records = { tier0: [], tier1: [], tier2: [] };

    for (let round = 1; round <= 3; round++) {
        console.log(`-- Round ${round} --`);
        const t0 = await measureTier(0);
        console.log(`  Tier 0: ${t0.avg.toFixed(3)} ms (${(1000 / t0.avg).toFixed(1)} FPS) [median: ${t0.median.toFixed(3)}]`);
        records.tier0.push(t0.avg);

        const t1 = await measureTier(1);
        console.log(`  Tier 1: ${t1.avg.toFixed(3)} ms (${(1000 / t1.avg).toFixed(1)} FPS) [median: ${t1.median.toFixed(3)}]`);
        records.tier1.push(t1.avg);

        const t2 = await measureTier(2);
        console.log(`  Tier 2: ${t2.avg.toFixed(3)} ms (${(1000 / t2.avg).toFixed(1)} FPS) [median: ${t2.median.toFixed(3)}]`);
        records.tier2.push(t2.avg);
    }

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const med = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];

    const summary = {
        tier0: { avg: +avg(records.tier0).toFixed(3), median: +med(records.tier0).toFixed(3), rounds: records.tier0 },
        tier1: { avg: +avg(records.tier1).toFixed(3), median: +med(records.tier1).toFixed(3), rounds: records.tier1 },
        tier2: { avg: +avg(records.tier2).toFixed(3), median: +med(records.tier2).toFixed(3), rounds: records.tier2 },
    };

    console.log('\n-- SUMMARY --');
    console.log(`Tier 0 Median: ${summary.tier0.median} ms`);
    console.log(`Tier 1 Median: ${summary.tier1.median} ms`);
    console.log(`Tier 2 Median: ${summary.tier2.median} ms`);

    writeFileSync(join(OUT, 'perf_matrix_rain.json'), JSON.stringify(summary, null, 2));
} finally {
    await browser.close();
    await server.close();
}
