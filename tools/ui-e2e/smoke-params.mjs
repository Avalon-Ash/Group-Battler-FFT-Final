import { chromium } from 'playwright-core';
import { createServer } from 'vite';

async function runSmokeTests() {
    console.log('== STARTING QUALITY & MUTE SMOKE TESTS ==');
    const server = await createServer({
        server: { port: 5198, strictPort: true },
        logLevel: 'error',
    });
    await server.listen();
    const port = server.config.server.port;
    const origin = `http://localhost:${port}`;

    let browser;
    try {
        browser = await chromium.launch({
            channel: 'msedge',
            headless: true,
            args: ['--window-size=1920,1080'],
        });
    } catch {
        browser = await chromium.launch({
            channel: 'chrome',
            headless: true,
            args: ['--window-size=1920,1080'],
        });
    }

    const testCases = [
        { url: `${origin}/?quality=1`, check: 'quality=1', expectTier: 1 },
        { url: `${origin}/?quality=2`, check: 'quality=2', expectTier: 2 },
        { url: `${origin}/?quality=3`, check: 'quality=3', expectTier: 3 },
        { url: `${origin}/?mute`, check: 'mute flag', expectMute: true },
    ];

    let allPassed = true;
    for (const tc of testCases) {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));

        console.log(`Testing ${tc.check} -> ${tc.url}...`);
        await page.goto(tc.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const checkRes = await page.evaluate(async (tc) => {
            const { getQualityTier } = await import('/engine/renderers/RenderQuality.ts');
            const tier = getQualityTier();
            const engine = window.__TACTICAL_ENGINE__;
            const audioMuted = new URLSearchParams(window.location.search).has('mute');
            return {
                tier,
                engineOk: Boolean(engine),
                audioMuted,
            };
        }, tc);

        if (errors.length > 0) {
            console.error(`[FAIL] ${tc.check}: encountered page errors:`, errors);
            allPassed = false;
        } else if (tc.expectTier !== undefined && checkRes.tier !== tc.expectTier) {
            console.error(`[FAIL] ${tc.check}: expected tier ${tc.expectTier}, got ${checkRes.tier}`);
            allPassed = false;
        } else if (tc.expectMute && !checkRes.audioMuted) {
            console.error(`[FAIL] ${tc.check}: expected muted`);
            allPassed = false;
        } else {
            console.log(`[PASS] ${tc.check}: tier=${checkRes.tier}, engineOk=${checkRes.engineOk}, muted=${checkRes.audioMuted}`);
        }

        await page.close();
    }

    await browser.close();
    await server.close();

    if (!allPassed) {
        console.error('Smoke tests failed!');
        process.exit(1);
    }
    console.log('== ALL QUALITY & MUTE SMOKE TESTS PASSED ==');
}

runSmokeTests().catch((err) => {
    console.error(err);
    process.exit(1);
});
