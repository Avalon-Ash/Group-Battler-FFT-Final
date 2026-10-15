// 輸出特效零件總表截圖（彩色＋灰階，ART_SPEC §11）。
// Usage: node tools/vfx/parts-sheet.mjs [--tier=0]
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from '../ui-e2e/lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(root, 'tools', 'ui-e2e', 'out', 'vfx');
mkdirSync(outDir, { recursive: true });
const tierArg = process.argv.find((a) => a.startsWith('--tier='));
const tier = tierArg ? Number(tierArg.slice(7)) : 0;

const server = await createServer({ root, server: { port: 3213, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await launchBrowser({ headed: false });
const page = await browser.newPage({ viewport: { width: 1100, height: 1600 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
for (const gray of [false, true]) {
    await page.goto(`http://localhost:${port}/tools/vfx/parts-preview.html?tier=${tier}${gray ? '&gray=1' : ''}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__PARTS_READY__, null, { timeout: 15000 });
    const info = await page.evaluate(() => window.__PARTS_READY__);
    const file = join(outDir, `parts_sheet_t${tier}${gray ? '_gray' : ''}.png`);
    await page.locator('#sheet').screenshot({ path: file });
    console.log(file, JSON.stringify(info));
}
// 裁切檢查：大量參數組合烘焙後，最外圈 1px 的 alpha 必須接近 0（否則零件被外框硬切）
const clip = await page.evaluate(async (tierIn) => {
    const m = await import('/engine/renderers/vfxparts/VFXPartStore.ts');
    const store = m.createVFXPartStore(undefined, () => tierIn);
    const edgeMax = (c) => {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const a = (i, j) => d[(j * c.width + i) * 4 + 3];
        let mx = 0;
        for (let i = 0; i < c.width; i++) mx = Math.max(mx, a(i, 0), a(i, c.height - 1));
        for (let j = 0; j < c.height; j++) mx = Math.max(mx, a(0, j), a(c.width - 1, j));
        return mx;
    };
    const specs = [];
    for (const r of [4, 8, 16, 32, 64, 128, 256]) {
        specs.push({ kind: 'glow', radius: r, ramp: 'LION_HOLY' }, { kind: 'glow', radius: r, ramp: 'ASH_FIRE', hard: true });
        for (const t of [4, 8, 16, 32]) {
            if (t > r) continue;
            specs.push({ kind: 'ring', radius: r, thickness: t, ramp: 'ASH_FIRE', roughness: 1, seed: 1 }, { kind: 'ring', radius: r, thickness: t, ramp: 'LION_HOLY' });
            for (const a of [90, 180, 360]) specs.push({ kind: 'slashArc', radius: r, arcDeg: a, thickness: t, ramp: 'LION_PHYSICAL' });
        }
        for (const c of [3, 12, 32]) specs.push({ kind: 'rays', radius: r, count: c, ramp: 'LION_HOLY', lengthJitter: 1, seed: 2 });
        for (const e of ['sun', 'lionShield', 'hornSkull', 'invTriangle']) specs.push({ kind: 'sigil', radius: r, emblem: e, ramp: 'LION_HOLY' });
        specs.push({ kind: 'flame', height: r, ramp: 'ASH_FIRE', jagged: true }, { kind: 'flame', height: r, ramp: 'LION_HOLY' });
        for (let s = 0; s < 4; s++) for (const b of [0, 3, 6]) specs.push({ kind: 'bolt', length: r, branches: b, ramp: 'LION_LIGHTNING', seed: s });
        specs.push({ kind: 'smoke', radius: r, color: 'ASH', roughness: 1, seed: 1 });
        for (const sh of ['crystal', 'rock', 'bone']) specs.push({ kind: 'shard', size: r, shape: sh, ramp: 'LION_ICE' });
        specs.push({ kind: 'spark', length: r, ramp: 'LION_LIGHTNING' }, { kind: 'droplet', size: r, ramp: 'ASH_BLOOD' });
        specs.push({ kind: 'pillar', width: r, height: Math.min(256, r * 2), ramp: 'LION_HOLY' });
    }
    const bad = [];
    for (const sp of specs) {
        const s = store.get(sp);
        const mx = Math.max(...s.frames.map(edgeMax));
        if (mx > 8) bad.push(`${JSON.stringify(sp)} edgeAlpha=${mx}`);
    }
    return { n: specs.length, bad };
}, tier);
console.log(`clip check: ${clip.n} specs, ${clip.bad.length} clipped`);
for (const b of clip.bad) console.log('  CLIPPED', b);
if (errors.length) console.log('PAGE ERRORS', errors);
await browser.close();
await server.close();
