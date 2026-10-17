/**
 * Faction readability screenshot (mixed battle, deterministic).
 * Same harness as render-fidelity.mjs (seeded Math.random, synthetic time, manual rAF),
 * captures the battle_frozen frame plus a later frame with more spread-out units.
 *
 * Run: node tools/ui-e2e/faction-shot.mjs --tag=before   (or --tag=after)
 * Output: tools/ui-e2e/out/faction/<tag>_frozen.png, <tag>_t300.png (gitignored)
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out', 'faction');
mkdirSync(OUT_DIR, { recursive: true });

const tagArg = process.argv.find((a) => a.startsWith('--tag='));
const tag = tagArg ? tagArg.slice('--tag='.length) : 'shot';
const START_TEXT = '啟動戰術模擬'; // 啟動戰術模擬
const DICE_TITLE = '隨機生成戰場與陣容'; // 隨機生成戰場與陣容

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    }
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

const server = await createServer({
    server: { port: 3197, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const save = (name, dataUrl) => {
    const dest = join(OUT_DIR, name);
    writeFileSync(dest, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log(dest);
};

const grab = (page) => page.evaluate(() => document.querySelector('canvas')?.toDataURL('image/png') ?? null);

try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
        let seed = 1337;
        Math.random = () => {
            let t = (seed += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        let syntheticTime = 1000.0;
        window.__resetSeed = (s = 1337) => { seed = s; syntheticTime = 1000.0; };
        Date.now = () => Math.floor(syntheticTime);
        performance.now = () => syntheticTime;
        let rafId = 0;
        const rafCallbacks = new Map();
        window.requestAnimationFrame = (cb) => { const id = ++rafId; rafCallbacks.set(id, cb); return id; };
        window.cancelAnimationFrame = (id) => { rafCallbacks.delete(id); };
        window.__stepFrames = (n = 1) => {
            for (let i = 0; i < n; i++) {
                syntheticTime += 16.666666666666668;
                const callbacks = Array.from(rafCallbacks.entries());
                rafCallbacks.clear();
                for (const [, cb] of callbacks) cb(syntheticTime);
            }
        };
    });

    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));

    await page.evaluate(async () => {
        window.__resetSeed(42);
        const mod = await import('/data/scenes.ts');
        const e = window.__TACTICAL_ENGINE__;
        e.currentScene = mod.SCENE_DB[0];
        e.map.rebuildMap(e);
    });
    await page.evaluate(() => window.__stepFrames(5));
    const clicked = await page.evaluate((title) => {
        const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.title === title);
        btns.forEach((b) => b.click());
        return btns.length;
    }, DICE_TITLE);
    if (clicked !== 1) throw new Error(`dice button matched ${clicked} elements`);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__stepFrames(5));
    // Faction textures load asynchronously (fetch + Image decode); give them real time to land.
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__TACTICAL_ENGINE__?.play());
    await page.evaluate(() => window.__stepFrames(120));
    const agents = await page.evaluate(() => window.__TACTICAL_ENGINE__.agents.map((a) => `${a.team}:${a.role}`));
    console.log(`agents=${agents.length} ${agents.join(' ')}`);
    save(`${tag}_frozen.png`, await grab(page));
    await page.evaluate(() => window.__stepFrames(180));
    save(`${tag}_t300.png`, await grab(page));

    // Pedestal sheet: every Team x Role, FLAT and POINTY, at 2x (same module instance as the app).
    const sheet = await page.evaluate(async () => {
        const { SpriteManager } = await import('/engine/sprites.ts');
        const roles = ['TANK', 'WARRIOR', 'RANGER', 'MAGE', 'SUPPORT'];
        const cell = 256;
        const c = document.createElement('canvas');
        c.width = cell * roles.length;
        c.height = cell * 4;
        const g = c.getContext('2d');
        g.fillStyle = '#1f3d2a';
        g.fillRect(0, 0, c.width, c.height);
        let row = 0;
        for (const layout of ['FLAT', 'POINTY']) {
            for (const team of [0, 1]) {
                roles.forEach((role, i) => {
                    const a = SpriteManager.getUnitImages(role, team, 'MALE', layout);
                    g.drawImage(a.base, i * cell, row * cell, cell, cell);
                    // core: world offset (13, -26) at 2x, sprite 64 canvas units * UNIT_SCALE 0.65 * 2
                    const cs = 64 * 0.65 * 2;
                    const cx = i * cell + cell / 2 + 26 - cs / 2, cy = row * cell + cell / 2 - 52 - cs / 2;
                    g.globalCompositeOperation = 'lighter';
                    g.globalAlpha = 0.5;
                    g.drawImage(a.core.glow, cx, cy, cs, cs);
                    g.globalCompositeOperation = 'source-over';
                    g.globalAlpha = 1;
                    g.drawImage(a.core.body, cx, cy, cs, cs);
                });
                row++;
            }
        }
        return c.toDataURL('image/png');
    });
    save(`${tag}_pedestals.png`, sheet);
    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}
