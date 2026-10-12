import { chromium } from 'playwright-core';

export const START_TEXT = '\u555f\u52d5\u6230\u8853\u6a21\u64ec'; // 啟動戰術模擬
export const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9'; // 隨機生成戰場與陣容

/**
 * Launch Chromium / Edge / Chrome with specified flags.
 */
export async function launchBrowser({
    headed = true,
    unthrottled = false,
    extraArgs = [],
} = {}) {
    const isHeadless = !headed;
    const args = [
        '--enable-gpu-rasterization',
        '--ignore-gpu-blocklist',
        '--window-size=2560,1440',
        ...extraArgs,
    ];

    if (unthrottled) {
        args.push('--disable-frame-rate-limit', '--disable-gpu-vsync');
    }

    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: isHeadless, args });
    }

    for (const channel of ['msedge', 'chrome']) {
        try {
            return await chromium.launch({ channel, headless: isHeadless, args });
        } catch {
            // try next channel
        }
    }

    if (headed) {
        console.warn('Headed browser launch failed, falling back to headless...');
        for (const channel of ['msedge', 'chrome']) {
            try {
                return await chromium.launch({ channel, headless: true, args });
            } catch {}
        }
    }

    throw new Error('No Edge or Chrome found.');
}

/**
 * Inspect page environment (DPR, screen, viewport, GPU string, refresh rate estimate).
 */
export async function getEnvInfo(page, isUnthrottled = false) {
    return await page.evaluate(async (unthrottled) => {
        const gl = document.createElement('canvas').getContext('webgl');
        const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
        const gpu = ext
            ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
            : (gl ? 'WebGL supported (no debug info)' : 'WebGL not supported');

        let estimatedRefreshRate = null;
        if (!unthrottled) {
            try {
                estimatedRefreshRate = await new Promise((resolve) => {
                    const samples = [];
                    let last = performance.now();
                    let count = 0;
                    const step = (now) => {
                        samples.push(now - last);
                        last = now;
                        count++;
                        if (count < 25) {
                            requestAnimationFrame(step);
                        } else {
                            const sorted = samples.slice(3).sort((a, b) => a - b);
                            const median = sorted[Math.floor(sorted.length / 2)] || 16.67;
                            resolve(Math.round(1000 / Math.max(0.1, median)));
                        }
                    };
                    requestAnimationFrame(step);
                });
            } catch {
                estimatedRefreshRate = null;
            }
        }

        return {
            dpr: window.devicePixelRatio || 1,
            screen: [window.screen.width, window.screen.height],
            viewport: [window.innerWidth, window.innerHeight],
            gpu,
            userAgent: navigator.userAgent,
            isHeadless: !window.chrome && navigator.webdriver,
            estimatedRefreshRate,
        };
    }, isUnthrottled);
}

/**
 * Assert that execution is running on the primary GPU (RTX 4070) and not an AMD/Radeon iGPU.
 */
export function assertMainGpu(envInfo) {
    const gpu = envInfo?.gpu || '';
    const isIgpu = /amd|radeon/i.test(gpu);
    if (isIgpu) {
        if (process.env.PERF_ALLOW_ANY_GPU === '1') {
            console.warn(`\n[PERF_WARN] 此次落在內顯 (${gpu})，結果標註為非主 GPU。\n`);
            envInfo.isNonPrimaryGpu = true;
            return;
        }
        console.error(`\n[PERF_ERROR] 此次落在內顯 (${gpu})，結果無效！`);
        console.error('請將瀏覽器視窗移至主螢幕 (RTX 4070)，或在 Windows 圖形設定將瀏覽器指定為高效能。');
        console.error('若執意在內顯量測，請設定 PERF_ALLOW_ANY_GPU=1 覆寫。\n');
        process.exit(1);
    }
}

/**
 * Assert that execution window viewport meets the 2560x1440 standard requirement (at least 2400x1300).
 */
export function assertResolution(envInfo) {
    const [w, h] = envInfo?.viewport || [0, 0];
    if (w < 2400 || h < 1300) {
        console.error(`\n[PERF_ERROR] 視窗解析度過小 (${w}x${h} < 2400x1300)，量測結果無效！\n`);
        process.exit(1);
    }
}

/**
 * Dispatch DOM click on the dice button (random battlefield & roster).
 * Avoids silent failure of Playwright locator.click({ force: true }).
 */
export async function clickDice(page) {
    const clicked = await page.evaluate((title) => {
        const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.title === title);
        btns.forEach((b) => b.click());
        return btns.length;
    }, DICE_TITLE);
    if (clicked !== 1) {
        throw new Error(`clickDice: dice button matched ${clicked} elements`);
    }
}

/**
 * Assert that tactical engine has at least minCount units on field.
 */
export async function assertAgents(page, minCount = 2) {
    const count = await page.evaluate(() => window.__TACTICAL_ENGINE__?.agents?.length ?? 0);
    if (count < minCount) {
        throw new Error(`assertAgents failed: expected >= ${minCount} agents, got ${count}`);
    }
    return count;
}

/**
 * Prepare and start manual_battle scenario with real units and sustained combat.
 * Optionally boosts HP to avoid battle prematurely ending during the sample window.
 */
export async function prepareManualBattle(page, { boostHp = true } = {}) {
    const startBtn = page.getByText(START_TEXT);
    if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click().catch(() => {});
        await page.waitForTimeout(400);
    }
    await clickDice(page);
    await page.waitForTimeout(400);
    await assertAgents(page, 2);

    if (boostHp) {
        await page.evaluate(() => {
            const e = window.__TACTICAL_ENGINE__;
            if (e?.agents) {
                for (const a of e.agents) {
                    a.hp = a.maxHp = 999999;
                }
            }
        });
    }

    await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        e?.play();
    });
    await page.waitForTimeout(500);
    await assertAgents(page, 2);
}

/**
 * Collect rAF frames over durationSeconds, filtering out transition frames in showcase
 * and checking battle validity in manual_battle.
 */
export async function measureScenarioFrames(page, {
    scenarioName,
    durationSeconds = 6,
} = {}) {
    // Reset and start frame collection
    await page.evaluate((name) => {
        window.__perfCollector = {
            scenario: name,
            activeFrames: [],
            transitionFrames: [],
            stop: false,
            battleInvalid: false,
        };

        const e = window.__TACTICAL_ENGINE__;
        let last = performance.now();

        const loop = (t) => {
            const dt = t - last;
            last = t;

            const c = window.__perfCollector;
            if (!c || c.stop) return;

            // Scenario-specific guard
            if (name === 'manual_battle') {
                const isOngoing = e?.isRunning && !e?.state?.victory?.isFinishing && (e?.agents?.length ?? 0) >= 2;
                if (!isOngoing) {
                    c.battleInvalid = true;
                }
                c.activeFrames.push(dt);
            } else if (name === 'showcase') {
                const inTrans = (e?.renderer?.pipeline?.transitionPhase !== 'IDLE') || (e?.agents?.length === 0);
                if (inTrans) {
                    c.transitionFrames.push(dt);
                } else {
                    c.activeFrames.push(dt);
                }
            } else {
                // Idle scenes
                c.activeFrames.push(dt);
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }, scenarioName);

    await page.waitForTimeout(durationSeconds * 1000);

    const result = await page.evaluate(async () => {
        const c = window.__perfCollector;
        c.stop = true;

        const rawFrames = c.activeFrames.slice(2); // warm-up drop
        const transFrames = c.transitionFrames;

        const calcStats = (arr) => {
            if (!arr.length) return { avgMs: 0, p95Ms: 0, fps: 0, count: 0 };
            const sorted = [...arr].sort((a, b) => a - b);
            const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
            const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
            const fps = +(1000 / Math.max(0.1, avg)).toFixed(1);
            return {
                avgMs: +avg.toFixed(2),
                p95Ms: +p95.toFixed(2),
                fps,
                count: arr.length,
            };
        };

        const activeStats = calcStats(rawFrames);
        const transStats = calcStats(transFrames);

        let phases = {};
        try {
            const { RenderStats } = await import('/engine/renderers/RenderStats.ts');
            for (const p of RenderStats.getPhases()) {
                phases[p] = +RenderStats.getPhaseMs(p).toFixed(3);
            }
        } catch {
            phases = {};
        }

        const e = window.__TACTICAL_ENGINE__;
        const currentAgents = e?.agents?.length ?? 0;

        return {
            ...activeStats,
            transitionCount: transStats.count,
            transitionAvgMs: transStats.avgMs,
            totalFrames: activeStats.count + transStats.count,
            battleInvalid: c.battleInvalid || (c.scenario === 'manual_battle' && currentAgents < 2),
            phases,
        };
    });

    if (result.battleInvalid) {
        console.warn(`[WARN] ${scenarioName} finished prematurely during sample window; retrying once...`);
        // Retry once if invalid
        await prepareManualBattle(page, { boostHp: true });
        return await measureScenarioFrames(page, { scenarioName, durationSeconds });
    }

    return result;
}
