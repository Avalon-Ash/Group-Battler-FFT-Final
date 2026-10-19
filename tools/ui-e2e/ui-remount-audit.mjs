/**
 * ui-remount-audit.mjs — 找「互動元件一直被拆掉重建」的 UI bug（文字閃爍、按鈕按不到）。
 *   node tools/ui-e2e/ui-remount-audit.mjs [--viewport=1600x900] [--window-ms=2000]
 *
 * 典型根因：在元件的 render 裡宣告子元件（const Btn = () => ...），每次重繪都是新的元件型別，
 * React 把整棵子樹卸載再掛載；點擊要求按下與放開落在同一個 DOM 節點，節點一換就永遠點不到。
 *
 * 做法：每個畫面掛 MutationObserver，在 window-ms 內統計被移除的按鈕／輸入元件數（含子孫），
 * 換算成每秒次數；超過 FLAG_PER_SEC 列為問題。另外在觀賞模式設定視窗實際點每個分頁，確認切換成功。
 * 結果寫到 tools/ui-e2e/out/ui-remount/findings.json，非 0 問題時退出碼 1。
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const arg = (name, fallback) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
};
const [VW, VH] = arg('viewport', '1600x900').split('x').map(Number);
const WINDOW_MS = Number(arg('window-ms', '2000'));
const FLAG_PER_SEC = 2;
const OUT = join(here, 'out', 'ui-remount');
mkdirSync(OUT, { recursive: true });

const START_TEXT = '啟動戰術模擬';
const WINDOW_IDS = ['logs', 'db', 'vfxmap', 'monitor', 'directorSettings', 'zoneSettings', 'audioSettings'];
const SHOWCASE_TABS = ['system', 'camera', 'matrix', 'gameplay'];

const launch = async () => {
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found.');
};

/** 在頁面內：量 ms 毫秒內被移除的互動元件，回傳每秒次數與前幾名標籤 */
const measure = (ms) => new Promise((done) => {
    const counts = new Map();
    let total = 0;
    const label = (el) => el.getAttribute('data-testid') || el.getAttribute('title') || (el.textContent || '').trim().slice(0, 24) || el.tagName;
    const obs = new MutationObserver((list) => {
        for (const m of list) {
            for (const n of m.removedNodes) {
                if (n.nodeType !== 1) continue;
                const hits = n.matches('button,input,select,[role="button"]') ? [n] : [...n.querySelectorAll('button,input,select,[role="button"]')];
                for (const el of hits) {
                    total++;
                    const k = label(el);
                    counts.set(k, (counts.get(k) || 0) + 1);
                }
            }
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
        obs.disconnect();
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ label: k, perSec: +(v / (ms / 1000)).toFixed(1) }));
        done({ perSec: +(total / (ms / 1000)).toFixed(1), top });
    }, ms);
});

const server = await createServer({ root, server: { port: 3203, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser = null;
const report = { viewport: `${VW}x${VH}`, surfaces: {}, tabClicks: {}, problems: [] };
try {
    await server.listen();
    browser = await launch();
    const page = await (await browser.newContext({ viewport: { width: VW, height: VH } })).newPage();
    await page.goto(`${server.resolvedUrls.local[0]}?mute`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const check = async (name) => {
        const r = await page.evaluate(measure, WINDOW_MS);
        report.surfaces[name] = r;
        if (r.perSec > FLAG_PER_SEC) report.problems.push({ surface: name, ...r });
        console.log(`${name.padEnd(28)} removed interactive/s=${r.perSec}${r.top.length ? '  top: ' + r.top.slice(0, 3).map((t) => `${t.label}(${t.perSec})`).join(', ') : ''}`);
    };

    await check('showcase');
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.locator('[data-testid="menu-item-showcaseSettings"]').click();
    await page.waitForTimeout(400);
    for (const tab of SHOWCASE_TABS) {
        const btn = page.locator(`[data-testid="showcase-tab-${tab}"]`);
        let ok = false;
        try {
            await btn.click({ timeout: 2000 });
            await page.waitForTimeout(200);
            ok = /text-cyan-400/.test((await btn.getAttribute('class')) || '');
        } catch { ok = false; }
        report.tabClicks[tab] = ok;
        if (!ok) report.problems.push({ surface: `showcase-tab-${tab}`, detail: 'click did not activate tab' });
        await check(`showcase-settings/${tab}`);
    }
    await page.locator('[data-window-btn="close"]').first().click().catch(() => {});

    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(900);
    await page.locator('button[title="隨機生成戰場與陣容"]').click().catch(() => {});
    await page.waitForTimeout(800);
    await check('manual');
    for (const id of WINDOW_IDS) {
        const item = page.locator(`[data-testid="menu-item-${id}"]`);
        if (!(await item.count())) await page.locator('[data-testid="system-menu-button"]').click().catch(() => {});
        if (!(await item.count())) continue;
        await item.click();
        await page.waitForTimeout(300);
        await check(`window/${id}`);
        await page.locator('[data-window-btn="close"]').first().click().catch(() => {});
        await page.waitForTimeout(150);
    }
} finally {
    if (browser) await browser.close();
    await server.close();
}
writeFileSync(join(OUT, 'findings.json'), JSON.stringify(report, null, 2));
console.log(`\nproblems: ${report.problems.length}  (tab clicks: ${JSON.stringify(report.tabClicks)})`);
process.exit(report.problems.length ? 1 : 0);
