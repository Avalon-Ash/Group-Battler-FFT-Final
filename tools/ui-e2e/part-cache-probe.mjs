// ╔══════════════════════════════════════════════════════════════════╗
// ║ 職責：真實 rAF 特效壓力情境，連續三輪各 20 秒量測零件快取。      ║
// ║ 用法：node tools/ui-e2e/part-cache-probe.mjs [--large]             ║
// ║ --large 僅在瀏覽器記憶體內放寬上限，不改快取程式或設定檔。       ║
// ║ 輸出：每輪增量 hits/misses/evictions、entries、精確駐留峰值 bytes。║
// ╚══════════════════════════════════════════════════════════════════╝
import { createServer } from 'vite';
import { launchBrowser, prepareManualBattle } from './lib/perf-common.mjs';
import { startVfxStorm, stopVfxStorm } from './lib/vfx-storm.mjs';

const large = process.argv.includes('--large');
const server = await createServer({ server: { host: '127.0.0.1', port: 3196, strictPort: false }, logLevel: 'error' });
let browser;
try {
    await server.listen();
    browser = await launchBrowser({ headed: false });
    const page = await browser.newPage({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
        let seed = 1337;
        Math.random = () => {
            let t = (seed += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    });
    await page.goto(`${server.resolvedUrls.local[0]}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 15000 });
    console.log(JSON.stringify(await page.evaluate(async (large) => {
        const { VFX_PARTS: config } = await import('/data/vfx/parts/partConfig.ts');
        if (large) {
            // Supports the original single limits and the tiered replacement.
            if (config.MAX_BYTES_BY_TIER) {
                config.MAX_BYTES_BY_TIER = [512 * 1024 * 1024, 512 * 1024 * 1024, 96 * 1024 * 1024, 96 * 1024 * 1024];
                config.MAX_ENTRIES_BY_TIER = [4096, 4096, 320, 320];
            } else {
                config.MAX_BYTES = 512 * 1024 * 1024;
                config.MAX_ENTRIES = 4096;
            }
        }
        const { vfxPartStore: store } = await import('/engine/renderers/vfxparts/VFXPartStore.ts');
        const originalGet = store.get;
        window.__partProbe = { peakBytes: store.bytes(), peakEntries: store.size(), store };
        store.get = (...args) => {
            const result = originalGet(...args);
            window.__partProbe.peakBytes = Math.max(window.__partProbe.peakBytes, store.bytes());
            window.__partProbe.peakEntries = Math.max(window.__partProbe.peakEntries, store.size());
            return result;
        };
        return { mode: large ? 'large' : 'configured', maxBytes: config.MAX_BYTES_BY_TIER ?? config.MAX_BYTES, maxEntries: config.MAX_ENTRIES_BY_TIER ?? config.MAX_ENTRIES };
    }, large)));
    await prepareManualBattle(page);
    for (let round = 1; round <= 3; round++) {
        const before = await page.evaluate(() => {
            const p = window.__partProbe;
            p.peakBytes = p.store.bytes();
            p.peakEntries = p.store.size();
            return p.store.stats();
        });
        await startVfxStorm(page);
        await page.waitForTimeout(20000);
        const after = await stopVfxStorm(page);
        const peak = await page.evaluate(() => ({ peakBytes: window.__partProbe.peakBytes, peakEntries: window.__partProbe.peakEntries }));
        console.log(JSON.stringify({ round, evictions: after.parts.evictions - before.evictions, misses: after.parts.misses - before.misses, hits: after.parts.hits - before.hits, entries: after.parts.entries, bytes: after.parts.bytes, ...peak }));
        if (peak.peakBytes > 192 * 1024 * 1024) throw new Error('Working set exceeds 192 MiB; stop per R1 contract');
    }
    if (errors.length) throw new Error(`Page errors: ${errors.join(' | ')}`);
} finally {
    await browser?.close();
    await server.close();
}
