/**
 * sigil-dump.mjs — 技能紋章零件（sigil）對照圖：四種圖騰，正面與壓扁（等距）各一列。
 *   node tools/vfx/sigil-dump.mjs [--bg=#2b3a2b] [--out=sigil] -> tools/ui-e2e/out/vfx/<out>.png
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const BG = arg('bg', '#2b3a2b');
const NAME = arg('out', 'sigil');
const OUT = path.join(root, 'tools/ui-e2e/out/vfx');
fs.mkdirSync(OUT, { recursive: true });

const server = await createServer({ root, server: { port: 3202, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
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
            { ramp: 'LION_HOLY', emblem: 'sun' }, { ramp: 'LION_HOLY', emblem: 'lionShield' },
            { ramp: 'ASH_FIRE', emblem: 'hornSkull' }, { ramp: 'ASH_FIRE', emblem: 'invTriangle' },
        ];
        const cell = 260;
        const c = document.createElement('canvas');
        c.width = cell * cases.length; c.height = cell * 2;
        const ctx = c.getContext('2d');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
        ctx.imageSmoothingQuality = 'high';
        cases.forEach((k, i) => {
            const sp = vfxPartStore.get({ kind: 'sigil', radius: 96, emblem: k.emblem, ramp: k.ramp });
            for (let row = 0; row < 2; row++) {
                ctx.save();
                ctx.translate(i * cell + cell / 2, row * cell + cell / 2);
                drawPart(ctx, sp, 0, 0, { scaleY: row === 0 ? 1 : 0.5, rotation: 0, alpha: 0.9, blend: 'lighter' });
                ctx.restore();
            }
        });
        return c.toDataURL('image/png');
    }, BG);
    const file = path.join(OUT, `${NAME}.png`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(file);
} finally {
    if (browser) await browser.close();
    await server.close();
}
