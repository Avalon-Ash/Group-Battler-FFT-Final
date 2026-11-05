// iPhone 解析度（393×852、DPR 3）下的畫布記憶體與 JS heap，新舊版 A/B 用。
// 動到鏡頭縮放範圍或離屏畫布時跑（METHODOLOGY §4 第 13 條）：npm run perf:mem -- [秒數] [query]
// 留在展示模式，一直有新局；沒有單位或頁面出錯就以退出碼 1 結束，那次的數字不算。
// 找不到 Edge 時設 E2E_BROWSER_PATH。
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const SECONDS = Number(process.argv[2] ?? 120);
const QUERY = process.argv[3] ?? 'mute';

const server = await createServer({ server: { port: 3201, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const executablePath = process.env.E2E_BROWSER_PATH;
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : { channel: 'msedge' }), headless: true, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => {
    const refs = [];
    window.__canvasRefs = refs;
    const orig = document.createElement.bind(document);
    document.createElement = (tag, ...rest) => {
        const el = orig(tag, ...rest);
        if (String(tag).toLowerCase() === 'canvas') { refs.push(new WeakRef(el)); el.__who = (new Error().stack.split(String.fromCharCode(10)).slice(2, 6).map((l) => (l.match(/\/([A-Za-z0-9_.]+)\.ts/) || [])[1]).filter((x) => x && x !== 'CanvasUtils').slice(0, 2).join('<')) || '?'; }
        return el;
    };
    if (window.OffscreenCanvas) {
        const O = window.OffscreenCanvas;
        window.OffscreenCanvas = class extends O {
            constructor(w, h) { super(w, h); refs.push(new WeakRef(this)); }
        };
    }
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('crash', () => errors.push('PAGE CRASH'));
await page.goto(`${server.resolvedUrls.local[0]}?${QUERY}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 30000 }).catch(() => console.log('assets timeout'));
await page.waitForTimeout(1000);

const out = await page.evaluate(async (SECONDS) => {
    const e = window.__TACTICAL_ENGINE__;
    const rows = [];
    const t0 = performance.now();
    const snapshot = () => {
        let bytes = 0, n = 0;
        const sizes = new Map();
        for (const r of window.__canvasRefs) {
            const c = r.deref();
            if (!c || !c.width || !c.height) continue;
            const b = c.width * c.height * 4;
            bytes += b; n++;
            const k = `${c.__who ?? 'offscreen'}`;
            const s = sizes.get(k) ?? { n: 0, b: 0 };
            s.n++; s.b += b;
            sizes.set(k, s);
        }
        return { bytes, n, sizes };
    };
    let peak = { bytes: 0 };
    while (performance.now() - t0 < SECONDS * 1000) {
        await new Promise((r) => setTimeout(r, 2000));
        const s = snapshot();
        const row = { t: (performance.now() - t0) / 1000, mb: s.bytes / 1048576, n: s.n, heap: (performance.memory?.usedJSHeapSize ?? 0) / 1048576, zoom: e.renderer.camera.zoom, gen: e.map.generation, alive: e.agents.filter((a) => a.hp > 0).length };
        rows.push(row);
        if (s.bytes > peak.bytes) peak = { bytes: s.bytes, t: row.t, top: [...s.sizes.entries()].sort((a, b) => b[1].b - a[1].b).slice(0, 10).map(([k, v]) => `${k}×${v.n}=${(v.b / 1048576).toFixed(0)}MB`) };
    }
    return { rows, peak };
}, SECONDS);

const r = out.rows;
const med = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
console.log(`局數 ${new Set(r.map((x) => x.gen)).size}，錯誤 ${errors.length} ${errors.slice(0, 3).join(' | ')}`);
console.log(`畫布 MB：中位 ${med(r.map((x) => x.mb)).toFixed(0)}，最高 ${(out.peak.bytes / 1048576).toFixed(0)}（t=${out.peak.t?.toFixed(0)}），最後 ${r.at(-1).mb.toFixed(0)}；畫布數中位 ${med(r.map((x) => x.n))}，最高 ${Math.max(...r.map((x) => x.n))}`);
console.log(`JS heap MB：中位 ${med(r.map((x) => x.heap)).toFixed(0)}，最高 ${Math.max(...r.map((x) => x.heap)).toFixed(0)}；縮放範圍 ${Math.min(...r.map((x) => x.zoom)).toFixed(2)}～${Math.max(...r.map((x) => x.zoom)).toFixed(2)}`);
console.log(`最高時的組成：${out.peak.top?.join('、')}`);
console.log('時間線 t:畫布MB/heapMB：' + r.filter((_, i) => i % 6 === 0).map((x) => `${x.t.toFixed(0)}:${x.mb.toFixed(0)}/${x.heap.toFixed(0)}`).join(' '));
await browser.close();
await server.close();
const maxAlive = Math.max(...r.map((x) => x.alive));
if (errors.length > 0 || maxAlive === 0) {
    console.error(`FAIL: 頁面錯誤 ${errors.length}，場上最多 ${maxAlive} 個活人`);
    process.exit(1);
}
process.exit(0);
