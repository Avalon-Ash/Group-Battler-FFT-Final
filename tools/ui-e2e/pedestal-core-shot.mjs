/**
 * Pedestal core screenshots: cores on both factions, projectiles leaving the core (ground and flying caster),
 * and the placement preview (pedestal entity, no character projection).
 *
 * Run: node tools/ui-e2e/pedestal-core-shot.mjs
 * Output: tools/ui-e2e/out/pedestal-core/*.png (gitignored)
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out', 'pedestal-core');
mkdirSync(OUT_DIR, { recursive: true });
const START_TEXT = 'START SIMULATION';
const DEPLOY_BLUE = '部署藍軍 (帝國)';

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

const server = await createServer({ server: { port: 3198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const save = (name, b64) => {
    const dest = join(OUT_DIR, name);
    writeFileSync(dest, Buffer.from(b64, 'base64'));
    console.log(dest);
};

// crop of the main canvas around (cx, cy) canvas px
const grab = (page, cx, cy, size) => page.evaluate(({ cx, cy, size }) => {
    const c = document.querySelector('canvas');
    const out = document.createElement('canvas');
    out.width = size; out.height = size;
    out.getContext('2d').drawImage(c, Math.round(cx - size / 2), Math.round(cy - size / 2), size, size, 0, 0, size, size);
    return out.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}, { cx, cy, size });

try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
        let s = 1337;
        Math.random = () => {
            let t = (s += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        let syntheticTime = 1000.0;
        Date.now = () => Math.floor(syntheticTime);
        performance.now = () => syntheticTime;
        let rafId = 0;
        const rafCallbacks = new Map();
        window.requestAnimationFrame = (cb) => { const id = ++rafId; rafCallbacks.set(id, cb); return id; };
        window.cancelAnimationFrame = (id) => { rafCallbacks.delete(id); };
        window.__stepFrames = (n = 1) => {
            for (let i = 0; i < n; i++) {
                syntheticTime += 16.666666666666668;
                const callbacks = Array.from(rafCallbacks.entries());
                rafCallbacks.clear();
                for (const [, cb] of callbacks) cb(syntheticTime);
            }
        };
    });
    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));

    // ---------- scenario helper: caster (ranger) vs target tank, 3 hexes apart, AI off
    const setup = (flying) => page.evaluate(async ({ flying }) => {
        const types = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        const usable = (col, row) => {
            if (col < 0 || row < 0 || col >= e.mapConfig.w || row >= e.mapConfig.h) return false;
            const h = HexUtils.offsetToAxial(col, row, e.mapConfig);
            return e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r);
        };
        let best = null;
        const midC = e.mapConfig.w / 2, midR = e.mapConfig.h / 2;
        for (let row = 0; row < e.mapConfig.h; row++) for (let col = 0; col + 3 < e.mapConfig.w; col++) {
            if (!usable(col, row) || !usable(col + 3, row)) continue;
            const score = Math.abs(col + 1.5 - midC) + Math.abs(row - midR);
            if (!best || score < best.score) best = { col, row, score };
        }
        const place = (team, col, row, role) => {
            const h = HexUtils.offsetToAxial(col, row, e.mapConfig);
            cmd({ type: 'PLACE_AGENT', team, q: h.q, r: h.r, hp: 20000, role });
            return e.agents[e.agents.length - 1];
        };
        const caster = place(types.Team.BLUE, best.col, best.row, types.Role.RANGER);
        const target = place(types.Team.RED, best.col + 3, best.row, types.Role.TANK);
        caster.skillIds = ['rb_b1', null, null];
        e.play();
        for (const a of e.agents) { a.bt = null; a.hp = a.maxHp = 20000; a.mp = a.maxMp; }
        if (flying) caster.movementType = types.MovementType.FLYING;
        caster.target = target;
        caster.targetHex = { q: target.q, r: target.r };
        caster.facing = 1;
        e.renderer.processVisualEvents(e.events.splice(0));
        const midX = caster.px + 90;
        const midY = (caster.py + target.py) / 2 - e.getTerrainHeight(caster.q, caster.r) - 30;
        e.renderer.camera.snapTo(midX, midY, 2.4);
        return { midX, midY };
    }, { flying });

    const runScenario = async (flying, tag) => {
        const s = await setup(flying);
        // let the spawn effect finish (and, for flying, the hover to settle), then start the cast
        for (let i = 0; i < 40; i++) {
            await page.evaluate(({ midX, midY }) => {
                const e = window.__TACTICAL_ENGINE__;
                e.renderer.camera.snapTo(midX, midY, 2.4);
                window.__stepFrames(1);
            }, s);
        }
        const info = await page.evaluate(() => {
            const e = window.__TACTICAL_ENGINE__;
            const c = e.agents[0];
            e.initiateCast(c, 0);
            e.renderer.processVisualEvents(e.events.splice(0));
            return { z: c.physics.z, mt: c.movementType };
        });
        console.log(`[${tag}] caster physics.z=${info.z} movementType=${info.mt}`);
        let shots = 0;
        for (let i = 0; i < 160 && shots < 2; i++) {
            const r = await page.evaluate(({ midX, midY }) => {
                const e = window.__TACTICAL_ENGINE__;
                e.renderer.camera.snapTo(midX, midY, 2.4);
                window.__stepFrames(1);
                const p = e.projectiles.find((q) => q.active && q.t > 0.04);
                return p ? { t: p.t } : null;
            }, s);
            if (r && (shots === 0 || r.t > 0.35)) {
                const c = await page.evaluate(() => { const k = document.querySelector('canvas'); return [k.width / 2, k.height / 2]; });
                save(`${tag}_projectile_${shots}.png`, await grab(page, c[0], c[1], 560));
                shots++;
            }
        }
        if (shots === 0) console.warn(`[${tag}] no projectile seen`);
    };

    await runScenario(false, 'ground');
    await runScenario(true, 'flying');

    // ---------- placement preview
    await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
    });
    await page.locator(`button[title="${DEPLOY_BLUE}"]`).click();
    await page.evaluate(() => window.__stepFrames(3));
    const spot = { x: 340, y: 310 };
    await page.evaluate(() => window.__stepFrames(3));
    await page.mouse.move(spot.x - 40, spot.y - 20);
    await page.mouse.move(spot.x, spot.y);
    await page.evaluate(() => window.__stepFrames(3));
    save('placement_preview_blue.png', await grab(page, spot.x, spot.y, 400));
    writeFileSync(join(OUT_DIR, 'placement_full.png'), await page.screenshot());
    await page.mouse.click(spot.x, spot.y);
    await page.evaluate(() => window.__stepFrames(60));
    save('placement_after_blue.png', await grab(page, spot.x, spot.y, 400));
    if (errors.length) console.warn(`[warn] page errors: ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}
