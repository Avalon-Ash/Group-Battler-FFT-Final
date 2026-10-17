/**
 * tools/ui-e2e/coord-guard.mjs
 * Runtime guards for the render coordinate protocol (engine/renderers/RenderSpec.ts). The fidelity baselines are single
 * frozen frames, so time-dependent misalignment and draw-order oscillation are invisible to them; this covers that gap.
 *
 *   --float     VOID/MAGMA: unit draw Y minus its tile's draw Y must stay constant while the tiles bob
 *   --sink      seeded battle royale: no unit's feet may sit below the top of the tile under them
 *   --flicker   seeded battles + idle edit board: no pair of overlapping ops may change draw order A<B, B<A, A<B within 8 frames
 * With no check flag all three run. Evidence only: nothing in engine/ is edited; the page is monkey-patched.
 *
 * Usage: node tools/ui-e2e/coord-guard.mjs [--float] [--sink] [--flicker] [--assert]
 *          [--seeds=3] [--seedStart=1] [--seconds=20] [--biomes=FOREST,VOID] [--fxfx] [--floatFrames=90] [--injectSink=N] [--no-decal-lift]
 * Output: tools/ui-e2e/out/coord_guard.json + a summary on stdout. Exit 1 with --assert on any violation.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';
import { startServer, seededHarnessInit, runFloatAlign, installRecorder, setupBattle, stepFrames } from './lib/coord-probes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const val = (n, d) => { const h = argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const any = flag('float') || flag('sink') || flag('flicker');
const DO_FLOAT = !any || flag('float');
const DO_SINK = !any || flag('sink');
const DO_FLICKER = !any || flag('flicker');
const ASSERT = flag('assert');
const SEEDS = Number(val('seeds', 3));
const SEED_START = Number(val('seedStart', 1));
const SECONDS = Number(val('seconds', 20));
const BIOMES = val('biomes', 'FOREST,VOID').split(',');
const FLOAT_FRAMES = Number(val('floatFrames', 90));
const FXFX = flag('fxfx');
const IDLE_FRAMES = 240;
const NO_DECAL_LIFT = flag('no-decal-lift'); // experiment: disable RenderList's decal lift (VFX_RENDER.DECAL_LIFT_MIN_HALF_H = 1e9) to prove its share of the flicker
const INJECT_SINK = Number(val('injectSink', 0)); // negative control: shift unit ops down N px before the sink check

const { server, port } = await startServer(3213);
const browser = await launchBrowser({ headed: false, unthrottled: false });
const result = { timestamp: new Date().toISOString(), config: { DO_FLOAT, DO_SINK, DO_FLICKER, SEEDS, SEED_START, SECONDS, BIOMES, FXFX }, float: [], runs: [] };
const failures = [];

async function openApp(seeded) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.warn('[pageerror]', String(e).slice(0, 200)));
    if (seeded) await page.addInitScript(seededHarnessInit);
    await page.goto(`http://localhost:${port}/?mute&quality=0`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
    if (seeded) await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    if (seeded) { await page.waitForTimeout(400); await page.evaluate(() => window.__stepFrames(10)); } else await page.waitForTimeout(800);
    return { ctx, page };
}

/* ---------------------------------------------------------------- 1. FLOAT */
if (DO_FLOAT) {
    console.log('== float ==');
    for (const biome of ['VOID', 'MAGMA']) {
        const { ctx, page } = await openApp(false);
        const out = await runFloatAlign(page, biome, FLOAT_FRAMES);
        await ctx.close();
        const pass = out.ok && out.bobbing;
        console.log(`  ${biome}: units=${out.summary.length} frames=${out.frames} bobbing=${out.bobbing} constantGap=${out.ok} -> ${pass ? 'PASS' : 'FAIL'}`);
        for (const s of out.summary) if (s.distinctGaps.length !== 1) console.log(`    unit ${s.id}: gaps=${JSON.stringify(s.distinctGaps)} tileY=${JSON.stringify(s.tileYRange)}`);
        if (!pass) failures.push(`float ${biome}`);
        result.float.push({ ...out, pass });
    }
}

/* ------------------------------------------------------ 2/3. SINK + FLICKER */
if (DO_SINK || DO_FLICKER) {
    const { ctx, page } = await openApp(true);
    await installRecorder(page);
    const sceneRuns = [];
    for (const biome of BIOMES) for (let i = 0; i < SEEDS; i++) sceneRuns.push({ kind: 'battle', biome, seed: 1000 + SEED_START + i });
    if (DO_FLICKER) for (const biome of BIOMES) sceneRuns.push({ kind: 'idle', biome, seed: 2000 });
    for (const run of sceneRuns) {
        const label = `${run.kind} ${run.biome} seed=${run.seed}`;
        const t0 = Date.now();
        const info = await setupBattle(page, { biome: run.biome, seed: run.seed, start: run.kind === 'battle' });
        await stepFrames(page, 6, { driveClock: run.kind === 'idle' }); // let the board settle before recording
        await page.evaluate((cfg) => window.__CG__.begin(cfg), { sink: DO_SINK && run.kind === 'battle', flicker: DO_FLICKER, fxfx: FXFX, injectSink: INJECT_SINK, noDecalLift: NO_DECAL_LIFT });
        const frames = run.kind === 'battle' ? Math.round(SECONDS * 60) : IDLE_FRAMES;
        await stepFrames(page, frames, { driveClock: run.kind === 'idle' });
        const rec = await page.evaluate(() => window.__CG__.end());
        const osc = Object.values(rec.flicker).reduce((s, g) => s + g.events, 0);
        console.log(`  ${label}: ${((Date.now() - t0) / 1000).toFixed(1)}s frames=${rec.frames} battleFrames=${rec.battleFrames} ops<=${rec.opsMax} sinkViol=${rec.sink.violations} void=${rec.sink.voidSamples} flips=${rec.flipsTotal} oscEvents=${osc} heights=${JSON.stringify(info.heightRange)} agents=${info.agents}`);
        result.runs.push({ ...run, setup: info, ...rec });
    }
    await ctx.close();
}

await browser.close();
await server.close();

/* ---------------------------------------------------------------- SUMMARY */
const battles = result.runs.filter((r) => r.kind === 'battle');
const sink = {
    runs: battles.length,
    samples: 0, groundedSamples: 0, violations: 0, episodes: 0, agentsAffected: 0, movingViolations: 0, stationaryViolations: 0, footHexNotLogical: 0, voidSamples: 0, voidAgents: 0, fallingSamples: 0, nonIdleFrames: 0,
    worst: [], voidWorst: [],
};
for (const r of battles) {
    for (const k of ['samples', 'groundedSamples', 'violations', 'episodes', 'agentsAffected', 'movingViolations', 'stationaryViolations', 'footHexNotLogical', 'voidSamples', 'voidAgents', 'fallingSamples', 'nonIdleFrames']) sink[k] += r.sink[k];
    sink.worst.push(...r.sink.worst.map((w) => ({ ...w, biome: r.biome, seed: r.seed })));
    sink.voidWorst.push(...r.sink.voidWorst.map((w) => ({ ...w, biome: r.biome, seed: r.seed })));
}
sink.worst.sort((a, b) => b.delta - a.delta);
sink.worst = sink.worst.slice(0, 10);
result.sinkSummary = sink;

const groups = {};
for (const r of result.runs) {
    for (const [name, g] of Object.entries(r.flicker)) {
        const t = (groups[name] ||= { pairsSeen: 0, pairsFlipped: 0, pairsOscillating: 0, flips: 0, events: 0, episodes: 0, staticEvents: 0, movedEvents: 0, ties: 0, tiesBothLifted: 0, liftEvents: 0, liftEdge: 0, liftScaling: 0, liftDecalSwitch: 0, drivers: { y: 0, sortBias: 0, zBoost: 0, decalLift: 0, other: 0 }, medians: [], exStatic: [], exMoved: [], runs: new Set() });
        for (const k of ['pairsSeen', 'pairsFlipped', 'pairsOscillating', 'flips', 'events', 'episodes', 'staticEvents', 'movedEvents', 'ties', 'tiesBothLifted', 'liftEvents', 'liftEdge', 'liftScaling', 'liftDecalSwitch']) t[k] += g[k];
        for (const k of Object.keys(t.drivers)) t.drivers[k] += g.drivers[k] || 0;
        if (g.medianMinKeyGap !== null) t.medians.push(g.medianMinKeyGap);
        if (g.events) t.runs.add(`${r.kind}:${r.biome}:${r.seed}`);
        for (const e of g.exStatic) if (t.exStatic.length < 3) t.exStatic.push({ ...e, run: `${r.kind}:${r.biome}:${r.seed}` });
        for (const e of g.exMoved) if (t.exMoved.length < 3) t.exMoved.push({ ...e, run: `${r.kind}:${r.biome}:${r.seed}` });
    }
}
const flickerGroups = Object.entries(groups).map(([name, g]) => {
    const m = g.medians.slice().sort((a, b) => a - b);
    return { name, ...g, runs: [...g.runs], medians: undefined, medianMinKeyGap: m.length ? m[m.length >> 1] : null };
}).sort((a, b) => b.events - a.events || b.flips - a.flips);
result.flickerGroups = flickerGroups;
const oscTotal = flickerGroups.reduce((s, g) => s + g.events, 0);
const oscStatic = flickerGroups.reduce((s, g) => s + g.staticEvents, 0);
const oscEpisodes = flickerGroups.reduce((s, g) => s + g.episodes, 0);
const flipsTotal = flickerGroups.reduce((s, g) => s + g.flips, 0);

writeFileSync(join(outDir, 'coord_guard.json'), JSON.stringify(result, null, 2));

console.log('\n================ coord-guard summary ================');
if (DO_FLOAT) for (const f of result.float) console.log(`FLOAT ${f.biome.padEnd(6)} ${f.pass ? 'PASS' : 'FAIL'}  units=${f.summary.length} bobbing=${f.bobbing} constantGap=${f.ok}`);
if (DO_SINK) {
    console.log(`SINK  battles=${sink.runs} grounded unit-samples=${sink.groundedSamples} (of ${sink.samples} alive-unit samples; ${sink.fallingSamples} falling skipped, ${sink.nonIdleFrames} non-idle frames skipped)`);
    console.log(`      violations(feet sunk >1px)=${sink.violations} in ${sink.episodes} episodes, ${sink.agentsAffected} unit-runs affected; moving=${sink.movingViolations} stationary=${sink.stationaryViolations} footHex!=logicalHex=${sink.footHexNotLogical}`);
    console.log(`      over-void samples (alive, grounded, no TERRAIN op under foot)=${sink.voidSamples} (${sink.voidAgents} unit-runs)`);
    for (const w of sink.voidWorst.slice(0, 5)) console.log(`      void: ${w.biome}/${w.seed} agent=${w.agent} f=${w.frame} hex=${w.hex} logical=${w.logical} z=${w.physicsZ} moving=${w.isMoving} mapValid=${w.mapValid} logicalValid=${w.logicalValid} collapsing=${w.collapsing} hp=${w.hp} deathTimer=${w.deathTimer}`);
    for (const w of sink.worst) console.log(`      worst: ${w.biome}/${w.seed} agent=${w.agent} f=${w.frame} hex=${w.q},${w.r} (logical ${w.logicalQ},${w.logicalR}) unitTy=${w.unitTy} tileTop=${w.tileTopY} delta=${w.delta} moving=${w.isMoving} progress=${w.moveProgress} tileTh=${w.tileTh} unitTh=${w.unitTh}`);
}
if (DO_FLICKER) {
    const ds = battles.map((r) => r.decalStats);
    const sum = (k) => ds.reduce((a, d) => a + d[k], 0);
    console.log(`DECALS (ground VFX with gHalfH >= DECAL_LIFT_MIN_HALF_H) seen=${sum('decalsSeen')} in ${sum('decalFramesWithDecals')} frames; lifetimes(frames): <=3:${ds.reduce((a, d) => a + d.lifetimeFrames.le3, 0)} 4-10:${ds.reduce((a, d) => a + d.lifetimeFrames.f4to10, 0)} 11-30:${ds.reduce((a, d) => a + d.lifetimeFrames.f11to30, 0)} >30:${ds.reduce((a, d) => a + d.lifetimeFrames.gt30, 0)}; with submit gaps: ${sum('withGaps')}; unit-frames lifted ${sum('liftedUnitFrames')}/${sum('unitFrames')}`);
    const byType = {};
    for (const d of ds) for (const [t, v] of Object.entries(d.byType)) { const x = (byType[t] ||= { count: 0, frames: 0, withGaps: 0 }); x.count += v.count; x.frames += v.frames; x.withGaps += v.withGaps; }
    console.log('  by type: ' + Object.entries(byType).map(([t, v]) => `${t}=${v.count}(${(v.frames / v.count).toFixed(1)}f avg, ${v.withGaps} gapped)`).join('  '));
    console.log(`FLICKER total order flips=${flipsTotal}; oscillation events=${oscTotal} (episodes=${oscEpisodes}, neither op moved >2px: ${oscStatic})`);
    console.log('  group                    pairs  flipped  osc.pairs  events  episodes  static  moved  ties  medGap  drivers');
    for (const g of flickerGroups) {
        if (g.liftEvents) console.log(`      ${g.name}: decalLift events=${g.liftEvents} (unit within 25% of decal edge: ${g.liftEdge}, decal size changed >2%: ${g.liftScaling}, nearest decal switched: ${g.liftDecalSwitch})`);
        console.log(`  ${g.name.padEnd(24)} ${String(g.pairsSeen).padStart(5)} ${String(g.pairsFlipped).padStart(8)} ${String(g.pairsOscillating).padStart(10)} ${String(g.events).padStart(7)} ${String(g.episodes).padStart(9)} ${String(g.staticEvents).padStart(7)} ${String(g.movedEvents).padStart(6)} ${String(g.ties).padStart(5)} ${String(g.medianMinKeyGap ?? '-').padStart(7)}  ${JSON.stringify(g.drivers)}`);
    }
    for (const g of flickerGroups.filter((x) => x.events > 0).slice(0, 6)) {
        for (const e of [...g.exStatic, ...g.exMoved].slice(0, 3)) {
            const [a0, a1, a2] = e.atFrames;
            const f = (d) => `A[y=${d.A.y.toFixed(1)} sb=${d.A.sortBias.toFixed(1)} key=${d.A.sortKey.toFixed(2)} z=${d.A.z.toFixed(1)} g=${d.A.isGround ? 1 : 0} gH=${d.A.gHalfH.toFixed(1)} lift=${d.A.lift.toFixed(0)}] B[y=${d.B.y.toFixed(1)} sb=${d.B.sortBias.toFixed(1)} key=${d.B.sortKey.toFixed(2)} z=${d.B.z.toFixed(1)} g=${d.B.isGround ? 1 : 0} gH=${d.B.gHalfH.toFixed(1)} lift=${d.B.lift.toFixed(0)}] gap=${d.keyGapBminusA}`;
            console.log(`  ${g.name} ${e.pair.join(' vs ')} ${e.run} frames ${e.frames.join('/')} moved=${e.moved.join(',')}`);
            console.log(`      f${e.frames[0]}: ${f(a0)}\n      f${e.frames[1]}: ${f(a1)}\n      f${e.frames[2]}: ${f(a2)}`);
        }
    }
}
console.log(`\nSaved ${join(outDir, 'coord_guard.json')}`);

if (DO_SINK && sink.violations > 0) failures.push(`sink ${sink.violations} violations`);
if (DO_SINK && sink.voidSamples > 0) failures.push(`sink ${sink.voidSamples} over-void samples`);
if (DO_FLICKER && oscTotal > 0) failures.push(`flicker ${oscTotal} oscillation events`);
if (ASSERT && failures.length) {
    console.error(`[ASSERTION FAILED] ${failures.join('; ')}`);
    process.exit(1);
}
if (ASSERT) console.log('[ASSERTION PASSED]');
process.exit(0);
