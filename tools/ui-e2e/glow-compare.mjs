/**
 * glow-compare.mjs — Compare rendering with glow=0 vs glow=1
 * Generates side-by-side comparison images and calculates meanAbsDiff / badPixelPct,
 * and measures manual_battle performance delta between glow=0 and glow=1.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

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
    server: { port: 3198, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const createHarnessContext = async (glow = 0) => {
    const ctx = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    await page.addInitScript(() => {
        let seed = 1337;
        function mulberry32() {
            let t = (seed += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        Math.random = mulberry32;
        window.__resetSeed = (s = 1337) => { window.__TACTICAL_ENGINE__?.seedSimulation?.(s); /* 模擬流與 Math.random 分離，需一併重設 */ seed = s; };

        let syntheticTime = 1000.0;
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
            for (let step = 0; step < n; step++) {
                syntheticTime += 16.666666666666668;
                const cbs = Array.from(rafCallbacks.entries());
                rafCallbacks.clear();
                for (const [, cb] of cbs) {
                    try { cb(syntheticTime); } catch (e) { console.error('rAF error', e); }
                }
            }
        };

        window.__compareImageData = async (currentDataUrl, baselineDataUrl) => {
            const loadImg = (src) => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

            const [imgCurr, imgBase] = await Promise.all([loadImg(currentDataUrl), loadImg(baselineDataUrl)]);
            const w = imgCurr.naturalWidth;
            const h = imgCurr.naturalHeight;
            const cCurr = document.createElement('canvas');
            const cBase = document.createElement('canvas');
            cCurr.width = cBase.width = w;
            cCurr.height = cBase.height = h;
            const ctxCurr = cCurr.getContext('2d', { willReadFrequently: true });
            const ctxBase = cBase.getContext('2d', { willReadFrequently: true });
            ctxCurr.drawImage(imgCurr, 0, 0);
            ctxBase.drawImage(imgBase, 0, 0);
            const dCurr = ctxCurr.getImageData(0, 0, w, h).data;
            const dBase = ctxBase.getImageData(0, 0, w, h).data;

            let totalPixels = w * h;
            let badPixels = 0;
            let sumDiff = 0;

            for (let i = 0; i < dCurr.length; i += 4) {
                const dr = Math.abs(dCurr[i] - dBase[i]);
                const dg = Math.abs(dCurr[i + 1] - dBase[i + 1]);
                const db = Math.abs(dCurr[i + 2] - dBase[i + 2]);
                const da = Math.abs(dCurr[i + 3] - dBase[i + 3]);
                const maxCh = Math.max(dr, dg, db, da);
                sumDiff += (dr + dg + db + da) / 4;
                if (maxCh > 8) {
                    badPixels++;
                }
            }

            const meanAbsDiff = +(sumDiff / totalPixels).toFixed(4);
            const badPixelPct = +((badPixels / totalPixels) * 100).toFixed(4);
            return { meanAbsDiff, badPixelPct, totalPixels, w, h };
        };

        window.__createSideBySide = async (urlLeft, urlRight, labelLeft, labelRight) => {
            const loadImg = (src) => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

            const [imgL, imgR] = await Promise.all([loadImg(urlLeft), loadImg(urlRight)]);
            const w = imgL.naturalWidth;
            const h = imgL.naturalHeight;
            const c = document.createElement('canvas');
            c.width = w * 2;
            c.height = h;
            const ctx = c.getContext('2d');
            ctx.drawImage(imgL, 0, 0);
            ctx.drawImage(imgR, w, 0);

            // Add labels
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 320, 34);
            ctx.fillRect(w + 10, 10, 320, 34);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(labelLeft, 20, 34);
            ctx.fillText(labelRight, w + 20, 34);

            return c.toDataURL('image/png');
        };

        window.__createCropComparison = async (urlLeft, urlRight, labelLeft, labelRight, cx = 490, cy = 250, cw = 300, ch = 220) => {
            const loadImg = (src) => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

            const [imgL, imgR] = await Promise.all([loadImg(urlLeft), loadImg(urlRight)]);
            const scale = 2;
            const c = document.createElement('canvas');
            c.width = cw * scale * 2 + 10;
            c.height = ch * scale + 40;
            const ctx = c.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, c.width, c.height);

            // Left crop (scaled)
            ctx.drawImage(imgL, cx, cy, cw, ch, 0, 40, cw * scale, ch * scale);
            // Right crop (scaled)
            ctx.drawImage(imgR, cx, cy, cw, ch, cw * scale + 10, 40, cw * scale, ch * scale);

            // Labels
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText(`${labelLeft} [2x Zoom]`, 10, 26);
            ctx.fillText(`${labelRight} [2x Zoom]`, cw * scale + 20, 26);

            return c.toDataURL('image/png');
        };
    });

    await page.goto(`${baseUrl}?quality=0&glow=${glow}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));

    return { ctx, page };
};

const captureBattleFrozen = async (page) => {
    await page.evaluate(async () => {
        window.__resetSeed(42);
        const mod = await import('/data/scenes.ts');
        const e = window.__TACTICAL_ENGINE__;
        e.currentScene = mod.SCENE_DB[0];
        e.map.rebuildMap(e);
    });
    await page.evaluate(() => window.__stepFrames(5));
    await page.evaluate((title) => { Array.from(document.querySelectorAll('button')).filter((b) => b.title === title).forEach((b) => b.click()); }, DICE_TITLE);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__stepFrames(5));
    await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        e?.play();
    });
    await page.evaluate(() => window.__stepFrames(120));
    return await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.toDataURL('image/png') : null;
    });
};

const captureBattleAtFrame = async (page, frameCount) => {
    await page.evaluate(async () => {
        window.__resetSeed(42);
        const mod = await import('/data/scenes.ts');
        const e = window.__TACTICAL_ENGINE__;
        e.currentScene = mod.SCENE_DB[0];
        e.map.rebuildMap(e);
    });
    await page.evaluate(() => window.__stepFrames(5));
    await page.evaluate((title) => { Array.from(document.querySelectorAll('button')).filter((b) => b.title === title).forEach((b) => b.click()); }, DICE_TITLE);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__stepFrames(5));
    await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        e?.play();
    });
    await page.evaluate((fc) => window.__stepFrames(fc), frameCount);
    return await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.toDataURL('image/png') : null;
    });
};

const scenesToCompare = [
    { id: 'battle_frozen_120', name: 'Battle Mid-Clash (Frame 120)', fn: (p) => captureBattleFrozen(p) },
    { id: 'battle_frozen_60', name: 'Battle Early Contact (Frame 60)', fn: (p) => captureBattleAtFrame(p, 60) },
    { id: 'battle_frozen_180', name: 'Battle Skills & Low-HP (Frame 180)', fn: (p) => captureBattleAtFrame(p, 180) },
];

console.log('== COMPARING VISUAL FIDELITY & GENERATING SIDE-BY-SIDE IMAGES (glow=0 vs glow=1) ==\n');

const results = [];

try {
    for (const sc of scenesToCompare) {
        console.log(`Testing Scene: ${sc.name} (${sc.id})`);
        
        // Capture with glow=0
        const h0 = await createHarnessContext(0);
        const img0 = await sc.fn(h0.page);
        await h0.ctx.close();

        // Capture with glow=1
        const h1 = await createHarnessContext(1);
        const img1 = await sc.fn(h1.page);

        // Compare
        const diff = await h1.page.evaluate(({ c0, c1 }) => window.__compareImageData(c1, c0), { c0: img0, c1: img1 });
        
        // Side by side
        const sideBySideUrl = await h1.page.evaluate(
            ({ left, right, l1, l2 }) => window.__createSideBySide(left, right, l1, l2),
            { left: img0, right: img1, l1: 'glow=0 (HUD glow off)', l2: 'glow=1 (HUD glow on)' }
        );

        // Crop side by side
        const cropUrl = await h1.page.evaluate(
            ({ left, right, l1, l2 }) => window.__createCropComparison(left, right, l1, l2),
            { left: img0, right: img1, l1: 'glow=0', l2: 'glow=1' }
        );
        await h1.ctx.close();

        const outPath = join(OUT_DIR, `glow_compare_${sc.id}.png`);
        writeFileSync(outPath, Buffer.from(sideBySideUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));

        const cropPath = join(OUT_DIR, `glow_crop_${sc.id}.png`);
        writeFileSync(cropPath, Buffer.from(cropUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));

        console.log(`  -> meanAbsDiff: ${diff.meanAbsDiff.toFixed(4)}, badPixelPct: ${diff.badPixelPct.toFixed(2)}%`);
        console.log(`  -> Saved side-by-side: ${outPath}`);
        console.log(`  -> Saved zoom crop: ${cropPath}\n`);

        results.push({
            id: sc.id,
            name: sc.name,
            meanAbsDiff: diff.meanAbsDiff,
            badPixelPct: diff.badPixelPct,
            file: `tools/ui-e2e/out/glow_compare_${sc.id}.png`,
            cropFile: `tools/ui-e2e/out/glow_crop_${sc.id}.png`,
        });
    }

    console.log('== MEASURING PERFORMANCE A/B FOR BATTLE (glow=0 vs glow=1) ==\n');
    
    // Measure 6s of manual_battle with unthrottled rAF
    const measurePerf = async (glowVal) => {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        await page.goto(`${baseUrl}?quality=0&glow=${glowVal}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        await page.getByText(START_TEXT).click();
        await page.waitForTimeout(500);
        await page.evaluate((title) => { Array.from(document.querySelectorAll('button')).filter((b) => b.title === title).forEach((b) => b.click()); }, DICE_TITLE);
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            const e = window.__TACTICAL_ENGINE__;
            e?.play();
        });

        // Collect frame durations for 6 seconds
        const frameStats = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const durations = [];
                let last = performance.now();
                const start = last;
                const onFrame = (now) => {
                    const dt = now - last;
                    last = now;
                    durations.push(dt);
                    if (now - start < 6000) {
                        requestAnimationFrame(onFrame);
                    } else {
                        durations.shift(); // remove first frame
                        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
                        resolve({ avg, count: durations.length });
                    }
                };
                requestAnimationFrame(onFrame);
            });
        });

        await ctx.close();
        return frameStats;
    };

    // Run interleaved rounds (2 rounds each)
    console.log('Running interleaved A/B benchmark (2 rounds)...');
    const r1_g0 = await measurePerf(0);
    const r1_g1 = await measurePerf(1);
    const r2_g0 = await measurePerf(0);
    const r2_g1 = await measurePerf(1);

    const avgG0 = (r1_g0.avg + r2_g0.avg) / 2;
    const avgG1 = (r1_g1.avg + r2_g1.avg) / 2;
    const deltaMs = avgG1 - avgG0;
    const pct = ((deltaMs / avgG0) * 100).toFixed(2);

    console.log(`Round 1: glow=0: ${r1_g0.avg.toFixed(2)}ms | glow=1: ${r1_g1.avg.toFixed(2)}ms`);
    console.log(`Round 2: glow=0: ${r2_g0.avg.toFixed(2)}ms | glow=1: ${r2_g1.avg.toFixed(2)}ms`);
    console.log(`Average: glow=0: ${avgG0.toFixed(2)}ms | glow=1: ${avgG1.toFixed(2)}ms (Delta: ${deltaMs.toFixed(2)}ms, ${pct}%)`);

    writeFileSync(join(OUT_DIR, 'glow_results.json'), JSON.stringify({
        fidelity: results,
        perf: {
            glow0Avg: +avgG0.toFixed(2),
            glow1Avg: +avgG1.toFixed(2),
            deltaMs: +deltaMs.toFixed(2),
            pct: +pct,
        }
    }, null, 2));

} finally {
    await browser.close();
    await server.close();
}
