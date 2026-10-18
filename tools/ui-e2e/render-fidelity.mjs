/**
 * Render fidelity guardrail (pixel comparison against recorded baseline PNGs).
 * Run:
 *   Record baseline: `node tools/ui-e2e/render-fidelity.mjs --record`
 *   Verify fidelity: `node tools/ui-e2e/render-fidelity.mjs`
 *
 * Deterministic harness:
 *   - Fixes Math.random with mulberry32 (seeded).
 *   - Mocks Date.now and performance.now to return synthetic monotonic time (+16.667ms / step).
 *   - Replaces requestAnimationFrame with a manual queue triggered via window.__stepFrames(n).
 *   - Viewport: 1280x720, DPR: 1.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = join(here, 'baseline', 'fidelity');
const OUT_DIR = join(here, 'out', 'fidelity');
mkdirSync(BASELINE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const isRecord = process.argv.includes('--record');
const START_TEXT = '\u555f\u52d5\u6230\u8853\u6a21\u64ec'; // 啟動戰術模擬
const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9'; // 隨機生成戰場與陣容

const MEAN_ABS_DIFF_LIMIT = 0.8;
const BAD_PIXEL_PCT_LIMIT = 0.5;

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
    server: { port: 3196, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const createHarnessContext = async () => {
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

        // Comparison helper executed in page context
        window.__compareImageData = (currentDataUrl, baselineDataUrl) => {
            return new Promise((resolve, reject) => {
                const imgCurr = new Image();
                const imgBase = new Image();
                let loaded = 0;
                const onLoaded = () => {
                    loaded++;
                    if (loaded < 2) return;
                    const w = imgCurr.naturalWidth || imgCurr.width;
                    const h = imgCurr.naturalHeight || imgCurr.height;
                    const c1 = document.createElement('canvas');
                    const c2 = document.createElement('canvas');
                    c1.width = w; c1.height = h;
                    c2.width = w; c2.height = h;
                    const ctx1 = c1.getContext('2d');
                    const ctx2 = c2.getContext('2d');
                    ctx1.drawImage(imgCurr, 0, 0);
                    ctx2.drawImage(imgBase, 0, 0);
                    const d1 = ctx1.getImageData(0, 0, w, h).data;
                    const d2 = ctx2.getImageData(0, 0, w, h).data;

                    let sumDiff = 0;
                    let badPixels = 0;
                    let strictSum = 0;
                    let strictBad = 0;
                    const totalPixels = w * h;

                    for (let i = 0; i < d1.length; i += 4) {
                        const px = (i / 4) % w;
                        const py = Math.floor((i / 4) / w);

                        let bestAvg = (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i+1] - d2[i+1]) + Math.abs(d1[i+2] - d2[i+2])) / 3;
                        let bestDr = Math.abs(d1[i] - d2[i]);
                        let bestDg = Math.abs(d1[i+1] - d2[i+1]);
                        let bestDb = Math.abs(d1[i+2] - d2[i+2]);
                        // Strict (no neighbourhood alignment) metrics, reported for transparency.
                        strictSum += bestAvg;
                        if (bestDr > 24 || bestDg > 24 || bestDb > 24) strictBad++;

                        // 3x3 neighborhood alignment for subpixel float jitter
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = px + dx, ny = py + dy;
                                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                                    const nIdx = (ny * w + nx) * 4;
                                    const ndr = Math.abs(d1[i] - d2[nIdx]);
                                    const ndg = Math.abs(d1[i+1] - d2[nIdx+1]);
                                    const ndb = Math.abs(d1[i+2] - d2[nIdx+2]);
                                    const navg = (ndr + ndg + ndb) / 3;
                                    if (navg < bestAvg) {
                                        bestAvg = navg;
                                        bestDr = ndr;
                                        bestDg = ndg;
                                        bestDb = ndb;
                                    }
                                }
                            }
                        }

                        sumDiff += bestAvg;
                        if (bestDr > 24 || bestDg > 24 || bestDb > 24) {
                            badPixels++;
                        }
                    }

                    const meanAbsDiff = +(sumDiff / totalPixels).toFixed(4);
                    const badPixelPct = +((badPixels / totalPixels) * 100).toFixed(4);
                    resolve({
                        meanAbsDiff, badPixelPct, totalPixels, w, h,
                        strictMeanAbsDiff: +(strictSum / totalPixels).toFixed(4),
                        strictBadPixelPct: +((strictBad / totalPixels) * 100).toFixed(4),
                    });
                };
                imgCurr.onload = onLoaded;
                imgBase.onload = onLoaded;
                imgCurr.onerror = reject;
                imgBase.onerror = reject;
                imgCurr.src = currentDataUrl;
                imgBase.src = baselineDataUrl;
            });
        };
    });

    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 10000 }).catch(() => {});
    // 開頭的展示戰鬥在模擬流種子化前會借用 Math.random，與特效抽籤共用同一條序列：特效改動會讓展示單位走位不同、
    // 鏡頭停在別處，第一個擷取的場景（VOID）因鏡頭還沒收斂而整張偏移。一開始就種子化，讓擷取與特效抽籤脫鉤。
    await page.evaluate(() => window.__resetSeed(1337));
    // Step a few frames to let React and ResizeObserver mount
    await page.evaluate(() => window.__stepFrames(10));
    // Enter manual mode
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));

    return { ctx, page };
};

const captureScene = async (page, sid) => {
    await page.evaluate(async (sceneId) => {
        window.__resetSeed(1337);
        const mod = await import('/data/scenes.ts');
        const e = window.__TACTICAL_ENGINE__;
        const s = mod.SCENE_DB.find((x) => x.id === sceneId);
        e.currentScene = s;
        e.map.rebuildMap(e);
    }, sid);
    await page.evaluate(() => window.__stepFrames(30));
    return await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.toDataURL('image/png') : null;
    });
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
    // Click dice button to generate battlefield and teams.
    // NOTE: Playwright's locator.click({ force: true }) silently does nothing under the synthetic
    // rAF/time harness (agents stayed 0 and the frame was an empty blurred scene), so dispatch a DOM click.
    const clicked = await page.evaluate((title) => {
        const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.title === title);
        btns.forEach((b) => b.click());
        return btns.length;
    }, DICE_TITLE);
    if (clicked !== 1) throw new Error(`battle_frozen: dice button matched ${clicked} elements`);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__stepFrames(5));
    // Start simulation
    await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        e?.play();
    });
    // Advance 120 frames
    await page.evaluate(() => window.__stepFrames(120));
    // Guard against a hollow capture: the scene must really contain units.
    const agentCount = await page.evaluate(() => window.__TACTICAL_ENGINE__.agents.length);
    if (agentCount < 2) throw new Error(`battle_frozen: expected units on the field, got ${agentCount}`);
    return await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.toDataURL('image/png') : null;
    });
};

try {
    const { ctx, page } = await createHarnessContext();
    const sceneIds = await page.evaluate(async () => {
        return (await import('/data/scenes.ts')).SCENE_DB.map((x) => x.id);
    });

    if (isRecord) {
        console.log('== RECORDING FIDELITY BASELINE PNGs ==');
        for (const sid of sceneIds) {
            const dest = join(BASELINE_DIR, `${sid}.png`);
            if (existsSync(dest)) {
                console.log(`Skipping existing scene baseline: ${sid}`);
                continue;
            }
            console.log(`Recording scene: ${sid}`);
            const dataUrl = await captureScene(page, sid);
            if (!dataUrl) throw new Error(`Failed to capture canvas for ${sid}`);
            const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
            writeFileSync(dest, buf);
        }

        // Test determinism of battle_frozen across two separate context runs
        console.log('Recording and testing determinism of: battle_frozen');
        await ctx.close();
        const h1 = await createHarnessContext();
        const shot1 = await captureBattleFrozen(h1.page);
        await h1.ctx.close();

        // Fresh context for run 2
        const h2 = await createHarnessContext();
        const shot2 = await captureBattleFrozen(h2.page);

        // Compare shot1 and shot2
        const check = await h2.page.evaluate(({ s1, s2 }) => window.__compareImageData(s1, s2), { s1: shot1, s2: shot2 });
        await h2.ctx.close();

        console.log(`battle_frozen determinism check: meanAbsDiff=${check.meanAbsDiff}, badPixelPct=${check.badPixelPct}%`);
        if (check.meanAbsDiff === 0 && check.badPixelPct === 0) {
            const buf = Buffer.from(shot1.replace(/^data:image\/png;base64,/, ''), 'base64');
            writeFileSync(join(BASELINE_DIR, 'battle_frozen.png'), buf);
            console.log('PASS: battle_frozen is 100% pixel-identical across runs -> recorded.');
        } else {
            console.log(`WARN: battle_frozen is not deterministic (meanAbsDiff=${check.meanAbsDiff}, badPixelPct=${check.badPixelPct}%). Excluding battle_frozen from baseline.`);
        }

        console.log('\n[RECORD COMPLETE] Baseline recorded to tools/ui-e2e/baseline/fidelity/');
    } else {
        console.log('== VERIFYING FIDELITY AGAINST BASELINE ==');
        let failed = false;
        const allScenes = [...sceneIds];
        if (existsSync(join(BASELINE_DIR, 'battle_frozen.png'))) {
            allScenes.push('battle_frozen');
        }

        for (const sid of allScenes) {
            const baselinePath = join(BASELINE_DIR, `${sid}.png`);
            if (!existsSync(baselinePath)) {
                console.error(`ERROR: Baseline not found: ${baselinePath}`);
                failed = true;
                continue;
            }
            const baselineBase64 = readFileSync(baselinePath).toString('base64');
            const baselineDataUrl = `data:image/png;base64,${baselineBase64}`;

            let currentDataUrl;
            if (sid === 'battle_frozen') {
                // Fresh context: battle_frozen must not inherit engine/camera/time state from the scene captures above.
                const hb = await createHarnessContext();
                currentDataUrl = await captureBattleFrozen(hb.page);
                await hb.ctx.close();
            } else {
                currentDataUrl = await captureScene(page, sid);
            }

            const diff = await page.evaluate(
                ({ curr, base }) => window.__compareImageData(curr, base),
                { curr: currentDataUrl, base: baselineDataUrl }
            );

            const isPass = diff.meanAbsDiff <= MEAN_ABS_DIFF_LIMIT && diff.badPixelPct <= BAD_PIXEL_PCT_LIMIT;
            const status = isPass ? 'PASS' : 'FAIL';
            console.log(`[fidelity] ${sid.padEnd(16)}: meanAbsDiff=${diff.meanAbsDiff.toFixed(3)} (<= ${MEAN_ABS_DIFF_LIMIT}), badPixelPct=${diff.badPixelPct.toFixed(2)}% (<= ${BAD_PIXEL_PCT_LIMIT}%) | strict(no alignment): mean=${diff.strictMeanAbsDiff} bad=${diff.strictBadPixelPct}% -> ${status}`);

            if (!isPass) {
                failed = true;
                const outPath = join(OUT_DIR, `${sid}_diff_curr.png`);
                writeFileSync(outPath, Buffer.from(currentDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
                console.error(`  -> Saved failed frame to ${outPath}`);
            }
        }

        await ctx.close();
        if (failed) {
            console.error('\nFAIL: Fidelity guardrail failed. Frame difference exceeds threshold.');
            process.exit(1);
        } else {
            console.log('\nALL FIDELITY CHECKS PASSED.');
        }
    }
} finally {
    await browser.close();
    await server.close();
}
