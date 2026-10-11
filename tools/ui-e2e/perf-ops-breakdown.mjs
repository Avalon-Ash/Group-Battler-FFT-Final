/**
 * Diagnostic tool to read CtxOpCounter operation breakdown in manual_battle.
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
} from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');

const isHeadless = process.env.PERF_HEADED !== '1';
const unthrottled = process.env.PERF_UNTHROTTLED !== '0';

const server = await createServer({ server: { port: 3200, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?perf&perfops&quality=0`;
const browser = await launchBrowser({ headed: !isHeadless, unthrottled });

try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const envInfo = await getEnvInfo(page, unthrottled);
    assertMainGpu(envInfo);

    // Transition to manual battle with DOM click and agent assertion
    await prepareManualBattle(page, { boostHp: true });

    // Run battle for 6 seconds to accumulate EMA stats
    await page.waitForTimeout(6000);

    const data = await page.evaluate(async () => {
        const { CtxOpCounter } = await import('/engine/renderers/CtxOpCounter.ts');
        return {
            enabled: CtxOpCounter.enabled,
            summary: CtxOpCounter.formatSummary(),
            latestCounts: CtxOpCounter.getLatestCounts(),
            emaCounts: CtxOpCounter.getCounts(),
            scopeCounts: CtxOpCounter.getScopeCounts(),
            scopeTimes: CtxOpCounter.getScopeTimes(),
        };
    });

    console.log('Battle Op Counts Result:', JSON.stringify(data, null, 2));
    writeFileSync(join(OUT, 'perf_ops_battle.json'), JSON.stringify(data, null, 2));
    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}
