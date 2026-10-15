// Terrain ambience cost probe: per-biome A/B cost of surface detail, liquid and weather particles.
// Headed 2560x1440 unthrottled on the main GPU, terrain only (no units).
// Usage: node tools/ui-e2e/terrain-cost.mjs [--out=terrain_cost.json] [--compare=terrain_cost_T0.json]
//   env: TC_SECONDS (default 5), TC_ROUNDS (default 3), TC_BIOMES (comma list)
import { createServer } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, getEnvInfo, assertMainGpu, START_TEXT } from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(here, 'out');
const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const SECONDS = Number(process.env.TC_SECONDS || 5);
const ROUNDS = Number(process.env.TC_ROUNDS || 3);
const BIOMES = (process.env.TC_BIOMES || 'VOID,FOREST,ICE,MAGMA,DESERT').split(',');
const TOGGLES = ['baseline', 'no_detail', 'no_liquid', 'no_ambience', 'no_surface', 'no_all'];
const outPath = join(outDir, arg('out', 'terrain_cost.json'));
const comparePath = arg('compare', null);

const stats = (d) => {
    const s = [...d].sort((a, b) => a - b);
    const p = (q) => s[Math.min(s.length - 1, Math.floor((q / 100) * (s.length - 1)))];
    return { n: s.length, median: +p(50).toFixed(3), p99: +p(99).toFixed(3), over8_4: s.filter((v) => v > 8.4).length };
};

const server = await createServer({ root, server: { port: 3207, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await launchBrowser({ headed: true, unthrottled: true });
const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`http://localhost:${port}/?quality=0&mute`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 15000 }).catch(() => {});
const env = await getEnvInfo(page, true);
console.log('GPU', env.gpu, 'viewport', env.viewport);
assertMainGpu(env);
await page.getByText(START_TEXT).click();
await page.waitForTimeout(800);

await page.evaluate(async () => {
    window.__t = {};
    window.__self = { detail: 0, liquid: 0 };
    const tr = (await import('/engine/renderers/grid/TerrainRenderer.ts')).TerrainRenderer;
    const od = tr.drawTerrainDetail;
    tr.drawTerrainDetail = function (...a) {
        if (window.__t.no_detail || window.__t.no_surface || window.__t.no_all) return;
        const t0 = performance.now(); const r = od.apply(this, a); window.__self.detail += performance.now() - t0; return r;
    };
    const sp = (await import('/engine/graphics/painters/SurfacePainter.ts')).SurfacePainter;
    const ol = sp.drawLiquid;
    sp.drawLiquid = function (...a) {
        if (window.__t.no_liquid || window.__t.no_surface || window.__t.no_all) return;
        const t0 = performance.now(); const r = ol.apply(this, a); window.__self.liquid += performance.now() - t0; return r;
    };
    const amb = (await import('/engine/systems/vfx/VFXAmbience.ts')).VFXAmbience;
    const ou = amb.prototype.update;
    amb.prototype.update = function (...a) {
        if (window.__t.no_ambience || window.__t.no_all) return;
        return ou.apply(this, a);
    };
    // Weather only spawns while the simulation clock runs (simDt > 0), but an agent-less engine would
    // enter the victory phase and stop. Feed the VFX system the real frame delta instead, so weather
    // behaves as in a live battle while the terrain stays the only workload.
    const vs = (await import('/engine/systems/vfx/VFXSystem.ts')).VFXSystem;
    const vu = vs.prototype.update;
    let lastNow = performance.now();
    vs.prototype.update = function (dt, ...rest) {
        const now = performance.now();
        const real = Math.min(0.05, (now - lastNow) / 1000);
        lastNow = now;
        return vu.call(this, dt > 0 ? dt : real, ...rest);
    };
});

const sample = (sec) => page.evaluate((s) => new Promise((res) => {
    const d = []; const selfD = []; const selfL = []; const atmo = [];
    let last = performance.now(); let go = true;
    const loop = (now) => {
        if (!go) return;
        d.push(now - last); last = now;
        selfD.push(window.__self.detail); selfL.push(window.__self.liquid);
        window.__self.detail = 0; window.__self.liquid = 0;
        const ps = window.__TACTICAL_ENGINE__.vfx?.state?.particles ?? [];
        let n = 0; for (const p of ps) if (p.type === 'ATMOSPHERE') n++;
        atmo.push(n);
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    setTimeout(() => { go = false; res({ d: d.slice(3), selfD: selfD.slice(3), selfL: selfL.slice(3), atmo: atmo.slice(3) }); }, s * 1000);
}), sec);

const results = {};
const avg = (a) => +(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(3);
for (const biome of BIOMES) {
    await page.evaluate(async (id) => {
        const mod = await import('/data/scenes.ts');
        const e = window.__TACTICAL_ENGINE__;
        e.currentScene = mod.SCENE_DB.find((x) => x.id === id);
        e.map.rebuildMap(e);
        window.__t = {};
    }, biome);
    await page.waitForTimeout(3000);
    results[biome] = { toggles: {} };
    for (let r = 0; r < ROUNDS; r++) {
        for (const tg of TOGGLES) {
            await page.evaluate((t) => { window.__t = t === 'baseline' ? {} : { [t]: true }; }, tg);
            // weather particles live up to 6 s: let them drain / refill
            await page.waitForTimeout(['baseline', 'no_ambience', 'no_surface', 'no_all'].includes(tg) ? 7000 : 1500);
            const m = await sample(SECONDS);
            const acc = results[biome].toggles[tg] ??= { d: [], selfD: [], selfL: [], atmo: [] };
            acc.d.push(...m.d); acc.selfD.push(...m.selfD); acc.selfL.push(...m.selfL); acc.atmo.push(...m.atmo);
        }
    }
    const t = results[biome].toggles;
    results[biome].atmosphereParticles = avg(t.baseline.atmo);
    for (const tg of TOGGLES) {
        const x = t[tg];
        t[tg] = { frame: stats(x.d), selfDetail: avg(x.selfD), selfLiquid: avg(x.selfL), atmosphere: avg(x.atmo) };
    }
    console.log(`done ${biome}: baseline median ${t.baseline.frame.median} p99 ${t.baseline.frame.p99}, atmosphere ${results[biome].atmosphereParticles}`);
}

// Summary table. cost = baseline - no_all (surface detail + liquid + weather particles);
// surface = baseline - no_surface (surface detail + liquid only, weather left on). Median and p99.
const rows = [];
for (const biome of BIOMES) {
    const t = results[biome].toggles;
    const b = t.baseline.frame; const n = t.no_all.frame; const sf = t.no_surface.frame;
    rows.push({
        biome,
        baselineMedian: b.median, baselineP99: b.p99,
        noAllMedian: n.median, noAllP99: n.p99,
        costMedian: +(b.median - n.median).toFixed(3),
        costP99: +(b.p99 - n.p99).toFixed(3),
        noSurfaceMedian: sf.median, noSurfaceP99: sf.p99,
        surfaceMedian: +(b.median - sf.median).toFixed(3),
        surfaceP99: +(b.p99 - sf.p99).toFixed(3),
        detailSelfMs: t.baseline.selfDetail, liquidSelfMs: t.baseline.selfLiquid,
        atmosphere: results[biome].atmosphereParticles,
    });
}
let ref = null;
if (comparePath && existsSync(join(outDir, comparePath))) ref = JSON.parse(readFileSync(join(outDir, comparePath), 'utf8')).summary;
console.log('\n| biome | base med | base p99 | no_all med | no_all p99 | cost med | cost p99 | nosurf med | surface med | surface p99 | detail ms | liquid ms | atmo n |' + (ref ? ' cost med vs ref | surface med vs ref |' : ''));
console.log('| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |' + (ref ? ' --: | --: |' : ''));
for (const r of rows) {
    const rr = ref?.find((x) => x.biome === r.biome);
    const pct = (a, b) => (b > 0 ? (((a - b) / b) * 100).toFixed(0) + '%' : 'n/a');
    const delta = rr ? ` ${pct(r.costMedian, rr.costMedian)} | ${pct(r.surfaceMedian, rr.surfaceMedian)} |` : '';
    console.log(`| ${r.biome} | ${r.baselineMedian} | ${r.baselineP99} | ${r.noAllMedian} | ${r.noAllP99} | ${r.costMedian} | ${r.costP99} | ${r.noSurfaceMedian} | ${r.surfaceMedian} | ${r.surfaceP99} | ${r.detailSelfMs} | ${r.liquidSelfMs} | ${r.atmosphere} |${delta}`);
}
writeFileSync(outPath, JSON.stringify({ env, summary: rows, results }, null, 2));
console.log('wrote', outPath);
await browser.close();
await server.close();
