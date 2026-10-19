/**
 * magic-circle-dump.mjs — 詠唱法陣零件（magicCircle）對照圖：正面與壓扁（等距）各一列，獅心／灰燼、一般／奧義尺寸。
 *   node tools/vfx/magic-circle-dump.mjs [--bg=#1f2a1f] -> tools/ui-e2e/out/vfx/magic_circle.png
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const BG = arg('bg', '#2b3a2b');
const OUT = path.join(root, 'tools/ui-e2e/out/vfx');
fs.mkdirSync(OUT, { recursive: true });

const server = await createServer({ root, server: { port: 3201, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser = null;
try {
    await server.listen();
    for (const channel of ['msedge', 'chrome']) {
        try { browser = await chromium.launch({ channel, headless: true }); break; } catch { /* next */ }
    }
    const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
    await page.goto(`${server.resolvedUrls.local[0]}?mute`, { waitUntil: 'networkidle' });
    const url = await page.evaluate(async (bg) => {
        const { vfxPartStore, drawPart } = await import('/engine/renderers/vfxparts/VFXPartStore.ts');
        const cases = [
            { ramp: 'LION_ARCANE', style: 'LION', r: 48 }, { ramp: 'LION_HOLY', style: 'LION', r: 48 },
            { ramp: 'ASH_FIRE', style: 'ASH', r: 48 }, { ramp: 'ASH_VOID', style: 'ASH', r: 48 },
            { ramp: 'LION_ARCANE', style: 'LION', r: 128 },
        ];
        const cell = 300, scale = 2;
        const c = document.createElement('canvas');
        c.width = cell * cases.length; c.height = cell * 2;
        const ctx = c.getContext('2d');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
        ctx.imageSmoothingQuality = 'high';
        cases.forEach((k, i) => {
            const outer = vfxPartStore.get({ kind: 'magicCircle', radius: k.r, ramp: k.ramp, layer: 'outer', style: k.style, seed: 1 });
            const inner = vfxPartStore.get({ kind: 'magicCircle', radius: k.r, ramp: k.ramp, layer: 'inner', style: k.style });
            const fit = k.r > 64 ? 0.55 : 1;
            for (let row = 0; row < 2; row++) {
                ctx.save();
                ctx.translate(i * cell + cell / 2, row * cell + cell / 2);
                ctx.scale(scale * fit, scale * fit);
                const sy = row === 0 ? 1 : 0.5;
                drawPart(ctx, outer, 0, 0, { scaleY: sy, rotation: 0.3, alpha: 0.95, blend: 'screen' });
                drawPart(ctx, inner, 0, 0, { scaleY: sy, rotation: -0.2, alpha: 0.85, blend: 'screen' });
                ctx.restore();
            }
        });
        return c.toDataURL('image/png');
    }, BG);
    const file = path.join(OUT, 'magic_circle.png');
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(file);
} finally {
    if (browser) await browser.close();
    await server.close();
}
