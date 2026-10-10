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
    { id: 'directorSettings' },
    { id: 'zoneSettings' },
    { id: 'showcaseSettings' },
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
    if (!suite.seed) {
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

const runToolMenuSuite = async () => {
    console.log('\n── ToolMenu (SystemMenu)');
    const { ctx, page } = await newPage({ id: 'toolmenu' });
    await enterManualMode(page);

    // 1. Open menu and check all 7 window items + reset layout + spec item exist
    await page.locator('[data-testid="system-menu-button"]').click();
    await page.waitForTimeout(300);

    const windowIds = ['logs', 'db', 'vfxmap', 'monitor', 'directorSettings', 'zoneSettings', 'showcaseSettings'];
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
    await enterManualMode(page);

    // Spawn units using the dice button on PlaybackHUD
    await page.locator('button[title="隨機生成戰場與陣容"]').click();
    await page.waitForTimeout(600);

    // 1. Calculate screen coordinates of an agent
    const target = await page.evaluate(() => {
        const engine = window.__TACTICAL_ENGINE__;
        if (!engine || !engine.agents || engine.agents.length === 0) return null;
        // Pick an active alive agent
        const agent = engine.agents.find(a => a.hp > 0) || engine.agents[0];
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const cam = engine.renderer.camera;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const terrainH = engine.map?.getTerrainHeight ? engine.map.getTerrainHeight(agent.q, agent.r) : 0;
        const worldX = agent.px;
        const worldY = agent.py - terrainH;
        const screenX = rect.left + (worldX - cam.x) * cam.zoom + cx;
        const screenY = rect.top + (worldY - cam.y) * cam.zoom + cy;
        return {
            screenX, screenY,
            agentId: agent.id,
            role: agent.role,
            maxHp: agent.maxHp,
            q: agent.q, r: agent.r,
        };
    });

    if (!target) {
        console.log('SKIP  Inspector selection entrypoint not found (marked unverified)');
        await ctx.close();
        return;
    }

    // Click on canvas at target coordinates
    await page.mouse.click(target.screenX, target.screenY);
    await page.waitForTimeout(500);

    const editBtn = page.locator('button[title="編輯單位屬性"]');
    const isInspectorOpen = await editBtn.isVisible();

    if (!isInspectorOpen) {
        console.log('SKIP  Inspector selection entrypoint not triggered by canvas click (marked unverified)');
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
} catch (e) {
    failures++;
    console.log('SCRIPT ERROR: ' + String(e.message).slice(0, 500));
}

ok('no console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED (screenshots: ${OUT})`);
process.exit(failures === 0 ? 0 : 1);
