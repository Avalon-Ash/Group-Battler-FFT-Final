// Floating-biome (VOID / MAGMA) terrain cache probe. EVIDENCE ONLY: no engine source is edited.
// Hypothesis: distinct terrain sprite keys on floating maps exceed RENDER_CACHE.MAX_TERRAIN_SPRITES, causing
// continuous eviction and re-baking. Headed 2560x1440, vsync-limited (real play conditions), main GPU asserted.
// Usage: node tools/ui-e2e/terrain-float-probe.mjs [--seconds=90] [--sweep=30] [--runs=VOID:baseline,MAGMA:floatflat,...]
//   conditions: baseline | floatflat (FLOAT_STEP=1e9 -> floatOffset quantizes to 0) | noliquid (SurfacePainter.drawLiquid no-op) | both
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, getEnvInfo, assertMainGpu, START_TEXT } from './lib/perf-common.mjs';
import { installTrackers, takeFrames, collectSnapshot, frameStats, median } from './lib/lifecycle-probe.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const SECONDS = Number(arg('seconds', 90));
const SWEEP = Number(arg('sweep', 30));
const SAMPLE_S = 5;
const RUNS = arg(
    'runs',
    'VOID:baseline,VOID:floatflat,MAGMA:baseline,MAGMA:floatflat,MAGMA:noliquid,FOREST:baseline,FOREST:floatflat'
).split(',').map((s) => { const [biome, cond] = s.split(':'); return { biome, cond }; });
const outFile = join(outDir, arg('out', 'terrain_float_probe.json'));

const server = await createServer({ root, server: { port: 3211, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await launchBrowser({ headed: true, unthrottled: false, extraArgs: ['--enable-precise-memory-info'] });

const results = [];
let env = null;

async function setupRun(page, biome, cond) {
    return page.evaluate(async ({ biome, cond }) => {
        const e = window.__TACTICAL_ENGINE__;
        const { Team, Role } = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        e.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
        e.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', w: 12, h: 8, layout: 'FLAT', sceneId: biome, randomizeScene: false });
        e.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
        e.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: false });
        // no zone: it would end the battle (ring-out kills) inside the sample window
        e.bus.emit('UI_COMMAND', { type: 'SET_ZONE_CONFIG', config: { enabled: false } });

        // same spawn recipe as hooks/useGameApp.ts internalSpawnTeams
        const radius = Math.floor(Math.max(e.mapConfig.w, e.mapConfig.h) / 2) + 1;
        const valid = [...e.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
            .filter((h) => !e.hasObstacle(h.q, h.r) && HexUtils.dist({ q: 0, r: 0 }, h) < radius);
        const left = valid.filter((h) => h.q < -1);
        const right = valid.filter((h) => h.q > 1);
        const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
        const spawn = (team, hexes) => {
            for (let i = 0; i < 5 && i < hexes.length; i++) {
                e.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team, q: hexes[i].q, r: hexes[i].r, hp: 800, role: roles[i] });
            }
        };
        spawn(Team.BLUE, left);
        spawn(Team.RED, right);
        for (const a of e.agents) a.hp = a.maxHp = 999999;

        // instrumentation (in-page monkey patches only)
        const C = await import('/constants.ts');
        if (cond === 'floatflat' || cond === 'both') C.RENDER_CACHE.FLOAT_STEP = 1e9;
        if (cond === 'noliquid' || cond === 'both') {
            const { SurfacePainter } = await import('/engine/graphics/painters/SurfacePainter.ts');
            SurfacePainter.drawLiquid = function () {};
        }
        const { TerrainRenderer: TR } = await import('/engine/renderers/grid/TerrainRenderer.ts');
        const W = (window.__W = { get: 0, bake: 0, bakeMs: 0, bakePx: 0, newKeys: 0, keys: new Set() });
        TR.store.clear();
        TR.store.resetStats();
        const origGet = TR.store.get;
        TR.store.get = function (key, bake) {
            W.get++;
            const p = key.packedInt;
            if (!W.keys.has(p)) { W.keys.add(p); W.newKeys++; }
            return origGet.call(this, key, bake);
        };
        const origBake = TR.bakeBlock;
        TR.bakeBlock = function (...a) {
            const t0 = performance.now();
            const r = origBake.apply(this, a);
            W.bakeMs += performance.now() - t0;
            W.bake++;
            W.bakePx += r.canvas.width * r.canvas.height;
            return r;
        };
        window.__sweepStart = (ms) => {
            const cam = e.renderer.camera;
            const t0 = performance.now();
            window.__sweepDone = false;
            const id = setInterval(() => {
                const u = (performance.now() - t0) / ms;
                if (u >= 1) { clearInterval(id); window.__sweepDone = true; return; }
                const tri = u < 0.5 ? u * 2 : (1 - u) * 2;
                const z = 0.4 + tri * 2.6;
                cam.zoom = cam.targetZoom = z;
                cam.manualOverrideTimer = 1.0;
            }, 100);
        };
        e.play();
        return { agents: e.agents.length, scene: e.currentScene.id, tiles: e.mapKeys.size, layout: e.mapConfig.layout, zoom: e.renderer.camera.zoom };
    }, { biome, cond });
}

const readWindow = (page) => page.evaluate(() => {
    const W = window.__W;
    const keys = [...W.keys];
    const dim = { float: new Set(), h: new Set(), variant: new Set(), mask: new Set(), scale: new Set() };
    const perScale = {};
    for (const p of keys) {
        const s = (p >> 22) & 7;
        dim.float.add((p >> 4) & 511); dim.h.add((p >> 13) & 511); dim.variant.add(p & 15);
        dim.mask.add((p >> 25) & 63); dim.scale.add(s);
        perScale[s] = (perScale[s] || 0) + 1;
    }
    const w = { get: W.get, bake: W.bake, bakeMs: +W.bakeMs.toFixed(2), bakePx: W.bakePx, newKeys: W.newKeys,
        keysTotal: keys.length, keysByDim: { float: dim.float.size, height: dim.h.size, variant: dim.variant.size, mask: dim.mask.size, scale: dim.scale.size }, keysPerScale: perScale };
    W.get = 0; W.bake = 0; W.bakeMs = 0; W.bakePx = 0; W.newKeys = 0;
    return w;
});

for (const run of RUNS) {
    const label = `${run.biome}:${run.cond}`;
    console.log(`\n=== ${label} ===`);
    const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(installTrackers);
    await page.goto(`http://localhost:${port}/?perf&mute&quality=0`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
    if (!env) { env = await getEnvInfo(page, false); console.log('GPU', env.gpu, 'viewport', env.viewport); assertMainGpu(env); }
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(800);
    const setup = await setupRun(page, run.biome, run.cond);
    console.log('setup', JSON.stringify(setup));
    await page.waitForTimeout(300);
    await page.evaluate(takeFrames); // clear
    await readWindow(page); // clear window counters

    const samples = [];
    let prev = null;
    const total = SECONDS + SWEEP;
    const n = Math.round(total / SAMPLE_S);
    for (let i = 1; i <= n; i++) {
        if (i === Math.round(SECONDS / SAMPLE_S) + 1) {
            await page.evaluate((ms) => window.__sweepStart(ms), SWEEP * 1000);
        }
        await page.waitForTimeout(SAMPLE_S * 1000);
        const { frames, rafCalls } = await page.evaluate(takeFrames);
        const win = await readWindow(page);
        const snap = await page.evaluate(collectSnapshot, { gc: false, walk: false });
        const ts = snap.caches.terrainSprites;
        const row = {
            t: i * SAMPLE_S,
            phase: i * SAMPLE_S <= SECONDS ? 'steady' : 'sweep',
            frame: frameStats(frames),
            zoom: snap.curated.cameraZoom,
            agents: snap.curated.agents,
            store: ts,
            d: prev ? { hits: ts.hits - prev.hits, misses: ts.misses - prev.misses, evictions: ts.evictions - prev.evictions, fallbacks: ts.fallbacks - prev.fallbacks, clears: ts.clears - prev.clears } : null,
            win,
            phases: snap.caches.phases,
            subPhases: snap.caches.subPhases,
            liquid: snap.caches.TerrainLoopAtlas?.liquid,
            canvasesLive: snap.canvases.live,
            heap: snap.heapBefore,
            spikeCount: snap.caches.spikeCount,
            scene: snap.curated.scene,
        };
        prev = ts;
        samples.push(row);
        console.log(`t=${String(row.t).padStart(3)} ${row.phase.padEnd(6)} z=${row.zoom} med=${row.frame.median} p99=${row.frame.p99} max=${row.frame.max} size=${ts.size} dMiss=${row.d?.misses} dEvict=${row.d?.evictions} dFb=${row.d?.fallbacks} bake=${win.bake}/${win.bakeMs}ms keys=${win.keysTotal} work=${Object.values(row.phases || {}).reduce((a, b) => a + b, 0).toFixed(2)}ms`);
    }
    const endSnap = await page.evaluate(collectSnapshot, { gc: true, walk: false });
    const spikes = await page.evaluate(() => (window.__PERF_SPIKES__ || []).length);
    const maxSpike = await page.evaluate(() => Math.max(0, ...(window.__PERF_SPIKES__ || []).map((s) => s.frameMs)));
    results.push({ label, biome: run.biome, cond: run.cond, setup, samples, end: { store: endSnap.caches.terrainSprites, canvases: endSnap.canvases, heapAfterGc: endSnap.heapAfter, spikesInRing: spikes, maxSpike } });
    await ctx.close();
    writeFileSync(outFile, JSON.stringify({ env, config: { SECONDS, SWEEP, SAMPLE_S }, results }, null, 2));
}

// ---- summary ----
const steady = (r) => r.samples.filter((s) => s.phase === 'steady' && s.t > 30);
const sweepS = (r) => r.samples.filter((s) => s.phase === 'sweep');
const sum = (a, f) => a.reduce((x, s) => x + (f(s) ?? 0), 0);
const avg = (a, f) => (a.length ? sum(a, f) / a.length : 0);
const work = (s) => Object.values(s.phases || {}).reduce((x, y) => x + y, 0);
console.log('\n| run | steady med | steady p99 | steady max | work ms | misses/s | evict (all) | clears | fallbacks (all) | bake ms/s | size end | distinct keys | sweep p99 | sweep work | sweep misses/s |');
console.log('| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |');
for (const r of results) {
    const st = steady(r); const sw = sweepS(r);
    const last = r.samples[r.samples.length - 1];
    const dur = SAMPLE_S;
    console.log(`| ${r.label} | ${median(st.map((s) => s.frame.median)).toFixed(2)} | ${avg(st, (s) => s.frame.p99).toFixed(2)} | ${Math.max(...st.map((s) => s.frame.max)).toFixed(1)} | ${avg(st, work).toFixed(2)} | ${(avg(st, (s) => s.d?.misses) / dur).toFixed(1)} | ${last.store.evictions} | ${last.store.clears} | ${last.store.fallbacks} | ${(avg(st, (s) => s.win.bakeMs) / dur).toFixed(2)} | ${last.store.size} | ${last.win.keysTotal} | ${avg(sw, (s) => s.frame.p99).toFixed(2)} | ${avg(sw, work).toFixed(2)} | ${(avg(sw, (s) => s.d?.misses) / dur).toFixed(1)} |`);
}
writeFileSync(outFile, JSON.stringify({ env, config: { SECONDS, SWEEP, SAMPLE_S }, results }, null, 2));
console.log('wrote', outFile);
await browser.close();
await server.close();
