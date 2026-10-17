/**
 * tools/assets/create-battle-comparison.mjs
 * Generates side-by-side before/after comparison PNG for battle_frozen (Task A2c):
 * Left: Baseline before unit sprite migration (Procedural)
 * Right: Current render with 3D pre-rendered fantasy sprites
 * Output: tools/ui-e2e/out/art_before_after_battle_frozen.png
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const BASELINE_PATH = join(ROOT, 'tools', 'ui-e2e', 'baseline', 'fidelity', 'battle_frozen.png');
const OUT_DIR = join(ROOT, 'tools', 'ui-e2e', 'out');
const OUT_FILE = join(OUT_DIR, 'art_before_after_battle_frozen.png');
mkdirSync(OUT_DIR, { recursive: true });

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

async function main() {
    console.log('[battle-comparison] Starting before/after comparison generation...');
    if (!existsSync(BASELINE_PATH)) {
        throw new Error(`Baseline not found: ${BASELINE_PATH}`);
    }
    const beforeBuf = readFileSync(BASELINE_PATH);
    const beforeDataUrl = `data:image/png;base64,${beforeBuf.toString('base64')}`;

    const server = await createServer({
        configFile: join(ROOT, 'vite.config.ts'),
        server: { port: 5183, host: '127.0.0.1' },
        logLevel: 'error',
    });
    await server.listen();

    const browser = await launchBrowser();
    const ctx = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    // Deterministic init script
    await page.addInitScript(() => {
        let seed = 1337;
        function mulberry32() {
            let t = (seed += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        Math.random = mulberry32;
        let syntheticTime = 1000.0;
        window.__resetSeed = (s = 1337) => { window.__TACTICAL_ENGINE__?.seedSimulation?.(s); /* 模擬流與 Math.random 分離，需一併重設 */
            seed = s;
            syntheticTime = 1000.0;
        };
        Date.now = () => Math.floor(syntheticTime);
        performance.now = () => syntheticTime;

        let rafId = 0;
        const rafCallbacks = new Map();
        window.requestAnimationFrame = (cb) => {
            const id = ++rafId;
            rafCallbacks.set(id, cb);
            return id;
        };
        window.cancelAnimationFrame = (id) => {
            rafCallbacks.delete(id);
        };

        window.__stepFrames = (n = 1) => {
            for (let i = 0; i < n; i++) {
                syntheticTime += 16.666666666666668;
                const callbacks = Array.from(rafCallbacks.entries());
                rafCallbacks.clear();
                for (const [, cb] of callbacks) {
                    cb(syntheticTime);
                }
            }
        };
    });

    await page.goto('http://127.0.0.1:5183/?mute&quality=0', { waitUntil: 'networkidle' });

    // Capture current battle_frozen
    console.log('[battle-comparison] Capturing current battle_frozen in sprite mode...');
    await page.evaluate(async () => {
        window.__resetSeed(42);
        const mod = await import('/data/scenes.ts');
        const e = window.__TACTICAL_ENGINE__;
        e.currentScene = mod.SCENE_DB[0];
        e.map.rebuildMap(e);
    });
    await page.evaluate(() => window.__stepFrames(5));

    // Click dice button
    const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9';
    await page.evaluate((title) => {
        const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.title === title);
        btns.forEach((b) => b.click());
    }, DICE_TITLE);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__stepFrames(5));

    // Start simulation
    await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        e?.play();
    });
    // Advance 120 frames
    await page.evaluate(() => window.__stepFrames(120));

    const afterDataUrl = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.toDataURL('image/png') : null;
    });

    if (!afterDataUrl) {
        throw new Error('Failed to capture after frame');
    }

    console.log('[battle-comparison] Stitching before and after images...');
    const stitchedDataUrl = await page.evaluate(({ beforeSrc, afterSrc }) => {
        return new Promise((resolve) => {
            const imgBefore = new Image();
            const imgAfter = new Image();
            let loaded = 0;
            const onLoaded = () => {
                loaded++;
                if (loaded < 2) return;

                const w = imgBefore.width;
                const h = imgBefore.height;
                const headerH = 50;

                const canvas = document.createElement('canvas');
                canvas.width = w * 2 + 8;
                canvas.height = h + headerH;
                const ctx = canvas.getContext('2d');

                // Dark background
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Header banners
                ctx.font = 'bold 20px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Before banner
                ctx.fillStyle = '#ef4444';
                ctx.fillText('BEFORE (Procedural Core Art — Baseline A1b)', w / 2, headerH / 2);

                // After banner
                ctx.fillStyle = '#38bdf8';
                ctx.fillText('AFTER (KayKit 3D Pre-rendered Fantasy Sprites — A2c)', w + 8 + w / 2, headerH / 2);

                // Divider line
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(w + 4, 0);
                ctx.lineTo(w + 4, canvas.height);
                ctx.stroke();

                // Draw frames
                ctx.drawImage(imgBefore, 0, headerH, w, h);
                ctx.drawImage(imgAfter, w + 8, headerH, w, h);

                resolve(canvas.toDataURL('image/png'));
            };

            imgBefore.onload = onLoaded;
            imgAfter.onload = onLoaded;
            imgBefore.src = beforeSrc;
            imgAfter.src = afterSrc;
        });
    }, { beforeSrc: beforeDataUrl, afterSrc: afterDataUrl });

    const outBuf = Buffer.from(stitchedDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    writeFileSync(OUT_FILE, outBuf);
    console.log(`[battle-comparison] Successfully saved: ${OUT_FILE} (${Math.round(outBuf.length / 1024)} KB)`);

    await ctx.close();
    await browser.close();
    await server.close();
}

main().catch((err) => {
    console.error('[battle-comparison] Error:', err);
    process.exit(1);
});
