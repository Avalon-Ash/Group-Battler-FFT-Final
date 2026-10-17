// Floating-biome alignment probe (VOID / MAGMA): units, obstacles and overlays must bob with the tile under them.
// Records, per frame, the draw Y of each unit op and of the TERRAIN op of the hex under its foot
// (RenderDispatcher snap coordinates). On a floating map the difference must stay constant while the tiles bob.
// Usage: node tools/ui-e2e/float-align-probe.mjs [--biome=VOID] [--frames=90] [--shot]
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const BIOME = arg('biome', 'VOID');
const FRAMES = Number(arg('frames', 90));
const SHOT = process.argv.includes('--shot');

const server = await createServer({ root, server: { port: 3212, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const port = server.config.server.port;
const browser = await launchBrowser({ headed: false, unthrottled: false });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`http://localhost:${port}/?mute&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
await page.getByText(START_TEXT).click();
await page.waitForTimeout(800);

const setup = await page.evaluate(async ({ biome }) => {
    const e = window.__TACTICAL_ENGINE__;
    const { Team, Role } = await import('/types.ts');
    const { HexUtils } = await import('/engine/utils.ts');
    e.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
    e.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', w: 10, h: 7, layout: 'FLAT', sceneId: biome, randomizeScene: false });
    e.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
    e.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: false });
    const valid = [...e.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
        .filter((h) => !e.hasObstacle(h.q, h.r) && HexUtils.dist({ q: 0, r: 0 }, h) < 4);
    const roles = [Role.TANK, Role.WARRIOR, Role.RANGER];
    for (let i = 0; i < 3 && i < valid.length; i++) {
        e.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: i % 2 ? Team.RED : Team.BLUE, q: valid[i * 3].q, r: valid[i * 3].r, hp: 800, role: roles[i] });
    }
    const { RenderDispatcher } = await import('/engine/renderers/RenderDispatcher.ts');
    const { RenderOpType } = await import('/engine/renderers/RenderList.ts');
    const rec = (window.__ALIGN__ = { frames: [], cur: null });
    const orig = RenderDispatcher.dispatch;
    RenderDispatcher.dispatch = function (c, op, ...rest) {
        if (!rec.cur) rec.cur = { tiles: {}, units: [] };
        if (op.type === RenderOpType.TERRAIN) rec.cur.tiles[`${op.tq},${op.tr}`] = Math.round(op.ty);
        if (op.type === RenderOpType.UNIT && op.agent) {
            const a = op.agent;
            rec.cur.units.push({ id: a.id, key: `${a.q},${a.r}`, y: Math.round(op.ty), h: op.th });
        }
        return orig.call(this, c, op, ...rest);
    };
    // edit mode does not advance battleTime (the bob clock); drive it here so units stay put while tiles bob
    const tick = () => {
        e.battleTime += 1 / 60;
        if (rec.cur) { rec.frames.push(rec.cur); rec.cur = null; }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return { scene: e.currentScene.id, texture: e.currentScene.textureType, agents: e.agents.length };
}, { biome: BIOME });
console.log('setup', JSON.stringify(setup));

if (SHOT) await page.screenshot({ path: join(outDir, `float_align_${BIOME}_a.png`) });
await page.waitForFunction((n) => window.__ALIGN__.frames.length >= n, FRAMES, { timeout: 60000 });
if (SHOT) {
    await page.waitForTimeout(2100); // about half a bob period (2*pi/1.5 s)
    await page.screenshot({ path: join(outDir, `float_align_${BIOME}_b.png`) });
}
const frames = await page.evaluate(() => window.__ALIGN__.frames);

// per unit: tileY (hex under the logical q,r) - unitY must be constant; tileY itself must move on floating maps
const perUnit = {};
for (const f of frames) {
    for (const u of f.units) {
        const tY = f.tiles[u.key];
        if (tY === undefined) continue;
        (perUnit[u.id] ||= { gaps: new Set(), tileYs: new Set() });
        perUnit[u.id].gaps.add(tY - u.y);
        perUnit[u.id].tileYs.add(tY);
    }
}
const summary = Object.entries(perUnit).map(([id, v]) => ({ id, tileYRange: [Math.min(...v.tileYs), Math.max(...v.tileYs)], distinctGaps: [...v.gaps] }));
const ok = summary.length > 0 && summary.every((s) => s.distinctGaps.length === 1);
const bobbing = summary.some((s) => s.tileYRange[1] > s.tileYRange[0]);
const out = { biome: BIOME, frames: frames.length, ok, bobbing, summary };
writeFileSync(join(outDir, `float_align_${BIOME}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
await server.close();
process.exit(ok ? 0 : 1);
