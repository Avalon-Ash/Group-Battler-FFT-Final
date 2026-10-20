/**
 * runtime-smoke.mjs — 渲染／生命週期變更的最小實跑驗證（CLAUDE.md 鐵律；render-verify skill）
 * lint／test／build 全綠曾經交出凍結的畫面，所以這裡用「真的 rAF」跑一場戰鬥，檢查：
 *   1. 0 個頁面錯誤（pageerror）
 *   2. 開戰後有單位（window.__TACTICAL_ENGINE__.agents）
 *   3. 引擎在走：state.time.battleTime 有前進
 *   4. 畫面沒凍結：相隔一段時間的兩張畫布截圖不相同
 * Run:
 *   node tools/ui-e2e/runtime-smoke.mjs [--seconds=4] [--query=glow=1] [--shot]
 *   --shot 會把最後一張畫面存到 tools/ui-e2e/out/runtime-smoke.png
 *   找不到 Edge／Chrome 時設 E2E_BROWSER_PATH（雲端容器：/opt/pw-browsers/chromium-1194/chrome-linux/chrome）
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
};
const SECONDS = Number(arg('seconds', '4'));
const EXTRA_QUERY = arg('query', '');
const SAVE_SHOT = process.argv.includes('--shot');
const START_TEXT = 'START SIMULATION';
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
    server: { port: 3198, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const failures = [];
const pageErrors = [];
const grab = (page) => page.evaluate(() => document.querySelector('canvas')?.toDataURL('image/png') ?? '');
const engineState = (page) => page.evaluate(() => {
    const e = window.__TACTICAL_ENGINE__;
    return { agents: e?.agents?.length ?? 0, battleTime: e?.state?.time?.battleTime ?? 0, running: !!e?.isRunning };
});

try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${baseUrl}?quality=0&mute${EXTRA_QUERY ? `&${EXTRA_QUERY}` : ''}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 10000 }).catch(() => {});
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    const clicked = await page.evaluate((title) => {
        const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.title === title);
        btns.forEach((b) => b.click());
        return btns.length;
    }, DICE_TITLE);
    if (clicked !== 1) failures.push(`dice button matched ${clicked} elements`);
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__TACTICAL_ENGINE__?.play());
    await page.waitForTimeout(500);

    const before = await engineState(page);
    const shotA = await grab(page);
    await page.waitForTimeout(SECONDS * 1000);
    const after = await engineState(page);
    const shotB = await grab(page);

    console.log(`[smoke] agents=${after.agents} running=${after.running} battleTime ${before.battleTime.toFixed(2)} -> ${after.battleTime.toFixed(2)} s`);
    if (after.agents === 0) failures.push('no agents spawned');
    if (!(after.battleTime > before.battleTime)) failures.push('battleTime did not advance (engine stopped?)');
    if (!shotA || shotA === shotB) failures.push(`canvas identical across ${SECONDS}s (frozen screen?)`);
    if (pageErrors.length) failures.push(`page errors: ${pageErrors.join(' | ')}`);

    if (SAVE_SHOT && shotB) {
        const out = join(here, 'out');
        mkdirSync(out, { recursive: true });
        const dest = join(out, 'runtime-smoke.png');
        writeFileSync(dest, Buffer.from(shotB.replace(/^data:image\/png;base64,/, ''), 'base64'));
        console.log(`[smoke] screenshot ${dest}`);
    }
    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}

if (failures.length) {
    console.error(`FAIL:\n- ${failures.join('\n- ')}`);
    process.exit(1);
}
console.log('PASS: runtime smoke (0 page errors, engine advancing, canvas changing)');
