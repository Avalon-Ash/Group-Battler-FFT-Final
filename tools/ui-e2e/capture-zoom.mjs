import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
mkdirSync(OUT, { recursive: true });

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found.');
};

const server = await createServer({ server: { port: 3198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Enter manual simulation mode
    await page.getByText('\u555f\u52d5\u6230\u8853\u6a21\u64ec').click();
    await page.waitForTimeout(1000);

    const zoomLevels = [0.5, 1.0, 2.0, 3.0];
    for (const zoom of zoomLevels) {
        await page.evaluate((z) => {
            const e = window.__TACTICAL_ENGINE__;
            e.bus.emit('UI_COMMAND', { type: 'CAMERA_SNAP', x: e.renderer.camera.x, y: e.renderer.camera.y, zoom: z });
        }, zoom);
        await page.waitForTimeout(500);

        const canvas = page.locator('canvas').first();
        const buf = await canvas.screenshot();
        const filename = `zoom_${zoom}x.png`;
        writeFileSync(join(OUT, filename), buf);
        console.log(`Saved screenshot for zoom ${zoom}x -> tools/ui-e2e/out/${filename}`);
    }
} finally {
    await browser.close();
    await server.close();
}
