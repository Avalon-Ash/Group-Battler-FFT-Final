// Beam alignment check: a flying caster on high ground beams a target on low ground (and the reverse).
// The beam must start at the caster's projection center and end at the target's projection center.
// On floating biomes (VOID/MAGMA) the tiles bob, so the check samples several frames: both beam ends must stay on the bobbing projection centers.
// Usage: node tools/ui-e2e/beam-align-shot.mjs [--biome=FOREST|VOID|MAGMA] [--samples=8]  -> tools/ui-e2e/out/beam_align[_<biome>].png
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
const BIOME = arg('biome', 'FOREST').toUpperCase();
const SAMPLES = Number(arg('samples', 8));
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const server = await createServer({ root, server: { port: 3217, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await launchBrowser({ headed: false, unthrottled: false });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage();
await page.goto(`http://localhost:${server.config.server.port}/?mute&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
await page.getByText(START_TEXT).click();
await page.waitForTimeout(800);
const info = await page.evaluate(async (BIOME) => {
    const e = window.__TACTICAL_ENGINE__;
    const { Team, Role, MovementType } = await import('/types.ts');
    const { VisualMath } = await import('/engine/math/VisualMath.ts');
    e.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
    e.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', w: 10, h: 7, layout: 'FLAT', sceneId: BIOME, randomizeScene: false });
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
    a.movementType = MovementType.FLYING;
    for (const x of e.agents) x.hp = x.maxHp = 999999;
    e.play();
    await new Promise((r) => setTimeout(r, 1800)); // spawn animation, flyer reaches hover height
    e.state.time.timeScale = e.state.time.targetTimeScale = 0;
    await new Promise((r) => setTimeout(r, 200));
    const vfx = e.renderer.vfx;
    vfx.playBeam('GENERIC_BEAM', VisualMath.getCoreAnchor(a, e), VisualMath.getUnitAnchor(b, e), '#ffffff', 60, 1.5, Team.BLUE);
    vfx.playBeam('GENERIC_BEAM', VisualMath.getCoreAnchor(b, e), VisualMath.getUnitAnchor(a, e), '#ff4444', 60, 0.6, Team.RED);
    // numeric check: drawn beam ends vs drawn projection centers (one frame of RenderDispatcher ops)
    const { RenderDispatcher } = await import('/engine/renderers/RenderDispatcher.ts');
    const { RenderOpType } = await import('/engine/renderers/RenderList.ts');
    const { projectionCenterHeight } = await import('/data/units/appearance/projection.ts');
    const { resolveBodyType } = await import('/data/units/appearance/bodyTypes.ts');
    const cap = { beams: [], units: {}, shots: [] };
    const orig = RenderDispatcher.dispatch;
    RenderDispatcher.dispatch = function (c, op, ...rest) {
        if (op.type === RenderOpType.VFX && op.particle && op.particle.type === 'BEAM') {
            const q = op.particle;
            cap.beams.push({ sx: op.tx, sy: op.ty, ex: op.tx + (q.tx - q.sx), ey: op.ty + ((q.ty - q.tz) - (q.sy - q.sz)) + (q.beamEndDy ?? 0) });
        }
        if (op.type === RenderOpType.PROJECTILE) cap.shots.push({ x: op.pVisX, y: op.pVisY });
        if (op.type === RenderOpType.UNIT && op.agent) {
            const ag = op.agent;
            cap.units[ag.id] = { x: op.tx, y: op.ty - ag.physics.z - projectionCenterHeight(resolveBodyType(ag)) };
        }
        return orig.call(this, c, op, ...rest);
    };
    a.target = b;
    e.combat.spawnProjectile(a, e.skillDB.find((sk) => sk.id === 'rb_a2'), e);
    window.__BEAMCAP__ = cap;
    const cam = e.renderer.camera;
    cam.x = cam.targetX = (a.px + b.px) / 2; cam.y = cam.targetY = (a.py + b.py) / 2 - 40;
    cam.zoom = cam.targetZoom = 2.2; cam.manualOverrideTimer = 99;
    return { biome: BIOME, hi, lo, flyerZ: a.physics.z, a: [a.q, a.r], b: [b.q, b.r] };
}, BIOME);
await page.waitForTimeout(700);
const suffix = BIOME === 'FOREST' ? '' : `_${BIOME}`;
await page.screenshot({ path: join(outDir, `beam_align${suffix}.png`) });
// several samples: floating tiles bob over time, so the beam ends must track them in every frame
const samples = [];
for (let i = 0; i < SAMPLES; i++) {
    samples.push(await page.evaluate(() => new Promise((resolve) => {
        const c = window.__BEAMCAP__; c.beams.length = 0; c.shots.length = 0;
        window.__TACTICAL_ENGINE__.battleTime += 0.37; // time scale is 0, so step the float phase by hand
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const us = Object.values(c.units);
            const near = (x, y) => Math.round(Math.min(...us.map((u) => Math.hypot(x - u.x, y - u.y))) * 10) / 10;
            const shot = c.shots.slice(-1)[0];
            resolve({ shotErr: shot ? Math.min(...us.map((u) => Math.round(Math.hypot(shot.x - u.x, shot.y - u.y) * 10) / 10)) : null, ends: c.beams.slice(-2).map((bm) => ({ startErr: near(bm.sx, bm.sy), endErr: near(bm.ex, bm.ey) })), unitY: us.map((u) => Math.round(u.y * 10) / 10) });
        }));
    })));
    await page.waitForTimeout(260);
}
const shotWorst = Math.max(...samples.map((s) => s.shotErr ?? Infinity));
const worst = Math.max(...samples.flatMap((s) => s.ends.flatMap((e) => [e.startErr, e.endErr])));
const ys = samples.map((s) => s.unitY[0]);
const cap = { worstErrPx: worst, projectileLaunchWorstErrPx: shotWorst, unitYRangePx: Math.round((Math.max(...ys) - Math.min(...ys)) * 10) / 10, samples: samples.map((s) => s.ends) };
console.log(JSON.stringify(info), 'nearest projection-center distance per beam end over samples (px):', JSON.stringify(cap));
await browser.close(); await server.close(); process.exit(0);
