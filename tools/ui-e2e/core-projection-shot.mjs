/**
 * Core-as-projection screenshots (docs/CORE_PROJECTION_DESIGN.md): idle, casting, projectile origin / in flight / hit,
 * flying unit, drag preview (solid gem on the pedestal), mid-spawn (gem rising into the projection center).
 * Also prints the numeric anchors (projectile start vs caster anchor, end vs target anchor).
 *
 * Run: node tools/ui-e2e/core-projection-shot.mjs
 * Output: tools/ui-e2e/out/core_*.png (gitignored)
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });
const START_TEXT = '啟動戰術模擬';
const CROP = 460;
const ZOOM = 3.0;
// projectile shots show both units (3 hexes apart): lower zoom, wide crop
const PROJ_ZOOM = 1.7;
const PROJ_W = 760;
const PROJ_H = 420;

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

const server = await createServer({ server: { port: 3197, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

const save = (name, b64) => {
    const dest = join(OUT_DIR, name);
    writeFileSync(dest, Buffer.from(b64, 'base64'));
    console.log(dest);
};

const grab = (page, cx, cy, w, h = w) => page.evaluate(({ cx, cy, w, h }) => {
    const c = document.querySelector('canvas');
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    out.getContext('2d').drawImage(c, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h, 0, 0, w, h);
    return out.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}, { cx, cy, w, h });

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

    // caster (ranger) vs target tank, 3 hexes apart, AI off
    const setup = (flying) => page.evaluate(async ({ flying, zoom }) => {
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
        e.renderer.camera.snapTo(midX, midY, zoom);
        return { midX, midY, casterCamX: caster.px, casterCamY: caster.py - e.getTerrainHeight(caster.q, caster.r) - 20 };
    }, { flying, zoom: ZOOM });

    const step = (s, n, focus) => page.evaluate(({ s, n, focus }) => {
        const e = window.__TACTICAL_ENGINE__;
        for (let i = 0; i < n; i++) {
            const x = focus === 'caster' ? s.casterCamX : s.midX;
            const y = focus === 'caster' ? s.casterCamY : s.midY;
            e.renderer.camera.snapTo(x, y, 3.0);
            window.__stepFrames(1);
        }
    }, { s, n, focus });

    const center = () => page.evaluate(() => { const k = document.querySelector('canvas'); return [k.width / 2, k.height / 2]; });
    const shot = async (name) => { const c = await center(); save(name, await grab(page, c[0], c[1], CROP)); };

    const runScenario = async (flying, tag) => {
        const s = { ...(await setup(flying)), projZoom: PROJ_ZOOM };
        // mid-spawn: gem on its way from the pedestal into the projection. Pause the sim so the timer holds,
        // and let the one-shot SPAWN effect finish first so only the gem and the body are in the picture.
        if (!flying) {
            const holdSpawn = (t) => page.evaluate((t) => {
                const e = window.__TACTICAL_ENGINE__;
                e.agents[0].spawnTimer = t;
            }, t);
            await page.evaluate(() => window.__TACTICAL_ENGINE__.bus.emit('UI_COMMAND', { type: 'STOP_GAME' }));
            for (let i = 0; i < 90; i++) { await holdSpawn(0.5); await step(s, 1, 'caster'); }
            for (const [t, name] of [[0.5, 'core_spawn_start.png'], [0.36, 'core_spawn_early.png'], [0.22, 'core_spawn_mid.png'], [0.08, 'core_spawn_late.png']]) {
                await holdSpawn(t);
                await step(s, 1, 'caster');
                await shot(name);
            }
            await holdSpawn(0);
            await page.evaluate(() => window.__TACTICAL_ENGINE__.play());
        }
        await step(s, 40, 'caster');
        if (flying) {
            const z = await page.evaluate(() => window.__TACTICAL_ENGINE__.agents[0].physics.z);
            console.log(`[flying] caster physics.z=${z}`);
        }
        await shot(`core_${tag}_idle.png`);

        if (!flying) {
            // drag preview: solid gem on the pedestal, no projection
            await page.evaluate(() => {
                const c = window.__TACTICAL_ENGINE__.agents[0];
                c.dragOverQ = c.q; c.dragOverR = c.r;
            });
            await step(s, 2, 'caster');
            await shot('core_drag_preview.png');
            await page.evaluate(() => {
                const c = window.__TACTICAL_ENGINE__.agents[0];
                c.dragOverQ = null; c.dragOverR = null;
            });
        }

        await page.evaluate(() => {
            const e = window.__TACTICAL_ENGINE__;
            e.initiateCast(e.agents[0], 0);
            e.renderer.processVisualEvents(e.events.splice(0));
        });
        await step(s, 6, 'caster');
        await shot(`core_${tag}_casting.png`);

        // projectile: origin, in flight, hit
        let shots = 0;
        let seen = false;
        let hitShot = false;
        for (let i = 0; i < 240 && !hitShot; i++) {
            const r = await page.evaluate(({ s }) => {
                const e = window.__TACTICAL_ENGINE__;
                e.renderer.camera.snapTo(s.midX, s.midY, s.projZoom);
                window.__stepFrames(1);
                const p = e.projectiles.find((q) => q.active);
                return p ? { t: p.t, sx: p.startX, sy: p.startY, sz: p.startZ, ez: p.endZ } : null;
            }, { s });
            if (r) {
                seen = true;
                if (shots === 0 && r.t > 0.04) {
                    const a = await page.evaluate(async () => {
                        const { VisualMath } = await import('/engine/math/VisualMath.ts');
                        const e = window.__TACTICAL_ENGINE__;
                        return [VisualMath.getCoreAnchor(e.agents[0], e), VisualMath.getUnitAnchor(e.agents[1], e)];
                    });
                    console.log(`[${tag}] projectile start=(${r.sx.toFixed(1)}, ${r.sy.toFixed(1)}, ${r.sz.toFixed(1)}) endZ=${r.ez.toFixed(1)}`, a ? JSON.stringify(a) : '');
                    const c = await center();
                    save(`core_${tag}_projectile_origin.png`, await grab(page, c[0], c[1], PROJ_W, PROJ_H));
                    shots++;
                } else if (shots === 1 && r.t > 0.4) {
                    const c = await center();
                    save(`core_${tag}_projectile_flight.png`, await grab(page, c[0], c[1], PROJ_W, PROJ_H));
                    shots++;
                }
            } else if (seen) {
                // projectile just landed: the hit effect is at the target projection center
                await page.evaluate(({ s }) => {
                    const e = window.__TACTICAL_ENGINE__;
                    e.renderer.camera.snapTo(s.midX, s.midY, s.projZoom);
                    window.__stepFrames(2);
                }, { s });
                const c = await center();
                save(`core_${tag}_projectile_hit.png`, await grab(page, c[0], c[1], PROJ_W, PROJ_H));
                hitShot = true;
            }
        }
        if (shots === 0) console.warn(`[${tag}] no projectile seen`);
    };

    await runScenario(false, 'ground');
    await runScenario(true, 'flying');
    if (errors.length) console.warn(`[warn] page errors: ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}
