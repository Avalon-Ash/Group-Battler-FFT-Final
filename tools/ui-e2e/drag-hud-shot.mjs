// Edit-mode drag preview probe: while a unit is dragged over a hex of a different height, the body (UNIT op),
// the HUD bar anchor and the status body center must all follow the cursor hex (UnitFrame, RenderSpec §4).
// Records the UNIT op draw Y and the BarPainter anchor Y for the dragged unit before / during the drag and saves a screenshot.
// Usage: node tools/ui-e2e/drag-hud-shot.mjs [--biome=FOREST]   -> tools/ui-e2e/out/drag_hud_{rest,drag}.png
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
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
const BIOME = arg('biome', 'FOREST');

const server = await createServer({ root, server: { port: 3213, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
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
    const hexes = [...e.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r, h: e.getTerrainHeight(q, r) }; })
        .filter((h) => !e.hasObstacle(h.q, h.r));
    // the pair (start, cursor) of nearby hexes with the largest height difference
    let best = null;
    for (const a of hexes) for (const b of hexes) {
        if (a === b || HexUtils.dist(a, b) > 3) continue;
        const d = b.h - a.h;
        if (!best || d > best.d) best = { a, b, d };
    }
    e.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: best.a.q, r: best.a.r, hp: 800, role: Role.WARRIOR });
    const { RenderDispatcher } = await import('/engine/renderers/RenderDispatcher.ts');
    const { RenderOpType } = await import('/engine/renderers/RenderList.ts');
    const { BarPainter } = await import('/engine/renderers/hud/BarPainter.ts');
    const rec = (window.__DRAG__ = { unitY: NaN, hudY: NaN });
    const origDispatch = RenderDispatcher.dispatch;
    RenderDispatcher.dispatch = function (c, op, ...rest) {
        if (op.type === RenderOpType.UNIT && op.agent) rec.unitY = op.ty;
        return origDispatch.call(this, c, op, ...rest);
    };
    const origBars = BarPainter.drawUnitBars;
    BarPainter.drawUnitBars = function (c, a, x, anchorY, ...rest) {
        rec.hudY = anchorY;
        return origBars.call(this, c, a, x, anchorY, ...rest);
    };
    for (const a of e.agents) a.spawnTimer = 0; // spawn animation does not advance in edit mode; the HUD skips spawning units
    window.__DRAG_TARGET__ = best.b;
    return { scene: e.currentScene.id, start: best.a, cursor: best.b, agents: e.agents.length };
}, { biome: BIOME });
console.log('setup', JSON.stringify(setup));

const sample = async (label) => {
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ ...window.__DRAG__, z: window.__TACTICAL_ENGINE__.agents[0].physics.z }));
    console.log(label, JSON.stringify(r), 'hud - unit =', (r.hudY - r.unitY).toFixed(3));
    return r;
};

const rest = await sample('rest');
await page.screenshot({ path: join(outDir, 'drag_hud_rest.png') });
await page.evaluate(() => {
    const a = window.__TACTICAL_ENGINE__.agents[0];
    a.dragOverQ = window.__DRAG_TARGET__.q;
    a.dragOverR = window.__DRAG_TARGET__.r;
});
const drag = await sample('drag');
await page.screenshot({ path: join(outDir, 'drag_hud_drag.png') });

// HUD offset from the body must be identical at rest and during the drag (both follow the same ground height)
const ok = Math.abs((rest.hudY - rest.unitY) - (drag.hudY - drag.unitY)) < 1e-6 && Math.abs(drag.unitY - rest.unitY) > 1;
console.log(JSON.stringify({ ok, bodyMoved: drag.unitY - rest.unitY }));
await browser.close();
await server.close();
process.exit(ok ? 0 : 1);
