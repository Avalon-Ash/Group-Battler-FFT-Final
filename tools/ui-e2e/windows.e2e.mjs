/**
 * UI window e2e (headless browser). Run: `npm run e2e:ui`
 *
 * - Starts its own Vite dev server (no manual `npm run dev` needed).
 * - Drives a locally installed Edge/Chrome through `playwright-core` (no browser download).
 *   Override with E2E_BROWSER_PATH=<path to chromium-based executable>.
 * - Screenshots are written to tools/ui-e2e/out/ (git-ignored). View them after a failure.
 *
 * Checks, per tool window: open, drag, SE-corner resize, W-edge resize, dblclick maximize/restore,
 * localStorage persistence, restore after reload, close, containment in a small viewport, and
 * recovery of the stored rect when the viewport grows again. Plus a multi-window check
 * (bring-to-front, canvas click-through).
 *
 * Add a window: add an entry to SUITES below (how to open it) — everything else is generic.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
mkdirSync(OUT, { recursive: true });

const STORAGE_KEY = 'tacticalWindowsV1'; // UI_WINDOW.STORAGE_KEY
// "Start tactical simulation" / "Close window" (kept escaped so the file is encoding-proof)
const START_TEXT = '\u555f\u52d5\u6230\u8853\u6a21\u64ec';
const CLOSE_TITLE = '\u95dc\u9589\u8996\u7a97';

/**
 * How each window is opened.
 *  - menuIndex: position of its button in the SystemMenu dropdown (until U7a replaces the menu).
 *  - seed: windows without a menu entry are pre-opened through the persisted layout.
 */
const SUITES = [
    { id: 'logs' },
    { id: 'db' },
    { id: 'vfxmap' },
    { id: 'monitor' },
];

let failures = 0;
const ok = (name, cond, extra = '') => {
    if (!cond) failures++;
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
};

const launchBrowser = async () => {
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true });
    }
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true }); } catch { /* try next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

const server = await createServer({ server: { port: 3199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();
const consoleErrors = [];

const newPage = async (suite) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (suite.seed) {
        const layout = { [suite.id]: { x: suite.seed.x, y: suite.seed.y, w: suite.seed.w, h: suite.seed.h, max: false, open: true, collapsed: false } };
        // Only seed when nothing is stored yet, so reload tests exercise real persistence.
        await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [STORAGE_KEY, JSON.stringify(layout)]);
    }
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 300)));
    page.on('console', (m) => {
        // Ignore the favicon 404; everything else counts.
        if (m.type() === 'error' && !/favicon|404/.test(m.text())) consoleErrors.push('console.error: ' + m.text().slice(0, 200));
    });
    return { ctx, page };
};

const enterManualMode = async (page) => {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(800);
};

const rectOf = (page, id) => page.evaluate((wid) => {
    const e = document.querySelector(`[data-window-id=${wid}]`);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, z: Number(e.style.zIndex) };
}, id);

const openViaMenu = async (page, target) => {
    const menuBtn = page.locator('[data-testid="system-menu-button"]').or(page.locator('button.w-12.h-12').first());
    await menuBtn.click();
    await page.waitForTimeout(300);
    if (typeof target === 'string') {
        await page.locator(`[data-testid="menu-item-${target}"]`).click();
    } else {
        await page.locator('button.min-w-\\[180px\\]').nth(target).click();
    }
    await page.waitForTimeout(500);
};

const near = (a, b, tol = 4) => Math.abs(a - b) <= tol;

const runSuite = async (suite) => {
    const { id } = suite;
    console.log(`\n── window: ${id}`);
    const { ctx, page } = await newPage(suite);
    await enterManualMode(page);
    if (suite.menuIndex !== undefined) {
        await openViaMenu(page, suite.menuIndex);
    } else if (!suite.seed) {
        await openViaMenu(page, suite.id);
    }


    const b = await rectOf(page, id);
    ok(`${id}: opens`, !!b, JSON.stringify(b));
    if (!b) { await page.screenshot({ path: join(OUT, `${id}_open_failed.png`) }); await ctx.close(); return; }
    await page.screenshot({ path: join(OUT, `${id}_1_open.png`) });

    // drag by title bar
    await page.mouse.move(b.x + 120, b.y + 20);
    await page.mouse.down();
    await page.mouse.move(b.x + 220, b.y + 80, { steps: 8 });
    await page.mouse.up();
    const b2 = await rectOf(page, id);
    ok(`${id}: drag moves window 1:1`, near(b2.x, b.x + 100) && near(b2.y, b.y + 60), JSON.stringify(b2));

    // SE corner (grab slightly inside: the rounded corner clips hit-testing at the very edge)
    await page.mouse.move(b2.x + b2.width - 10, b2.y + b2.height - 10);
    await page.mouse.down();
    await page.mouse.move(b2.x + b2.width + 100, b2.y + b2.height + 60, { steps: 8 });
    await page.mouse.up();
    const b3 = await rectOf(page, id);
    ok(`${id}: SE resize grows window`, b3.width > b2.width + 80 && b3.height > b2.height + 40, JSON.stringify(b3));

    // W edge shrink
    await page.mouse.move(b3.x + 2, b3.y + b3.height / 2);
    await page.mouse.down();
    await page.mouse.move(b3.x + 82, b3.y + b3.height / 2, { steps: 6 });
    await page.mouse.up();
    const b4 = await rectOf(page, id);
    ok(`${id}: W resize shrinks from the left edge`, b4.width < b3.width - 60 && b4.x > b3.x + 60, JSON.stringify(b4));
    await page.screenshot({ path: join(OUT, `${id}_2_moved_resized.png`) });

    // maximize / restore
    await page.mouse.dblclick(b4.x + 100, b4.y + 20);
    await page.waitForTimeout(300);
    const bm = await rectOf(page, id);
    ok(`${id}: dblclick maximizes to the viewport`, bm.width > 1400 && bm.height > 860, JSON.stringify(bm));
    await page.screenshot({ path: join(OUT, `${id}_3_maximized.png`) });
    await page.mouse.dblclick(bm.x + 100, bm.y + 20);
    await page.waitForTimeout(300);
    const br = await rectOf(page, id);
    ok(`${id}: dblclick again restores the previous rect`, near(br.width, b4.width, 3) && near(br.x, b4.x, 3), JSON.stringify(br));

    // persistence
    await page.waitForTimeout(700);
    const saved = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    ok(`${id}: layout persisted to localStorage`, !!saved && saved.includes(`"${id}"`));
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(800);
    const bp = await rectOf(page, id);
    ok(`${id}: rect + open state restored after reload`, !!bp && near(bp.x, br.x, 3) && near(bp.width, br.width, 3), JSON.stringify(bp));

    // content actually rendered (not an empty shell)
    const hasContent = await page.evaluate((wid) => (document.querySelector(`[data-window-id=${wid}]`)?.textContent ?? '').trim().length > 20, id);
    ok(`${id}: body content rendered`, hasContent);

    // close
    await page.locator(`[data-window-id=${id}] button[title="${CLOSE_TITLE}"]`).click();
    await page.waitForTimeout(300);
    ok(`${id}: close button closes (body unmounted)`, (await rectOf(page, id)) === null);

    // small viewport containment + recovery (reopen first)
    if (suite.menuIndex !== undefined) await openViaMenu(page, suite.menuIndex);
    else if (!suite.seed) await openViaMenu(page, suite.id);
    else await page.evaluate(([k, wid]) => { const m = JSON.parse(localStorage.getItem(k)); m[wid].open = true; localStorage.setItem(k, JSON.stringify(m)); }, [STORAGE_KEY, id]).then(() => page.reload({ waitUntil: 'networkidle' })).then(() => page.getByText(START_TEXT).click()).then(() => page.waitForTimeout(800));

    const full = await rectOf(page, id);
    await page.setViewportSize({ width: 420, height: 400 });
    await page.waitForTimeout(500);
    const bs = await rectOf(page, id);
    ok(`${id}: fully contained in a small viewport`, !!bs && bs.x >= 0 && bs.y >= 0 && bs.x + bs.width <= 420 && bs.y + bs.height <= 400, JSON.stringify(bs));
    await page.screenshot({ path: join(OUT, `${id}_4_small_viewport.png`) });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    const bl = await rectOf(page, id);
    ok(`${id}: stored rect recovered when the viewport grows`, !!bl && !!full && near(bl.width, full.width, 3) && near(bl.x, full.x, 3), JSON.stringify(bl));
    await ctx.close();
};

const runMultiWindow = async () => {
    console.log('\n── multi-window');
    const { ctx, page } = await newPage({ id: 'vfxmap', seed: { x: 100, y: 80, w: 720, h: 520 } });
    await enterManualMode(page);
    await openViaMenu(page, 'logs');
    await openViaMenu(page, 'db');

    const [logs, db, vfx] = await Promise.all(['logs', 'db', 'vfxmap'].map((id) => rectOf(page, id)));
    ok('three windows open at the same time', !!logs && !!db && !!vfx);
    if (!logs || !db || !vfx) { await ctx.close(); return; }
    await page.screenshot({ path: join(OUT, 'multi_1_three_windows.png') });

    // Press on the title bar of the window that is currently underneath -> it must come to front.
    const lowest = [['logs', logs], ['db', db], ['vfxmap', vfx]].sort((a, b) => a[1].z - b[1].z)[0];
    // Find a point on the lowest window's title bar that no other window covers.
    const pt = await page.evaluate((wid) => {
        const e = document.querySelector(`[data-window-id=${wid}]`);
        const r = e.getBoundingClientRect();
        for (let dx = 8; dx < r.width - 8; dx += 4) {
            const px = r.x + dx; const py = r.y + 20;
            const hit = document.elementFromPoint(px, py);
            if (hit && e.contains(hit)) return { x: px, y: py };
        }
        return null;
    }, lowest[0]);
    ok('lowest window has an uncovered title-bar point', !!pt);
    if (!pt) { await ctx.close(); return; }
    await page.mouse.move(pt.x, pt.y);
    await page.mouse.down();
    await page.mouse.up();
    const after = await Promise.all(['logs', 'db', 'vfxmap'].map((id) => rectOf(page, id)));
    const maxZ = Math.max(...after.map((r) => r.z));
    const lowestAfter = after[['logs', 'db', 'vfxmap'].indexOf(lowest[0])];
    ok(`pressing the title bar raises the window (${lowest[0]})`, lowestAfter.z === maxZ);

    // Click-through: a point far from every window must hit the game canvas.
    const hit = await page.evaluate(() => document.elementFromPoint(1420, 880)?.tagName);
    ok('area outside the windows hits the canvas (click-through)', hit === 'CANVAS', String(hit));
    await ctx.close();
};

try {
    for (const suite of SUITES) await runSuite(suite);
    await runMultiWindow();
} catch (e) {
    failures++;
    console.log('SCRIPT ERROR: ' + String(e.message).slice(0, 500));
}

ok('no console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED (screenshots: ${OUT})`);
process.exit(failures === 0 ? 0 : 1);
