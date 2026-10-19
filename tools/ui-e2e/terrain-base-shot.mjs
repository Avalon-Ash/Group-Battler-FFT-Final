/**
 * Terrain foundation (island underside) screenshots: 5 biomes x 2 hex layouts, deterministic harness.
 *
 * Run:
 *   node tools/ui-e2e/terrain-base-shot.mjs --tag=before   -> tools/ui-e2e/out/terrain-base/before_<LAYOUT>_<BIOME>.png
 *   node tools/ui-e2e/terrain-base-shot.mjs --tag=after    -> ... after_*.png, plus a before|after sheet per layout
 *                                                            when the matching before_* files exist
 *   --height=<px>   viewport height (default 720); a taller viewport shows the whole island underside
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out', 'terrain-base');
mkdirSync(OUT_DIR, { recursive: true });

const argOf = (name, fallback = null) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
};
const tag = argOf('tag', 'shot');
const viewH = Number(argOf('height', '720'));
const BIOMES = ['VOID', 'FOREST', 'ICE', 'MAGMA', 'DESERT'];
const LAYOUTS = ['FLAT', 'POINTY'];
const START_TEXT = 'START SIMULATION';

const launchBrowser = async () => {
    const args = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
    if (process.env.E2E_BROWSER_PATH) {
        return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args });
    }
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args }); } catch { /* next */ }
    }
    throw new Error('No Edge/Chrome found. Install one or set E2E_BROWSER_PATH.');
};

const server = await createServer({
    server: { port: 3198, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: viewH }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();

    // Same deterministic harness as render-fidelity.mjs (seeded random, synthetic clock, manual rAF).
    await page.addInitScript(() => {
        let seed = 1337;
        function mulberry32() {
            let t = (seed += 0x6D2B79F5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
        Math.random = mulberry32;
        let syntheticTime = 1000.0;
        window.__resetSeed = (s = 1337) => { window.__TACTICAL_ENGINE__?.seedSimulation?.(s); /* 模擬流與 Math.random 分離，需一併重設 */ seed = s; syntheticTime = 1000.0; };
        Date.now = () => Math.floor(syntheticTime);
        performance.now = () => syntheticTime;
        let rafId = 0;
        const rafCallbacks = new Map();
        window.requestAnimationFrame = (cb) => { const id = ++rafId; rafCallbacks.set(id, cb); return id; };
        window.cancelAnimationFrame = (id) => { rafCallbacks.delete(id); };
        window.__stepFrames = (n = 1) => {
            for (let i = 0; i < n; i++) {
                syntheticTime += 16.666666666666668;
                const callbacks = Array.from(rafCallbacks.entries());
                rafCallbacks.clear();
                for (const [, cb] of callbacks) cb(syntheticTime);
            }
        };
    });

    await page.goto(`${baseUrl}?quality=0&mute`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 15000 });
    await page.waitForFunction(() => window.__TERRAIN_ASSETS_READY__ === true, null, { timeout: 15000 });
    await page.evaluate(() => window.__stepFrames(10));
    await page.getByText(START_TEXT).click();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__stepFrames(10));

    const written = [];
    for (const layout of LAYOUTS) {
        for (const sid of BIOMES) {
            await page.evaluate(async ({ sceneId, layoutName }) => {
                window.__resetSeed(1337);
                const mod = await import('/data/scenes.ts');
                const { TerrainRenderer } = await import('/engine/renderers/grid/TerrainRenderer.ts');
                TerrainRenderer.store.clear();
                const e = window.__TACTICAL_ENGINE__;
                e.mapConfig.layout = layoutName;
                e.currentScene = mod.SCENE_DB.find((x) => x.id === sceneId);
                e.map.rebuildMap(e);
            }, { sceneId: sid, layoutName: layout });
            await page.evaluate(() => window.__stepFrames(30));
            const dataUrl = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
            const p = join(OUT_DIR, `${tag}_${layout}_${sid}.png`);
            writeFileSync(p, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
            written.push(p);
        }
    }
    for (const p of written) console.log(`wrote ${p}`);

    if (tag !== 'before') {
        for (const layout of LAYOUTS) {
            const befores = BIOMES.map((b) => join(OUT_DIR, `before_${layout}_${b}.png`));
            if (!befores.every((p) => existsSync(p))) continue;
            const afters = BIOMES.map((b) => join(OUT_DIR, `${tag}_${layout}_${b}.png`));
            const outPng = join(OUT_DIR, `sheet_${layout}_before_vs_${tag}.png`);
            const py = [
                'import sys',
                'from PIL import Image, ImageDraw',
                'out = sys.argv[1]; olds = sys.argv[2].split("|"); news = sys.argv[3].split("|"); names = sys.argv[4].split("|")',
                'S = 0.6',
                'imgs = [(Image.open(o).convert("RGB"), Image.open(n).convert("RGB")) for o, n in zip(olds, news)]',
                'w = int(imgs[0][0].width * S); h = int(imgs[0][0].height * S)',
                'sheet = Image.new("RGB", (w * 2, h * len(imgs)), (0, 0, 0))',
                'd = ImageDraw.Draw(sheet)',
                'for i, (o, n) in enumerate(imgs):',
                '    sheet.paste(o.resize((w, h), Image.LANCZOS), (0, i * h))',
                '    sheet.paste(n.resize((w, h), Image.LANCZOS), (w, i * h))',
                '    d.text((6, i * h + 6), names[i] + " before", fill=(255, 255, 255))',
                '    d.text((w + 6, i * h + 6), names[i] + " " + sys.argv[5], fill=(255, 255, 255))',
                'sheet.save(out)',
            ].join('\n');
            execFileSync('python', ['-I', '-c', py, outPng, befores.join('|'), afters.join('|'), BIOMES.join('|'), tag]);
            console.log(`wrote ${outPng}`);
        }
    }
} finally {
    await browser.close();
    await server.close();
}
