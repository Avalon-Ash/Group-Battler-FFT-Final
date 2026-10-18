/**
 * biome-frames — 各地圖（生物群系）的幀間隔分佈（地形 T1：ICE 極光尖峰的驗收）。
 * 不注入假時鐘：真實 rAF，2560×1440、unthrottled（關垂直同步），量每幀間隔的 median／p99／max 與 >8.4 ms 幀數。
 *   node tools/ui-e2e/biome-frames.mjs [--biomes=ICE,VOID] [--sec=10] [--no-bg=ICE]   (--no-bg：把該地圖的 bgFeature 改 NONE 對照)
 *     -> tools/ui-e2e/out/biome_frames.json
 * 只在主螢幕（RTX）上量；副螢幕（內顯）數字無效（HANDOFF §1）。
 */
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './lib/perf-common.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
const biomes = arg('biomes', 'ICE,VOID,FOREST,MAGMA,DESERT').split(',');
const sec = Number(arg('sec', '10'));
const noBg = new Set(arg('no-bg', '').split(',').filter(Boolean));
const START_TEXT = '啟動戰術模擬';

const server = await createServer({ root, server: { port: 3195, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await launchBrowser({ headed: false, unthrottled: true });
const results = [];
try {
    const page = await browser.newPage({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
    await page.goto(`${server.resolvedUrls.local[0]}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 15000 }).catch(() => {});
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(500);
    const runs = [...biomes.map((b) => [b, false]), ...[...noBg].map((b) => [b, true])];
    for (const [biome, disableBg] of runs) {
        const r = await page.evaluate(async ({ biome, disableBg, sec }) => {
            const mod = await import('/data/scenes.ts');
            const e = window.__TACTICAL_ENGINE__;
            const scene = { ...mod.SCENE_DB.find((x) => x.id === biome) };
            if (disableBg) scene.bgFeature = 'NONE';
            e.currentScene = scene;
            e.map.rebuildMap(e);
            await new Promise((res) => setTimeout(res, 1500)); // 轉場與烘焙暖機
            const gaps = [];
            let last = performance.now();
            await new Promise((res) => {
                const end = last + sec * 1000;
                const tick = (now) => { gaps.push(now - last); last = now; if (now < end) requestAnimationFrame(tick); else res(); };
                requestAnimationFrame(tick);
            });
            gaps.sort((a, b) => a - b);
            const q = (p) => gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))];
            return { frames: gaps.length, median: q(0.5), p99: q(0.99), max: gaps[gaps.length - 1], over8: gaps.filter((g) => g > 8.4).length };
        }, { biome, disableBg, sec });
        const row = { biome: disableBg ? `${biome}(bg NONE)` : biome, ...r };
        results.push(row);
        console.log(`${row.biome.padEnd(16)} frames ${String(r.frames).padStart(6)}  median ${r.median.toFixed(2)}  p99 ${r.p99.toFixed(2)}  max ${r.max.toFixed(1)}  >8.4ms ${r.over8}`);
    }
} finally {
    await browser.close();
    await server.close();
}
mkdirSync(join(root, 'tools', 'ui-e2e', 'out'), { recursive: true });
writeFileSync(join(root, 'tools', 'ui-e2e', 'out', 'biome_frames.json'), JSON.stringify(results, null, 1));
