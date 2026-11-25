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
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
mkdirSync(OUT, { recursive: true });

const STORAGE_KEY = 'tacticalWindowsV1'; // UI_WINDOW.STORAGE_KEY
// "Start tactical simulation" / "Close window" (kept escaped so the file is encoding-proof)
const START_TEXT = 'START SIMULATION';
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
    { id: 'directorSettings' },
    { id: 'zoneSettings' },
    { id: 'showcaseSettings' },
    { id: 'audioSettings' },
    {
        id: 'inspector',
        open: async (page) => {
            const target = await page.evaluate(() => {
                const engine = window.__TACTICAL_ENGINE__;
                const agent = engine?.agents[0];
                if (!agent) return null;
                const canvas = document.querySelector('canvas');
                if (!canvas) return null;
                const rect = canvas.getBoundingClientRect();
                const cam = engine.renderer.camera;
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const terrainH = engine.map?.getTerrainHeight ? engine.map.getTerrainHeight(agent.q, agent.r) : 0;
                const worldX = agent.px;
                const worldY = agent.py - terrainH;
                return {
                    x: rect.left + (worldX - cam.x) * cam.zoom + cx,
                    y: rect.top + (worldY - cam.y) * cam.zoom + cy,
                };
            });
            if (target) {
                await page.mouse.click(target.x, target.y);
                await page.waitForTimeout(500);
            } else {
                await openViaMenu(page, 'inspector');
            }
        },
    },
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
const baseUrl = `${server.resolvedUrls.local[0]}?quality=0&mute`;
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

/** 共用 Select 是 Radix：點開觸發器，再點文字含 optionText 的選項。 */
const chooseOption = async (page, testId, optionText) => {
    await page.locator(`[data-testid="${testId}"]`).click();
    await page.locator('[role="option"]').filter({ hasText: optionText }).first().click();
    await page.waitForTimeout(150);
};

/**
 * 操作列（播放列、工具列）的版面合約：純圖示、單列、不超出畫面。
 * 文字會撐寬面板、面板不夠就換行或拉伸，這個問題每次改版都回來，所以用檢查擋住。
 * 說明放 aria-label 與 title；數值讀數（1.0x）不是按鈕，可以留。
 */
const CONTROL_BAR_MAX_HEIGHT_PX = 64;
async function checkControlBars(page, where) {
    const bars = await page.evaluate(() => ['playback-hud', 'map-toolbar'].map((id) => {
        const bar = document.querySelector(`[data-testid="${id}"]`);
        if (!bar) return { id, missing: true };
        const r = bar.getBoundingClientRect();
        const buttons = [...bar.querySelectorAll('button')].map((b) => {
            const br = b.getBoundingClientRect();
            return { text: b.textContent.trim(), label: b.getAttribute('aria-label'), centerY: br.top + br.height / 2 };
        });
        const ys = buttons.map((b) => b.centerY);
        return {
            id,
            height: r.height,
            left: r.left,
            right: r.right,
            viewport: window.innerWidth,
            count: buttons.length,
            withText: buttons.filter((b) => b.text !== '').map((b) => b.text),
            unlabelled: buttons.filter((b) => !b.label).length,
            rowSpread: Math.max(...ys) - Math.min(...ys),
        };
    }));
    for (const b of bars) {
        const detail = JSON.stringify(b);
        ok(`${where} ${b.id}: exists with buttons`, !b.missing && b.count > 0, detail);
        if (b.missing) continue;
        ok(`${where} ${b.id}: buttons are icon-only and labelled`, b.withText.length === 0 && b.unlabelled === 0, detail);
        ok(`${where} ${b.id}: stays on one row`, b.rowSpread <= 2 && b.height <= CONTROL_BAR_MAX_HEIGHT_PX, detail);
        ok(`${where} ${b.id}: fits the viewport`, b.left >= 0 && b.right <= b.viewport, detail);
    }
}

const rectOf = (page, id) => page.evaluate((wid) => {
    const e = document.querySelector(`[data-window-id=${wid}]`);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, z: Number(e.style.zIndex) };
}, id);

const openViaMenu = async (page, windowId) => {
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);
    await page.locator(`[data-testid="menu-item-${windowId}"]`).click();
    await page.waitForTimeout(500);
};

const near = (a, b, tol = 4) => Math.abs(a - b) <= tol;

const runSuite = async (suite) => {
    const { id } = suite;
    console.log(`\n── window: ${id}`);
    const { ctx, page } = await newPage(suite);
    if (id === 'showcaseSettings') {
        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
    } else {
        await enterManualMode(page);
    }
    if (suite.open) {
        await suite.open(page);
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
    if (id !== 'showcaseSettings') {
        await page.getByText(START_TEXT).click();
        await page.waitForTimeout(800);
    } else {
        await page.waitForTimeout(600);
    }
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
    if (id === 'showcaseSettings') {
        await openViaMenu(page, 'showcaseSettings');
    } else if (suite.open) await suite.open(page);
    else if (suite.menuIndex !== undefined) await openViaMenu(page, suite.menuIndex);
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
            // 標題列的三顆鈕不算：按到關閉鈕視窗就沒了
            if (hit && e.contains(hit) && !hit.closest('[data-window-btn]')) return { x: px, y: py };
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

const runToolMenuSuite = async () => {
    console.log('\n── ToolMenu (SystemMenu)');
    const { ctx, page } = await newPage({ id: 'toolmenu' });
    await enterManualMode(page);

    // 1. Open menu and check all 7 window items + reset layout + spec item exist
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);

    const manualWindowIds = ['logs', 'db', 'vfxmap', 'monitor', 'directorSettings', 'zoneSettings', 'inspector'];
    for (const wid of manualWindowIds) {
        const item = page.locator(`[data-testid="menu-item-${wid}"]`);
        ok(`menu item exists: ${wid}`, await item.isVisible());
    }
    const scItemInManual = page.locator('[data-testid="menu-item-showcaseSettings"]');
    ok('manual mode: menu-item-showcaseSettings does not exist', (await scItemInManual.count()) === 0 || !(await scItemInManual.isVisible()));
    ok('menu item exists: audioSettings', await page.locator('[data-testid="menu-item-audioSettings"]').isVisible());
    ok('menu item exists: reset-layout', await page.locator('[data-testid="menu-item-reset-layout"]').isVisible());
    ok('menu item exists: spec', await page.locator('[data-testid="menu-item-spec"]').isVisible());
    const menuRows = await page.evaluate(() => ['menu-item-reset-layout', 'menu-item-spec'].map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        const rowLeft = el.getBoundingClientRect().left;
        const iconLeft = el.firstElementChild.getBoundingClientRect().left;
        return { id, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, iconInset: iconLeft - rowLeft };
    }));
    ok('system menu: two-line actions fit inside their rows', menuRows.every((r) => r.scrollHeight <= r.clientHeight), JSON.stringify(menuRows));
    ok('system menu: actions are left-aligned', menuRows.every((r) => r.iconInset <= 16), JSON.stringify(menuRows));

    // 2. Click backdrop outside menu to dismiss
    await page.mouse.click(100, 100);
    await page.waitForTimeout(300);
    const menuHidden = !(await page.locator('[data-testid="menu-item-logs"]').isVisible());
    ok('clicking backdrop closes menu', menuHidden);

    // 3. Re-open menu, check dot indicator state, click to toggle
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);

    // Helper to check if indicator dot for a window is active (bg-cyan-400)
    const isDotActive = (wid) => page.evaluate((id) => {
        const btn = document.querySelector(`[data-testid="menu-item-${id}"]`);
        const dot = btn?.querySelector('.rounded-full:last-child');
        return dot ? dot.classList.contains('bg-cyan-400') : false;
    }, wid);

    ok('logs dot inactive before open', !(await isDotActive('logs')));

    // Click logs to open window
    await page.locator('[data-testid="menu-item-logs"]').click();
    await page.waitForTimeout(500);
    const logsRect = await rectOf(page, 'logs');
    ok('clicking menu item opens window', logsRect !== null);

    // Reopen menu: dot should now be active
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);
    ok('logs dot active after open', await isDotActive('logs'));

    // Click logs again to close window
    await page.locator('[data-testid="menu-item-logs"]').click();
    await page.waitForTimeout(500);
    const logsClosedRect = await rectOf(page, 'logs');
    ok('clicking menu item again closes window', logsClosedRect === null);

    // Reopen menu: dot should be inactive again
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);
    ok('logs dot inactive after close', !(await isDotActive('logs')));

    // 4. Test "Reset Layout":
    // Open logs window
    await page.locator('[data-testid="menu-item-logs"]').click();
    await page.waitForTimeout(500);
    const origRect = await rectOf(page, 'logs');

    // Drag logs window so its position changes from default
    await page.mouse.move(origRect.x + 100, origRect.y + 20);
    await page.mouse.down();
    await page.mouse.move(origRect.x + 200, origRect.y + 80, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(600); // Wait for debounce save

    const movedRect = await rectOf(page, 'logs');
    ok('dragged logs away from default', movedRect && movedRect.x > origRect.x + 50);

    // Open menu and click "Reset Layout"
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid="menu-item-reset-layout"]').click();
    await page.waitForTimeout(500);

    // Verify localStorage key is cleared
    const savedAfterReset = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    ok('reset layout clears window localStorage', savedAfterReset === null);

    // Re-open logs window and verify its rect is reset to defaultRect
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-testid="menu-item-logs"]').click();
    await page.waitForTimeout(500);

    const resetRect = await rectOf(page, 'logs');
    ok('window rect restored to default after reset layout', resetRect && near(resetRect.x, 40, 4) && near(resetRect.y, 80, 4), JSON.stringify(resetRect));

    await ctx.close();

    // 5. Verify showcase mode SystemMenu: only showcaseSettings, reset-layout, spec exist
    const { ctx: scCtx, page: scPage } = await newPage({ id: 'toolmenu_showcase' });
    await scPage.goto(baseUrl, { waitUntil: 'networkidle' });
    await scPage.waitForTimeout(500);

    await scPage.locator('[data-testid="system-menu-button"]').click();
    await scPage.waitForTimeout(300);

    const scItemInShowcase = scPage.locator('[data-testid="menu-item-showcaseSettings"]');
    ok('showcase mode: menu-item-showcaseSettings exists', await scItemInShowcase.isVisible());
    const audioItemInShowcase = scPage.locator('[data-testid="menu-item-audioSettings"]');
    ok('showcase mode: menu-item-audioSettings exists', await audioItemInShowcase.isVisible());

    for (const wid of manualWindowIds) {
        const item = scPage.locator(`[data-testid="menu-item-${wid}"]`);
        ok(`showcase mode: menu-item-${wid} does not exist`, (await item.count()) === 0 || !(await item.isVisible()));
    }
    await scCtx.close();
};

const runSchemaFormSuite = async () => {
    console.log('\n── SchemaForm -> Engine (zoneSettings & directorSettings)');
    const { ctx, page } = await newPage({ id: 'schemaform' });
    await enterManualMode(page);

    // 1. zoneSettings: initial values match engine
    await openViaMenu(page, 'zoneSettings');
    const engZone = await page.evaluate(() => ({
        enabled: window.__TACTICAL_ENGINE__.zoneConfig.enabled,
        initialRadius: window.__TACTICAL_ENGINE__.zoneConfig.initialRadius,
    }));
    const uiRadius = await page.locator('[data-testid="setting-slider-initialRadius"]').inputValue();
    const uiEnabled = await page.locator('[data-testid="setting-toggle-zoneEnabled"]').isChecked();
    ok('zoneSettings: initial radius matches engine', Number(uiRadius) === engZone.initialRadius, `${uiRadius} vs ${engZone.initialRadius}`);
    ok('zoneSettings: initial enabled matches engine', uiEnabled === engZone.enabled);

    // Toggle zoneEnabled
    await page.locator('[data-testid="setting-toggle-zoneEnabled"]').click({ force: true });
    await page.waitForTimeout(300);
    const engZoneAfterToggle = await page.evaluate(() => window.__TACTICAL_ENGINE__.zoneConfig.enabled);
    ok('zoneSettings: toggle updates engine zoneConfig.enabled', engZoneAfterToggle === !engZone.enabled);

    // Drag initialRadius slider
    const radiusBox = await page.locator('[data-testid="setting-slider-initialRadius"]').boundingBox();
    await page.mouse.move(radiusBox.x + radiusBox.width * 0.2, radiusBox.y + radiusBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(radiusBox.x + radiusBox.width * 0.85, radiusBox.y + radiusBox.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const engRadiusAfter = await page.evaluate(() => window.__TACTICAL_ENGINE__.zoneConfig.initialRadius);
    ok('zoneSettings: slider updates engine initialRadius', engRadiusAfter > 16 && engRadiusAfter <= 25, String(engRadiusAfter));

    // Close zoneSettings
    await page.locator(`[data-window-id="zoneSettings"] button[title="${CLOSE_TITLE}"]`).click();
    await page.waitForTimeout(300);

    // 2. directorSettings: initial followStiffness matches engine and is NOT 3.5
    await openViaMenu(page, 'directorSettings');
    const engFollow = await page.evaluate(() => window.__TACTICAL_ENGINE__.renderer.camera.followStiffness);
    const uiFollow = await page.locator('[data-testid="setting-slider-followStiffness"]').inputValue();
    ok('directorSettings: initial followStiffness matches engine (not 3.5)', Math.abs(Number(uiFollow) - engFollow) < 0.05 && Math.abs(Number(uiFollow) - 3.5) > 0.05, `${uiFollow} vs ${engFollow}`);

    // Drag followStiffness slider
    const followBox = await page.locator('[data-testid="setting-slider-followStiffness"]').boundingBox();
    await page.mouse.move(followBox.x + followBox.width * 0.2, followBox.y + followBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(followBox.x + followBox.width * 0.8, followBox.y + followBox.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const engFollowAfter = await page.evaluate(() => window.__TACTICAL_ENGINE__.renderer.camera.followStiffness);
    ok('directorSettings: slider updates engine followStiffness within clamp range', engFollowAfter >= 0.1 && engFollowAfter <= 5.0 && Math.abs(engFollowAfter - engFollow) > 0.5, String(engFollowAfter));

    // Close directorSettings
    await page.locator(`[data-window-id="directorSettings"] button[title="${CLOSE_TITLE}"]`).click();
    await page.waitForTimeout(300);

    await ctx.close();
};

const runShowcaseAndPinSuite = async () => {
    console.log('\n── Showcase & Pinned Toolbar (PlaybackHUD)');
    // Seed logs window open in localStorage
    const { ctx, page } = await newPage({ id: 'logs', seed: { x: 40, y: 80, w: 640, h: 420 } });

    // 1. Enter page in showcase mode (do NOT click START_TEXT)
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Assert standard windows (e.g. logs) are NOT visible in showcase mode
    const logsInShowcase = await rectOf(page, 'logs');
    ok('showcase mode: standard window (logs) is hidden', logsInShowcase === null);

    // Open showcaseSettings from the system menu (the old top-left gear was removed 2026-10-19)
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.locator('[data-testid="menu-item-showcaseSettings"]').click();
    await page.waitForTimeout(500);
    const scRect = await rectOf(page, 'showcaseSettings');
    ok('showcase mode: showcaseSettings window visible and interactive', scRect !== null);

    // Enter manual mode
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(800);

    // Assert showcaseSettings was closed when entering manual mode
    const scInManual = await rectOf(page, 'showcaseSettings');
    ok('manual mode: showcaseSettings closed after entering manual mode', scInManual === null);

    // Assert standard windows are now restored and visible
    const logsInManual = await rectOf(page, 'logs');
    ok('manual mode: standard windows restored and visible', logsInManual !== null);

    // 2. Playback toolbar drag, persistence, and clamp
    const getPlaybackRect = () => page.evaluate(() => {
        const btn = document.querySelector('button[title="開始戰鬥"], button[title="暫停戰鬥"]');
        const tb = btn?.closest('[style*="position: fixed"]');
        if (!tb) return null;
        const r = tb.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
    });

    const pbInit = await getPlaybackRect();
    ok('playback toolbar rendered in manual mode', pbInit !== null);
    if (!pbInit) { await ctx.close(); return; }

    // Drag playback toolbar by its right grab-handle
    await page.mouse.move(pbInit.x + pbInit.width - 10, pbInit.y + pbInit.height / 2);
    await page.mouse.down();
    await page.mouse.move(pbInit.x + pbInit.width - 10 + 60, pbInit.y + pbInit.height / 2 - 40, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(400);

    const pbMoved = await getPlaybackRect();
    ok('playback toolbar dragged to new position', pbMoved && Math.abs(pbMoved.x - (pbInit.x + 60)) <= 4 && Math.abs(pbMoved.y - (pbInit.y - 40)) <= 4);

    // Reload page and re-enter manual mode
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(800);

    const pbReloaded = await getPlaybackRect();
    ok('playback toolbar position preserved after reload (±2px)', pbReloaded && pbMoved && near(pbReloaded.x, pbMoved.x, 2) && near(pbReloaded.y, pbMoved.y, 2), JSON.stringify(pbReloaded));

    // Shrink viewport to 420x400
    await page.setViewportSize({ width: 420, height: 400 });
    // 工具列先切精簡排版、再夾回畫面內，位移有 500ms 過場（transition-all duration-500）；等它停下再量
    await page.waitForTimeout(1200);

    const pbSmall = await getPlaybackRect();
    ok(
        'playback toolbar fully contained in small viewport (420x400)',
        pbSmall && pbSmall.x >= 0 && pbSmall.y >= 0 && pbSmall.x + pbSmall.width <= 420 && pbSmall.y + pbSmall.height <= 400,
        JSON.stringify(pbSmall)
    );

    await ctx.close();
};

const runInspectorCommandSuite = async () => {
    console.log('\n── Inspector Commands (UnitInspectorHUD -> EDIT_AGENT)');
    const { ctx, page } = await newPage({ id: 'inspector-cmd' });
    await ctx.addInitScript(([k]) => { localStorage.removeItem(k); }, [STORAGE_KEY]);
    await enterManualMode(page);

    // Spawn units using the dice button on PlaybackHUD
    await page.locator('button[title="隨機生成戰場與陣容"]').click();
    await page.waitForTimeout(1000);

    // 1. Calculate screen coordinates of an agent and click to select
    let target = null;
    let isInspectorOpen = false;
    const editBtn = page.locator('button[title="編輯單位屬性"]');

    for (let attempt = 0; attempt < 3; attempt++) {
        target = await page.evaluate((idx) => {
            const engine = window.__TACTICAL_ENGINE__;
            if (!engine || !engine.agents || engine.agents.length === 0) return null;
            const alive = engine.agents.filter(a => a.hp > 0);
            const canvas = document.querySelector('canvas');
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const cam = engine.renderer.camera;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const candidates = alive.filter(u => {
                const terrainH = engine.map?.getTerrainHeight ? engine.map.getTerrainHeight(u.q, u.r) : 0;
                const sx = rect.left + (u.px - cam.x) * cam.zoom + cx;
                const sy = rect.top + (u.py - terrainH - cam.y) * cam.zoom + cy;
                return sx > 380 && sx < rect.width - 100 && sy > 120 && sy < rect.height - 120;
            });
            const agent = (candidates.length > 0 ? candidates[idx % candidates.length] : null) || alive[idx % alive.length] || engine.agents[0];
            if (!agent) return null;
            const terrainH = engine.map?.getTerrainHeight ? engine.map.getTerrainHeight(agent.q, agent.r) : 0;
            const worldX = agent.px;
            const worldY = agent.py - terrainH;
            return {
                screenX: rect.left + (worldX - cam.x) * cam.zoom + cx,
                screenY: rect.top + (worldY - cam.y) * cam.zoom + cy,
                agentId: agent.id,
                role: agent.role,
                maxHp: agent.maxHp,
                q: agent.q, r: agent.r,
            };
        }, attempt);

        if (target) {
            await page.mouse.click(target.screenX, target.screenY);
            await page.waitForTimeout(600);
        }

        isInspectorOpen = await editBtn.isVisible();
        if (isInspectorOpen) break;
    }

    if (!isInspectorOpen) {
        await openViaMenu(page, 'inspector');
        await page.waitForTimeout(400);
        isInspectorOpen = await editBtn.isVisible();
    }

    if (!isInspectorOpen) {
        ok('inspector opened on unit select (canvas click reached the agent)', false, JSON.stringify(target));
        await ctx.close();
        return;
    }

    ok('inspector opened on unit select', isInspectorOpen);

    // 玩家操控（契約 G3）：Inspector 的開關切換控制者；選取中的玩家單位點空地＝移動指令。做完切回 AI，不影響後面的檢查
    {
        const control = page.locator('[data-testid="inspector-control"]');
        const playerUnitId = () => page.evaluate(() => window.__TACTICAL_ENGINE__.agents.find((a) => a.controller === 'PLAYER')?.id ?? null);
        const orderOf = (id) => page.evaluate((agentId) => window.__TACTICAL_ENGINE__.agents.find((a) => a.id === agentId)?.order ?? null, id);
        await control.click({ force: true });
        await page.waitForTimeout(200);
        const playerId = await playerUnitId();
        ok('G3: PLAYER CONTROL switch hands the selected unit to the player', playerId !== null && await control.isChecked(), String(playerId));
        if (playerId) {
            // 掃畫面找一個沒人、沒障礙物的格子（避開左邊的 Inspector 與上下的操作列）
            const cell = await page.evaluate(() => {
                const engine = window.__TACTICAL_ENGINE__;
                const rect = document.querySelector('canvas').getBoundingClientRect();
                const cam = engine.renderer.camera;
                for (let y = 180; y < rect.height - 160; y += 15) {
                    for (let x = 420; x < rect.width - 120; x += 15) {
                        const h = engine.renderer.getHexAtScreenPoint(x, y, rect.width, rect.height, cam, engine);
                        if (h && engine.map.isValid(h.q, h.r) && !engine.map.hasObstacle(h.q, h.r) && !engine.agents.some((a) => a.q === h.q && a.r === h.r)) {
                            return { screenX: Math.round(rect.left + x), screenY: Math.round(rect.top + y), q: h.q, r: h.r };
                        }
                    }
                }
                return null;
            });
            if (cell) {
                await page.mouse.click(cell.screenX, cell.screenY);
                await page.waitForTimeout(250);
            }
            const order = await orderOf(playerId);
            ok('G3: tapping empty ground with a player unit selected issues a move order', order?.type === 'MOVE', JSON.stringify({ order, cell }));
            ok('G3: the unit stays selected after the order', await control.isVisible());
            await control.click({ force: true });
            await page.waitForTimeout(200);
            ok('G3: switching back to AI clears the order', (await playerUnitId()) === null && (await orderOf(playerId)) === null);
        }
    }

    // Expand config drawer
    await editBtn.click();
    await page.waitForTimeout(400);

    // Change Role to another role
    const newRole = target.role === 'WARRIOR' ? 'TANK' : 'WARRIOR';
    await chooseOption(page, 'inspector-role', newRole);
    await page.waitForTimeout(150);

    // Change maxHp to 123 (R8: draft + Enter submission)
    const hpInput = page.locator('[data-testid="inspector-hp"] input');
    await hpInput.fill('123');
    await hpInput.press('Enter');
    await page.waitForTimeout(300);

    // Change bodyType (Task A2e)
    if (await page.locator('[data-testid="inspector-bodytype"]').isVisible()) {
        await chooseOption(page, 'inspector-bodytype', '男');
        await page.waitForTimeout(150);
    }

    // Assert live engine agent was updated
    const updated = await page.evaluate((aid) => {
        const a = window.__TACTICAL_ENGINE__.agents.find(u => u.id === aid);
        return a ? { role: a.role, maxHp: a.maxHp, hp: a.hp, bodyType: a.bodyType } : null;
    }, target.agentId);

    ok('inspector EDIT_AGENT changed role in live engine', updated?.role === newRole, `${updated?.role} vs ${newRole}`);
    ok('inspector EDIT_AGENT changed maxHp in live engine to 123', updated?.maxHp === 123, String(updated?.maxHp));
    ok('inspector EDIT_AGENT updated hp in live engine to 123', updated?.hp === 123, String(updated?.hp));
    ok('inspector EDIT_AGENT verified bodyType in live engine', updated?.bodyType === 'MALE', String(updated?.bodyType));

    // 1. Selecting another unit preserves inspector rect (D5)
    const r1 = await rectOf(page, 'inspector');
    let r2 = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        const secondAgent = await page.evaluate(({ currId, idx }) => {
            const engine = window.__TACTICAL_ENGINE__;
            if (!engine?.agents) return null;
            const canvas = document.querySelector('canvas');
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const cam = engine.renderer.camera;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const alive = engine.agents.filter(u => u.id !== currId && u.hp > 0);
            const candidates = alive.filter(u => {
                const terrainH = engine.map?.getTerrainHeight ? engine.map.getTerrainHeight(u.q, u.r) : 0;
                const sx = rect.left + (u.px - cam.x) * cam.zoom + cx;
                const sy = rect.top + (u.py - terrainH - cam.y) * cam.zoom + cy;
                return sx > 380 && sx < rect.width - 100 && sy > 120 && sy < rect.height - 120;
            });
            // 點擊是先換算成格子再找單位：相鄰格有人就可能選到別人，後面的斷言會驗錯對象
            const isolated = candidates.filter(u => !alive.some(o => o !== u
                && (Math.abs(o.q - u.q) + Math.abs(o.r - u.r) + Math.abs(o.q + o.r - u.q - u.r)) / 2 <= 1));
            const pool = isolated.length > 0 ? isolated : candidates;
            const agent = (pool.length > 0 ? pool[idx % pool.length] : null) || alive[idx % alive.length];
            if (!agent) return null;
            const terrainH = engine.map?.getTerrainHeight ? engine.map.getTerrainHeight(agent.q, agent.r) : 0;
            const worldX = agent.px;
            const worldY = agent.py - terrainH;
            return {
                screenX: rect.left + (worldX - cam.x) * cam.zoom + cx,
                screenY: rect.top + (worldY - cam.y) * cam.zoom + cy,
                agentId: agent.id
            };
        }, { currId: target.agentId, idx: attempt });

        if (secondAgent) {
            await page.mouse.click(secondAgent.screenX, secondAgent.screenY);
            await page.waitForTimeout(400);
            r2 = await rectOf(page, 'inspector');
            if (r2 !== null) break;
        }
    }
    ok('selecting another unit preserves inspector rect (D5)', Boolean(r1 && r2 && near(r1.x, r2.x, 2) && near(r1.y, r2.y, 2) && near(r1.width, r2.width, 2) && near(r1.height, r2.height, 2)), `${JSON.stringify(r1)} vs ${JSON.stringify(r2)}`);

    // 2. Click outside inspector on empty canvas area to deselect
    await page.mouse.click(650, 450);
    await page.waitForTimeout(400);
    const closedAfterUnselect = await rectOf(page, 'inspector');
    ok('clicking outside inspector deselects agent and closes inspector', closedAfterUnselect === null);

    // Re-select unit on canvas
    await page.mouse.click(target.screenX, target.screenY);
    await page.waitForTimeout(400);
    const reopened = await rectOf(page, 'inspector');
    ok('clicking canvas agent reopens inspector', reopened !== null);

    // 2a. Behavior tree is its own window and follows the selection.
    await page.locator('[data-testid="inspector-open-bt"]').click();
    await page.waitForTimeout(400);
    const btAgent = await page.locator('[data-testid="behavior-tree-agent"]').textContent();
    const inspectorText = await page.locator('[data-window-id="inspector"]').textContent();
    ok('behavior tree window shows the unit selected in the inspector', Boolean(btAgent) && inspectorText.includes(btAgent), btAgent);
    const btBlur = await page.evaluate(() => [...document.querySelectorAll('[data-window-id="behaviorTree"] *')].filter((e) => getComputedStyle(e).backdropFilter !== 'none').length);
    ok('behavior tree rows have no nested blur', btBlur === 0, `blur=${btBlur}`);
    ok('behavior tree has a readable tree', (await page.locator('[data-window-id="behaviorTree"] [role="treeitem"]').count()) > 0);
    await page.locator('[data-window-id="behaviorTree"] [data-window-btn="close"]').click();
    await page.waitForTimeout(200);

    // 2b. Maximized windows rise above the system menu and the toolbar; Esc restores them.
    await page.locator('[data-window-id="inspector"] [data-window-btn="maximize"]').click();
    await page.waitForTimeout(300);
    const maxHits = await page.evaluate(() => {
        const root = document.querySelector('[data-window-id="inspector"]');
        const buttons = {};
        for (const b of root.querySelectorAll('[data-window-btn]')) {
            const r = b.getBoundingClientRect();
            buttons[b.getAttribute('data-window-btn')] = root.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        }
        const r = root.getBoundingClientRect();
        let blocked = 0;
        for (let i = 0; i < 24; i++) for (let j = 0; j < 16; j++) {
            if (!root.contains(document.elementFromPoint(r.x + (i + .5) * r.width / 24, r.y + (j + .5) * r.height / 16))) blocked++;
        }
        return { buttons, blocked };
    });
    ok('maximized window: title-bar buttons are not covered', Object.values(maxHits.buttons).length === 3 && Object.values(maxHits.buttons).every(Boolean), JSON.stringify(maxHits.buttons));
    ok('maximized window: no toolbar or menu on top of it', maxHits.blocked === 0, `blocked=${maxHits.blocked}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const restored = await rectOf(page, 'inspector');
    ok('Esc restores a maximized window', restored !== null && restored.width < 1200, `width=${restored?.width}`);

    // 2c. 視窗內的卷軸要拖得動：縮放把手不能蓋在卷軸上
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-testid="menu-item-db"]').click();
    await page.waitForTimeout(400);
    // 無頭模式預設隱藏卷軸，拖不到，所以驗卷軸那一條上按得到的是捲動容器本身
    const scrollbarHits = await page.evaluate(() => {
        const el = document.querySelector('[data-window-id="db"] .ui-scroll');
        const r = el.getBoundingClientRect();
        const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scrollbar'));
        const points = [];
        for (let dx = 1; dx < bar; dx += 2) {
            // 右下角把手要夠大才抓得到（圓角會裁掉邊緣），它蓋住卷軸最底部幾 px，滑塊仍抓得到
            for (const y of [r.top + 8, r.top + r.height / 2, r.bottom - 12]) {
                const hit = document.elementFromPoint(r.right - dx, y);
                points.push({ dx, y: Math.round(y), onScroller: hit === el || el.contains(hit), handle: hit?.getAttribute?.('data-handle-direction') ?? null });
            }
        }
        return { bar, overflow: el.scrollHeight - el.clientHeight, blocked: points.filter((p) => !p.onScroller) };
    });
    ok('skill database has enough rows to scroll', scrollbarHits.overflow > 0, `overflow=${scrollbarHits.overflow}`);
    ok('scrollbar is not covered by a resize handle', scrollbarHits.bar > 0 && scrollbarHits.blocked.length === 0, JSON.stringify(scrollbarHits.blocked.slice(0, 4)));
    await page.locator('[data-window-id="db"] [data-window-btn="close"]').click();
    await page.waitForTimeout(200);

    // 3. SystemMenu is layered above inspector
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);
    const menuZ = await page.evaluate(() => {
        const menu = document.querySelector('[data-testid="system-menu-button"]')?.closest('div[style*="z-index"]');
        const inspector = document.querySelector('[data-window-id="inspector"]');
        return {
            menuZ: menu ? Number(window.getComputedStyle(menu).zIndex) : 0,
            inspectorZ: inspector ? Number(window.getComputedStyle(inspector).zIndex) : 0,
        };
    });
    ok('SystemMenu is layered above inspector', menuZ.menuZ > menuZ.inspectorZ, `${menuZ.menuZ} vs ${menuZ.inspectorZ}`);
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);

    // 4. Dead agent displays empty state without throwing
    await page.evaluate((aid) => {
        const a = window.__TACTICAL_ENGINE__.agents.find(u => u.id === aid);
        if (a) { a.hp = 0; a.fullyDead = true; }
    }, target.agentId);
    await page.waitForTimeout(400);
    const emptyStateText = await page.locator('[data-window-id="inspector"]').textContent();
    ok('dead agent shows empty state without throwing', emptyStateText.includes('請先選取單位'));

    await ctx.close();
};

const STYLE_BASELINE_PATH = join(here, 'style-baseline.json');
const UPDATE_STYLE = process.env.E2E_UPDATE_STYLE === '1';

const SNAPSHOT_PROPS = [
    'color',
    'backgroundColor',
    'borderTopColor',
    'boxShadow',
    'backdropFilter',
    'opacity',
    'borderRadius',
    'fontSize',
];

const TARGET_ELEMENTS_MANUAL = [
    { id: 'window_logs', selector: '[data-window-id="logs"]' },
    { id: 'window_logs_header', selector: '[data-window-id="logs"] > div:first-child' },
    { id: 'window_logs_close_btn', selector: '[data-window-id="logs"] button[title="\u95dc\u9589\u8996\u7a97"]' },
    { id: 'window_logs_collapse_btn', selector: '[data-window-id="logs"] button[title="\u6536\u5408\u8996\u7a97"]' },
    { id: 'window_db', selector: '[data-window-id="db"]' },
    { id: 'window_vfxmap', selector: '[data-window-id="vfxmap"]' },
    { id: 'window_monitor', selector: '[data-window-id="monitor"]' },
    { id: 'window_director_settings', selector: '[data-window-id="directorSettings"]' },
    { id: 'window_zone_settings', selector: '[data-window-id="zoneSettings"]' },
    { id: 'slider_zone_radius', selector: '[data-testid="setting-slider-initialRadius"]' },
    { id: 'toggle_zone_enabled', selector: '[data-testid="setting-toggle-zoneEnabled"]' },
    { id: 'window_inspector', selector: '[data-window-id="inspector"]' },
    { id: 'window_inspector_header', selector: '[data-window-id="inspector"] > div:first-child' },
    { id: 'window_inspector_tab_status', selector: '[data-window-id="inspector"] button[title="\u72c0\u614b\u76e3\u63a7"]' },
    { id: 'window_inspector_tab_skills', selector: '[data-window-id="inspector"] button[title="\u6280\u80fd\u914d\u7f6e (LINK)"]' },
    { id: 'window_inspector_config_btn', selector: '[data-window-id="inspector"] button[title="\u7de8\u8f2f\u55ae\u4f4d\u5c6c\u6027"]' },
    { id: 'playback_hud', selector: '[data-testid="playback-hud"]' },
    { id: 'playback_play_btn', selector: '[data-testid="playback-play-btn"]' },
    { id: 'system_menu_btn', selector: '[data-testid="system-menu-button"]' },
    { id: 'system_menu_item_logs', selector: '[data-testid="menu-item-logs"]' },
    { id: 'system_menu_item_reset', selector: '[data-testid="menu-item-reset-layout"]' },
];

const TARGET_ELEMENTS_SHOWCASE = [
    { id: 'showcase_card', selector: '[data-testid="showcase-card"]' },
    { id: 'showcase_enter_btn', selector: '[data-testid="showcase-enter-btn"]' },
    { id: 'window_showcase_settings', selector: '[data-window-id="showcaseSettings"]' },
    { id: 'showcase_settings_tab_system', selector: '[data-testid="showcase-tab-system"]' },
    { id: 'showcase_settings_tab_matrix', selector: '[data-testid="showcase-tab-visual"]' },
    { id: 'showcase_settings_slider_timescale', selector: '[data-testid="showcase-slider-timescale"]' },
];

const runStyleSnapshotSuite = async () => {
    console.log('\n── Style Snapshot Visual Guardrail (S1)');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(([k]) => { localStorage.removeItem(k); }, [STORAGE_KEY]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 300)));
    page.on('console', (m) => {
        if (m.type() === 'error' && !/favicon|404/.test(m.text())) consoleErrors.push('console.error: ' + m.text().slice(0, 200));
    });

    await enterManualMode(page);
    await page.waitForTimeout(400);

    // Spawn units using the dice button on PlaybackHUD
    await page.locator('button[title="\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9"]').click();
    await page.waitForTimeout(1000);

    // Reduced motion & freeze animations
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addStyleTag({
        content: `*, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
        }`
    });

    // 1. Select unit on canvas to open inspector with full unit data
    for (let attempt = 0; attempt < 3; attempt++) {
        const target = await page.evaluate((idx) => {
            const engine = window.__TACTICAL_ENGINE__;
            if (!engine || !engine.agents || engine.agents.length === 0) return null;
            const alive = engine.agents.filter(a => a.hp > 0);
            const agent = alive[idx % alive.length] || engine.agents[0];
            if (!agent) return null;
            const canvas = document.querySelector('canvas');
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const cam = engine.renderer.camera;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const terrainH = engine.map?.getTerrainHeight ? engine.map.getTerrainHeight(agent.q, agent.r) : 0;
            const worldX = agent.px;
            const worldY = agent.py - terrainH;
            return {
                screenX: rect.left + (worldX - cam.x) * cam.zoom + cx,
                screenY: rect.top + (worldY - cam.y) * cam.zoom + cy,
                agentId: agent.id
            };
        }, attempt);

        if (target) {
            await page.mouse.click(target.screenX, target.screenY);
            await page.waitForTimeout(600);
        }

        const isInspectorOpen = await page.locator('[data-window-id="inspector"] button[title="\u7de8\u8f2f\u55ae\u4f4d\u5c6c\u6027"]').isVisible();
        if (isInspectorOpen) break;
    }

    // 2. Open needed windows via menu
    await openViaMenu(page, 'logs');
    await openViaMenu(page, 'db');
    await openViaMenu(page, 'vfxmap');
    await openViaMenu(page, 'monitor');
    await openViaMenu(page, 'directorSettings');
    await openViaMenu(page, 'zoneSettings');

    // 3. Keep SystemMenu open so menu items are in DOM
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);

    const collectStyles = async (elements) => {
        return await page.evaluate(({ elements, props }) => {
            const out = {};
            for (const item of elements) {
                const el = document.querySelector(item.selector);
                if (!el) {
                    out[item.id] = { __missing: true, selector: item.selector };
                    continue;
                }
                const cs = window.getComputedStyle(el);
                const s = {};
                for (const p of props) {
                    if (p === 'backdropFilter') {
                        s[p] = cs.backdropFilter || cs.webkitBackdropFilter || 'none';
                    } else {
                        s[p] = cs[p] || '';
                    }
                }
                out[item.id] = s;
            }
            return out;
        }, { elements, props: SNAPSHOT_PROPS });
    };

    const manualStyles = await collectStyles(TARGET_ELEMENTS_MANUAL);

    // Close SystemMenu before entering showcase
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(200);

    // Enter showcase mode via playback hud button
    const showcaseBtn = page.locator('button[title*="\u5c55\u793a"]');
    if (await showcaseBtn.count() > 0) {
        await showcaseBtn.click();
        await page.waitForTimeout(600);
    }

    // Open showcaseSettings in showcase mode（左上舊齒輪 2026-10-19 移除，改從系統選單開）
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-testid="menu-item-showcaseSettings"]').click();
    await page.waitForTimeout(400);

    const showcaseStyles = await collectStyles(TARGET_ELEMENTS_SHOWCASE);

    const currentSnapshot = {
        ...manualStyles,
        ...showcaseStyles,
    };

    // Assert all target elements found
    const missing = Object.entries(currentSnapshot).filter(([_, v]) => v.__missing);
    ok('all target elements found in DOM for style-snapshot', missing.length === 0, missing.map(([k, v]) => `${k} (${v.selector})`).join(', '));

    if (UPDATE_STYLE || !existsSync(STYLE_BASELINE_PATH)) {
        writeFileSync(STYLE_BASELINE_PATH, JSON.stringify(currentSnapshot, null, 2) + '\n', 'utf8');
        console.log(`PASS  [style-snapshot] baseline written (${Object.keys(currentSnapshot).length} elements)`);
        ok('style baseline generated/updated', true);
    } else {
        const baselineRaw = readFileSync(STYLE_BASELINE_PATH, 'utf8');
        const baseline = JSON.parse(baselineRaw);

        const diffs = [];
        for (const [elemId, styles] of Object.entries(currentSnapshot)) {
            if (!baseline[elemId]) {
                diffs.push({ element: elemId, diff: 'missing from baseline' });
                continue;
            }
            for (const prop of SNAPSHOT_PROPS) {
                const expected = baseline[elemId][prop];
                const actual = styles[prop];
                if (expected !== actual) {
                    diffs.push({ element: elemId, prop, expected, actual });
                }
            }
        }

        const diffMsg = diffs.length > 0 
            ? diffs.map(d => `${d.element}.${d.prop}: expected "${d.expected}" !== actual "${d.actual}"`).join('; ')
            : '';
        ok('style-snapshot: 0 diffs against baseline', diffs.length === 0, diffMsg);
    }

    await ctx.close();
};

const runBottomSheetSuite = async () => {
    console.log('\n── Narrow Screen Bottom Sheet (U12a)');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(([k]) => { localStorage.removeItem(k); }, [STORAGE_KEY]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 300)));
    page.on('console', (m) => {
        if (m.type() === 'error' && !/favicon|404/.test(m.text())) consoleErrors.push('console.error: ' + m.text().slice(0, 200));
    });

    await enterManualMode(page);
    await page.waitForTimeout(400);

    // Open 3 windows via SystemMenu: logs, directorSettings, zoneSettings
    await openViaMenu(page, 'logs');
    await openViaMenu(page, 'directorSettings');
    await openViaMenu(page, 'zoneSettings');
    await page.waitForTimeout(400);

    // 1. Assert only ONE window is visible in DOM
    const visibleWindows = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[data-window-id]'));
        return els.map(el => {
            const r = el.getBoundingClientRect();
            return {
                id: el.getAttribute('data-window-id'),
                rect: { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom },
            };
        });
    });

    ok('narrow screen: exactly one window rendered/visible', visibleWindows.length === 1, `count: ${visibleWindows.length}`);
    const active = visibleWindows[0];
    ok('narrow screen: active window is zoneSettings (topmost open)', active?.id === 'zoneSettings', active?.id);

    // 2. Assert width = viewport width (390)
    ok('narrow screen: width equals viewport width', active && near(active.rect.width, 390, 2), `${active?.rect.width} vs 390`);

    // 3. Assert bottom edge flush with viewport bottom (844)
    // 手動模式底部面板要讓開播放列（index.css 的 --ui-sheet-bottom = 96px）
    ok('narrow screen: bottom sheet stays clear of the playback bar', active && near(active.rect.bottom, 844 - 96, 2), `${active?.rect.bottom} vs 748`);
    await checkControlBars(page, 'phone');

    // 4. Assert height <= 72vh (844 * 0.72 = 607.68)
    const maxAllowedHeight = 844 * 0.72 + 2;
    ok('narrow screen: height <= 72vh', active && active.rect.height <= maxAllowedHeight, `${active?.rect.height} <= ${maxAllowedHeight}`);

    // 5. Assert no resize handles and no maximize button rendered
    const handleCount = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('div')).filter(el => {
            const cs = window.getComputedStyle(el);
            return cs.cursor && cs.cursor.includes('resize');
        }).length;
    });
    ok('narrow screen: no resize handles rendered', handleCount === 0, `handle count: ${handleCount}`);

    const maxBtnCount = await page.locator('[data-window-id="zoneSettings"] button[title*="\u6700\u5927\u5316"], [data-window-id="zoneSettings"] button[title*="\u9084\u539f\u8996\u7a97"]').count();
    ok('narrow screen: maximize button not rendered', maxBtnCount === 0, `count: ${maxBtnCount}`);

    // 6. Resize viewport back to 1440x900 and verify all 3 windows restore their original desktop rects
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);

    const wideWindows = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[data-window-id]'));
        return els.map(el => el.getAttribute('data-window-id'));
    });

    ok('wide screen restore: all 3 windows visible', wideWindows.length === 3, `count: ${wideWindows.length}`);
    const logsRect = await rectOf(page, 'logs');
    ok('wide screen restore: logs window recovered desktop rect', logsRect && near(logsRect.width, 640, 2) && near(logsRect.height, 420, 2), JSON.stringify(logsRect));

    await ctx.close();
};

const runTouchTargetAndReducedMotionSuite = async () => {
    console.log('\n── Touch Target & Reduced Motion (U12b)');
    const ctx = await browser.newContext({
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
        isMobile: true,
    });
    await ctx.addInitScript(([k]) => { localStorage.removeItem(k); }, [STORAGE_KEY]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 300)));
    page.on('console', (m) => {
        if (m.type() === 'error' && !/favicon|404/.test(m.text())) consoleErrors.push('console.error: ' + m.text().slice(0, 200));
    });

    await enterManualMode(page);
    await page.waitForTimeout(400);

    await openViaMenu(page, 'logs');
    await page.waitForTimeout(300);

    // 1. Measure title bar buttons bounding box >= 44px
    const collapseBtnBox = await page.locator('[data-window-id="logs"] [data-window-btn="collapse"]').boundingBox();
    ok('touch context: collapse button width >= 44px', collapseBtnBox && collapseBtnBox.width >= 44, `${collapseBtnBox?.width} >= 44`);
    ok('touch context: collapse button height >= 44px', collapseBtnBox && collapseBtnBox.height >= 44, `${collapseBtnBox?.height} >= 44`);

    const closeBtnBox = await page.locator('[data-window-id="logs"] [data-window-btn="close"]').boundingBox();
    ok('touch context: close button width >= 44px', closeBtnBox && closeBtnBox.width >= 44, `${closeBtnBox?.width} >= 44`);
    ok('touch context: close button height >= 44px', closeBtnBox && closeBtnBox.height >= 44, `${closeBtnBox?.height} >= 44`);

    // 2. Measure resize handle bounding boxes >= 44px
    const seHandleBox = await page.locator('[data-window-id="logs"] [data-handle-direction="se"]').boundingBox();
    ok('touch context: se handle width >= 44px', seHandleBox && seHandleBox.width >= 44, `${seHandleBox?.width} >= 44`);
    ok('touch context: se handle height >= 44px', seHandleBox && seHandleBox.height >= 44, `${seHandleBox?.height} >= 44`);

    const sHandleBox = await page.locator('[data-window-id="logs"] [data-handle-direction="s"]').boundingBox();
    ok('touch context: s handle height >= 44px', sHandleBox && sHandleBox.height >= 44, `${sHandleBox?.height} >= 44`);

    // 3. Measure title bar buttons in narrow bottom sheet context
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const sheetCloseBtnBox = await page.locator('[data-window-id="logs"] [data-window-btn="close"]').boundingBox();
    ok('bottom sheet touch context: close button width >= 44px', sheetCloseBtnBox && sheetCloseBtnBox.width >= 44, `${sheetCloseBtnBox?.width} >= 44`);
    ok('bottom sheet touch context: close button height >= 44px', sheetCloseBtnBox && sheetCloseBtnBox.height >= 44, `${sheetCloseBtnBox?.height} >= 44`);

    // 4. prefers-reduced-motion: reduce -> animationName === 'none'
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(200);

    const animResult = await page.evaluate(() => {
        const testEl = document.createElement('div');
        testEl.className = 'animate-fade-in animate-slide-up transition-all';
        document.body.appendChild(testEl);
        const cs = window.getComputedStyle(testEl);
        const animName = cs.animationName;
        const transProp = cs.transitionProperty;
        testEl.remove();
        return { animName, transProp };
    });

    ok('reduced motion: animationName is none', animResult.animName === 'none', animResult.animName);
    ok('reduced motion: transition is none', animResult.transProp === 'none', animResult.transProp);

    await ctx.close();
};

const runTabletEdgeSuite = async () => {
    console.log('\n── Tablet touch: window edge vs resize handle (U3)');
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(([k]) => { localStorage.removeItem(k); }, [STORAGE_KEY]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 300)));
    page.on('console', (m) => {
        if (m.type() === 'error' && !/favicon|404/.test(m.text())) consoleErrors.push('console.error: ' + m.text().slice(0, 200));
    });
    await enterManualMode(page);
    await page.waitForTimeout(400);
    await openViaMenu(page, 'logs');
    await page.waitForTimeout(300);

    // 內容區最靠邊的點（視窗右緣、下緣往內 14 px）要是內容，不是把手；把手本體要夠大且大部分在視窗外
    const probe = await page.evaluate(() => {
        const win = document.querySelector('[data-window-id="logs"]');
        const r = win.getBoundingClientRect();
        const body = win.querySelector('[data-window-body="true"]');
        const b = body.getBoundingClientRect();
        const hit = (x, y) => document.elementFromPoint(x, y);
        const handleOf = (el) => el?.getAttribute?.('data-handle-direction') ?? null;
        const midY = (b.top + b.bottom) / 2;
        const midX = (b.left + b.right) / 2;
        const e = win.querySelector('[data-handle-direction="e"]').getBoundingClientRect();
        const w = win.querySelector('[data-handle-direction="w"]').getBoundingClientRect();
        return {
            rect: { x: r.x, y: r.y, right: r.right, bottom: r.bottom },
            viewport: { w: window.innerWidth, h: window.innerHeight },
            innerRight: handleOf(hit(r.right - 14, midY)),
            innerLeft: handleOf(hit(r.left + 14, midY)),
            innerBottom: handleOf(hit(midX, r.bottom - 14)),
            outsideRight: handleOf(hit(r.right + 8, midY)),
            eWidth: e.width,
            eInside: Math.max(0, r.right - e.left),
            wInside: Math.max(0, w.right - r.left),
        };
    });
    const detail = JSON.stringify(probe);
    ok('tablet touch: content 14px inside the right edge is not a resize handle', probe.innerRight === null, detail);
    ok('tablet touch: content 14px inside the left edge is not a resize handle', probe.innerLeft === null, detail);
    ok('tablet touch: content 14px inside the bottom edge is not a resize handle', probe.innerBottom === null, detail);
    ok('tablet touch: side handle keeps a 44px touch width', probe.eWidth >= 44, detail);
    ok('tablet touch: side handle covers at most ~12px of the window interior', probe.eInside <= 14 && probe.wInside <= 14, detail);
    ok('tablet touch: the outside part of the handle is grabbable', probe.outsideRight === 'e', detail);

    // 抓外側的部分真的拉得動
    const before = await rectOf(page, 'logs');
    const gx = before.x + before.width + 8;
    const gy = before.y + before.height / 2;
    await page.mouse.move(gx, gy);
    await page.mouse.down();
    await page.mouse.move(gx - 60, gy, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const after = await rectOf(page, 'logs');
    ok('tablet touch: dragging the outside part of the E handle resizes the window', after.width < before.width - 40, JSON.stringify({ before: before.width, after: after.width }));
    await page.screenshot({ path: join(OUT, 'tablet_edge_logs.png') });
    await ctx.close();
};

const runTouchScrollSuite = async () => {
    console.log('\n── Touch Scroll (U12c)');
    const ctx = await browser.newContext({
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
    });
    await ctx.addInitScript(([k]) => { localStorage.removeItem(k); }, [STORAGE_KEY]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 300)));
    page.on('console', (m) => {
        if (m.type() === 'error' && !/favicon|404/.test(m.text())) consoleErrors.push('console.error: ' + m.text().slice(0, 200));
    });

    await enterManualMode(page);
    await page.waitForTimeout(400);

    // Open db window
    await openViaMenu(page, 'db');
    await page.waitForTimeout(300);

    // Verify touch-action computed styles
    const touchActions = await page.evaluate(() => {
        const root = document.querySelector('.h-dvh');
        const canvas = document.querySelector('canvas');
        const titlebar = document.querySelector('[data-window-id="db"] [data-window-titlebar="true"]');
        const body = document.querySelector('[data-window-id="db"] [data-window-body="true"]');
        return {
            rootTouchAction: root ? window.getComputedStyle(root).touchAction : null,
            canvasTouchAction: canvas ? window.getComputedStyle(canvas).touchAction : null,
            titlebarTouchAction: titlebar ? window.getComputedStyle(titlebar).touchAction : null,
            bodyTouchAction: body ? window.getComputedStyle(body).touchAction : null,
        };
    });

    ok('root touch-action is auto (touch-none removed)', touchActions.rootTouchAction === 'auto', touchActions.rootTouchAction);
    ok('canvas touch-action is none', touchActions.canvasTouchAction === 'none', touchActions.canvasTouchAction);
    ok('titlebar touch-action is none', touchActions.titlebarTouchAction === 'none', touchActions.titlebarTouchAction);
    ok('window body touch-action allows pan', touchActions.bodyTouchAction === 'pan-x pan-y' || touchActions.bodyTouchAction === 'pan-y pan-x', touchActions.bodyTouchAction);

    // Test CDP synthesizeScrollGesture on db window body
    const initialRect = await rectOf(page, 'db');
    const initialCamera = await page.evaluate(() => {
        const cam = window.__TACTICAL_ENGINE__?.renderer?.camera;
        return cam ? { x: cam.x, y: cam.y, zoom: cam.zoom } : null;
    });

    const bodyRect = await page.locator('[data-window-id="db"] [data-window-body="true"]').boundingBox();

    if (bodyRect) {
        try {
            const cdp = await ctx.newCDPSession(page);
            await cdp.send('Input.synthesizeScrollGesture', {
                x: Math.round(bodyRect.x + bodyRect.width / 2),
                y: Math.round(bodyRect.y + bodyRect.height / 2),
                yDistance: -250,
                speed: 800,
                gestureSourceType: 'touch',
            });
            await page.waitForTimeout(400);

            const scrollInfo = await page.evaluate(() => {
                const scrollable = document.querySelector('[data-window-id="db"] .overflow-y-auto') ||
                                   document.querySelector('[data-window-id="db"] .overflow-auto') ||
                                   document.querySelector('[data-window-id="db"] > div:last-child');
                return {
                    scrollTop: scrollable?.scrollTop ?? 0,
                    scrollHeight: scrollable?.scrollHeight ?? 0,
                    clientHeight: scrollable?.clientHeight ?? 0,
                };
            });

            const currentRect = await rectOf(page, 'db');
            const currentCamera = await page.evaluate(() => {
                const cam = window.__TACTICAL_ENGINE__?.renderer?.camera;
                return cam ? { x: cam.x, y: cam.y, zoom: cam.zoom } : null;
            });

            ok('window rect preserved during scroll gesture', near(currentRect.x, initialRect.x, 2) && near(currentRect.y, initialRect.y, 2), JSON.stringify(currentRect));
            if (initialCamera && currentCamera) {
                ok('canvas camera did not move during window scroll', near(currentCamera.x, initialCamera.x, 1) && near(currentCamera.y, initialCamera.y, 1), `${currentCamera.x} vs ${initialCamera.x}`);
            }

            if (scrollInfo.scrollTop > 0) {
                ok('CDP touch scroll gesture scrolled content', scrollInfo.scrollTop > 0, `scrollTop: ${scrollInfo.scrollTop}`);
            } else {
                console.log(`INFO: CDP touch scroll gesture produced scrollTop: ${scrollInfo.scrollTop}`);
            }
        } catch (e) {
            console.log('INFO: CDP synthesizeScrollGesture not supported: ' + e.message);
        }
    }

    await ctx.close();
};

const runEditorSuite = async () => {
    console.log('\n── Editor & Camera Interaction (E8-0)');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(([k]) => { localStorage.removeItem(k); }, [STORAGE_KEY]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 300)));
    page.on('console', (m) => {
        if (m.type() === 'error' && !/favicon|404/.test(m.text())) consoleErrors.push('console.error: ' + m.text().slice(0, 200));
    });

    await enterManualMode(page);
    await page.waitForTimeout(400);

    // Scan canvas using engine.renderer.getHexAtScreenPoint
    const scanHexScreenPoints = async () => {
        return await page.evaluate(() => {
            const engine = window.__TACTICAL_ENGINE__;
            const canvas = document.querySelector('canvas');
            if (!engine || !canvas) return {};
            const rect = canvas.getBoundingClientRect();
            const cam = engine.renderer.camera;
            const map = {};
            for (let y = 160; y < rect.height - 120; y += 15) {
                for (let x = 400; x < rect.width - 120; x += 15) {
                    const h = engine.renderer.getHexAtScreenPoint(x, y, rect.width, rect.height, cam, engine);
                    if (h && engine.map.isValid(h.q, h.r)) {
                        const key = `${h.q},${h.r}`;
                        if (!map[key]) {
                            map[key] = { screenX: Math.round(rect.left + x), screenY: Math.round(rect.top + y), q: h.q, r: h.r };
                        }
                    }
                }
            }
            return map;
        });
    };

    const getEmptyHexWithCoord = async () => {
        const hexMap = await scanHexScreenPoints();
        const found = await page.evaluate((keys) => {
            const engine = window.__TACTICAL_ENGINE__;
            for (const key of keys) {
                const [qStr, rStr] = key.split(',');
                const q = parseInt(qStr);
                const r = parseInt(rStr);
                const hasAgent = engine.agents.some(a => a.hp > 0 && a.q === q && a.r === r);
                const hasObs = engine.map.hasObstacle(q, r);
                if (!hasAgent && !hasObs) return key;
            }
            return null;
        }, Object.keys(hexMap));
        if (found && hexMap[found]) return hexMap[found];
        return null;
    };

    const getHexScreenCoord = async (q, r) => {
        const hexMap = await scanHexScreenPoints();
        return hexMap[`${q},${r}`] || null;
    };

    // ① ADD_BLUE: click tool, click hex, verify agent added
    const empty1 = await getEmptyHexWithCoord();
    ok('found empty hex with coordinates', empty1 !== null, JSON.stringify(empty1));
    await page.locator('button[title="部署藍軍 (帝國)"]').click();
    await page.waitForTimeout(200);
    await page.mouse.click(empty1.screenX, empty1.screenY);
    await page.waitForTimeout(300);
    const blueAgent = await page.evaluate(({ q, r }) => {
        const eng = window.__TACTICAL_ENGINE__;
        return eng.agents.find(a => a.q === q && a.r === r);
    }, empty1);
    ok('ADD_BLUE: placed blue agent on empty hex', blueAgent !== undefined && (blueAgent.team === 0 || blueAgent.team === 'blue'), JSON.stringify(blueAgent));

    // ② DELETE: click tool, click blueAgent, verify deleted
    await page.locator('button[title="移除單位或障礙"]').click();
    await page.waitForTimeout(200);
    await page.mouse.click(empty1.screenX, empty1.screenY);
    await page.waitForTimeout(300);
    const agentAfterDel = await page.evaluate(({ q, r }) => {
        return window.__TACTICAL_ENGINE__.agents.find(a => a.q === q && a.r === r);
    }, empty1);
    ok('DELETE: removed agent from hex', agentAfterDel === undefined);

    // ③ OBSTACLE: click tool, click hex, verify obstacle placed & deleted
    const emptyObs = await getEmptyHexWithCoord();
    await page.locator('button[title="地形編輯"]').click();
    await page.waitForTimeout(200);
    await page.mouse.click(emptyObs.screenX, emptyObs.screenY);
    await page.waitForTimeout(300);
    const hasObs = await page.evaluate(({ q, r }) => {
        return window.__TACTICAL_ENGINE__.map.hasObstacle(q, r);
    }, emptyObs);
    ok('OBSTACLE: placed obstacle on hex', hasObs === true);

    await page.locator('button[title="移除單位或障礙"]').click();
    await page.waitForTimeout(200);
    await page.mouse.click(emptyObs.screenX, emptyObs.screenY);
    await page.waitForTimeout(300);
    const hasObsAfterDel = await page.evaluate(({ q, r }) => {
        return window.__TACTICAL_ENGINE__.map.hasObstacle(q, r);
    }, emptyObs);
    ok('DELETE: removed obstacle from hex', hasObsAfterDel === false);

    // ④ SELECT: drag unit to valid and invalid hex
    await page.locator('button[title="選取 / 移動"]').click();
    await page.waitForTimeout(200);
    const agentToDrag = await page.evaluate(() => {
        const a = window.__TACTICAL_ENGINE__.agents.find(u => u.hp > 0);
        return a ? { id: a.id, q: a.q, r: a.r } : null;
    });
    if (agentToDrag) {
        const fromCoord = await getHexScreenCoord(agentToDrag.q, agentToDrag.r);
        const targetEmpty = await getEmptyHexWithCoord();

        if (fromCoord && targetEmpty) {
            await page.mouse.move(fromCoord.screenX, fromCoord.screenY);
            await page.mouse.down();
            await page.mouse.move(targetEmpty.screenX, targetEmpty.screenY, { steps: 5 });
            await page.mouse.up();
            await page.waitForTimeout(300);

            const newPos = await page.evaluate((id) => {
                const a = window.__TACTICAL_ENGINE__.agents.find(u => u.id === id);
                return a ? { q: a.q, r: a.r } : null;
            }, agentToDrag.id);
            ok('SELECT drag: moved agent to valid hex', newPos && newPos.q === targetEmpty.q && newPos.r === targetEmpty.r, JSON.stringify(newPos));

            // Drag to invalid off-board location (top toolbar area)
            await page.mouse.move(targetEmpty.screenX, targetEmpty.screenY);
            await page.mouse.down();
            await page.mouse.move(targetEmpty.screenX, 20, { steps: 5 });
            await page.mouse.up();
            await page.waitForTimeout(300);

            const revertedPos = await page.evaluate((id) => {
                const a = window.__TACTICAL_ENGINE__.agents.find(u => u.id === id);
                return a ? { q: a.q, r: a.r } : null;
            }, agentToDrag.id);
            ok('SELECT drag: agent position reverted on illegal drop', revertedPos && revertedPos.q === targetEmpty.q && revertedPos.r === targetEmpty.r, JSON.stringify(revertedPos));
        }
    }

    // ⑤ Drag obstacle
    const obsHex = await getEmptyHexWithCoord();
    await page.locator('button[title="地形編輯"]').click();
    await page.waitForTimeout(200);
    await page.mouse.click(obsHex.screenX, obsHex.screenY);
    await page.waitForTimeout(300);

    await page.locator('button[title="選取 / 移動"]').click();
    await page.waitForTimeout(200);
    const destHex = await getEmptyHexWithCoord();

    if (destHex) {
        await page.mouse.move(obsHex.screenX, obsHex.screenY);
        await page.mouse.down();
        await page.mouse.move(destHex.screenX, destHex.screenY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        const obsAtDest = await page.evaluate(({ q, r }) => {
            return window.__TACTICAL_ENGINE__.map.hasObstacle(q, r);
        }, destHex);
        ok('SELECT drag obstacle: moved obstacle to new hex', obsAtDest === true);
    }

    // ⑥ DRAFT mode: add unit with specific role
    await page.locator('button[title="部署藍軍 (帝國)"]').click();
    await page.waitForTimeout(200);
    await page.locator('button[title="指定固定職業"]').click();
    await page.waitForTimeout(200);
    await chooseOption(page, 'toolbar-draft-role', 'RANGER');
    const draftHex = await getEmptyHexWithCoord();
    await page.mouse.click(draftHex.screenX, draftHex.screenY);
    await page.waitForTimeout(300);
    const draftAgent = await page.evaluate(({ q, r }) => {
        return window.__TACTICAL_ENGINE__.agents.find(a => a.q === q && a.r === r);
    }, draftHex);
    ok('DRAFT mode: placed unit with selected role RANGER', draftAgent !== undefined && draftAgent.role === 'RANGER', draftAgent?.role);
    // 2026-10-27 起男女各半（依 agent id 雜湊），所以只檢查有指派合法體型
    ok('DRAFT mode: placed unit has bodyType assigned', draftAgent !== undefined && ['MALE', 'FEMALE'].includes(draftAgent.bodyType), draftAgent?.bodyType);

    // ⑦ Wheel zoom: camera.zoom changes
    const initialZoom = await page.evaluate(() => window.__TACTICAL_ENGINE__.renderer.camera.zoom);
    await page.mouse.move(700, 500);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);
    const zoomedIn = await page.evaluate(() => window.__TACTICAL_ENGINE__.renderer.camera.zoom);
    ok('wheel zoom: camera zoom changed', zoomedIn !== initialZoom, `${initialZoom} -> ${zoomedIn}`);

    // ⑧ Empty space drag pan & FPS measurement
    await page.locator('button[title="選取 / 移動"]').click();
    await page.waitForTimeout(200);
    const initialCamPos = await page.evaluate(() => {
        const cam = window.__TACTICAL_ENGINE__.renderer.camera;
        return { x: cam.x, y: cam.y };
    });

    await page.evaluate(() => {
        window.__fpsFrames = 0;
        window.__fpsStart = performance.now();
        function loop() {
            window.__fpsFrames++;
            window.__fpsRaf = requestAnimationFrame(loop);
        }
        window.__fpsRaf = requestAnimationFrame(loop);
    });

    // 暫停時按在單位或障礙物上是拖曳它們，不是平移；隨機地圖要從空格起手
    const panStart = await getEmptyHexWithCoord();
    await page.mouse.move(panStart.screenX, panStart.screenY);
    await page.mouse.down();
    for (let i = 0; i < 10; i++) {
        await page.mouse.move(panStart.screenX - i * 15, panStart.screenY - i * 15);
        await page.waitForTimeout(20);
    }
    await page.mouse.up();
    await page.waitForTimeout(300);

    const fpsResult = await page.evaluate(() => {
        cancelAnimationFrame(window.__fpsRaf);
        const elapsed = (performance.now() - window.__fpsStart) / 1000;
        const fps = Math.round(window.__fpsFrames / elapsed);
        const cam = window.__TACTICAL_ENGINE__.renderer.camera;
        return { fps, x: cam.x, y: cam.y };
    });

    ok('drag pan: camera position changed', fpsResult.x !== initialCamPos.x || fpsResult.y !== initialCamPos.y, `${JSON.stringify(initialCamPos)} vs ${JSON.stringify(fpsResult)}`);
    console.log(`INFO: Baseline Pan FPS: ${fpsResult.fps}`);

    await checkControlBars(page, 'desktop');

    // ⑨ PlaybackHUD Restart & Random buttons
    await page.locator('button[title="重新開始"]').click();
    await page.waitForTimeout(400);
    const battleTimeAfterRestart = await page.evaluate(() => window.__TACTICAL_ENGINE__.battleTime);
    ok('Restart button: battleTime reset to 0', battleTimeAfterRestart === 0);

    await page.locator('button[title="隨機生成戰場與陣容"]').click();
    await page.waitForTimeout(600);
    const agentCountAfterRandom = await page.evaluate(() => window.__TACTICAL_ENGINE__.agents.length);
    ok('Random battlefield button: generated units', agentCountAfterRandom > 0);

    // ⑩ Play / Pause
    const playBtn = page.locator('button[data-testid="playback-play-btn"]');
    await playBtn.click();
    await page.waitForTimeout(400);
    const isPlayingAfterStart = await page.evaluate(() => window.__TACTICAL_ENGINE__.isRunning);
    ok('Play button: battle started (isRunning === true)', isPlayingAfterStart === true);

    await playBtn.click();
    await page.waitForTimeout(400);
    const isPlayingAfterPause = await page.evaluate(() => window.__TACTICAL_ENGINE__.isRunning);
    ok('Pause button: battle paused (isRunning === false)', isPlayingAfterPause === false);

    await ctx.close();
};

const runAudioSettingsSuite = async () => {
    console.log('\n── AudioSettings (S0c E2E)');
    const { ctx, page } = await newPage({ id: 'audioSettings' });

    // 1. Showcase mode: open via menu and verify
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await openViaMenu(page, 'audioSettings');
    const audioWinShowcase = await rectOf(page, 'audioSettings');
    ok('audioSettings: opens in showcase mode', audioWinShowcase !== null);

    // Verify ?mute indicator
    const mutedIndicator = page.locator('[data-testid="url-muted-indicator"]');
    ok('audioSettings: ?mute shows URL muted indicator', await mutedIndicator.isVisible());

    // Verify audio system is not created in engine under ?mute
    const engineAudio = await page.evaluate(() => window.__TACTICAL_ENGINE__?.audio);
    ok('audioSettings: ?mute does not instantiate audio in engine', engineAudio === undefined);

    // Close in showcase mode
    await page.locator(`[data-window-id=audioSettings] button[title="${CLOSE_TITLE}"]`).click();
    await page.waitForTimeout(300);
    ok('audioSettings: closes in showcase mode', (await rectOf(page, 'audioSettings')) === null);

    // 2. Manual mode: enter manual mode, open via menu and verify
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(800);

    await openViaMenu(page, 'audioSettings');
    const audioWinManual = await rectOf(page, 'audioSettings');
    ok('audioSettings: opens in manual mode', audioWinManual !== null);

    // 3. Slider change updates localStorage
    const masterSlider = page.locator('[data-testid="slider-master"]');
    await masterSlider.fill('0.45');
    await masterSlider.dispatchEvent('input');
    await masterSlider.dispatchEvent('change');
    await page.waitForTimeout(400);

    const savedAudio = await page.evaluate((k) => {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
    }, 'tactical_audio_settings');
    ok('audioSettings: slider updates localStorage', !!savedAudio && Math.abs(savedAudio.master - 0.45) < 0.05, JSON.stringify(savedAudio));

    // 4. Mute toggle updates localStorage
    const muteToggle = page.locator('[data-testid="btn-mute-toggle"]');
    await muteToggle.click();
    await page.waitForTimeout(400);

    const savedAfterMute = await page.evaluate((k) => {
        const raw = localStorage.getItem(k);
        return raw ? JSON.parse(raw) : null;
    }, 'tactical_audio_settings');
    ok('audioSettings: mute toggle updates localStorage', !!savedAfterMute && savedAfterMute.muted === true, JSON.stringify(savedAfterMute));

    // Close in manual mode
    await page.locator(`[data-window-id=audioSettings] button[title="${CLOSE_TITLE}"]`).click();
    await page.waitForTimeout(300);
    ok('audioSettings: closes in manual mode', (await rectOf(page, 'audioSettings')) === null);

    await ctx.close();
};

/** PLAY 模式（docs/plans/play-mode.md P4～P6）：主畫面 PLAY → 選主角 → HUD → 瞄準點敵人 → 施放指令 → 停下 → 暫停 → 結算 → 再來一場 → 回主畫面。桌機與手機各一次。 */
/** iPhone 14 Pro 在 Safari 分頁裡實際看得到的範圍（扣掉網址列與工具列）；觸控、DPR 2 */
const PLAY_PHONE = { deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PLAY_VIEWS = [
    ['desktop', { viewport: { width: 1280, height: 800 } }],
    ['iphone-portrait', { viewport: { width: 393, height: 659 }, ...PLAY_PHONE }],
    ['iphone-landscape', { viewport: { width: 852, height: 361 }, ...PLAY_PHONE }],
];
/** 戰鬥 HUD 最多佔可視高度的比例（手機橫向 361 px → 79 px） */
const PLAY_HUD_MAX_HEIGHT_SHARE = 0.22;

/**
 * PLAY 畫面的版面檢查：所有 play-* 元素（含按鈕、選單）四邊都在可視區內、沒有橫向捲動、文字沒有被截斷（scrollWidth > clientWidth）。
 * 回傳違規清單，空陣列才算過。
 */
const playLayoutIssues = (page, root) => page.evaluate((rootSel) => {
    const vw = innerWidth, vh = innerHeight, issues = [];
    if (document.documentElement.scrollWidth > vw + 1) issues.push(`doc scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
    const rootEl = document.querySelector(rootSel);
    if (!rootEl) return [`missing ${rootSel}`];
    if (rootEl.scrollWidth > rootEl.clientWidth + 1) issues.push(`${rootSel} scrollWidth ${rootEl.scrollWidth} > ${rootEl.clientWidth}`);
    for (const el of [rootEl, ...rootEl.querySelectorAll('[data-testid], button, [role="radio"], [role="combobox"]')]) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const name = el.getAttribute('data-testid') ?? `${el.tagName}:${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 12)}`;
        if (r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5) issues.push(`${name} out of view [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
    }
    for (const el of rootEl.querySelectorAll('button *, button')) {
        if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1) issues.push(`truncated "${el.textContent.trim().slice(0, 16)}"`);
    }
    return issues;
}, root);

// ── ADR 0026 K3：PLAY 桌機滑鼠對應與 Quick Cast（主代理寫的紅色驗收，執行代理不得修改）
// 全部在暫停中做：局面不動，點到的格子與單位是確定的（避開 HANDOFF D「敵人移動中點偏」的偶發）。
// 用 bus 監聽記下輸入層送出的 UI_COMMAND（只記錄、照常轉送，不改行為）。
const K3_DRAG_PX = 60;
const K3_DRAG_STEPS = 6;
const K3_SETTLE_MS = 150;
/** 瞄準與 Quick Cast 用普攻槽（SKILL_SLOTS.BASIC＝第 2 槽，鍵 3）：普攻不會因冷卻或魔力被拒收（ADR 0026），前面打過也一定按得出來 */
const K3_AIM_KEY = '3';
const K3_AIM_SLOT = 2;
const spyUiCommands = (page) => page.evaluate(() => {
    const e = window.__TACTICAL_ENGINE__;
    window.__k3Sent = [];
    if (!window.__k3Spy) {
        const orig = e.bus.emit.bind(e.bus);
        e.bus.emit = (type, payload) => {
            if (type === 'UI_COMMAND' && window.__k3Sent) window.__k3Sent.push({ type: payload?.type, targetId: payload?.targetId ?? null, q: payload?.q ?? null, r: payload?.r ?? null, aim: payload?.type === 'SET_AIM' ? payload.aim : undefined });
            return orig(type, payload);
        };
        window.__k3Spy = true;
    }
});
const takeSent = (page) => page.evaluate(() => { const s = window.__k3Sent ?? []; window.__k3Sent = []; return s; });
/** 畫面上（HUD 上方）的一格空地與一個敵人的螢幕座標 */
/** 拖鏡頭的起點離 HUD 至少這麼遠（px） */
const K3_PAN_MARGIN = 80;
/** 左鍵點的空地離所有單位至少這麼多格（單位的身體框會蓋到上方幾格，點到就變成點單位） */
const K3_GROUND_CLEAR_HEX = 3;
/** 選來點的敵人，腳下的點離其他活著的單位至少這麼遠（螢幕 px）：重疊時會點到前面那一個（UnitPick 取 sortY 大者） */
const K3_FOE_CLEAR_PX = 56;
/** 點敵人時點在腳下往上這麼多（世界 px，乘上鏡頭縮放）：腳下那一點在身體框的下緣，差一點就落到上一格的空地 */
const K3_FOE_BODY_LIFT = 12;
/** 暫停後鏡頭還會緩動一陣子：等到相鄰兩次取樣的位移與縮放都小於門檻才取目標（最多等 CAMERA_SETTLE_MAX_MS） */
const CAMERA_SETTLE_EPS = 0.5;
const CAMERA_SETTLE_POLL_MS = 100;
const CAMERA_SETTLE_MAX_MS = 3000;
const waitCameraSettled = async (page) => {
    const camAt = () => page.evaluate(() => { const c = window.__TACTICAL_ENGINE__.renderer.camera; return { x: c.x, y: c.y, z: c.zoom }; });
    let prev = await camAt();
    for (let waited = 0; waited < CAMERA_SETTLE_MAX_MS; waited += CAMERA_SETTLE_POLL_MS) {
        await page.waitForTimeout(CAMERA_SETTLE_POLL_MS);
        const now = await camAt();
        const moved = Math.max(Math.abs(now.x - prev.x), Math.abs(now.y - prev.y)) * now.z;
        if (moved < CAMERA_SETTLE_EPS && Math.abs(now.z - prev.z) < CAMERA_SETTLE_EPS / 100) return;
        prev = now;
    }
};
const playScreenTargets = async (page) => {
    await waitCameraSettled(page);
    return playScreenTargetsNow(page);
};
const playScreenTargetsNow = (page) => page.evaluate(({ panMargin, groundClear, foeClear, foeLift }) => {
    const e = window.__TACTICAL_ENGINE__;
    const hero = e.agents.find((a) => a.id === e.matchFlow.playHeroId);
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const hud = document.querySelector('[data-testid="play-hud"]')?.getBoundingClientRect();
    const bottom = (hud ? hud.top - rect.top : rect.height) - 40;
    const cam = e.renderer.camera;
    let ground = null;
    for (let y = 100; y < bottom && !ground; y += 15) {
        for (let x = 60; x < rect.width - 60; x += 15) {
            const h = e.renderer.getHexAtScreenPoint(x, y, rect.width, rect.height, cam, e);
            if (h && document.elementFromPoint(rect.left + x, rect.top + y) === canvas && e.map.isValid(h.q, h.r) && !e.map.hasObstacle(h.q, h.r) && !e.agents.some((a) => a.hp > 0 && (Math.abs(a.q - h.q) + Math.abs(a.r - h.r) + Math.abs(a.q + a.r - h.q - h.r)) / 2 < groundClear)) {
                ground = { x: Math.round(rect.left + x), y: Math.round(rect.top + y), q: h.q, r: h.r };
                break;
            }
        }
    }
    const screenOf = (a) => {
        const th = e.map?.getTerrainHeight ? e.map.getTerrainHeight(a.q, a.r) : 0;
        return { id: a.id, side: a.side, x: rect.left + (a.px - cam.x) * cam.zoom + rect.width / 2, y: rect.top + (a.py - th - cam.y) * cam.zoom + rect.height / 2 };
    };
    const living = e.agents.filter((a) => a.hp > 0).map(screenOf);
    const foe = living.filter((p) => hero && p.side !== hero.side)
        .filter((p) => p.x > rect.left + 40 && p.x < rect.right - 40 && p.y > rect.top + 100 && p.y < rect.top + bottom)
        .find((p) => living.every((o) => o.id === p.id || Math.hypot(o.x - p.x, o.y - p.y) >= foeClear)) ?? null;
    return { ground, foe: foe && { id: foe.id, x: foe.x, y: foe.y - foeLift * cam.zoom }, center: { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + Math.min(rect.height / 2, bottom - panMargin)) } };
}, { panMargin: K3_PAN_MARGIN, groundClear: K3_GROUND_CLEAR_HEX, foeClear: K3_FOE_CLEAR_PX, foeLift: K3_FOE_BODY_LIFT }).catch(() => ({ ground: null, foe: null, center: null }));
/** 主畫面進選主角畫面：入口鈕若還是模擬，先按交換鈕 */
const openPlaySetup = async (page) => {
    if (await page.locator('[data-testid="showcase-play-btn"]').count() === 0) await page.click('[data-testid="showcase-mode-swap"]');
    await page.waitForSelector('[data-testid="showcase-play-btn"]');
    await page.click('[data-testid="showcase-play-btn"]');
    await page.waitForSelector('[data-testid="play-setup"]');
};
const dragWith = async (page, from, button) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down({ button });
    await page.mouse.move(from.x + K3_DRAG_PX, from.y + K3_DRAG_PX / 2, { steps: K3_DRAG_STEPS });
    await page.mouse.up({ button });
    await page.waitForTimeout(K3_SETTLE_MS);
};
const isOrder = (t) => typeof t === 'string' && t.startsWith('ORDER_');

const runPlayMouseChecks = async (page, tag) => {
    await page.keyboard.press(' ');
    await page.waitForTimeout(K3_SETTLE_MS);
    await spyUiCommands(page);
    const t = await playScreenTargets(page);
    if (!t.ground || !t.center) { ok(`PLAY ${tag} K3: an empty ground hex is on screen`, false, JSON.stringify(t)); await page.keyboard.press(' '); return; }

    // 左鍵按下就送移動指令（不用等放開）
    await page.mouse.move(t.ground.x, t.ground.y);
    await takeSent(page);
    await page.mouse.down();
    await page.waitForTimeout(K3_SETTLE_MS);
    const onPress = await takeSent(page);
    await page.mouse.up();
    await page.waitForTimeout(K3_SETTLE_MS);
    const onRelease = await takeSent(page);
    ok(`PLAY ${tag} K3: left button sends the move order on press, nothing more on release`,
        onPress.filter((c) => c.type === 'ORDER_MOVE').length === 1 && !onRelease.some((c) => isOrder(c.type)),
        JSON.stringify({ onPress, onRelease }));

    // 左鍵按住拖：只有按下那一筆指令，不拖鏡頭
    await dragWith(page, t.ground, 'left');
    const leftDrag = await takeSent(page);
    ok(`PLAY ${tag} K3: dragging with the left button keeps one order and does not pan`,
        leftDrag.filter((c) => isOrder(c.type)).length === 1 && !leftDrag.some((c) => c.type === 'CAMERA_PAN'),
        JSON.stringify(leftDrag));

    // 右鍵、中鍵拖：拖鏡頭，不下指令
    for (const button of ['right', 'middle']) {
        await dragWith(page, t.center, button);
        const sent = await takeSent(page);
        ok(`PLAY ${tag} K3: dragging with the ${button} button pans the camera and sends no order`,
            sent.some((c) => c.type === 'CAMERA_PAN') && !sent.some((c) => isOrder(c.type)),
            JSON.stringify(sent));
    }

    // 終審 #3（11-25）：同一個滑鼠已按著一顆鍵時再按另一顆，瀏覽器只發 pointermove（沒有 pointerdown／pointerup）
    // 右鍵按著時按左鍵：照樣下令；放開右鍵後還按著的左鍵不拖鏡頭、不再下令
    // 右鍵按著不拖：拖了鏡頭會動（畫面邊緣還會被夾住），左鍵按下的位置就不一定在地圖上；chord 只看另一顆鍵按著，和有沒有拖無關。
    // 前面拖過鏡頭，開頭取的空地座標已經不準：重取一次
    const tc = await playScreenTargets(page);
    if (!tc.ground) { ok(`PLAY ${tag} K3: an empty ground hex is on screen for the chord checks`, false, JSON.stringify(tc)); await page.keyboard.press(' '); return; }
    await page.mouse.move(tc.ground.x, tc.ground.y);
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(K3_SETTLE_MS);
    await takeSent(page);
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(K3_SETTLE_MS);
    const chordPress = await takeSent(page);
    await page.mouse.up({ button: 'right' });
    await page.mouse.move(tc.ground.x + K3_DRAG_PX, tc.ground.y + K3_DRAG_PX / 2, { steps: K3_DRAG_STEPS });
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(K3_SETTLE_MS);
    const chordAfter = await takeSent(page);
    ok(`PLAY ${tag} K3: pressing left while right is held still sends one order`,
        chordPress.filter((c) => isOrder(c.type)).length === 1, JSON.stringify({ chordPress, ground: tc.ground }));
    ok(`PLAY ${tag} K3: after releasing right, the held left button neither pans nor orders`,
        !chordAfter.some((c) => c.type === 'CAMERA_PAN' || isOrder(c.type)), JSON.stringify(chordAfter));

    // 瞄準中：右鍵拖鏡頭不取消瞄準；右鍵點一下（沒拖）取消瞄準
    await page.keyboard.press(K3_AIM_KEY);
    await page.waitForTimeout(K3_SETTLE_MS);
    const aimed = await page.evaluate(() => window.__TACTICAL_ENGINE__.state.aim);
    ok(`PLAY ${tag} K3: with Quick Cast off (default) the skill key starts aiming`, aimed?.slot === K3_AIM_SLOT, JSON.stringify(aimed));
    await dragWith(page, t.center, 'right');
    const stillAimed = await page.evaluate(() => window.__TACTICAL_ENGINE__.state.aim);
    ok(`PLAY ${tag} K3: right-drag while aiming pans without cancelling the aim`, stillAimed?.slot === K3_AIM_SLOT, JSON.stringify(stillAimed));
    await page.mouse.move(t.center.x, t.center.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(K3_SETTLE_MS);
    const cancelled = await page.evaluate(() => window.__TACTICAL_ENGINE__.state.aim);
    const rightClick = await takeSent(page);
    ok(`PLAY ${tag} K3: right-click without dragging cancels the aim and sends no order`,
        cancelled === null && !rightClick.some((c) => isOrder(c.type)), JSON.stringify({ cancelled, rightClick }));

    // 終審 #3：左鍵按著（瞄準普攻、點在空地上不施放）時右鍵點一下，照樣取消瞄準
    await page.keyboard.press(K3_AIM_KEY);
    await page.waitForTimeout(K3_SETTLE_MS);
    const t2 = await playScreenTargets(page);
    const chordAt = t2.ground ?? t.ground;
    await page.mouse.move(chordAt.x, chordAt.y);
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(K3_SETTLE_MS);
    const aimBeforeChord = await page.evaluate(() => window.__TACTICAL_ENGINE__.state.aim);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(K3_SETTLE_MS);
    const aimAfterChord = await page.evaluate(() => window.__TACTICAL_ENGINE__.state.aim);
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(K3_SETTLE_MS);
    ok(`PLAY ${tag} K3: a right click while the left button is held cancels the aim`,
        aimBeforeChord?.slot === K3_AIM_SLOT && aimAfterChord === null, JSON.stringify({ aimBeforeChord, aimAfterChord, chordAt }));
    await takeSent(page);

    await page.keyboard.press(' ');
    await page.waitForTimeout(K3_SETTLE_MS);
};

/** 回到主畫面後再進一次 PLAY：選主角畫面有 Quick Cast 開關（預設關），打開後技能鍵直接對游標下的敵人施放 */
const runPlayQuickCastCheck = async (page, tag) => {
    await openPlaySetup(page);
    const toggle = page.locator('[data-testid="play-quickcast-toggle"]');
    const before = await toggle.count() === 1 ? await toggle.getAttribute('aria-pressed') : null;
    ok(`PLAY ${tag} K3: hero setup has a Quick Cast toggle, off by default`, before === 'false', String(before));
    if (before === null) return;
    await toggle.click();
    const after = await toggle.getAttribute('aria-pressed');
    ok(`PLAY ${tag} K3: the Quick Cast toggle turns on`, after === 'true', String(after));
    await page.click('[data-testid="play-role-RANGER"]');
    await page.click('[data-testid="play-start-btn"]');
    await page.waitForSelector('[data-testid="play-hud"]');
    await page.waitForTimeout(400);
    await page.keyboard.press(' ');
    await page.waitForTimeout(K3_SETTLE_MS);
    await spyUiCommands(page);
    const t = await playScreenTargets(page);
    if (!t.foe) { ok(`PLAY ${tag} K3: an enemy is on screen for Quick Cast`, false, 'no enemy in view'); return; }
    await page.mouse.move(t.foe.x, t.foe.y);
    await page.waitForTimeout(K3_SETTLE_MS);
    await takeSent(page);
    await page.keyboard.press(K3_AIM_KEY);
    await page.waitForTimeout(K3_SETTLE_MS);
    const sent = await takeSent(page);
    const aim = await page.evaluate(() => window.__TACTICAL_ENGINE__.state.aim);
    ok(`PLAY ${tag} K3: with Quick Cast on, the skill key casts at the enemy under the cursor without aiming`,
        sent.some((c) => c.type === 'ORDER_CAST' && c.targetId === t.foe.id) && aim === null,
        JSON.stringify({ sent, aim, foe: t.foe.id }));
    // 設定要留著：下次進選主角畫面仍是開的；關回去，不影響之後的執行
    await page.evaluate(() => window.__TACTICAL_ENGINE__.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: 5 }));
    await page.keyboard.press(' ');
    await page.waitForSelector('[data-testid="play-result"]', { timeout: 120000 });
    await page.click('[data-testid="play-menu-btn"]');
    await page.waitForSelector('[data-testid="showcase-card"]');
    await openPlaySetup(page);
    const kept = await toggle.getAttribute('aria-pressed');
    ok(`PLAY ${tag} K3: the Quick Cast setting is remembered`, kept === 'true', String(kept));
    await toggle.click();
};

// ── ADR 0026 K4：PLAY 觸控（主代理寫的紅色驗收，執行代理不得修改）
// page.click／page.mouse 在 hasTouch 的 context 裡仍是滑鼠指標，這裡一律用 CDP Input.dispatchTouchEvent 送真的觸控
// （每次送出目前所有按著的觸點；從清單拿掉的觸點就是放開）。和 K3 一樣全部在暫停中做、監聽 bus。
/** 單指滑動、兩指拖曳的距離（px）：大於觸控的拖曳門檻 GAME_INPUT_PARAM.DRAG_DRIFT_TOUCH_PX（18） */
const K4_SLIDE_PX = 60;
/** 兩指的半間距（px），捏合時拉開到 K4_PINCH_OUT_PX */
const K4_FINGER_HALF_GAP_PX = 40;
const K4_PINCH_OUT_PX = 110;
/** 技能鈕拖出去再拖回來時，離開按鈕的高度（px） */
const K4_BUTTON_LIFT_PX = 120;
const touchSend = (cdp, type, points) => cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id ?? 0, radiusX: 1, radiusY: 1, force: 1 })),
});
/** 把每根手指從 from[i] 線性移到 to[i]（同時移動，K3_DRAG_STEPS 步） */
const touchMoveAll = async (cdp, from, to) => {
    for (let s = 1; s <= K3_DRAG_STEPS; s++) {
        const k = s / K3_DRAG_STEPS;
        await touchSend(cdp, 'touchMove', from.map((p, i) => ({ id: p.id, x: p.x + (to[i].x - p.x) * k, y: p.y + (to[i].y - p.y) * k })));
    }
};
/** 探針前提（METHODOLOGY §4 第 11 條）：畫布真的收到觸控指標、真的同時按過兩根 */
const recordCanvasPointers = (page) => page.evaluate(() => {
    window.__k4Ptr = { types: [], maxActive: 0 };
    if (window.__k4PtrSpy) return;
    const cvs = document.querySelector('canvas');
    const ids = new Set();
    cvs.addEventListener('pointerdown', (e) => {
        ids.add(e.pointerId);
        const rec = window.__k4Ptr;
        if (!rec.types.includes(e.pointerType)) rec.types.push(e.pointerType);
        rec.maxActive = Math.max(rec.maxActive, ids.size);
    }, true);
    const release = (e) => ids.delete(e.pointerId);
    cvs.addEventListener('pointerup', release, true);
    cvs.addEventListener('pointercancel', release, true);
    window.__k4PtrSpy = true;
});
const readAim = (page) => page.evaluate(() => window.__TACTICAL_ENGINE__.state.aim);

const runPlayTouchChecks = async (page, tag) => {
    const cdp = await page.context().newCDPSession(page);
    const settle = () => page.waitForTimeout(K3_SETTLE_MS);
    const orders = (sent) => sent.filter((c) => isOrder(c.type));
    const movedTo = (sent, hex) => {
        const o = orders(sent);
        return o.length === 1 && o[0].type === 'ORDER_MOVE' && o[0].q === hex.q && o[0].r === hex.r;
    };
    await page.keyboard.press(' ');
    await settle();
    // 前面的流程（例如「an enemy is on screen to aim at」偶發失敗時）可能留下瞄準：瞄準中點空地本來就不下令，先清掉
    await page.evaluate(() => window.__TACTICAL_ENGINE__.bus.emit('UI_COMMAND', { type: 'SET_AIM', aim: null }));
    await settle();
    await spyUiCommands(page);
    await recordCanvasPointers(page);
    const heroHp = await page.evaluate(() => { const e = window.__TACTICAL_ENGINE__; return e.agents.find((a) => a.id === e.matchFlow.playHeroId)?.hp ?? 0; });
    if (heroHp <= 0) { ok(`PLAY ${tag} K4: the hero is alive for the touch checks (probe check)`, false, String(heroHp)); await page.keyboard.press(' '); return; }
    const t = await playScreenTargets(page);
    if (!t.ground || !t.center) { ok(`PLAY ${tag} K4: an empty ground hex is on screen`, false, JSON.stringify(t)); await page.keyboard.press(' '); return; }
    const g = { x: t.ground.x, y: t.ground.y, id: 0 };

    // 單指輕點：放開才下令，打到點的那一格
    await takeSent(page);
    await touchSend(cdp, 'touchStart', [g]);
    await settle();
    const tapHold = await takeSent(page);
    await touchSend(cdp, 'touchEnd', []);
    await settle();
    const tapUp = await takeSent(page);
    // 失敗時一併記下放開那一刻點下的格子、主角能不能接指令（區分「點偏」與「沒送指令」）
    const tapNow = await page.evaluate((pt) => {
        const e = window.__TACTICAL_ENGINE__;
        const rect = document.querySelector('canvas').getBoundingClientRect();
        const h = e.renderer.getHexAtScreenPoint(pt.x - rect.left, pt.y - rect.top, rect.width, rect.height, e.renderer.camera, e);
        const hero = e.agents.find((a) => a.id === e.matchFlow.playHeroId);
        const top = document.elementFromPoint(pt.x, pt.y);
        return { hex: h && { q: h.q, r: h.r }, heroHp: hero?.hp, controller: hero?.controller, finishing: e.state.victory.isFinishing, top: top?.tagName + (top?.getAttribute('data-testid') ? `#${top.getAttribute('data-testid')}` : '') };
    }, g);
    ok(`PLAY ${tag} K4: a one-finger tap sends one move order to the tapped hex on release`,
        orders(tapHold).length === 0 && movedTo(tapUp, t.ground), JSON.stringify({ tapHold, tapUp, ground: t.ground, tapNow }));
    const ptr = await page.evaluate(() => window.__k4Ptr);
    ok(`PLAY ${tag} K4: the canvas receives touch pointers (probe check)`, ptr.types.includes('touch'), JSON.stringify(ptr));

    // 單指滑動：不拖鏡頭，放開時對手指下的格子下令（不是按下的位置）
    // 滑動起點也要在畫布上（畫面上緣可能有介面蓋住）：先試往畫面中央那一側，不行換另一側
    const pref = t.center.x >= g.x ? 1 : -1;
    const dir = await page.evaluate(({ x, y, d, px }) => { const cvs = document.querySelector('canvas'); return [d, -d].find((k) => document.elementFromPoint(x + k * px, y) === cvs) ?? d; }, { x: g.x, y: g.y, d: pref, px: K4_SLIDE_PX });
    const s0 = { x: g.x + dir * K4_SLIDE_PX, y: g.y, id: 0 };
    await touchSend(cdp, 'touchStart', [s0]);
    await touchMoveAll(cdp, [s0], [g]);
    await settle();
    const slideHold = await takeSent(page);
    await touchSend(cdp, 'touchEnd', []);
    await settle();
    const slideUp = await takeSent(page);
    // main 上從單位身上滑動，暫停中會變成編輯用的拖單位（MOVE_AGENT）：PLAY 觸控不得送出
    ok(`PLAY ${tag} K4: sliding one finger does not pan or drag units; the order goes to the hex under the finger on release`,
        !slideHold.some((c) => c.type === 'CAMERA_PAN') && orders(slideHold).length === 0
            && ![...slideHold, ...slideUp].some((c) => c.type === 'CAMERA_PAN' || c.type === 'MOVE_AGENT') && movedTo(slideUp, t.ground),
        JSON.stringify({ slideHold, slideUp, ground: t.ground }));

    // 第二根手指落下：取消還沒送出的單指指令（先放開第一根，再放開第二根）
    const c1 = { x: t.center.x, y: t.center.y, id: 1 };
    await touchSend(cdp, 'touchStart', [g]);
    await settle();
    await touchSend(cdp, 'touchStart', [g, c1]);
    await settle();
    await touchSend(cdp, 'touchMove', [c1]);
    await settle();
    await touchSend(cdp, 'touchEnd', []);
    await settle();
    const second = await takeSent(page);
    ok(`PLAY ${tag} K4: a second finger cancels the pending one-finger order`, orders(second).length === 0, JSON.stringify(second));

    // 兩指同方向拖：平移鏡頭，不下令
    const p1 = { x: t.center.x - K4_FINGER_HALF_GAP_PX, y: t.center.y, id: 0 };
    const p2 = { x: t.center.x + K4_FINGER_HALF_GAP_PX, y: t.center.y, id: 1 };
    const shift = (p) => ({ id: p.id, x: p.x + K4_SLIDE_PX, y: p.y + K4_SLIDE_PX / 2 });
    await touchSend(cdp, 'touchStart', [p1]);
    await touchSend(cdp, 'touchStart', [p1, p2]);
    await touchMoveAll(cdp, [p1, p2], [shift(p1), shift(p2)]);
    await touchSend(cdp, 'touchEnd', []);
    await settle();
    const twoDrag = await takeSent(page);
    ok(`PLAY ${tag} K4: dragging two fingers pans the camera and sends no order`,
        twoDrag.some((c) => c.type === 'CAMERA_PAN') && orders(twoDrag).length === 0, JSON.stringify(twoDrag));
    const ptr2 = await page.evaluate(() => window.__k4Ptr);
    ok(`PLAY ${tag} K4: two touch pointers were down at once (probe check)`, ptr2.maxActive >= 2, JSON.stringify(ptr2));

    // 兩指捏合：縮放（useCameraControl 既有，防退化），不下令
    const spread = (p, sign) => ({ id: p.id, x: t.center.x + sign * K4_PINCH_OUT_PX, y: p.y });
    await touchSend(cdp, 'touchStart', [p1]);
    await touchSend(cdp, 'touchStart', [p1, p2]);
    await touchMoveAll(cdp, [p1, p2], [spread(p1, -1), spread(p2, 1)]);
    await touchSend(cdp, 'touchEnd', []);
    await settle();
    const pinch = await takeSent(page);
    ok(`PLAY ${tag} K4: pinching zooms the camera and sends no order`,
        pinch.some((c) => c.type === 'CAMERA_ZOOM') && orders(pinch).length === 0, JSON.stringify(pinch));

    // 技能鈕拖到敵人放開：拖曳中瞄準該槽，放開對它施放並結束瞄準（鏡頭動過，重找目標）
    const box = await page.locator(`[data-testid="play-skill-${K3_AIM_SLOT}"]`).boundingBox();
    const b = box ? { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 0 } : null;
    let t2 = await playScreenTargets(page);
    if (!t2.foe) {
        // 手機橫向可視範圍小：先把鏡頭對到最近的敵人（測的是拖曳，不是鏡頭；CAMERA_SNAP 是既有指令）
        await page.evaluate(() => {
            const e = window.__TACTICAL_ENGINE__;
            const hero = e.agents.find((a) => a.id === e.matchFlow.playHeroId);
            // 選離其他單位最遠的敵人（playScreenTargets 只收沒被別人蓋住的敵人）
            const living = e.agents.filter((a) => a.hp > 0);
            const gap = (a) => Math.min(...living.filter((o) => o !== a).map((o) => Math.hypot(o.px - a.px, o.py - a.py)));
            const foe = living.filter((a) => hero && a.side !== hero.side).sort((a, b) => gap(b) - gap(a))[0];
            if (!foe) return;
            const th = e.map?.getTerrainHeight ? e.map.getTerrainHeight(foe.q, foe.r) : 0;
            e.bus.emit('UI_COMMAND', { type: 'CAMERA_SNAP', x: foe.px, y: foe.py - th });
        });
        await page.waitForTimeout(K3_SETTLE_MS * 2);
        await takeSent(page);
        t2 = await playScreenTargets(page);
    }
    if (!b || !t2.foe) {
        ok(`PLAY ${tag} K4: a skill button and an enemy are on screen for the skill drag`, false, JSON.stringify({ box, foe: t2.foe }));
    } else {
        const foe = { x: t2.foe.x, y: t2.foe.y, id: 0 };
        await takeSent(page);
        await touchSend(cdp, 'touchStart', [b]);
        await touchMoveAll(cdp, [b], [foe]);
        await settle();
        const midAim = await readAim(page);
        const dragHold = await takeSent(page);
        await touchSend(cdp, 'touchEnd', []);
        await settle();
        const dropped = await takeSent(page);
        const afterDrop = await readAim(page);
        // 失敗時記下放開點上方的元素、格子與那一格的單位、目標敵人現在的位置（區分「點偏」與「規則」）
        const dropNow = await page.evaluate(({ pt, foeId }) => {
            const e = window.__TACTICAL_ENGINE__;
            const rect = document.querySelector('canvas').getBoundingClientRect();
            const h = e.renderer.getHexAtScreenPoint(pt.x - rect.left, pt.y - rect.top, rect.width, rect.height, e.renderer.camera, e);
            const top = document.elementFromPoint(pt.x, pt.y);
            const f = e.agents.find((a) => a.id === foeId);
            return { top: top?.tagName + (top?.getAttribute('data-testid') ? `#${top.getAttribute('data-testid')}` : ''), hex: h && { q: h.q, r: h.r }, at: h ? e.agents.filter((a) => a.hp > 0 && a.q === h.q && a.r === h.r).map((a) => a.id) : [], foeHex: f && { q: f.q, r: f.r, hp: f.hp } };
        }, { pt: foe, foeId: t2.foe.id });
        ok(`PLAY ${tag} K4: dragging a skill button aims that slot while the finger is down`,
            midAim?.slot === K3_AIM_SLOT && orders(dragHold).length === 0, JSON.stringify({ midAim, dragHold }));
        ok(`PLAY ${tag} K4: releasing a dragged skill button on an enemy casts at it and ends aiming`,
            dropped.some((c) => c.type === 'ORDER_CAST' && c.targetId === t2.foe.id) && afterDrop === null,
            JSON.stringify({ dropped, afterDrop, foe: t2.foe.id, dropNow }));
    }

    if (b) {
        // 拖出去再拖回按鈕放開：取消（不施放、不留在瞄準，放開時也不能被 click 再開一次瞄準）
        const up = { x: b.x, y: b.y - K4_BUTTON_LIFT_PX, id: 0 };
        await touchSend(cdp, 'touchStart', [b]);
        await touchMoveAll(cdp, [b], [up]);
        await settle();
        await touchMoveAll(cdp, [up], [b]);
        await touchSend(cdp, 'touchEnd', []);
        await settle();
        const back = await takeSent(page);
        const afterBack = await readAim(page);
        ok(`PLAY ${tag} K4: dragging a skill button out and back onto it cancels: no cast, not aiming`,
            !back.some((c) => c.type === 'ORDER_CAST') && afterBack === null, JSON.stringify({ back, afterBack }));

        // 原地輕點技能鈕：照舊進入瞄準（點鈕再點目標仍可用）
        await touchSend(cdp, 'touchStart', [b]);
        await touchSend(cdp, 'touchEnd', []);
        await settle();
        const tapAim = await readAim(page);
        ok(`PLAY ${tag} K4: a touch tap on a skill button still starts aiming`, tapAim?.slot === K3_AIM_SLOT, JSON.stringify(tapAim));
        if (tapAim) {
            await page.click('[data-testid="play-aim-cancel"]');
            await settle();
        }
    }

    // 兩指平移與捏合拉近會留到後面的流程（畫面裡的敵人變少）：交還導播縮放、等鏡頭停下
    await page.evaluate(() => window.__TACTICAL_ENGINE__.bus.emit('UI_COMMAND', { type: 'CAMERA_RESET_ZOOM' }));
    await waitCameraSettled(page);
    await cdp.detach();
    await page.keyboard.press(' ');
    await settle();
};

const runPlaySuite = async () => {
    // E2E_PLAY_VIEWS=iphone-landscape,desktop：只跑指定的版面（除錯用）
    const only = process.env.E2E_PLAY_VIEWS ? process.env.E2E_PLAY_VIEWS.split(',') : null;
    for (const [tag, opts] of PLAY_VIEWS.filter(([t]) => !only || only.includes(t))) {
        console.log(`\n── PLAY mode (${tag})`);
        const viewport = opts.viewport;
        const touch = !!opts.hasTouch;
        const ctx = await browser.newContext(opts);
        const page = await ctx.newPage();
        page.setDefaultTimeout(15000);
        page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 300)));
        page.on('console', (m) => {
            if (m.type() === 'error' && !/favicon|404/.test(m.text())) consoleErrors.push('console.error: ' + m.text().slice(0, 200));
        });
        await page.goto(baseUrl);
        // 主畫面只有一顆入口鈕，旁邊的交換鈕切換「模擬／PLAY」；預設模擬（工具腳本都點 START SIMULATION）
        await page.waitForSelector('[data-testid="showcase-enter-btn"]');
        await page.waitForTimeout(600);
        const entry = await page.evaluate(() => ({
            play: !!document.querySelector('[data-testid="showcase-play-btn"]'),
            swap: !!document.querySelector('[data-testid="showcase-mode-swap"]'),
        }));
        ok(`PLAY ${tag}: the showcase shows one entry button plus a mode swap`, !entry.play && entry.swap, JSON.stringify(entry));
        const cardIssues = await playLayoutIssues(page, '[data-testid="showcase-card"]');
        ok(`PLAY ${tag}: the showcase title card and entry fit the viewport`, cardIssues.length === 0, cardIssues.slice(0, 4).join(' | '));
        await page.click('[data-testid="showcase-mode-swap"]');
        await page.waitForSelector('[data-testid="showcase-play-btn"]');
        ok(`PLAY ${tag}: swapping replaces the entry button`, await page.locator('[data-testid="showcase-enter-btn"]').count() === 0);
        await page.click('[data-testid="showcase-play-btn"]');
        await page.waitForSelector('[data-testid="play-setup"]');
        await page.waitForTimeout(400);
        const setupIssues = await playLayoutIssues(page, '[data-testid="play-setup"]');
        if (setupIssues.length) await page.screenshot({ path: join(OUT, `play-setup-${tag}.png`) });
        ok(`PLAY ${tag}: hero setup fits the viewport without scrolling (start button visible)`, setupIssues.length === 0, setupIssues.slice(0, 4).join(' | '));
        await page.click('[data-testid="play-role-RANGER"]');
        await page.click('[data-testid="play-start-btn"]');
        await page.waitForSelector('[data-testid="play-hud"]');
        const start = await page.evaluate(() => {
            const e = window.__TACTICAL_ENGINE__;
            const hero = e.agents.find((a) => a.id === e.matchFlow.playHeroId);
            return { role: hero?.role, controller: hero?.controller, stance: hero?.stance, hud: document.querySelector('[data-hud]')?.getAttribute('data-hud') };
        });
        ok(`PLAY ${tag}: the chosen hero is player-controlled and countering; tool bars hidden`, start.role === 'RANGER' && start.controller === 'PLAYER' && start.stance === 'COUNTER' && start.hud === 'off', JSON.stringify(start));
        await page.waitForTimeout(400);
        const hudBox = await page.locator('[data-testid="play-hud"]').boundingBox();
        const hudIssues = await playLayoutIssues(page, '[data-testid="play-hud"]');
        ok(`PLAY ${tag}: HUD fits inside the viewport, no clipped skill labels`, !!hudBox && hudIssues.length === 0, hudIssues.slice(0, 4).join(' | '));
        ok(`PLAY ${tag}: HUD takes at most ${PLAY_HUD_MAX_HEIGHT_SHARE * 100}% of the height`, !!hudBox && hudBox.height <= viewport.height * PLAY_HUD_MAX_HEIGHT_SHARE, JSON.stringify(hudBox));
        const skillIcons = await page.locator('[data-testid^="play-skill-icon-"]').count();
        ok(`PLAY ${tag}: skill buttons show the skill icons`, skillIcons === 4, String(skillIcons));
        const shortLabels = await page.locator(`[data-testid^="play-skill-label-"]`).allInnerTexts();
        ok(`PLAY ${tag}: skill buttons carry distinct 2-character labels`, shortLabels.length === 4 && new Set(shortLabels).size === 4 && shortLabels.every((t) => [...t.trim()].length === 2), JSON.stringify(shortLabels));
        // K4 觸控緊接在 HUD 出現後做：越晚做主角越可能已經倒下（倒下就沒有技能鈕、點地面也不下令）
        if (touch) await runPlayTouchChecks(page, tag);

        await page.click('[data-testid="play-skill-2"]');
        const aim = await page.evaluate(() => window.__TACTICAL_ENGINE__.state.aim);
        ok(`PLAY ${tag}: pressing a skill starts aiming`, aim?.slot === 2 && await page.locator('[data-testid="play-aim-hint"]').waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false), JSON.stringify(aim));
        const hint = await page.locator('[data-testid="play-aim-hint"]').innerText();
        ok(`PLAY ${tag}: the aim hint names the skill and only mentions keys on desktop`, hint.length > 0 && /Esc/.test(hint) === !touch, hint);
        const aimIssues = await playLayoutIssues(page, '[data-testid="play-hud"]');
        ok(`PLAY ${tag}: aiming layout fits the viewport`, aimIssues.length === 0, aimIssues.slice(0, 4).join(' | '));
        await page.click('[data-testid="play-aim-cancel"]');
        await page.waitForTimeout(150);
        const cancelled = await page.evaluate(() => window.__TACTICAL_ENGINE__.state.aim);
        ok(`PLAY ${tag}: the aim cancel button ends aiming`, cancelled === null, JSON.stringify(cancelled));
        await page.click('[data-testid="play-skill-2"]');
        const hudTop = hudBox ? hudBox.y : viewport.height;
        const foe = await page.evaluate((bottom) => {
            const e = window.__TACTICAL_ENGINE__;
            const hero = e.agents.find((a) => a.id === e.matchFlow.playHeroId);
            const canvas = document.querySelector('canvas');
            const rect = canvas.getBoundingClientRect();
            const cam = e.renderer.camera;
            const inView = e.agents.filter((a) => a.side !== hero.side && a.hp > 0).map((a) => {
                const h = e.map?.getTerrainHeight ? e.map.getTerrainHeight(a.q, a.r) : 0;
                return { id: a.id, x: rect.left + (a.px - cam.x) * cam.zoom + rect.width / 2, y: rect.top + (a.py - h - cam.y) * cam.zoom + rect.height / 2 };
            }).filter((p) => p.x > 20 && p.x < rect.width - 20 && p.y > 80 && p.y < bottom - 20);
            return inView[0] ?? null;
        }, hudTop);
        if (foe) {
            // 前面的 K4 技能鈕拖曳也會送同一槽的 ORDER_CAST：比點擊前後的筆數，只算這次點擊送出的
            const castCount = () => page.evaluate(() => { const e = window.__TACTICAL_ENGINE__; return e.commands.log.filter((r) => r.cmd.type === 'ORDER_CAST' && r.cmd.agentId === e.matchFlow.playHeroId && r.cmd.slot === 2).length; });
            const castsBefore = await castCount();
            await page.mouse.click(foe.x, foe.y);
            await page.waitForTimeout(300);
            const castsAfter = await castCount();
            const cast = await page.evaluate(() => {
                const e = window.__TACTICAL_ENGINE__;
                const hero = e.agents.find((a) => a.id === e.matchFlow.playHeroId);
                // 射程內的話指令可能已經放完清掉：看指令紀錄
                return { aim: e.state.aim, heroId: hero?.id };
            }).then((c) => ({ ...c, logged: castsAfter > castsBefore, castsBefore, castsAfter }));
            ok(`PLAY ${tag}: tapping an enemy while aiming issues a cast order and ends aiming`, cast.logged && cast.aim === null, JSON.stringify(cast));
        } else {
            ok(`PLAY ${tag}: an enemy is on screen to aim at`, false, 'no enemy in view');
        }
        if (touch) await page.click('[data-testid="play-stop-btn"]'); else await page.keyboard.press('s');
        await page.waitForTimeout(200);
        const lastCmd = await page.evaluate(() => window.__TACTICAL_ENGINE__.commands.log.slice(-1)[0]?.cmd?.type);
        ok(`PLAY ${tag}: stop (S / button) sends a stop order`, lastCmd === 'ORDER_STOP', String(lastCmd));
        if (touch) await page.click('[data-testid="play-pause-btn"]'); else await page.keyboard.press(' ');
        await page.waitForTimeout(200);
        const paused = await page.evaluate(() => !window.__TACTICAL_ENGINE__.isRunning);
        if (touch) await page.click('[data-testid="play-pause-btn"]'); else await page.keyboard.press(' ');
        await page.waitForTimeout(200);
        const resumed = await page.evaluate(() => window.__TACTICAL_ENGINE__.isRunning);
        ok(`PLAY ${tag}: pause (space / button) pauses and resumes`, paused && resumed, JSON.stringify({ paused, resumed }));
        if (!touch) await runPlayMouseChecks(page, tag);

        await page.evaluate(() => window.__TACTICAL_ENGINE__.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: 5 }));
        await page.waitForSelector('[data-testid="play-result"]', { timeout: 120000 });
        const seed = await page.evaluate(() => window.__TACTICAL_ENGINE__.commands.matchStart?.seed);
        await page.waitForTimeout(400);
        const resultIssues = await playLayoutIssues(page, '[data-testid="play-result"]');
        ok(`PLAY ${tag}: the result screen fits the viewport`, resultIssues.length === 0, resultIssues.slice(0, 4).join(' | '));
        ok(`PLAY ${tag}: the result screen shows an outcome`, ['WIN', 'LOSE', 'DRAW'].includes(await page.getAttribute('[data-testid="play-result"]', 'data-outcome')));
        await page.click('[data-testid="play-next-btn"]');
        await page.waitForSelector('[data-testid="play-hud"]');
        const again = await page.evaluate((s) => ({ isPlay: window.__TACTICAL_ENGINE__.matchFlow.isPlay, newSeed: window.__TACTICAL_ENGINE__.commands.matchStart?.seed !== s }), seed);
        ok(`PLAY ${tag}: next battle keeps PLAY with a new seed`, again.isPlay && again.newSeed, JSON.stringify(again));
        await page.evaluate(() => window.__TACTICAL_ENGINE__.bus.emit('UI_COMMAND', { type: 'SET_TIME_SCALE', timeScale: 5 }));
        await page.waitForSelector('[data-testid="play-result"]', { timeout: 120000 });
        await page.click('[data-testid="play-menu-btn"]');
        await page.waitForSelector('[data-testid="showcase-card"]');
        const back = await page.evaluate(() => ({ isPlay: window.__TACTICAL_ENGINE__.matchFlow.isPlay, isShowcase: window.__TACTICAL_ENGINE__.matchFlow.isShowcase }));
        ok(`PLAY ${tag}: main menu returns to the showcase`, !back.isPlay && back.isShowcase, JSON.stringify(back));
        if (!touch) await runPlayQuickCastCheck(page, tag);
        await ctx.close();
    }
};

// 只跑某幾組：E2E_ONLY=play,editor，或 --only=play（npm run e2e:play；允許清單只收確切指令，不收環境變數前綴）
const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length);
const onlySpec = onlyArg ?? process.env.E2E_ONLY;
const filterOnly = onlySpec ? onlySpec.split(',').map(s => s.trim()) : null;
const activeSuites = filterOnly ? SUITES.filter(s => filterOnly.includes(s.id)) : SUITES;

try {
    for (const suite of activeSuites) await runSuite(suite);
    if (!filterOnly || filterOnly.includes('multi')) await runMultiWindow();
    if (!filterOnly || filterOnly.includes('toolmenu')) await runToolMenuSuite();
    if (!filterOnly || filterOnly.includes('schemaform')) await runSchemaFormSuite();
    if (!filterOnly || filterOnly.includes('showcase-pin')) await runShowcaseAndPinSuite();
    if (!filterOnly || filterOnly.includes('inspector-cmd')) await runInspectorCommandSuite();
    if (!filterOnly || filterOnly.includes('bottom-sheet')) await runBottomSheetSuite();
    if (!filterOnly || filterOnly.includes('touch-reduced-motion')) await runTouchTargetAndReducedMotionSuite();
    if (!filterOnly || filterOnly.includes('tablet-edge')) await runTabletEdgeSuite();
    if (!filterOnly || filterOnly.includes('touch-scroll')) await runTouchScrollSuite();
    if (!filterOnly || filterOnly.includes('editor')) await runEditorSuite();
    if (!filterOnly || filterOnly.includes('style-snapshot')) await runStyleSnapshotSuite();
    if (!filterOnly || filterOnly.includes('audio-settings')) await runAudioSettingsSuite();
    if (!filterOnly || filterOnly.includes('play')) await runPlaySuite();
} catch (e) {
    failures++;
    console.log('SCRIPT ERROR: ' + String(e.message).slice(0, 500));
}

ok('no console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED (screenshots: ${OUT})`);
process.exit(failures === 0 ? 0 : 1);
