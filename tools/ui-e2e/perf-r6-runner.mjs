/**
 * perf-r6-runner.mjs
 * R6: Run standalone baked-terrain-proto.html benchmark on primary GPU with unthrottled rAF.
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
    server: { port: 3188, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const protoUrl = `${server.resolvedUrls.local[0]}tools/baked-terrain-proto.html`;

console.log('== R6: BAKED TERRAIN HEIGHT-BANDED PROTOTYPE BENCHMARK ==\n');
console.log(`Target: ${protoUrl}`);

const browser = await launchBrowser({ headed: true, unthrottled: true });
try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(protoUrl, { waitUntil: 'networkidle' });

    const envInfo = await getEnvInfo(page, true);
    assertMainGpu(envInfo);

    console.log(`GPU: ${envInfo.gpu}`);
    console.log(`Running 300-frame benchmark comparing Per-Hex Blit vs 2-Layer Height-Banded Baked...`);

    const result = await page.evaluate(async () => {
        return await window.runBenchmark(300);
    });

    console.log('\n-- BENCHMARK RESULTS --');
    console.log(`1. Per-Hex Blit (Baseline):`);
    console.log(`   Median: ${result.perHex.median.toFixed(3)} ms | Avg: ${result.perHex.avg.toFixed(3)} ms | FPS: ${result.perHex.fps.toFixed(1)}`);
    console.log(`2. 2-Layer Height-Banded Baked:`);
    console.log(`   Median: ${result.baked2Layer.median.toFixed(3)} ms | Avg: ${result.baked2Layer.avg.toFixed(3)} ms | FPS: ${result.baked2Layer.fps.toFixed(1)}`);
    console.log(`Delta: ${result.deltaMs > 0 ? '+' : ''}${result.deltaMs.toFixed(3)} ms (${result.pct}%)`);

    writeFileSync(join(OUT, 'perf_r6_baked.json'), JSON.stringify({ env: envInfo, result }, null, 2));
    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}

console.log('\nPrototype benchmark complete. Result saved to tools/ui-e2e/out/perf_r6_baked.json');
