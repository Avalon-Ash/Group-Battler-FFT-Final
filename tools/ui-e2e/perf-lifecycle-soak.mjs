// Lifecycle soak: does the game accumulate objects that are never cleared? EVIDENCE ONLY.
// Phase 1: showcase auto-cycle (random scenes, default zone). Phase 2: manual battles (dice / next level / rematch,
// alternating an aggressive battle-royale shrink with the default zone), each battle played to its end.
// Every SAMPLE_S seconds: forced GC, then JS heap, DOM nodes, live canvases, listeners, timers, rAF rate, audio nodes,
// engine/VFX/HUD/render-list counters, bus listener counts, every registered/exported cache, and a generic census of every
// Map/Set/Array reachable from the engine. Monotonic growth is flagged in the analysis.
// R-group: Tracks console.error with location and http status>=400 errors; non-empty errors result in process.exitCode=1.
// Harness provides GET /favicon.ico -> 204 fixture for browser decoration request.
// Usage: node tools/ui-e2e/perf-lifecycle-soak.mjs [--minutes=11] [--showcase=5] [--sample=10] [--device=desktop|iphone] [--out=perf_lifecycle_soak.json]
//   env: PL_ANALYZE_ONLY=<json file under out/> re-runs only the analysis.
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, getEnvInfo, assertMainGpu, START_TEXT, DICE_TITLE } from './lib/perf-common.mjs';
import { cacheRegistryPlugin, installTrackers, takeFrames, collectSnapshot, frameStats } from './lib/lifecycle-probe.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const MINUTES = Number(arg('minutes', 11));
const SHOWCASE_MIN = Number(arg('showcase', 5));
const SAMPLE_S = Number(arg('sample', 10));
const outFile = join(outDir, arg('out', 'perf_lifecycle_soak.json'));
const NEXT_TEXT = '前進下一關'; // 前進下一關
const REMATCH_TEXT = '再戰一局'; // 再戰一局

// ---------------- analysis ----------------
function flatten(sample) {
    const m = {};
    const put = (k, v) => { if (typeof v === 'number' && Number.isFinite(v)) m[k] = v; };
    const rec = (prefix, o, depth = 0) => {
        if (o === null || typeof o !== 'object' || depth > 4) return;
        for (const [k, v] of Object.entries(o)) {
            if (typeof v === 'number') put(`${prefix}.${k}`, v);
            else if (v && typeof v === 'object' && !Array.isArray(v)) rec(`${prefix}.${k}`, v, depth + 1);
        }
    };
    put('heap.usedAfterGc', sample.heapAfter);
    put('heap.usedBeforeGc', sample.heapBefore);
    put('dom.nodes', sample.dom);
    rec('canvas', sample.canvases);
    rec('listeners', { total: sample.listeners.total });
    for (const [k, v] of Object.entries(sample.listeners.byKey)) put(`listeners.${k}`, v);
    rec('timers', sample.timers);
    rec('audio.created', sample.audio.created);
    put('audio.liveNodes', sample.audio.liveNodes);
    for (const [k, v] of Object.entries(sample.audio.liveByType)) put(`audio.live.${k}`, v);
    put('audio.liveCreatedBufferBytes', sample.audio.liveCreatedBufferBytes);
    rec('cur', sample.curated);
    rec('registry', sample.registry);
    rec('bus', sample.bus);
    rec('cache', sample.caches);
    if (sample.containers) for (const [k, v] of Object.entries(sample.containers)) put(`census.${k}`, v);
    rec('cdp', sample.cdp);
    rec('proc', sample.proc);
    return m;
}

function spearman(ys) {
    const n = ys.length;
    if (n < 5) return 0;
    const rank = (a) => {
        const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
        const r = new Array(n);
        for (let i = 0; i < n;) {
            let j = i;
            while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
            const avg = (i + j) / 2;
            for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
            i = j + 1;
        }
        return r;
    };
    const rx = Array.from({ length: n }, (_, i) => i);
    const ry = rank(ys);
    const mx = (n - 1) / 2;
    const my = ry.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
    return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

function analyze(samples, sampleS) {
    const flat = samples.map(flatten);
    const keys = new Set();
    for (const f of flat) for (const k of Object.keys(f)) keys.add(k);
    const n = samples.length;
    const skip = Math.floor(n * 0.15);
    const third = Math.max(2, Math.floor((n - skip) / 3));
    const rows = [];
    for (const k of keys) {
        const ys = flat.map((f) => f[k] ?? 0);
        const body = ys.slice(skip);
        if (Math.max(...body) === 0) continue;
        const first = body.slice(0, third), last = body.slice(-third), mid = body.slice(third, 2 * third);
        const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
        const floorFirst = Math.min(...first), floorLast = Math.min(...last);
        const maxFirst = Math.max(...first);
        const rho = spearman(body);
        // least squares slope per minute
        const xs = body.map((_, i) => i * sampleS / 60);
        const mx = mean(xs), my = mean(body);
        let num = 0, den = 0;
        for (let i = 0; i < body.length; i++) { num += (xs[i] - mx) * (body[i] - my); den += (xs[i] - mx) ** 2; }
        const slope = den ? num / den : 0;
        const growth = mean(last) - mean(first);
        const rel = mean(first) > 0 ? growth / mean(first) : (growth > 0 ? Infinity : 0);
        const cumulative = /(\.hits|\.misses|\.evictions|\.fallbacks|\.clears|\.bakes|spikeCount|canvas\.created|audio\.created|bakeCount|JSHeapTotalSizeMB)/.test(k);
        const flagged = !cumulative && rho >= 0.6 && floorLast > floorFirst * 1.05 + 1 && mean(last) > mean(mid) * 1.02 && !k.startsWith('cur.cameraZoom') && !k.includes('battleTime');
        rows.push({ key: k, first: ys[0], last: ys[n - 1], max: Math.max(...ys), meanFirst: +mean(first).toFixed(2), meanMid: +mean(mid).toFixed(2), meanLast: +mean(last).toFixed(2), floorFirst, floorLast, maxFirst, rho: +rho.toFixed(2), slopePerMin: +slope.toFixed(3), growth: +growth.toFixed(2), rel: Number.isFinite(rel) ? +rel.toFixed(3) : 'inf', flagged });
    }
    rows.sort((a, b) => Number(b.flagged) - Number(a.flagged) || (typeof b.rel === 'number' ? b.rel : 1e9) - (typeof a.rel === 'number' ? a.rel : 1e9));
    return rows;
}

function report(samples, sampleS) {
    const rows = analyze(samples, sampleS);
    const flagged = rows.filter((r) => r.flagged);
    console.log(`\nSeries analysed: ${rows.length}, flagged (monotonic growth, floor rising, still growing in last third): ${flagged.length}`);
    console.log('| series | first | meanFirst3rd | meanMid3rd | meanLast3rd | floor first->last | max | rho | slope/min |');
    console.log('| :-- | --: | --: | --: | --: | --: | --: | --: | --: |');
    for (const r of flagged.slice(0, 60)) {
        console.log(`| ${r.key} | ${r.first} | ${r.meanFirst} | ${r.meanMid} | ${r.meanLast} | ${r.floorFirst}->${r.floorLast} | ${r.max} | ${r.rho} | ${r.slopePerMin} |`);
    }
    return rows;
}

if (process.env.PL_ANALYZE_ONLY) {
    const d = JSON.parse(readFileSync(join(outDir, process.env.PL_ANALYZE_ONLY), 'utf8'));
    const rows = report(d.samples, d.config.SAMPLE_S);
    writeFileSync(join(outDir, 'perf_lifecycle_analysis.json'), JSON.stringify(rows, null, 2));
    process.exit(0);
}

// ---------------- process memory (browser process tree, Windows) ----------------
async function procMemory(bcdp) {
    try {
        const info = (await bcdp.send('SystemInfo.getProcessInfo')).processInfo;
        const ids = info.map((p) => p.id).join(',');
        const raw = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', `Get-Process -Id ${ids} -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress`], { encoding: 'utf8', timeout: 30000 });
        let rows = JSON.parse(raw);
        if (!Array.isArray(rows)) rows = [rows];
        const byId = new Map(rows.map((r) => [r.Id, r]));
        const out = {};
        for (const p of info) {
            const r = byId.get(p.id);
            if (!r) continue;
            const t = String(p.type).replace(/[^a-z]/gi, '');
            out[`${t}_wsMB`] = +(((out[`${t}_wsMB`] || 0) + r.WorkingSet64 / 1048576)).toFixed(1);
            out[`${t}_privMB`] = +(((out[`${t}_privMB`] || 0) + r.PrivateMemorySize64 / 1048576)).toFixed(1);
        }
        return out;
    } catch (e) {
        return { error: String(e.message).slice(0, 80) };
    }
}

// ---------------- run ----------------
const httpErrors = [];
const meta = {
    fixture: 'GET /favicon.ico returns 204 in this harness only',
};

const faviconFixturePlugin = {
    name: 'audit-favicon-fixture',
    configureServer(vite) {
        // Register before Vite's terminal 404 middleware. This fixture
        // supplies only browser decoration, never app assets.
        vite.middlewares.use((request, response, next) => {
            if (request.method === 'GET' && request.url === '/favicon.ico') {
                response.statusCode = 204;
                response.end();
            } else next();
        });
    },
};

const httpAuditPlugin = {
    name: 'perf-lifecycle-http-audit',
    configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
            res.on('finish', () => {
                if (res.statusCode >= 400) {
                    const method = req.method || 'GET';
                    const url = req.url || '';
                    const status = res.statusCode;
                    if (!httpErrors.some((e) => e.method === method && e.url === url && e.status === status)) {
                        httpErrors.push({ method, url, status });
                    }
                }
            });
            next();
        });
    },
};

const server = await createServer({
    root,
    plugins: [cacheRegistryPlugin(), faviconFixturePlugin, httpAuditPlugin],
    server: { port: 3212, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const port = server.config.server.port;
const browser = await launchBrowser({ headed: true, unthrottled: false, extraArgs: ['--enable-precise-memory-info', '--js-flags=--expose-gc', '--mute-audio'] });
// --device=iphone：iPhone 14 Pro 的視窗、DPR 3、觸控與 UA（量手機版面下的畫布與快取；CPU／GPU 仍是這台電腦）
const DEVICE = arg('device', 'desktop');
const ctx = await browser.newContext(DEVICE === 'iphone'
    ? {
        viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
    }
    : { viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('response', (res) => {
    if (res.status() >= 400) {
        const req = res.request();
        const method = req ? req.method() : 'GET';
        const url = res.url();
        const status = res.status();
        if (!httpErrors.some((e) => e.method === method && e.url === url && e.status === status)) {
            httpErrors.push({ method, url, status });
        }
    }
});
page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
page.on('console', (m) => {
    if (m.type() === 'error') {
        const loc = m.location()?.url;
        errors.push(`console.error: ${m.text()}${loc ? ` (${loc})` : ''}`);
    }
});
await page.addInitScript(installTrackers);
await page.goto(`http://localhost:${port}/?perf&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 30000 }).catch(() => {});
const env = await getEnvInfo(page, false);
console.log('GPU', env.gpu, 'viewport', env.viewport, 'refresh~', env.estimatedRefreshRate);
assertMainGpu(env);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
const bcdp = await browser.newBrowserCDPSession();

// count battle starts / clears without touching the engine source
await page.evaluate(() => {
    const e = window.__TACTICAL_ENGINE__;
    window.__BATTLES = { play: 0, restart: 0, clear: 0, gameOver: 0 };
    const op = e.play.bind(e); e.play = (...a) => { if (!e.isRunning) window.__BATTLES.play++; return op(...a); };
    const orst = e.restart.bind(e); e.restart = (...a) => { window.__BATTLES.restart++; return orst(...a); };
    const oc = e.clear.bind(e); e.clear = (...a) => { window.__BATTLES.clear++; return oc(...a); };
    window.__GOVER = 0;
    e.bus.on('GAME_OVER', () => { window.__BATTLES.gameOver++; });
});

const samples = [];
const t0 = Date.now();
const elapsed = () => (Date.now() - t0) / 1000;
let driverPhase = 'showcase';
let driverDone = false;
let lastRaf = 0;
let lastT = Date.now();

async function sampleOnce(index) {
    const { frames, rafCalls } = await page.evaluate(takeFrames);
    const now = Date.now();
    const snap = await page.evaluate(collectSnapshot, { gc: true, walk: true });
    const m = await cdp.send('Performance.getMetrics');
    const cm = Object.fromEntries(m.metrics.map((x) => [x.name, x.value]));
    snap.cdp = { JSEventListeners: cm.JSEventListeners, Nodes: cm.Nodes, Documents: cm.Documents, Frames: cm.Frames, JSHeapUsedSizeMB: +(cm.JSHeapUsedSize / 1048576).toFixed(1), JSHeapTotalSizeMB: +(cm.JSHeapTotalSize / 1048576).toFixed(1) };
    if (index % 3 === 0) snap.proc = await procMemory(bcdp);
    snap.battles = await page.evaluate(() => ({ ...window.__BATTLES }));
    snap.wallS = +elapsed().toFixed(1);
    snap.phase = driverPhase;
    snap.frame = frameStats(frames);
    const secs = (now - lastT) / 1000;
    snap.rafRate = { appRafPerSec: +((rafCalls - lastRaf) / secs).toFixed(1), framesPerSec: +(frames.length / secs).toFixed(1) };
    lastRaf = rafCalls; lastT = now;
    samples.push(snap);
    const c = snap.curated;
    console.log(`#${String(index).padStart(3)} t=${String(snap.wallS).padStart(6)} ${snap.phase.padEnd(8)} scene=${c.scene} battles=${snap.battles.play}+${snap.battles.restart} agents=${c.agents} part=${c.vfxParticles} heapGC=${(snap.heapAfter / 1048576).toFixed(1)}MB dom=${snap.dom} canv=${snap.canvases.live}/${snap.canvases.created} lst=${snap.listeners.total}/${snap.cdp.JSEventListeners} med=${snap.frame.median} p99=${snap.frame.p99} max=${snap.frame.max} raf/s=${snap.rafRate.appRafPerSec}/${snap.rafRate.framesPerSec}${snap.proc ? ` gpuMB=${snap.proc.gpu_privMB ?? '?'} rendMB=${snap.proc.renderer_privMB ?? '?'}` : ''}`);
    if (index % 6 === 0) writeFileSync(outFile, JSON.stringify({ env, config: { MINUTES, SHOWCASE_MIN, SAMPLE_S }, meta, errors, httpErrors, samples }));
}

async function driver() {
    // Phase 1: showcase cycles by itself.
    await page.waitForTimeout(SHOWCASE_MIN * 60 * 1000);
    driverPhase = 'manual';
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(1000);
    let battle = 0;
    while (elapsed() < MINUTES * 60 - 5) {
        battle++;
        if (battle === 1 || !(await page.getByText(NEXT_TEXT).isVisible().catch(() => false))) {
            const clicked = await page.evaluate((title) => {
                const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.title === title);
                btns.forEach((b) => b.click());
                return btns.length;
            }, DICE_TITLE);
            if (clicked !== 1) { errors.push(`dice matched ${clicked}`); await page.waitForTimeout(2000); continue; }
            await page.waitForTimeout(500);
            await page.evaluate((aggressive) => {
                const e = window.__TACTICAL_ENGINE__;
                e.bus.emit('UI_COMMAND', { type: 'SET_ZONE_CONFIG', config: { enabled: true, initialRadius: 12, shrinkInterval: aggressive ? 4 : 10, minRadius: 1 } });
                e.bus.emit('UI_COMMAND', { type: 'START_GAME' });
            }, battle % 2 === 1);
        } else {
            // overlay is up: alternate "next level" (new random battlefield) and "rematch" (restart path)
            const useRematch = battle % 4 === 0;
            await page.getByText(useRematch ? REMATCH_TEXT : NEXT_TEXT).first().click();
            await page.waitForTimeout(600);
            if (!useRematch) {
                await page.evaluate((aggressive) => {
                    const e = window.__TACTICAL_ENGINE__;
                    e.bus.emit('UI_COMMAND', { type: 'SET_ZONE_CONFIG', config: { enabled: true, initialRadius: 12, shrinkInterval: aggressive ? 4 : 10, minRadius: 1 } });
                    e.bus.emit('UI_COMMAND', { type: 'START_GAME' });
                }, battle % 2 === 1);
            }
        }
        // wait for the battle to end (or time out)
        const startedAt = elapsed();
        while (elapsed() < MINUTES * 60 - 5 && elapsed() - startedAt < 150) {
            await page.waitForTimeout(1000);
            const over = await page.evaluate(() => { const e = window.__TACTICAL_ENGINE__; return !e.isRunning; });
            if (over) break;
        }
        await page.waitForTimeout(2500);
    }
    driverDone = true;
}

const driverPromise = driver().catch((e) => { errors.push(`driver: ${e.message}`); driverDone = true; });
let idx = 0;
const target = MINUTES * 60;
while (elapsed() < target) {
    const nextAt = (idx + 1) * SAMPLE_S;
    const wait = nextAt - elapsed();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait * 1000));
    idx++;
    await sampleOnce(idx);
}
await Promise.race([driverPromise, new Promise((r) => setTimeout(r, 15000))]);

const rows = report(samples, SAMPLE_S);
writeFileSync(outFile, JSON.stringify({ env, config: { MINUTES, SHOWCASE_MIN, SAMPLE_S, SAMPLE_S_: SAMPLE_S }, meta, errors, httpErrors, samples, analysis: rows }));
console.log('errors:', errors.length ? errors.slice(0, 10) : 'none');
console.log('httpErrors:', httpErrors.length ? httpErrors.slice(0, 10) : 'none');
console.log('wrote', outFile);
await browser.close();
await server.close();
if (errors.length > 0 || httpErrors.length > 0) {
    process.exitCode = 1;
}
