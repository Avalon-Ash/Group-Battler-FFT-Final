/**
 * Ground drape screenshots (RenderSpec §9): a large ground circle laid over tiles of different heights, and a unit standing
 * on the back half of the circle (pedestal must stay visible and the circle must not paint over a taller front tile).
 *
 * Run: node tools/ui-e2e/ground-drape-shot.mjs [--biome=FOREST] [--fx=FX_ULT_BLUE_TITAN_SMASH] [--at=0.35]
 * Output: tools/ui-e2e/out/ground_drape_<scenario>_<biome>.png
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, START_TEXT } from './lib/perf-common.mjs';
import { startServer, seededHarnessInit } from './lib/coord-probes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'out');
mkdirSync(outDir, { recursive: true });
const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const BIOME = arg('biome', 'FOREST');
const FX = arg('fx', 'FX_ULT_BLUE_AEGIS_IMPACT');
const AT = Number(arg('at', 0.9)); // seconds of battle time after the effect starts
const TAG = arg('tag', '');
const ZOOM = Number(arg('zoom', 1.5));

const { server, port } = await startServer(3213);
const browser = await launchBrowser({ headed: false, unthrottled: false });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(seededHarnessInit);
await page.goto(`http://localhost:${port}/?mute&quality=0`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => window.__stepFrames(10));
await page.getByText(START_TEXT).click();
await page.waitForTimeout(500);
await page.evaluate(() => window.__stepFrames(10));

const scenario = async (name, withUnit) => {
    const info = await page.evaluate(async ({ biome, fx, withUnit, ZOOM }) => {
        const { Team, Role } = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'RANDOMIZE_MAP', w: 12, h: 10, layout: 'FLAT', sceneId: biome, randomizeScene: false });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        e.obstacles.clear();
        // flat board, centre = valid tile nearest the centroid of the island
        const valid = [];
        for (let row = 0; row < e.mapConfig.h; row++) for (let col = 0; col < e.mapConfig.w; col++) {
            const h = HexUtils.offsetToAxial(col, row, e.mapConfig);
            if (e.isValid(h.q, h.r)) { valid.push(h); e.map.setHeight(HexUtils.key(h), 0); }
        }
        const mean = valid.reduce((m, h) => ({ x: m.x + HexUtils.toPx(h.q, h.r, e.mapConfig).x / valid.length, y: m.y + HexUtils.toPx(h.q, h.r, e.mapConfig).y / valid.length }), { x: 0, y: 0 });
        const c = valid.filter((h) => !e.hasObstacle(h.q, h.r)).reduce((best, h) => {
            const p = HexUtils.toPx(h.q, h.r, e.mapConfig);
            const d = Math.hypot(p.x - mean.x, p.y - mean.y);
            return !best || d < best.d ? { ...h, d } : best;
        }, null);
        const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
        const ringOf = (h) => NB.map(([dq, dr]) => ({ q: h.q + dq, r: h.r + dr })).filter((n) => e.isValid(n.q, n.r));
        const px = (h) => HexUtils.toPx(h.q, h.r, e.mapConfig);
        const byY = (list) => [...list].sort((a, b) => px(a).y - px(b).y); // back (small Y) first
        const set = (h, v) => e.map.setHeight(HexUtils.key(h), v);
        // 'heights': circle centre c (h 0), back tiles 48 (plateau behind), side tiles 24, front tiles 0.
        // 'unit_back': the unit stands on c; the circle is centred on c's front neighbour f, whose own front neighbours are taller (36).
        let circle = c, unitSpot = null;
        if (!withUnit) {
            const r6 = byY(ringOf(c));
            for (const h of r6.slice(0, 2)) set(h, 48);
            for (const h of r6.slice(2, 4)) set(h, 24);
        } else {
            const f = byY(ringOf(c)).slice(-1)[0];
            circle = f;
            unitSpot = c;
            for (const h of byY(ringOf(f)).slice(-2)) set(h, 36);
        }
        e.mapVersion++;
        // both teams must exist or the battle ends immediately (victory blur); the dummies stand far from the circle
        const farTiles = [];
        for (let row = 0; row < e.mapConfig.h; row++) for (let col = 0; col < e.mapConfig.w; col++) {
            const h = HexUtils.offsetToAxial(col, row, e.mapConfig);
            if (e.isValid(h.q, h.r) && HexUtils.dist(h, c) >= 5) farTiles.push(h);
        }
        for (const [team, h] of [[Team.BLUE, farTiles[0]], [Team.RED, farTiles[farTiles.length - 1]]]) {
            if (h) cmd({ type: 'PLACE_AGENT', team, q: h.q, r: h.r, hp: 20000, role: Role.TANK });
        }
        let unit = null;
        if (withUnit) {
            cmd({ type: 'PLACE_AGENT', team: Team.BLUE, q: unitSpot.q, r: unitSpot.r, hp: 20000, role: Role.TANK });
            unit = e.agents[e.agents.length - 1];
        }
        e.play();
        for (const a of e.agents) { a.bt = null; a.hp = a.maxHp = 20000; }
        const cp = px(circle);
        const ch = e.getTerrainHeight(circle.q, circle.r);
        e.renderer.camera.snapTo(cp.x, cp.y - ch - 30, ZOOM);
        return { cx: cp.x, cy: cp.y, ch, unit: unit ? { q: unit.q, r: unit.r } : null };
    }, { biome: BIOME, fx: FX, withUnit, ZOOM });

    // let spawn effects / camera settle, then play the circle
    for (let i = 0; i < 200; i++) {
        await page.evaluate(({ cx, cy, ch, zoom }) => {
            window.__TACTICAL_ENGINE__.renderer.camera.snapTo(cx, cy - ch - 30, zoom);
            window.__stepFrames(1);
        }, { ...info, zoom: ZOOM });
    }
    await page.evaluate(({ cx, cy, ch, fx }) => {
        const e = window.__TACTICAL_ENGINE__;
        e.renderer.vfx.playEffect(fx, cx, cy, ch, undefined, ch);
    }, { ...info, fx: FX });
    const frames = Math.round(AT * 60);
    for (let i = 0; i < frames; i++) {
        await page.evaluate(({ cx, cy, ch, zoom }) => {
            window.__TACTICAL_ENGINE__.renderer.camera.snapTo(cx, cy - ch - 30, zoom);
            window.__stepFrames(1);
        }, { ...info, zoom: ZOOM });
    }
    console.log(JSON.stringify(await page.evaluate(() => {
        const e = window.__TACTICAL_ENGINE__;
        const p = e.renderer?.pipeline;
        return { win: e.victory.winningTeam, fin: e.victory.isFinishing, run: e.isRunning, agents: e.agents.length, cam: e.renderer.camera?.x ?? null,
            phase: p?.transitionPhase, t: p?.transitionT, vfx: e.renderer.vfx.state.particles.length, drape: p?.groundDrape?.count, types: [...new Set(e.renderer.vfx.state.particles.map((q) => q.type))].join(','), bt: e.battleTime };
    })));
    const png = await page.screenshot();
    const file = join(outDir, `ground_drape_${name}_${BIOME}${TAG}.png`);
    writeFileSync(file, png);
    console.log(file, JSON.stringify(info));
};

await scenario('heights', false);
await scenario('unit_back', true);
if (errors.length) console.warn('[warn] page errors:', errors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
