// Prepare half-size delivery atlases using the same Canvas high-quality sampling
// as SpriteAtlasStore. Lossless WebP encoding avoids a second lossy RGB pass.
// node tools/assets/blender/prepare_runtime_atlases.mjs [output-directory]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { chromium } from 'playwright-core';

if (process.argv.includes('--help')) {
    console.log('node tools/assets/blender/prepare_runtime_atlases.mjs [output-directory]');
    process.exit(0);
}
const out = resolve(process.argv[2] ?? 'tools/ui-e2e/out/faction-skins-runtime');
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(execFileSync('git', ['show', 'codex/lionheart-warrior-skins:docs/art/faction-animation-v01/manifest.json'], { encoding: 'utf8' }));
manifest.atlasScale = 0.5;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
    const page = await browser.newPage();
    for (const [key, unit] of Object.entries(manifest.units)) {
        const [team, role, body] = key.toLowerCase().split(':');
        const file = basename(unit.file);
        const source = join('tools/ui-e2e/out/faction-animation-v01/packed', team, role, body, file);
        const png = await page.evaluate(async ({ data, width, height }) => {
            const image = new Image();
            image.src = `data:image/webp;base64,${data}`;
            await image.decode();
            if (image.naturalWidth !== width || image.naturalHeight !== height) throw Error('Source dimensions differ from manifest');
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * 0.5);
            canvas.height = Math.round(height * 0.5);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const result = canvas.toDataURL('image/png').split(',')[1];
            canvas.width = canvas.height = 0;
            return result;
        }, { data: readFileSync(source).toString('base64'), width: unit.atlas.w, height: unit.atlas.h });
        const temp = join(out, `${file}.png`);
        writeFileSync(temp, Buffer.from(png, 'base64'));
        execFileSync('python', ['-c', 'from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2], lossless=True, method=6)', temp, join(out, file)]);
        unlinkSync(temp);
        unit.file = file;
        console.log(key);
    }
    writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest) + '\n');
} finally {
    await browser.close();
}
