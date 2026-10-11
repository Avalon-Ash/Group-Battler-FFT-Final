/**
 * Diagnostic tool to read CtxOpCounter operation breakdown in manual_battle.
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

const server = await createServer({ server: { port: 3200, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?perf&perfops&quality=0`;
const browser = await launchBrowser();

const START_TEXT = '\u555f\u52d5\u6230\u8853\u6a21\u64ec';
const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9';

try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    // Transition to manual battle
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(600);
    await page.locator(`button[title="${DICE_TITLE}"]`).click();
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__TACTICAL_ENGINE__?.play());

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
