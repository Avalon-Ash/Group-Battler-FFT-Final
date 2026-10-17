/**
 * drape-perf.mjs — main-thread frame time (update + render command recording) in a VFX-heavy seeded fight.
 * Used to compare the ground drape change against `main`: run once per checkout with --root=<repo>.
 * Headless and not GPU-synchronised (a getImageData sync would push the canvas to software raster), so this
 * measures CPU-side cost only. Same seed, same effect schedule on both sides.
 *
 * Run: node tools/ui-e2e/drape-perf.mjs [--root=<repo root>] [--frames=900] [--rounds=3] [--label=after]
 * Output: tools/ui-e2e/out/drape_perf_<label>.json
 */
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';
import { seededHarnessInit } from './lib/coord-probes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const ROOT = resolve(arg('root', join(here, '..', '..')));
const FRAMES = Number(arg('frames', 900));
const ROUNDS = Number(arg('rounds', 3));
const LABEL = arg('label', 'run');
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });

const server = await createServer({ root: ROOT, server: { port: 3214, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await launchBrowser({ headed: false, unthrottled: false });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { window.__realNow = performance.now.bind(performance); });
await page.addInitScript(seededHarnessInit);
await page.goto(`http://localhost:${port}/?mute&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => window.__stepFrames(10));
await page.getByText(START_TEXT).click();
await page.waitForTimeout(500);

const results = [];
for (let round = 0; round < ROUNDS; round++) {
    const r = await page.evaluate(async ({ frames, round }) => {
        const { Team, Role } = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const { VFX_REGISTRY } = await import('/data/vfx/VFXRegistry.ts');
        const e = window.__TACTICAL_ENGINE__;
        window.__resetSeed(7000 + round);
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'RANDOMIZE_MAP', w: 12, h: 10, layout: 'FLAT', sceneId: 'FOREST', randomizeScene: false });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        const valid = [];
        for (let row = 0; row < e.mapConfig.h; row++) for (let col = 0; col < e.mapConfig.w; col++) {
            const h = HexUtils.offsetToAxial(col, row, e.mapConfig);
            if (e.isValid(h.q, h.r) && !e.hasObstacle(h.q, h.r)) valid.push(h);
        }
        const roles = [Role.TANK, Role.RANGER, Role.MAGE, Role.WARRIOR, Role.CLERIC, Role.ASSASSIN].filter(Boolean);
        for (let i = 0; i < 12 && i * 3 < valid.length; i++) {
            const h = valid[i * 3];
            cmd({ type: 'PLACE_AGENT', team: i % 2 ? Team.RED : Team.BLUE, q: h.q, r: h.r, hp: 999999, role: roles[i % roles.length] });
        }
        e.play();
        for (const a of e.agents) { a.hp = a.maxHp = 999999; }
        // settle the transition and the spawn effects
        for (let i = 0; i < 240; i++) window.__stepFrames(1);
        const ids = Object.keys(VFX_REGISTRY).filter((k) => /^FX_(ULT|ACTIVE)_/.test(k));
        const times = [];
        let drapeFrames = 0, drapeMax = 0;
        const pipe = e.renderer.pipeline;
        for (let f = 0; f < frames; f++) {
            if (f % 12 === 0) {
                // two effects per burst: one on a random unit, one on a random tile (ground-heavy ULT/ACTIVE sets)
                const a = e.agents[Math.floor(Math.random() * e.agents.length)];
                const t = valid[Math.floor(Math.random() * valid.length)];
                const tp = HexUtils.toPx(t.q, t.r, e.mapConfig);
                const th = e.getTerrainHeight(t.q, t.r);
                e.renderer.vfx.playEffect(ids[Math.floor(Math.random() * ids.length)], a.px, a.py, e.getTerrainHeight(a.q, a.r), undefined, e.getTerrainHeight(a.q, a.r));
                e.renderer.vfx.playEffect(ids[Math.floor(Math.random() * ids.length)], tp.x, tp.y, th, undefined, th);
            }
            const t0 = window.__realNow();
            window.__stepFrames(1);
            times.push(window.__realNow() - t0);
            const n = pipe?.groundDrape?.count ?? 0;
            if (n > 0) drapeFrames++;
            drapeMax = Math.max(drapeMax, n);
        }
        return { times, drapeFrames, drapeMax, effects: ids.length };
    }, { frames: FRAMES, round });
    const s = [...r.times].sort((a, b) => a - b);
    const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    const row = { round, frames: s.length, mean: +mean.toFixed(3), p50: +q(0.5).toFixed(3), p90: +q(0.9).toFixed(3), p99: +q(0.99).toFixed(3), max: +s[s.length - 1].toFixed(3), drapeFrames: r.drapeFrames, drapeMax: r.drapeMax, effects: r.effects };
    console.log(LABEL, JSON.stringify(row));
    results.push(row);
}
const med = (k) => { const v = results.map((x) => x[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const summary = { label: LABEL, root: ROOT, p50: med('p50'), p90: med('p90'), p99: med('p99'), mean: med('mean'), rounds: results };
writeFileSync(join(outDir, `drape_perf_${LABEL}.json`), JSON.stringify(summary, null, 2));
console.log(`SUMMARY ${LABEL} p50=${summary.p50} p90=${summary.p90} p99=${summary.p99} mean=${summary.mean} (median of ${ROUNDS} rounds, ms)`);
if (errors.length) console.warn('[warn] page errors:', errors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
