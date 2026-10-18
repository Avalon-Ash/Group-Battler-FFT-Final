// AOE ground indicator drape check: a caster on high ground channels an AOE whose indicator spans lower tiles.
// The indicator must lie on each tile top (not cut by same-height tiles in front, not floating over lower ones).
// Usage: node tools/ui-e2e/aoe-drape-shot.mjs  -> tools/ui-e2e/out/aoe_drape.png
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const server = await createServer({ root, server: { port: 3218, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await launchBrowser({ headed: false, unthrottled: false });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage();
await page.goto(`http://localhost:${server.config.server.port}/?mute&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
await page.getByText(START_TEXT).click();
await page.waitForTimeout(800);
const info = await page.evaluate(async () => {
    const e = window.__TACTICAL_ENGINE__;
    const { Team, Role, MovementType } = await import('/types.ts');
    const { VisualMath } = await import('/engine/math/VisualMath.ts');
    e.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
    e.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', w: 10, h: 7, layout: 'FLAT', sceneId: 'FOREST', randomizeScene: false });
    e.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
    e.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: false });
    const hexes = [...e.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r, h: e.getTerrainHeight(q, r) }; })
        .filter((x) => !e.hasObstacle(x.q, x.r));
    hexes.sort((a, b) => b.h - a.h);
    const hi = hexes[0];
    const lo = hexes.filter((x) => x.h <= hi.h - 48 && Math.abs(x.q - hi.q) + Math.abs(x.r - hi.r) <= 6 && Math.abs(x.q - hi.q) + Math.abs(x.r - hi.r) >= 3)[0] || hexes[hexes.length - 1];
    e.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: hi.q, r: hi.r, hp: 800, role: Role.MAGE });
    e.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.RED, q: lo.q, r: lo.r, hp: 800, role: Role.WARRIOR });
    const [a, b] = e.agents;
    for (const x of e.agents) x.hp = x.maxHp = 999999;
    e.play();
    await new Promise((r) => setTimeout(r, 1800)); // spawn animation, flyer reaches hover height
    e.state.time.timeScale = e.state.time.targetTimeScale = 0;
    await new Promise((r) => setTimeout(r, 200));
    const vfx = e.renderer.vfx;
        const sk = { ...a.skills[0], type: 'AOE', aoeRadius: 2, cast: 2, tag: 'ACTIVE' };
    a.skills[0] = sk; a.castingSkillIdx = 0; a.castTimer = 0.4;
    a.movementType = MovementType.GROUND;
    e.renderer.camera.snapTo(a.px, a.py - e.getTerrainHeight(a.q, a.r), 1.8);
    return { hi, lo, flyerZ: a.physics.z, a: [a.q, a.r], b: [b.q, b.r] };
});
await page.waitForTimeout(700);
await page.screenshot({ path: join(outDir, 'aoe_drape.png') });
console.log(JSON.stringify(info));
await browser.close(); await server.close(); process.exit(0);
