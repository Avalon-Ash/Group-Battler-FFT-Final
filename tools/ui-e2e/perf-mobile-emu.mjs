// ╔════════════════════════════════════════════════════════════════════╗
// ║ 職責：R5 手機版面／CPU 模擬量測；真實 rAF、自適應品質，不設門檻。
// ║ 用法：node tools/ui-e2e/perf-mobile-emu.mjs --cpu=4 --seconds=60
// ║       [--out=tools/ui-e2e/out/perf_mobile_emu.json] [--headed]
// ║ 使用 Vite dev server，便於讀既有模組；程序 Private 絕對值可能約
// ║ 2 GB，只比較差值。預設 headless；headed 幀時間較接近實機。
// ║ 只模擬 CPU 降速、393×852／DPR 3／觸控版面；不模擬手機 GPU、
// ║ WebKit、iOS 記憶體回收。UA 不會把 Chromium 變成 iOS Chrome。
// ║ 壓力段沿用 multi 八招，停用 AI／打斷／縮圈，0/15/30/45 秒重放。
// ║ 畫布用 WeakRef 統計（含脫離 DOM 的快取，不強制 GC）；程序／heap
// ║ 每約 2 秒取樣，峰值是觀測峰值；粒子每 rAF 取樣，平均為幀平均。
// ╚════════════════════════════════════════════════════════════════════╝
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, getEnvInfo, prepareManualBattle } from './lib/perf-common.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (key, fallback) => process.argv.find((a) => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback;
const cpu = Number(arg('cpu', 4));
const seconds = Number(arg('seconds', 60));
const headed = process.argv.includes('--headed');
const out = resolve(root, arg('out', 'tools/ui-e2e/out/perf_mobile_emu.json'));
if (!Number.isFinite(cpu) || cpu < 1 || !Number.isFinite(seconds) || seconds <= 0) throw new Error('cpu must be >= 1; seconds must be > 0');
const exec = promisify(execFile);
const errors = [], unavailable = [], results = [];
let memoryFailures = 0;
async function procMemory(cdp) {
    if (memoryFailures >= 2) return null;
    try {
        const info = (await cdp.send('SystemInfo.getProcessInfo')).processInfo;
        const ids = info.map((p) => Number(p.id));
        if (!ids.length || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw new Error('Invalid process IDs');
        const { stdout } = await exec('powershell', ['-NoProfile', '-NonInteractive', '-Command', `Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | Select-Object Id,PrivateMemorySize64 | ConvertTo-Json -Compress`], { timeout: 10000, windowsHide: true });
        const parsed = JSON.parse(stdout);
        const rows = Array.isArray(parsed) ? parsed : [parsed];
        const sum = (type) => {
            const matching = info.filter((p) => p.type === type).map((p) => rows.find((r) => r.Id === p.id)).filter(Boolean);
            return matching.length ? matching.reduce((s, r) => s + r.PrivateMemorySize64, 0) / 1048576 : null;
        };
        return { rendererMB: sum('renderer'), gpuMB: sum('GPU') ?? sum('gpu') };
    } catch (e) {
        unavailable.push(`procMemory attempt ${++memoryFailures}: ${e.message}`);
        return null;
    }
}
const summary = (values) => {
    const valid = values.filter((x) => Number.isFinite(x));
    return { start: values[0] ?? null, peak: valid.length ? Math.max(...valid) : null, end: values.at(-1) ?? null };
};
const round = (n) => n == null ? 'n/a' : n.toFixed(2);
const triple = (s) => [s.start, s.peak, s.end].map(round).join('/');
const server = await createServer({ root, server: { port: 3225, host: '127.0.0.1', strictPort: false }, logLevel: 'error' });
let browser;
let env;
try {
    await server.listen();
    browser = await launchBrowser({ headed, extraArgs: ['--enable-precise-memory-info', '--mute-audio'] });
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1' });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push({ phase: page.phase ?? 'setup', message: e.message }));
    await page.addInitScript(() => {
        const refs = [];
        const original = document.createElement;
        document.createElement = function (...args) {
            const el = original.apply(this, args);
            if (el instanceof HTMLCanvasElement) refs.push(new WeakRef(el));
            return el;
        };
        window.__mobileCanvases = () => {
            for (let i = refs.length - 1; i >= 0; i--) if (!refs[i].deref()) refs.splice(i, 1);
            return refs.length;
        };
        // Same deterministic random stream for both CPU runs, without replacing time/rAF.
        let seed = 1337;
        Math.random = () => {
            let t = (seed += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await cdp.send('Performance.enable');
    const bcdp = await browser.newBrowserCDPSession();
    await page.goto(`${server.resolvedUrls.local[0]}?mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ && window.__TACTICAL_ENGINE__?.renderer, null, { timeout: 60000 });
    env = await getEnvInfo(page);

    async function measure(name, stress) {
        page.phase = name;
        const errorStart = errors.length;
        const samples = [];
        const snapshot = async () => {
            const metrics = (await cdp.send('Performance.getMetrics')).metrics;
            samples.push({ elapsedS: await page.evaluate(() => window.__mobileMeasure ? (performance.now() - window.__mobileMeasure.start) / 1000 : 0),
                heapMB: (metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? NaN) / 1048576,
                canvases: await page.evaluate(() => window.__mobileCanvases()), proc: await procMemory(bcdp) });
        };
        await page.evaluate(async ({ seconds, stress }) => {
            const { getQualityTier } = await import('/engine/renderers/RenderQuality.ts');
            const e = window.__TACTICAL_ENGINE__;
            const m = window.__mobileMeasure = { start: performance.now(), frames: [], tiers: [{ seconds: 0, tier: getQualityTier() }], particleSum: 0, particlePeak: 0, particleFrames: 0, done: false, casts: [] };
            let last = null, nextCast = 0;
            const loop = (now) => {
                const elapsed = (now - m.start) / 1000;
                if (last !== null && now > last) m.frames.push(now - last);
                last = now;
                const tier = getQualityTier();
                if (tier !== m.tiers.at(-1).tier) m.tiers.push({ seconds: elapsed, tier });
                const n = e.renderer.vfx.state.particles.length;
                m.particleSum += n; m.particleFrames++; m.particlePeak = Math.max(m.particlePeak, n);
                if (elapsed >= seconds) { m.done = true; m.durationS = elapsed; return; }
                if (stress && elapsed >= nextCast) { m.casts.push({ seconds: elapsed, count: window.__mobileCast() }); nextCast += 15; }
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }, { seconds, stress });
        await snapshot();
        while (!(await page.evaluate(() => window.__mobileMeasure.done))) {
            await page.waitForTimeout(2000);
            await snapshot();
        }
        const m = await page.evaluate(() => window.__mobileMeasure);
        const sorted = [...m.frames].sort((a, b) => a - b);
        const slow = sorted.slice(-Math.max(1, Math.ceil(sorted.length * 0.01)));
        const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
        results.push({ name, durationS: m.durationS, fps: 1000 / mean(m.frames), low1Fps: 1000 / mean(slow), p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], frameCount: sorted.length,
            quality: { start: m.tiers[0].tier, end: m.tiers.at(-1).tier, minimumQualityTier: Math.max(...m.tiers.map((t) => t.tier)), transitions: m.tiers, downgrades: m.tiers.filter((t, i) => i && t.tier > m.tiers[i - 1].tier) },
            particles: { peak: m.particlePeak, average: m.particleSum / m.particleFrames }, canvases: summary(samples.map((s) => s.canvases)), heapMB: summary(samples.map((s) => s.heapMB)),
            rendererPrivateMB: summary(samples.map((s) => s.proc?.rendererMB)), gpuPrivateMB: summary(samples.map((s) => s.proc?.gpuMB)), pageErrors: errors.slice(errorStart), casts: m.casts, samples });
    }
    await measure('showcase', false);
    await prepareManualBattle(page);
    await page.evaluate(async () => {
        const e = window.__TACTICAL_ENGINE__;
        const T = await import('/types.ts');
        const { SCENE_DB } = await import('/data/scenes.ts');
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        e.currentScene = SCENE_DB.find((s) => s.id === 'DESERT');
        e.map.rebuildMap(e);
        const picks = ['mb_u1', 'rr_u2', 'wb_u4', 'sb_u4', 'tr_u4', 'mr_u4', 'rb_u2', 'wr_u5'];
        // multi stress fixture: all eight casts must finish despite opposing CC.
        e.combat.breakCast = () => {};
        e.combat.castingEngine.handleInterruption = () => {};
        window.__mobileCast = () => {
            cmd({ type: 'STOP_GAME' });
            cmd({ type: 'CLEAR_BOARD', keepScene: true });
            const free = (q, r) => e.isValid(q, r) && !e.hasObstacle(q, r);
            const ring = [];
            for (let q = -2; q <= 3; q++) for (let r = -2; r <= 2; r++) {
                const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
                if (d >= 1 && d <= 2 && !(q === 1 && r === 0) && free(q, r)) ring.push({ q, r });
            }
            if (ring.length < picks.length || !free(0, 0) || !free(1, 0)) throw new Error('multi placement unavailable');
            picks.forEach((id, i) => cmd({ type: 'PLACE_AGENT', team: e.skillDB.find((s) => s.id === id).team === 1 ? T.Team.RED : T.Team.BLUE, ...ring[i], hp: 999999, role: T.Role.MAGE }));
            cmd({ type: 'PLACE_AGENT', team: T.Team.RED, q: 0, r: 0, hp: 999999, role: T.Role.TANK });
            cmd({ type: 'PLACE_AGENT', team: T.Team.BLUE, q: 1, r: 0, hp: 999999, role: T.Role.TANK });
            e.play();
            for (const a of e.agents) { a.bt = null; a.mp = 0; a.spawnTimer = 0; }
            picks.forEach((id, i) => {
                const a = e.agents.find((a) => a.q === ring[i].q && a.r === ring[i].r);
                const sk = e.skillDB.find((s) => s.id === id);
                const foe = e.agents.find((x) => x.team !== a.team && ((x.q === 0 && x.r === 0) || (x.q === 1 && x.r === 0)));
                a.skillIds = [id, null, null]; a.skills = [sk, null, null]; a.mp = a.maxMp; a.target = foe; a.targetHex = { q: foe.q, r: foe.r };
            });
            let count = 0;
            for (let i = 0; i < picks.length; i++) {
                const a = e.agents.find((a) => a.q === ring[i].q && a.r === ring[i].r);
                e.initiateCast(a, 0); count++;
            }
            e.renderer.processVisualEvents(e.events.splice(0));
            return count;
        };
    });
    await measure('eight-ults', true);
} catch (e) {
    errors.push({ phase: 'harness', message: e.stack ?? String(e) });
} finally {
    if (browser) await browser.close();
    await server.close();
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ config: { cpu, seconds, headed, server: 'vite-dev', seed: 1337, processSampleSeconds: 2 }, env, unavailable, errors, results }, null, 2));
console.log('| scenario | FPS avg / 1% low | p95 ms | tier start/end/worst | downgrade seconds:tier | particles peak/avg | canvas S/P/E | heap MB S/P/E | renderer Private MB S/P/E | GPU Private MB S/P/E | errors |');
console.log('| :-- | --: | --: | :-- | :-- | --: | :-- | :-- | :-- | :-- | --: |');
for (const r of results) console.log(`| ${r.name} | ${round(r.fps)} / ${round(r.low1Fps)} | ${round(r.p95Ms)} | ${r.quality.start}/${r.quality.end}/${r.quality.minimumQualityTier} | ${r.quality.downgrades.map((t) => `${round(t.seconds)}:${t.tier}`).join(', ') || 'none'} | ${r.particles.peak}/${round(r.particles.average)} | ${triple(r.canvases)} | ${triple(r.heapMB)} | ${triple(r.rendererPrivateMB)} | ${triple(r.gpuPrivateMB)} | ${r.pageErrors.length} |`);
console.log(`JSON: ${out}`);
if (unavailable.length) console.warn(unavailable.join('\n'));
if (errors.length) { console.error(JSON.stringify(errors)); process.exitCode = 1; }
