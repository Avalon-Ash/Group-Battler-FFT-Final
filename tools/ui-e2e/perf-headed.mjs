/**
 * perf-headed.mjs — Real-browser (headed) performance benchmark.
 * Run: `npm run perf:headed`
 *
 * Measures:
 *   - 5 idle terrain scenes (VOID, FOREST, ICE, MAGMA, DESERT)
 *   - manual_battle (6 units real battle)
 *   - showcase (Showcase cycling + matrix rain)
 *
 * Collects:
 *   - window.devicePixelRatio, screen resolution, GPU renderer string via WEBGL_debug_renderer_info
 *   - rAF frame durations (avg, p95, fps)
 *   - RenderStats phase breakdown (background, world, post, overlay+hud)
 * Output:
 *   - tools/ui-e2e/out/perf_headed.json
 *   - Markdown summary table printed to console
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const SECONDS_PER_SCENARIO = Number(process.env.PERF_SECONDS || 6);
const isHeadless = process.env.PERF_HEADLESS === '1';

const START_TEXT = '\u555f\u52d5\u6230\u8853\u6a21\u64ec'; // 啟動戰術模擬
const DICE_TITLE = '\u96a8\u6a5f\u751f\u6210\u6230\u5834\u8207\u9663\u5bb9'; // 隨機生成戰場與陣容

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: isHeadless, args });
    }
    for (const channel of ['msedge', 'chrome']) {
        try {
            return await chromium.launch({ channel, headless: isHeadless, args });
        } catch {
            // try next
        }
    }
    // Fallback to headless if headed failed
    console.warn('Headed browser launch failed, falling back to headless...');
    for (const channel of ['msedge', 'chrome']) {
        try {
            return await chromium.launch({ channel, headless: true, args });
        } catch {}
    }
    throw new Error('No Edge or Chrome found.');
};

const server = await createServer({
    server: { port: 3195, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = `${server.resolvedUrls.local[0]}?quality=0&perf=1`;
const browser = await launchBrowser();

try {
    const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    console.log(`Connecting to ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Read environment diagnostic info
    const envInfo = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl');
        const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
        const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? 'WebGL supported (no debug info)' : 'WebGL not supported');
        return {
            dpr: window.devicePixelRatio || 1,
            screen: [window.screen.width, window.screen.height],
            viewport: [window.innerWidth, window.innerHeight],
            gpu,
            userAgent: navigator.userAgent,
            isHeadless: !window.chrome && navigator.webdriver,
        };
    });

    console.log('\n================================================================');
    console.log('               PERFORMANCE MEASUREMENT ENVIRONMENT              ');
    console.log('================================================================');
    console.log(`• Device Pixel Ratio (DPR) : ${envInfo.dpr}`);
    console.log(`• Screen Resolution         : ${envInfo.screen[0]} × ${envInfo.screen[1]}`);
    console.log(`• Viewport Size            : ${envInfo.viewport[0]} × ${envInfo.viewport[1]}`);
    console.log(`• GPU Renderer (Diagnostic) : ${envInfo.gpu}`);
    console.log(`• User Agent               : ${envInfo.userAgent.slice(0, 80)}...`);
    console.log(`• Measurement Duration     : ${SECONDS_PER_SCENARIO}s per scenario`);
    console.log('================================================================\n');

    const results = [];

    // Helper to measure rAF frames + RenderStats for SECONDS_PER_SCENARIO seconds
    const measureScenario = async (name) => {
        process.stdout.write(`Measuring [${name.padEnd(14)}] ... `);

        // Reset and start frame collection
        await page.evaluate(() => {
            window.__perfFrames = [];
            window.__perfStop = false;
            let last = performance.now();
            const loop = (t) => {
                window.__perfFrames.push(t - last);
                last = t;
                if (!window.__perfStop) requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        });

        await page.waitForTimeout(SECONDS_PER_SCENARIO * 1000);

        const data = await page.evaluate(async () => {
            window.__perfStop = true;
            const rawFrames = window.__perfFrames.slice(2); // drop first two warmup frames
            const sorted = [...rawFrames].sort((a, b) => a - b);
            const avg = rawFrames.reduce((a, b) => a + b, 0) / Math.max(1, rawFrames.length);
            const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
            const fps = +(1000 / Math.max(0.1, avg)).toFixed(1);

            const { RenderStats } = await import('/engine/renderers/RenderStats.ts');
            const phases = {};
            for (const p of RenderStats.getPhases()) {
                phases[p] = +RenderStats.getPhaseMs(p).toFixed(3);
            }

            return {
                fps,
                avgMs: +avg.toFixed(2),
                p95Ms: +p95.toFixed(2),
                frameCount: rawFrames.length,
                phases,
            };
        });

        console.log(`avg: ${data.avgMs.toFixed(2)}ms (${data.fps} FPS) | p95: ${data.p95Ms.toFixed(2)}ms`);

        results.push({
            name,
            ...data,
        });
    };

    // 1. Measure 5 Idle Scenes
    const sceneIds = ['VOID', 'FOREST', 'ICE', 'MAGMA', 'DESERT'];
    for (const sid of sceneIds) {
        await page.evaluate(async (targetId) => {
            const mod = await import('/data/scenes.ts');
            const e = window.__TACTICAL_ENGINE__;
            const s = mod.SCENE_DB.find((x) => x.id === targetId);
            if (s && e) {
                e.currentScene = s;
                e.map.rebuildMap(e);
            }
        }, sid);
        await page.waitForTimeout(1000);
        await measureScenario(sid);
    }

    // 2. Measure manual_battle
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.locator(`button[title="${DICE_TITLE}"]`).click({ force: true });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        e?.play();
    });
    await page.waitForTimeout(1000);
    await measureScenario('manual_battle');

    // 3. Measure showcase (fresh page starts in showcase mode)
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await measureScenario('showcase');

    // Build Markdown Output Table
    let md = '';
    md += '### 真機／Headed 效能量測基準對照表\n\n';
    md += `> **環境資訊**：DPR ${envInfo.dpr} | 解析度 ${envInfo.screen[0]}×${envInfo.screen[1]} | 模式: ${isHeadless ? 'Headless' : 'Headed'}\n`;
    md += `> **GPU**: \`${envInfo.gpu}\`\n\n`;
    md += '| 場景 / 模式 | 平均幀耗時 (avgMs) | 等效幀率 (FPS) | p95 幀耗時 | Background | World | Post | Overlay+HUD |\n';
    md += '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n';

    for (const r of results) {
        const bg = r.phases['background'] !== undefined ? `${r.phases['background'].toFixed(3)}ms` : '-';
        const world = r.phases['world'] !== undefined ? `${r.phases['world'].toFixed(3)}ms` : '-';
        const post = r.phases['post'] !== undefined ? `${r.phases['post'].toFixed(3)}ms` : '-';
        const hud = r.phases['overlay+hud'] !== undefined ? `${r.phases['overlay+hud'].toFixed(3)}ms` : '-';
        md += `| **\`${r.name}\`** | **${r.avgMs.toFixed(2)} ms** | ${r.fps} FPS | ${r.p95Ms.toFixed(2)} ms | ${bg} | ${world} | ${post} | ${hud} |\n`;
    }

    console.log('\n\n' + md);

    const outJson = {
        timestamp: new Date().toISOString(),
        env: envInfo,
        results,
        markdown: md,
    };

    const outPath = join(OUT_DIR, 'perf_headed.json');
    writeFileSync(outPath, JSON.stringify(outJson, null, 2));
    console.log(`\nResults written to: ${outPath}\n`);

} finally {
    await browser.close();
    await server.close();
}
