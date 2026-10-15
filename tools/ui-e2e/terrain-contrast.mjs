/**
 * Terrain contrast probe (R1 / T0).
 * Bakes one block per biome with TerrainRenderer.bakeBlock and measures mean luma (Rec.709, sRGB values)
 * of three regions: top face centre, lit side face (drawFace(2,1)) middle, dark side face (drawFace(1,0)) middle.
 * Every biome is measured twice: texture path, and procedural path (terrainTextureStore.isReady patched to false
 * inside the page only; no source change).
 *
 * Run:
 *   node tools/ui-e2e/terrain-contrast.mjs                      -> table + tools/ui-e2e/out/terrain_contrast.json
 *   node tools/ui-e2e/terrain-contrast.mjs --layout=POINTY       -> other hex layout (default FLAT)
 *   node tools/ui-e2e/terrain-contrast.mjs --skin='{"topDetail":{"blend":"overlay","alpha":0.5}}'
 *                                                                -> deep-merge overrides into TERRAIN_SKIN (page only)
 *   node tools/ui-e2e/terrain-contrast.mjs --grid [--name=foo]   -> also screenshot 5 biomes and place them next to the
 *                                                                   13ad34c baseline: out/terrain_r1_grid[_foo].png
 *   --out=<file>  override the JSON output name (default terrain_contrast.json)
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out');
mkdirSync(OUT_DIR, { recursive: true });

const argOf = (name, fallback = null) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
};
const wantGrid = process.argv.includes('--grid');
const layout = argOf('layout', 'FLAT');
const skinOverride = argOf('skin') ? JSON.parse(argOf('skin')) : null;
const gridName = argOf('name');
const jsonName = argOf('out', 'terrain_contrast.json');
const OLD_BASELINE_COMMIT = '13ad34c';
const BIOMES = ['VOID', 'FOREST', 'ICE', 'MAGMA', 'DESERT'];
const START_TEXT = '啟動戰術模擬'; // 啟動戰術模擬

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
    server: { port: 3197, strictPort: false, host: '127.0.0.1' },
    logLevel: 'error',
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();

try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
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
        window.__resetSeed = (s = 1337) => { seed = s; syntheticTime = 1000.0; };
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

    if (skinOverride) {
        await page.evaluate(async (ov) => {
            const { TERRAIN_SKIN } = await import('/constants.ts');
            const merge = (dst, src) => {
                for (const k of Object.keys(src)) {
                    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') merge(dst[k], src[k]);
                    else dst[k] = src[k];
                }
            };
            merge(TERRAIN_SKIN, ov);
        }, skinOverride);
    }

    // ---- contrast measurement (inside the page) ----
    const rows = await page.evaluate(async ({ biomes, layoutName }) => {
        const C = await import('/constants.ts');
        const { TerrainRenderer } = await import('/engine/renderers/grid/TerrainRenderer.ts');
        const { terrainTextureStore } = await import('/engine/renderers/grid/TerrainTextureStore.ts');
        const { HexGeometry } = await import('/engine/graphics/utils/HexGeometry.ts');

        const EXPANSION_BIAS = 0.6; // mirrors TerrainRenderer (renderer-private constant)
        const PEDESTAL_DEPTH = 45;
        const size = C.HEX_SIZE;
        const height = 2 * C.BLOCK_HEIGHT;
        const r = size + EXPANSION_BIAS;
        const vertices = HexGeometry.getVertices(r, true, layoutName);
        const visualTopY = -height;
        const depth = Math.max(PEDESTAL_DEPTH, -visualTopY + 15);

        const factory = (w, h) => {
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            return { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }) };
        };

        const meanRegion = (sprite, cx, cy, half) => {
            const c = sprite.canvas.getContext('2d', { willReadFrequently: true });
            const x0 = Math.round(sprite.anchorX + cx) - half, y0 = Math.round(sprite.anchorY + cy) - half;
            const n = half * 2 + 1;
            const d = c.getImageData(x0, y0, n, n).data;
            let R = 0, G = 0, B = 0, A = 0;
            for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; A += d[i + 3]; }
            const cnt = n * n;
            R /= cnt; G /= cnt; B /= cnt; A /= cnt;
            return { rgb: [R, G, B].map((v) => +v.toFixed(2)), luma: +(0.2126 * R + 0.7152 * G + 0.0722 * B).toFixed(3), alpha: +A.toFixed(1) };
        };
        const faceMid = (a, b) => ({
            x: (vertices[a].x + vertices[b].x) / 2,
            y: (vertices[a].y + vertices[b].y) / 2 + (visualTopY + depth) / 2,
        });

        const out = [];
        for (const biome of biomes) {
            const theme = C.TERRAIN_THEMES[biome];
            for (const path of ['texture', 'procedural']) {
                if (path === 'procedural') terrainTextureStore.isReady = () => false;
                else delete terrainTextureStore.isReady;
                const sprite = TerrainRenderer.bakeBlock(factory, size, height, theme, biome, layoutName, 0, 0, 1);
                delete terrainTextureStore.isReady;
                const top = meanRegion(sprite, 0, visualTopY, 4);
                const lp = faceMid(2, 1), dp = faceMid(1, 0);
                const light = meanRegion(sprite, lp.x, lp.y, 3);
                const dark = meanRegion(sprite, dp.x, dp.y, 3);
                out.push({
                    biome, path, topRgb: top.rgb, themeTop: theme.top,
                    top: top.luma, lightSide: light.luma, darkSide: dark.luma,
                    lightOverTop: +(light.luma / top.luma).toFixed(3),
                    darkOverTop: +(dark.luma / top.luma).toFixed(3),
                    minAlpha: Math.min(top.alpha, light.alpha, dark.alpha),
                });
            }
        }
        return out;
    }, { biomes: BIOMES, layoutName: layout });

    const pad = (s, n) => String(s).padEnd(n);
    console.log(`\nlayout=${layout}${skinOverride ? ` skin=${JSON.stringify(skinOverride)}` : ''}`);
    console.log([pad('biome', 8), pad('path', 11), pad('top', 8), pad('lightSide', 10), pad('darkSide', 9), pad('light/top', 10), 'dark/top'].join(' | '));
    for (const r of rows) {
        console.log([pad(r.biome, 8), pad(r.path, 11), pad(r.top.toFixed(1), 8), pad(r.lightSide.toFixed(1), 10), pad(r.darkSide.toFixed(1), 9), pad(r.lightOverTop.toFixed(3), 10), r.darkOverTop.toFixed(3)].join(' | '));
    }
    console.log('\nacceptance (texture vs procedural x1.15):');
    let allOk = true;
    for (const b of BIOMES) {
        const t = rows.find((x) => x.biome === b && x.path === 'texture');
        const p = rows.find((x) => x.biome === b && x.path === 'procedural');
        const okL = t.lightOverTop <= p.lightOverTop * 1.15;
        const okD = t.darkOverTop <= p.darkOverTop * 1.15;
        if (!okL || !okD) allOk = false;
        console.log(`  ${pad(b, 8)} light ${t.lightOverTop} <= ${(p.lightOverTop * 1.15).toFixed(3)} ${okL ? 'ok' : 'NO'} | dark ${t.darkOverTop} <= ${(p.darkOverTop * 1.15).toFixed(3)} ${okD ? 'ok' : 'NO'} | top rgb ${t.topRgb.map((v) => v.toFixed(0)).join(',')} vs theme.top ${t.themeTop}`);
    }
    console.log(`acceptance: ${allOk ? 'PASS' : 'FAIL'}`);
    writeFileSync(join(OUT_DIR, jsonName), JSON.stringify({ layout, skinOverride, accept: allOk, rows }, null, 2));
    console.log(`wrote ${join(OUT_DIR, jsonName)}`);

    // ---- optional grid: new render vs 13ad34c baseline ----
    if (wantGrid) {
        await page.getByText(START_TEXT).click();
        await page.waitForTimeout(400);
        await page.evaluate(() => window.__stepFrames(10));
        const tag = gridName ? `_${gridName}` : '';
        const newPaths = [];
        const oldPaths = [];
        for (const sid of BIOMES) {
            const dataUrl = await (async () => {
                await page.evaluate(async (sceneId) => {
                    window.__resetSeed(1337);
                    const mod = await import('/data/scenes.ts');
                    const { TerrainRenderer } = await import('/engine/renderers/grid/TerrainRenderer.ts');
                    TerrainRenderer.store.clear();
                    const e = window.__TACTICAL_ENGINE__;
                    e.currentScene = mod.SCENE_DB.find((x) => x.id === sceneId);
                    e.map.rebuildMap(e);
                }, sid);
                await page.evaluate(() => window.__stepFrames(30));
                return page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
            })();
            const np = join(OUT_DIR, `_grid_new_${sid}.png`);
            writeFileSync(np, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
            newPaths.push(np);
            const op = join(OUT_DIR, `_grid_old_${sid}.png`);
            const oldBuf = execFileSync('git', ['show', `${OLD_BASELINE_COMMIT}:tools/ui-e2e/baseline/fidelity/${sid}.png`], { maxBuffer: 64 * 1024 * 1024 });
            writeFileSync(op, oldBuf);
            oldPaths.push(op);
        }
        const outPng = join(OUT_DIR, `terrain_r1_grid${tag}.png`);
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
            '    d.text((6, i * h + 6), names[i] + " old (13ad34c)", fill=(255, 255, 255))',
            '    d.text((w + 6, i * h + 6), names[i] + " new", fill=(255, 255, 255))',
            'sheet.save(out)',
        ].join('\n');
        execFileSync('python', ['-I', '-c', py, outPng, oldPaths.join('|'), newPaths.join('|'), BIOMES.join('|')]);
        console.log(`wrote ${outPng}`);
    }
    await ctx.close();
} finally {
    await browser.close();
    await server.close();
}
