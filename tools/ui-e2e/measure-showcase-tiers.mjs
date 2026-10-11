import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch {}
    }
    throw new Error('No Edge/Chrome found.');
};

const server = await createServer({ server: { port: 3203, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const measureTier = async (tier) => {
    console.log(`\n== Measuring Showcase at ?quality=${tier} ==`);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${base}?quality=${tier}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Save screenshot
    const shot = await page.screenshot();
    writeFileSync(join(OUT, `showcase_q${tier}.png`), shot);

    // Measure frame time over 4 seconds
    await page.evaluate(() => {
        window.__frames = [];
        window.__stop = false;
        let last = performance.now();
        const loop = (t) => {
            window.__frames.push(t - last);
            last = t;
            if (!window.__stop) requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    });

    await page.waitForTimeout(4000);

    const data = await page.evaluate(() => {
        window.__stop = true;
        const frames = window.__frames.slice(2);
        const avg = frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length);
        return {
            avgMs: +avg.toFixed(2),
            fps: +(1000 / avg).toFixed(1),
            totalFrames: frames.length,
        };
    });

    console.log(`Tier ${tier}: avgMs=${data.avgMs}ms (${data.fps} FPS)`);
    await ctx.close();
    return data;
};

try {
    const r0 = await measureTier(0);
    const r1 = await measureTier(1);
    const r2 = await measureTier(2);
    const results = { tier0: r0, tier1: r1, tier2: r2 };
    console.log('\nShowcase Tier Comparison Summary:', JSON.stringify(results, null, 2));
    writeFileSync(join(OUT, 'perf_showcase_tiers.json'), JSON.stringify(results, null, 2));
} finally {
    await browser.close();
    await server.close();
}
