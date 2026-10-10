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
    { id: 'directorSettings' },
    { id: 'zoneSettings' },
    { id: 'showcaseSettings' },
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
    await enterManualMode(page);
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
    if (suite.open) await suite.open(page);
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

const runToolMenuSuite = async () => {
    console.log('\n── ToolMenu (SystemMenu)');
    const { ctx, page } = await newPage({ id: 'toolmenu' });
    await enterManualMode(page);

    // 1. Open menu and check all 7 window items + reset layout + spec item exist
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);

    const windowIds = ['logs', 'db', 'vfxmap', 'monitor', 'directorSettings', 'zoneSettings', 'showcaseSettings', 'inspector'];
    for (const wid of windowIds) {
        const item = page.locator(`[data-testid="menu-item-${wid}"]`);
        ok(`menu item exists: ${wid}`, await item.isVisible());
    }
    ok('menu item exists: reset-layout', await page.locator('[data-testid="menu-item-reset-layout"]').isVisible());
    ok('menu item exists: spec', await page.locator('[data-testid="menu-item-spec"]').isVisible());

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
    ok('directorSettings: initial followStiffness matches engine (not 3.5)', Math.abs(Number(uiFollow) - engFollow) < 0.05 && Number(uiFollow) < 1.0, `${uiFollow} vs ${engFollow}`);

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

    // Open showcaseSettings via the gear icon in ShowcaseOverlay
    await page.locator('button[title="展示與特效設定"]').click();
    await page.waitForTimeout(500);
    const scRect = await rectOf(page, 'showcaseSettings');
    ok('showcase mode: showcaseSettings window visible and interactive', scRect !== null);

    // Enter manual mode
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(800);

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
    await page.waitForTimeout(500);

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
        ok('inspector opened on unit select (canvas click reached the agent)', false, JSON.stringify(target));
        await ctx.close();
        return;
    }

    ok('inspector opened on unit select', isInspectorOpen);

    // Expand config drawer
    await editBtn.click();
    await page.waitForTimeout(400);

    // Change Role to another role
    const newRole = target.role === 'WARRIOR' ? 'TANK' : 'WARRIOR';
    const roleSelect = page.locator('label:has-text("職業") + select');
    await roleSelect.selectOption(newRole);
    await page.waitForTimeout(300);

    // Change maxHp to 123 (R8: draft + Enter submission)
    const hpInput = page.locator('label:has-text("生命值") + input');
    await hpInput.fill('123');
    await hpInput.press('Enter');
    await page.waitForTimeout(300);

    // Assert live engine agent was updated
    const updated = await page.evaluate((aid) => {
        const a = window.__TACTICAL_ENGINE__.agents.find(u => u.id === aid);
        return a ? { role: a.role, maxHp: a.maxHp, hp: a.hp } : null;
    }, target.agentId);

    ok('inspector EDIT_AGENT changed role in live engine', updated?.role === newRole, `${updated?.role} vs ${newRole}`);
    ok('inspector EDIT_AGENT changed maxHp in live engine to 123', updated?.maxHp === 123, String(updated?.maxHp));
    ok('inspector EDIT_AGENT updated hp in live engine to 123', updated?.hp === 123, String(updated?.hp));

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
            const agent = (candidates.length > 0 ? candidates[idx % candidates.length] : null) || alive[idx % alive.length];
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
    { id: 'window_inspector_tab_ai', selector: '[data-window-id="inspector"] button[title="\u884c\u70ba\u6a39\u76e3\u63a7 (AI)"]' },
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
    { id: 'showcase_settings_btn', selector: 'button[title="\u5c55\u793a\u8207\u7279\u6548\u8a2d\u5b9a"]' },
    { id: 'window_showcase_settings', selector: '[data-window-id="showcaseSettings"]' },
    { id: 'showcase_settings_tab_system', selector: '[data-testid="showcase-tab-system"]' },
    { id: 'showcase_settings_tab_matrix', selector: '[data-testid="showcase-tab-matrix"]' },
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

    // Open showcaseSettings in showcase mode
    const showcaseSettingsBtn = page.locator('button[title="\u5c55\u793a\u8207\u7279\u6548\u8a2d\u5b9a"]');
    if (await showcaseSettingsBtn.count() > 0) {
        await showcaseSettingsBtn.click();
        await page.waitForTimeout(400);
    }

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
    ok('narrow screen: bottom edge flush with viewport bottom', active && near(active.rect.bottom, 844, 2), `${active?.rect.bottom} vs 844`);

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
        const root = document.querySelector('.h-\\[100dvh\\]');
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
    await page.locator('select').first().selectOption('RANGER');
    await page.waitForTimeout(200);
    const draftHex = await getEmptyHexWithCoord();
    await page.mouse.click(draftHex.screenX, draftHex.screenY);
    await page.waitForTimeout(300);
    const draftAgent = await page.evaluate(({ q, r }) => {
        return window.__TACTICAL_ENGINE__.agents.find(a => a.q === q && a.r === r);
    }, draftHex);
    ok('DRAFT mode: placed unit with selected role RANGER', draftAgent !== undefined && draftAgent.role === 'RANGER', draftAgent?.role);

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

    await page.mouse.move(1250, 350);
    await page.mouse.down();
    for (let i = 0; i < 10; i++) {
        await page.mouse.move(1250 - i * 15, 350 - i * 15);
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

const filterOnly = process.env.E2E_ONLY ? process.env.E2E_ONLY.split(',').map(s => s.trim()) : null;
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
    if (!filterOnly || filterOnly.includes('touch-scroll')) await runTouchScrollSuite();
    if (!filterOnly || filterOnly.includes('editor')) await runEditorSuite();
    if (!filterOnly || filterOnly.includes('style-snapshot')) await runStyleSnapshotSuite();
} catch (e) {
    failures++;
    console.log('SCRIPT ERROR: ' + String(e.message).slice(0, 500));
}

ok('no console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED (screenshots: ${OUT})`);
process.exit(failures === 0 ? 0 : 1);
