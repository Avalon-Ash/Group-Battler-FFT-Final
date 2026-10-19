/**
 * obstacle-sheet-dump.mjs — 把障礙物循環影格（OBSTACLE_SPRITE.ANIM：風擺、閃光、發光）攤成一張對照圖（VISUAL_ROADMAP O3）。
 *   node tools/ui-e2e/obstacle-sheet-dump.mjs [--types=TREE,ICE_CRYSTAL,OBSIDIAN_PILLAR] [--steps=6]
 *     -> tools/ui-e2e/out/obstacles/anim_sheet.png（每列一種、每欄一個時間點，深色底）
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const TYPES = arg('types', 'TREE,ICE_CRYSTAL,OBSIDIAN_PILLAR').split(',');
const STEPS = Number(arg('steps', '6'));
const OUT = path.join(root, 'tools/ui-e2e/out/obstacles');
fs.mkdirSync(OUT, { recursive: true });

const server = await createServer({ root, server: { port: 3199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser = null;
try {
    await server.listen();
    for (const channel of ['msedge', 'chrome']) {
        try { browser = await chromium.launch({ channel, headless: true }); break; } catch { /* next */ }
    }
    if (!browser) throw new Error('No Edge/Chrome found.');
    const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
    await page.goto(`${server.resolvedUrls.local[0]}?mute`, { waitUntil: 'networkidle' });
    const url = await page.evaluate(async ({ types, steps }) => {
        const { obstacleSpriteStore } = await import('/engine/renderers/grid/ObstacleSpriteStore.ts');
        const { OBSTACLE_SPRITE } = await import('/constants.ts');
        await obstacleSpriteStore.readyPromise;
        const cell = { w: 180, h: 220 }, scale = 1.4;
        const c = document.createElement('canvas');
        c.width = cell.w * steps; c.height = cell.h * types.length;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#1e2433'; ctx.fillRect(0, 0, c.width, c.height);
        types.forEach((type, row) => {
            const period = OBSTACLE_SPRITE.ANIM[type]?.period ?? 1;
            for (let i = 0; i < steps; i++) {
                const t = (i / steps) * period;
                // 固定格子 (0,0)：相位固定，只看時間
                const s = obstacleSpriteStore.get(type, 'POINTY', 0, 0, t);
                if (!s) continue;
                const x = i * cell.w + cell.w / 2, y = row * cell.h + cell.h - 30;
                ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
                if (s.sw !== undefined) ctx.drawImage(s.image, s.sx, s.sy, s.sw, s.sh, -s.anchorX, -s.anchorY, s.width, s.height);
                else ctx.drawImage(s.image, -s.anchorX, -s.anchorY, s.width, s.height);
                if (s.overlay && s.overlay.alpha > 0) { ctx.globalAlpha = s.overlay.alpha; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(s.overlay.image, s.overlay.x, s.overlay.y, s.overlay.width, s.overlay.height); }
                ctx.restore();
            }
        });
        return c.toDataURL('image/png');
    }, { types: TYPES, steps: STEPS });
    const file = path.join(OUT, 'anim_sheet.png');
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(file);
} finally {
    if (browser) await browser.close();
    await server.close();
}
