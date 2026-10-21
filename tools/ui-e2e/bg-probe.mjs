/**
 * bg-probe — 場景背景（engine/renderers/background.ts）每幀成本的 A/B 量測。
 * 每個場景量四種模式的 rAF 間隔中位數（不限幀率；GPU 填色成本會反映在這裡，RenderStats 的 CPU 計時量不到）：
 *   full＝原樣、noDyn＝關動態層、none＝整個背景換成純色、x10＝背景連畫 10 次（對照組：證明量得出差異）。
 * 一次背景的成本 ≈ (x10 − full) / 9。
 * Run:
 *   node tools/ui-e2e/bg-probe.mjs                 # 無頭（數字偏低，只能比相對差）
 *   BG_HEADED=1 node tools/ui-e2e/bg-probe.mjs     # 開視窗（用主螢幕）
 *   BG_W=1920 BG_H=1080 …                          # 換解析度
 * 2026-10-21 基準（RTX 4070，2560×1440，開視窗）：一次背景約 0.03～0.06 ms；整幀 0.6～1.1 ms。
 */
import { createServer } from 'vite';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';

const W = Number(process.env.BG_W || 2560), H = Number(process.env.BG_H || 1440);
const server = await createServer({ server: { port: 3197, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const url = `${server.resolvedUrls.local[0]}?quality=0&mute`;
const browser = await launchBrowser({ headed: process.env.BG_HEADED === '1', unthrottled: true });
try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__TACTICAL_ENGINE__, null, { timeout: 30000 });
    await page.getByText(START_TEXT).first().click().catch(() => {});
    await page.waitForTimeout(2500);
    await page.evaluate(async () => {
        const mod = await import('/engine/renderers/background.ts');
        const P = mod.BackgroundRenderer.prototype;
        window.__bgOrig = { draw: P.draw, dyn: P.drawDynamicElements };
        window.__bgMode = (m) => {
            P.draw = window.__bgOrig.draw; P.drawDynamicElements = window.__bgOrig.dyn;
            if (m === 'noDyn') P.drawDynamicElements = function () {};
            if (m === 'none') P.draw = function (c, w, h) { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); };
            if (m === 'x10') P.draw = function (...a) { for (let i = 0; i < 10; i++) window.__bgOrig.draw.apply(this, a); };
        };
    });
    const measure = () => page.evaluate(() => new Promise((res) => {
        const ts = []; let last = performance.now(); const end = last + 2500;
        const loop = (t) => { ts.push(t - last); last = t; if (t < end) requestAnimationFrame(loop); else { ts.sort((a, b) => a - b); res(ts[Math.floor(ts.length / 2)]); } };
        requestAnimationFrame(loop);
    }));
    const scenes = await page.evaluate(async () => (await import('/data/scenes.ts')).SCENE_DB.map((s) => s.id + ':' + (s.bgFeature || '-')));
    console.log(`viewport ${W}x${H} headed=${process.env.BG_HEADED === '1'}`);
    for (const sc of scenes) {
        const id = sc.split(':')[0];
        await page.evaluate(async (sid) => {
            const mod = await import('/data/scenes.ts');
            const e = window.__TACTICAL_ENGINE__;
            e.currentScene = mod.SCENE_DB.find((x) => x.id === sid);
            e.map.rebuildMap(e);
        }, id);
        await page.waitForTimeout(800);
        const row = {};
        for (const m of ['full', 'noDyn', 'none', 'x10']) {
            await page.evaluate((mm) => window.__bgMode(mm), m);
            await page.waitForTimeout(300);
            row[m] = await measure();
        }
        const per = Math.max(0, (row.x10 - row.full) / 9);
        console.log(`${sc.padEnd(18)} median ms  full ${row.full.toFixed(2)}  noDyn ${row.noDyn.toFixed(2)}  none ${row.none.toFixed(2)}  x10 ${row.x10.toFixed(2)}  ≈ 一次背景 ${per.toFixed(3)}`);
    }
} finally {
    await browser.close();
    await server.close();
}
