// Floating-biome alignment probe (VOID / MAGMA): units, obstacles and overlays must bob with the tile under them.
// Records, per frame, the draw Y of each unit op and of the TERRAIN op of the hex under its foot
// (RenderDispatcher snap coordinates). On a floating map the difference must stay constant while the tiles bob.
// The logic lives in lib/coord-probes.mjs (shared with coord-guard.mjs --float).
// Usage: node tools/ui-e2e/float-align-probe.mjs [--biome=VOID] [--frames=90] [--shot]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';
import { startServer, floatSetup, floatCollect, floatAnalyze } from './lib/coord-probes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const BIOME = arg('biome', 'VOID');
const FRAMES = Number(arg('frames', 90));
const SHOT = process.argv.includes('--shot');

const { server, port } = await startServer(3212);
const browser = await launchBrowser({ headed: false, unthrottled: false });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`http://localhost:${port}/?mute&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
await page.getByText(START_TEXT).click();
await page.waitForTimeout(800);

console.log('setup', JSON.stringify(await floatSetup(page, BIOME)));
const frames = await floatCollect(page, FRAMES, { shot: SHOT, shotPath: (s) => join(outDir, `float_align_${BIOME}_${s}.png`) });
const out = floatAnalyze(BIOME, frames);
writeFileSync(join(outDir, `float_align_${BIOME}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
await server.close();
process.exit(out.ok ? 0 : 1);
