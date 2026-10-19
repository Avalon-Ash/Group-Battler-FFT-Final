/**
 * idle-quality-soak.mjs — 「放著不動畫面越跑越糊」：觀賞模式閒置 N 分鐘，追蹤畫質階層與粒子數。
 *   node tools/ui-e2e/idle-quality-soak.mjs [--minutes=8] [--sample=15] [--headless]
 * 每 sample 秒記：品質階層（RenderQuality.getQualityTier，2／3 階＝解析度 0.75／0.5，畫面變糊）、
 * 粒子總數與天氣粒子數（Particle.weather）、2 秒內 rAF 幀間隔平均／p95，以及階層變動的時間點。
 * 預設有頭＋高效能 GPU（lib/perf-common.mjs），量的是真實螢幕刷新。結果寫到 out/idle_quality_soak.json。
 */
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const MINUTES = Number(arg('minutes', 8));
const SAMPLE_S = Number(arg('sample', 15));
const HEADLESS = process.argv.includes('--headless');
mkdirSync(join(here, 'out'), { recursive: true });

const server = await createServer({ root, server: { port: 3204, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await launchBrowser({ headed: !HEADLESS });
const samples = [];
try {
    const page = await (await browser.newContext({ viewport: { width: 2560, height: 1440 } })).newPage();
    await page.goto(`${server.resolvedUrls.local[0]}?mute`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
        const rq = await import('/engine/renderers/RenderQuality.ts');
        window.__RQ = rq;
        window.__TIER_LOG = [];
        let last = rq.getQualityTier();
        const t0 = performance.now();
        const watch = () => {
            const t = rq.getQualityTier();
            if (t !== last) { window.__TIER_LOG.push({ s: +((performance.now() - t0) / 1000).toFixed(1), from: last, to: t }); last = t; }
            requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
    });
    const end = Date.now() + MINUTES * 60_000;
    const start = Date.now();
    while (Date.now() < end) {
        await page.waitForTimeout(SAMPLE_S * 1000 - 2000);
        const s = await page.evaluate(() => new Promise((done) => {
            const dts = [];
            let prev = performance.now();
            const stopAt = prev + 2000;
            const tick = (now) => {
                dts.push(now - prev); prev = now;
                if (now < stopAt) requestAnimationFrame(tick);
                else {
                    const e = window.__TACTICAL_ENGINE__;
                    const ps = e?.vfx?.state?.particles ?? [];
                    let weather = 0;
                    const byType = {};
                    for (const p of ps) { if (p.weather) weather++; byType[p.type] = (byType[p.type] || 0) + 1; }
                    const sorted = [...dts].sort((a, b) => a - b);
                    done({
                        tier: window.__RQ.getQualityTier(),
                        particles: ps.length, weather,
                        topTypes: Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 4),
                        agents: e?.agents?.length ?? 0,
                        scene: e?.scene?.id ?? e?.mapConfig?.sceneId ?? null,
                        dtAvg: +(dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(2),
                        dtP95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
                    });
                }
            };
            requestAnimationFrame(tick);
        }));
        s.t = Math.round((Date.now() - start) / 1000);
        samples.push(s);
        console.log(`t=${String(s.t).padStart(4)}s tier=${s.tier} particles=${s.particles} weather=${s.weather} dtAvg=${s.dtAvg} p95=${s.dtP95} agents=${s.agents} top=${JSON.stringify(s.topTypes)}`);
    }
    const tierLog = await page.evaluate(() => window.__TIER_LOG);
    console.log('tier changes:', JSON.stringify(tierLog));
    writeFileSync(join(here, 'out', 'idle_quality_soak.json'), JSON.stringify({ minutes: MINUTES, samples, tierLog }, null, 2));
} finally {
    await browser.close();
    await server.close();
}
