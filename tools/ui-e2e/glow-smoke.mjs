/**
 * glow-smoke.mjs — Smoke test for ?glow=1
 * Verifies canvas opens, clicks to select agent, and checks 0 page errors.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const START_TEXT = 'START SIMULATION';
const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9'; // 隨機生成戰場與陣容

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    }
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found.');
};

const server = await createServer({
    server: { port: 3199, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const pageErrors = [];

try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();

    page.on('pageerror', (err) => {
        pageErrors.push(err.message);
    });

    console.log('Navigating to ?quality=0&glow=1...');
    await page.goto(`${baseUrl}?quality=0&glow=1`, { waitUntil: 'networkidle' });

    // Verify canvas rendered
    const canvas = await page.locator('canvas').first();
    const isCanvasVisible = await canvas.isVisible();
    if (!isCanvasVisible) throw new Error('Canvas is not visible');
    console.log('PASS: Canvas rendered and visible');

    // Click start tactical simulation
    const startBtn = page.getByText(START_TEXT);
    if (await startBtn.isVisible()) {
        await startBtn.click();
        await page.waitForTimeout(500);
        console.log('PASS: Clicked start simulation button');
    }

    // Click random generate button
    const diceBtn = page.locator(`button[title="${DICE_TITLE}"]`);
    if (await diceBtn.isVisible()) {
        await diceBtn.click({ force: true });
        await page.waitForTimeout(500);
        console.log('PASS: Clicked generate teams');
    }

    // Verify agents exist and can be selected
    const agentCount = await page.evaluate(() => {
        const engine = window.__TACTICAL_ENGINE__;
        return engine?.agents?.length ?? 0;
    });
    console.log(`Agent count: ${agentCount}`);
    if (agentCount === 0) throw new Error('No agents spawned');

    // Click center of screen to select / interact
    await page.mouse.click(640, 360);
    await page.waitForTimeout(300);

    // Verify glow flag active in engine
    const isGlowActive = await page.evaluate(async () => {
        const mod = await import('/engine/renderers/RenderQuality.ts');
        return mod.isGlowSpritesEnabled();
    });
    console.log(`isGlowSpritesEnabled: ${isGlowActive}`);
    if (!isGlowActive) throw new Error('isGlowSpritesEnabled was false with ?glow=1');

    if (pageErrors.length > 0) {
        throw new Error(`Page errors detected: ${pageErrors.join('; ')}`);
    }

    console.log('\nALL SMOKE CHECKS PASSED with ?glow=1 (0 page errors).');
} finally {
    await browser.close();
    await server.close();
}
