/**
 * tools/ui-e2e/sink-demo.mjs
 * Constructed before/after screenshots for the "unit sinks into the hex column" bug.
 * Works on any code version (it only writes Agent fields): puts one unit mid-step between two adjacent hexes
 * and renders a crop around it, for the two situations that sank the unit:
 *   up   : stepping UP onto a taller hex (feet used to stay at the lower hex height until arrival)
 *   front: stepping toward the camera onto an equal-height hex (the front tile used to be drawn over the unit)
 *
 * Usage: node tools/ui-e2e/sink-demo.mjs --label=before|after [--theme=ICE]
 * Output: tools/ui-e2e/out/sink-flicker/demo_<label>_<case>_t<NN>.png (+ a contact sheet demo_<label>.png)
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out', 'sink-flicker');
mkdirSync(OUT_DIR, { recursive: true });

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const LABEL = String(args.label ?? 'run');
const THEME = String(args.theme ?? 'ICE');
const START_TEXT = '啟動戰術模擬';
const DICE_TITLE = '隨機生成戰場與陣容';
const STEPS = [0.3, 0.6, 0.9];

const server = await createServer({ server: { port: 3196, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
let browser = null;
for (const channel of ['msedge', 'chrome']) {
    try { browser = await chromium.launch({ channel, headless: true, args: ['--window-size=1280,720'] }); break; } catch { /* next */ }
}
if (!browser) throw new Error('No Edge or Chrome found.');
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })).newPage();

await page.addInitScript(() => {
    let seed = 1337;
    Math.random = () => { let t = (seed += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    let now = 1000;
    window.__resetSeed = (s) => { window.__TACTICAL_ENGINE__?.seedSimulation?.(s); /* 模擬流與 Math.random 分離，需一併重設 */ seed = s; now = 1000; };
    Date.now = () => Math.floor(now); performance.now = () => now;
    let id = 0; const cbs = new Map();
    window.requestAnimationFrame = (cb) => { cbs.set(++id, cb); return id; };
    window.cancelAnimationFrame = (i) => { cbs.delete(i); };
    window.__stepFrames = (n = 1) => { for (let i = 0; i < n; i++) { now += 16.6667; const l = Array.from(cbs.values()); cbs.clear(); l.forEach((cb) => cb(now)); } };
});
await page.goto(`${baseUrl}?mute&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => window.__stepFrames(10));
const startBtn = page.getByText(START_TEXT);
if (await startBtn.isVisible().catch(() => false)) { await startBtn.click().catch(() => {}); await page.waitForTimeout(400); await page.evaluate(() => window.__stepFrames(10)); }

let theme = null;
for (let s = 7000; s < 7060 && theme !== THEME; s++) {
    await page.evaluate((x) => window.__resetSeed(x), s);
    await page.evaluate((t) => document.querySelectorAll('button').forEach((b) => { if (b.title === t) b.click(); }), DICE_TITLE);
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__stepFrames(10));
    theme = await page.evaluate(() => window.__TACTICAL_ENGINE__.currentScene.textureType);
}
if (theme !== THEME) throw new Error(`could not roll ${THEME}`);

// Find the two scenarios from the real map (no battle is started: nothing moves except what we set).
const setup = await page.evaluate(async () => {
    const e = window.__TACTICAL_ENGINE__;
    const { HexUtils } = await import('/engine/utils.ts');
    const keys = Array.from(e.map.mapKeys).map((k) => k.split(',').map(Number));
    const H = (q, r) => e.map.getTerrainHeight(q, r);
    const nbs = (q, r) => HexUtils.neighbors({ q, r }).filter((n) => e.map.mapKeys.has(`${n.q},${n.r}`));
    const Y = (q, r) => HexUtils.toPx(q, r, e.mapConfig).y;
    // 'front' neighbour = larger screen y; prefer hexes near the middle so nothing else is in the way
    const cands = keys.filter(([q, r]) => HexUtils.dist({ q, r }, { q: 0, r: 0 }) <= 2 && !e.map.obstacles.has(`${q},${r}`));
    let up = null, front = null;
    for (const [q, r] of cands) for (const n of nbs(q, r)) {
        if (e.map.obstacles.has(`${n.q},${n.r}`)) continue;
        if (!up && H(n.q, n.r) - H(q, r) >= 48 && Math.abs(Y(n.q, n.r) - Y(q, r)) > 1) up = { a: [q, r], b: [n.q, n.r] };
        if (!front && H(n.q, n.r) === H(q, r) && Y(n.q, n.r) - Y(q, r) > 20) front = { a: [q, r], b: [n.q, n.r] };
    }
    return { up, front, agents: e.agents.length };
});
console.log('scenarios', JSON.stringify(setup));

const shots = [];
for (const name of ['up', 'front']) {
    const sc = setup[name];
    if (!sc) { console.log(`no ${name} scenario found`); continue; }
    for (const t of STEPS) {
        const box = await page.evaluate(({ a, b, t }) => {
            const e = window.__TACTICAL_ENGINE__;
            const u = e.agents[0];
            // park everybody else far away from the crop
            e.agents.forEach((o, i) => { if (i > 0) { o.hp = Math.max(o.hp, 1); } });
            u.q = a[0]; u.r = a[1];
            u.isMoving = true;
            u.path = [{ q: b[0], r: b[1] }];
            u.moveProgress = t;
            u.physics.x = 0; u.physics.y = 0; u.physics.z = 0; u.physics.vx = 0; u.physics.vy = 0; u.physics.vz = 0;
            return null;
        }, { a: sc.a, b: sc.b, t });
        // Place px/py with the same lerp MotionEngine uses, then render two frames (not running: nothing else moves it)
        await page.evaluate(async ({ a, b, t }) => {
            const e = window.__TACTICAL_ENGINE__;
            const { HexUtils } = await import('/engine/utils.ts');
            const u = e.agents[0];
            const c = HexUtils.toPx(a[0], a[1], e.mapConfig), n = HexUtils.toPx(b[0], b[1], e.mapConfig);
            u.px = c.x + (n.x - c.x) * t; u.py = c.y + (n.y - c.y) * t;
            const cam = e.renderer.camera;
            const hm = Math.max(e.map.getTerrainHeight(a[0], a[1]), e.map.getTerrainHeight(b[0], b[1]));
            cam.snapTo(u.px, u.py - hm - 20, 2.4);
        }, { a: sc.a, b: sc.b, t });
        await page.evaluate(() => window.__stepFrames(3));
        const file = join(OUT_DIR, `demo_${LABEL}_${name}_t${Math.round(t * 100)}.png`);
        await page.screenshot({ path: file, clip: { x: 440, y: 160, width: 400, height: 400 } });
        shots.push(file);
        console.log('shot', file);
    }
}
await browser.close();
await server.close();
