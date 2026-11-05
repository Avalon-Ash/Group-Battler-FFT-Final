/** Pack the approved short-legged Blender sheep and copy accepted effect pixels.
 * node tools/assets/blender/pack_status_art.mjs C:/Git/_wt_status_art/docs/status_art
 * The input is read-only. Output is confined to public/assets/cc_bodies.
 * Blender source: render_status_art.py -- <render_dir> --short-legs --sheep-only
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const source = resolve(process.argv[2]);
const output = resolve('public/assets/cc_bodies');
const dirs = ['SE', 'SW', 'NE', 'NW'];
const files = dirs.flatMap(dir => Array.from({ length: 4 }, (_, n) =>
    readFileSync(join(source, 'proto/v3/sheep', `sheep_${dir}_${String(n).padStart(2, '0')}.png`)).toString('base64')));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
    const page = await browser.newPage();
    const packed = await page.evaluate(async files => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
        const g = canvas.getContext('2d');
        const scan = document.createElement('canvas'); scan.width = 384; scan.height = 512;
        const sg = scan.getContext('2d', { willReadFrequently: true });
        const frames = [];
        for (let slot = 0; slot < files.length; slot++) {
            const im = new Image(); im.src = 'data:image/png;base64,' + files[slot]; await im.decode();
            sg.clearRect(0, 0, 384, 512); sg.drawImage(im, 0, 0);
            const pixels = sg.getImageData(0, 0, 384, 512).data;
            let x0 = 384, y0 = 512, x1 = 0, y1 = 0;
            for (let y = 0; y < 512; y++) for (let x = 0; x < 384; x++) if (pixels[(y * 384 + x) * 4 + 3] > 2) {
                x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
            }
            const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.min(128 / w, 128 / h, 0.5);
            const dw = Math.ceil(w * k), dh = Math.ceil(h * k), x = slot % 4 * 128, y = Math.floor(slot / 4) * 128;
            // Identical trim and resampling to the approved v3 prototype.
            g.drawImage(im, x0, y0, w, h, x, y, dw, dh);
            frames.push({ x, y, w: dw, h: dh, ax: (192 - x0) * k, ay: (410 - y0) * k,
                drawW: w / 4, drawH: h / 4, drawX: (x0 - 192) / 4, drawY: (y0 - 410) / 4 });
        }
        return { png: canvas.toDataURL().split(',')[1], frames };
    }, files);
    writeFileSync(join(output, 'sheep-short.png'), Buffer.from(packed.png, 'base64'));
    copyFileSync(join(source, 'v3/accepted-effects.png'), join(output, 'status-effects.png'));
    const manifestPath = join(output, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.types.SHEEP = {
        file: 'sheep-short.png', atlas: { w: 512, h: 512 }, heightHex: 0.7,
        frames: Object.fromEntries(dirs.map((dir, i) => [dir, packed.frames[i * 4]])),
        animationFrames: Object.fromEntries(dirs.map((dir, i) => [dir, packed.frames.slice(i * 4, i * 4 + 4)])),
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
    console.log(JSON.stringify({ frames: packed.frames.length, sheepBytes: 512 * 512 * 4, effectsBytes: 1024 * 384 * 4 }));
} finally {
    await browser.close();
}
