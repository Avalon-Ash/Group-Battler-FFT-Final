/**
 * Phone-size UI audit (headless Edge/Chrome). Run: `node tools/ui-e2e/mobile-audit.mjs [--tag=before] [--viewports=375x812,812x375,390x844]`
 *
 * For every viewport it walks the UI surfaces (showcase, HUD, menu, toolbar sub-menus, each tool window),
 * takes a screenshot into tools/ui-e2e/out/mobile/<tag>/ (git-ignored) and prints geometry findings:
 *   - document wider/taller than the viewport (horizontal scroll)
 *   - visible UI elements that stick out of the viewport
 *   - tap targets smaller than UI_WINDOW.TOUCH_TARGET_MIN_PX (reported at the audit floor, see MIN_TAP)
 *   - overlapping top-level HUD blocks
 * Findings are written to out/mobile/<tag>/findings.json.
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
const TAG = arg('tag', 'run');
const VIEWPORTS = arg('viewports', '375x812,812x375,390x844')
    .split(',')
    .map((v) => v.split('x').map(Number))
    .map(([width, height]) => ({ width, height }));
const OUT = join(here, 'out', 'mobile', TAG);
mkdirSync(OUT, { recursive: true });

const START_TEXT = 'START SIMULATION';
const MIN_TAP = 40;

const WINDOW_IDS = ['logs', 'db', 'vfxmap', 'monitor', 'directorSettings', 'zoneSettings', 'audioSettings'];

const launch = async () => {
    if (process.env.E2E_BROWSER_PATH) return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true });
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found.');
};

/** Runs in the page: geometry findings for the current screen. */
const scan = (minTap) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const doc = document.documentElement;
    const findings = [];
    const visible = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        let p = el;
        while (p && p !== document.body) {
            const s = getComputedStyle(p);
            if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
            p = p.parentElement;
        }
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    };
    const name = (el) => {
        const t = el.getAttribute('data-testid') || el.getAttribute('data-window-btn') || el.getAttribute('title') || el.textContent?.trim().slice(0, 20) || el.tagName;
        return `${el.tagName.toLowerCase()}[${t}]`;
    };
    if (doc.scrollWidth > vw + 1) findings.push({ kind: 'h-scroll', detail: `scrollWidth ${doc.scrollWidth} > ${vw}` });
    if (document.body.scrollWidth > vw + 1) findings.push({ kind: 'h-scroll-body', detail: `body.scrollWidth ${document.body.scrollWidth} > ${vw}` });

    const root = document.getElementById('root');
    // overflow:hidden containers can still be scrolled by focus/scroll-into-view, shifting the whole UI off-screen.
    const app = root.firstElementChild;
    if (app && app.scrollHeight > app.clientHeight + 1) findings.push({ kind: 'root-overflow', detail: `app scrollHeight ${app.scrollHeight} > ${app.clientHeight}` });
    for (const el of [document.scrollingElement, document.body, root.firstElementChild]) {
        if (el && el.scrollTop > 0) findings.push({ kind: 'root-scrolled', detail: `${el.tagName} scrollTop ${el.scrollTop}` });
    }
    const els = root.querySelectorAll('button, input, select, textarea, [role=button], summary, a[href]');
    for (const el of els) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        const isSlider = el instanceof HTMLInputElement && el.type === 'range';
        const isSrOnly = r.width <= 1 && r.height <= 1; // visually-hidden checkbox behind a custom switch
        const inScroll = !!el.closest('[data-window-body], .overflow-y-auto');
        if (isSrOnly) continue;
        // The playback slider is an invisible full-size overlay; measure it by its track height like any slider.
        if (Math.min(r.width, r.height) < minTap && !isSlider) {
            findings.push({ kind: 'tap-small', detail: `${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}` });
        }
        const out = r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1;
        // Content inside a window body may legitimately sit below the fold of its own scroller; only flag horizontal escape there.
        const hOut = r.left < -1 || r.right > vw + 1;
        if (inScroll ? hOut : out) findings.push({ kind: 'offscreen', detail: `${name(el)} [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}] vs ${vw}x${vh}` });
    }

    // Containers that stick out (cards, windows, HUD blocks)
    const blocks = root.querySelectorAll('[data-window-id], [data-testid="playback-hud"], [data-testid="showcase-card"], .liquid-card');
    for (const el of blocks) {
        if (!visible(el)) continue;
        const r = el.getBoundingClientRect();
        const bInScroll = !!el.closest('[data-window-body], .overflow-y-auto');
        const bOut = bInScroll ? (r.left < -1 || r.right > vw + 1) : (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1);
        if (bOut) {
            findings.push({ kind: 'block-offscreen', detail: `${name(el)} [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}]` });
        }
    }

    // Text clipped by its own box
    for (const el of root.querySelectorAll('span, h1, h2, h3, p, label, div')) {
        if (el.children.length) continue;
        if (!el.textContent?.trim() || !visible(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.overflow === 'hidden' && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis') {
            findings.push({ kind: 'text-clipped', detail: `${name(el)} scrollW ${el.scrollWidth} > ${el.clientWidth}` });
        }
    }

    // Overlap between top-level HUD pieces
    const hud = [...root.querySelectorAll('[data-testid="playback-hud"], [data-testid="system-menu-button"]')]
        .filter(visible).map((el) => ({ n: name(el), r: el.getBoundingClientRect() }));
    const toolbar = [...root.querySelectorAll('.liquid-card')].filter((el) => el.querySelector('.liquid-icon-btn') && !el.closest('[data-window-id]') && visible(el));
    for (const t of toolbar) hud.push({ n: 'toolbar', r: t.getBoundingClientRect() });
    for (let i = 0; i < hud.length; i++) {
        for (let j = i + 1; j < hud.length; j++) {
            const a = hud[i].r; const b = hud[j].r;
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
                findings.push({ kind: 'overlap', detail: `${hud[i].n} ∩ ${hud[j].n}` });
            }
        }
    }
    return findings;
};

const server = await createServer({ server: { port: 3198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?quality=0&mute`;
const browser = await launch();
const report = {};

try {
    for (const vp of VIEWPORTS) {
        const vpName = `${vp.width}x${vp.height}`;
        report[vpName] = {};
        const ctx = await browser.newContext({ viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
        const page = await ctx.newPage();
        page.setDefaultTimeout(6000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));

        const shot = async (label) => {
            await page.waitForTimeout(350);
            const findings = await page.evaluate(scan, MIN_TAP);
            report[vpName][label] = findings;
            await page.screenshot({ path: join(OUT, `${vpName}_${label}.png`) });
            console.log(`${vpName} ${label}: ${findings.length} findings`);
        };
        const tap = async (locator) => { await locator.tap(); await page.waitForTimeout(250); };
        const resetStorage = async () => { await page.evaluate(() => localStorage.clear()); };

        await page.goto(baseUrl, { waitUntil: 'networkidle' });
        await resetStorage();
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        await shot('01_showcase');

        // showcase settings window
        await tap(page.locator('[data-testid="system-menu-button"]'));
        await tap(page.locator('[data-testid="menu-item-showcaseSettings"]'));
        await shot('02_showcase_settings');
        await page.locator('[data-window-btn="close"]').first().tap().catch(() => {});

        // enter manual mode
        await page.getByText(START_TEXT).tap();
        await page.waitForTimeout(900);
        await shot('03_manual');

        // toolbar sub menus
        await tap(page.locator('button[title="部署藍軍 (帝國)"]'));
        await shot('04_toolbar_unit');
        await page.getByRole('button', { name: '指定', exact: true }).tap().catch(() => {});
        await shot('05_toolbar_unit_draft');
        await tap(page.locator('button[title="地形編輯"]'));
        await shot('06_toolbar_obstacle');
        await tap(page.locator('button[title="選取 / 移動"]'));

        // system menu
        await tap(page.locator('[data-testid="system-menu-button"]'));
        await shot('07_menu');

        // each window via the menu
        for (const id of WINDOW_IDS) {
            const item = page.locator(`[data-testid="menu-item-${id}"]`);
            if (!(await item.count())) {
                // menu closed after previous pick
                await tap(page.locator('[data-testid="system-menu-button"]'));
            }
            if (!(await item.count())) { report[vpName][`win_${id}`] = [{ kind: 'missing', detail: 'no menu item' }]; continue; }
            await tap(item);
            await shot(`win_${id}`);
            await page.locator('[data-window-btn="close"]').first().tap().catch(() => {});
            await page.waitForTimeout(150);
        }

        // populate the battlefield, then inspector: select first agent through the engine's own hit-test path (canvas tap at its screen position)
        await tap(page.locator('button[title="隨機生成戰場與陣容"]'));
        await page.waitForTimeout(800);
        const target = await page.evaluate(() => {
            const engine = window.__TACTICAL_ENGINE__;
            const agent = engine?.agents?.[0];
            const canvas = document.querySelector('canvas');
            if (!agent || !canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const cam = engine.renderer.camera;
            const th = engine.map?.getTerrainHeight ? engine.map.getTerrainHeight(agent.q, agent.r) : 0;
            return { x: rect.left + (agent.px - cam.x) * cam.zoom + rect.width / 2, y: rect.top + (agent.py - th - cam.y) * cam.zoom + rect.height / 2 };
        });
        // Try each agent until the inspector window opens (some may sit under HUD pieces at phone sizes).
        let opened = false;
        const count = await page.evaluate(() => window.__TACTICAL_ENGINE__?.agents?.length ?? 0);
        for (let i = 0; i < count && !opened; i++) {
            const t = await page.evaluate((idx) => {
                const engine = window.__TACTICAL_ENGINE__;
                const agent = engine.agents[idx];
                const canvas = document.querySelector('canvas');
                const rect = canvas.getBoundingClientRect();
                const cam = engine.renderer.camera;
                const th = engine.map?.getTerrainHeight ? engine.map.getTerrainHeight(agent.q, agent.r) : 0;
                return { x: rect.left + (agent.px - cam.x) * cam.zoom + rect.width / 2, y: rect.top + (agent.py - th - cam.y) * cam.zoom + rect.height / 2 };
            }, i);
            if (t.x < 0 || t.y < 0 || t.x > vp.width || t.y > vp.height) continue;
            await page.touchscreen.tap(t.x, t.y);
            await page.waitForTimeout(500);
            opened = (await page.locator('[data-window-id="inspector"]').count()) > 0;
        }
        if (opened) await shot('win_inspector');
        else report[vpName].win_inspector = [{ kind: 'missing', detail: 'could not select an agent by tapping' }];
        if (opened) {
            await page.locator('[data-window-btn="close"]').first().tap().catch(() => {});
            await page.waitForTimeout(300);
        }

        // game over: start the sim, wipe the red team, wait for the victory overlay
        await page.locator('button[title="開始戰鬥"]').tap().catch(() => {});
        await page.evaluate(() => {
            const engine = window.__TACTICAL_ENGINE__;
            for (const a of engine.agents) if (a.team === 'RED' || a.team === 1) a.hp = 0;
        });
        await page.waitForTimeout(6500);
        await shot('99_gameover');

        if (errors.length) report[vpName].pageerrors = errors;
        await ctx.close();
    }
} finally {
    writeFileSync(join(OUT, 'findings.json'), JSON.stringify(report, null, 2));
    await browser.close();
    await server.close();
}
