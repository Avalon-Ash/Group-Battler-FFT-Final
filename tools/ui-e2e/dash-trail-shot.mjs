/**
 * Dash / high-speed afterimage screenshots (RenderSpec §10): a real wb_a2 ground dash mid-flight, a knockback-style slide, and a
 * flying unit moving fast. Reads UnitFrame.ghosts to pick the frame where the most ghosts are on screen and prints ghost data.
 *
 * Run: node tools/ui-e2e/dash-trail-shot.mjs [--biome=FOREST] [--zoom=2.2]
 * Output: tools/ui-e2e/out/dash_{ground,knockback,flying}_<biome>.png
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
const ZOOM = Number(arg('zoom', 2.2));

const { server, port } = await startServer(3217);
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

/** Flat board, a unit at the centre and a far dummy for the other team; returns the unit's start info. */
async function setup(kind) {
    return page.evaluate(async ({ biome, kind }) => {
        const { Team, Role, MovementType } = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        cmd({ type: 'STOP_GAME' });
        cmd({ type: 'RANDOMIZE_MAP', w: 12, h: 10, layout: 'FLAT', sceneId: biome, randomizeScene: false });
        cmd({ type: 'CLEAR_BOARD', keepScene: true });
        cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
        cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        e.obstacles.clear();
        const valid = [];
        for (let row = 0; row < e.mapConfig.h; row++) for (let col = 0; col < e.mapConfig.w; col++) {
            const h = HexUtils.offsetToAxial(col, row, e.mapConfig);
            if (e.isValid(h.q, h.r)) { valid.push(h); e.map.setHeight(HexUtils.key(h), 0); }
        }
        e.mapVersion++;
        // a row of tiles that is long enough: pick the valid tile with the most valid tiles at +q
        const lineLen = (h) => { let n = 0; while (e.isValid(h.q + n + 1, h.r)) n++; return n; };
        const start = valid.reduce((b, h) => (!b || lineLen(h) > lineLen(b) ? h : b), null);
        const far = valid.reduce((b, h) => (!b || HexUtils.dist(h, start) > HexUtils.dist(b, start) ? h : b), null);
        cmd({ type: 'PLACE_AGENT', team: Team.RED, q: far.q, r: far.r, hp: 20000, role: Role.TANK });
        const role = kind === 'ground' ? Role.WARRIOR : (kind === 'flying' ? Role.MAGE : Role.WARRIOR);
        cmd({ type: 'PLACE_AGENT', team: Team.BLUE, q: start.q, r: start.r, hp: 20000, role });
        const unit = e.agents[e.agents.length - 1];
        e.play();
        for (const a of e.agents) { a.bt = null; a.hp = a.maxHp = 20000; }
        if (kind === 'flying') unit.movementType = MovementType.FLYING;
        const target = { q: start.q + Math.min(5, lineLen(start)), r: start.r };
        unit.targetHex = target;
        const p = HexUtils.toPx(start.q, start.r, e.mapConfig);
        e.renderer.camera.snapTo(p.x + 90, p.y - 20, 2.2);
        return { id: unit.id, start, target };
    }, { biome: BIOME, kind });
}

async function fire(kind, info) {
    await page.evaluate(async ({ kind, info }) => {
        const e = window.__TACTICAL_ENGINE__;
        const unit = e.agents.find((a) => a.id === info.id);
        if (!e.isRunning) e.play();
        if (kind === 'ground') {
            const { SkillExecutor } = await import('/engine/systems/combat/SkillExecutor.ts');
            const { DEFAULT_SKILL_DB } = await import('/skillDatabase.ts');
            const skill = DEFAULT_SKILL_DB.find((s) => s.id === 'wb_a2');
            new SkillExecutor().executeInstantSkill(unit, skill, e);
        } else {
            // knockback / forced move on a flying unit: the same mechanism as CCManager.calculateKnockback —
            // snap px/py to the destination tile and spring the sprite back through the physics offset
            const { HexUtils } = await import('/engine/utils.ts');
            const steps = kind === 'flying' ? 5 : 3;
            let dest = { q: unit.q, r: unit.r };
            for (let i = 1; i <= steps; i++) if (e.isValid(unit.q + i, unit.r)) dest = { q: unit.q + i, r: unit.r };
            const from = { x: unit.px, y: unit.py };
            e.updateAgentPosition(unit, dest.q, dest.r);
            const np = HexUtils.toPx(dest.q, dest.r, e.mapConfig);
            unit.px = np.x; unit.py = np.y;
            unit.physics.x += from.x - np.x;
            unit.physics.y += from.y - np.y;
        }
    }, { kind, info });
}

const MIN_GHOSTS = { ground: 3, knockback: 3, flying: 3 };
const MIN_SPREAD = { ground: 0, knockback: 0, flying: 0 };

/** Step one frame at a time until a frame with the most ghosts, then screenshot it. */
async function capture(kind, info) {
    let best = -1;
    for (let i = 0; i < 90; i++) {
        const st = await page.evaluate(({ id, zoom }) => {
            const e = window.__TACTICAL_ENGINE__;
            window.__stepFrames(1);
            const u = e.agents.find((a) => a.id === id);
            const f = e.renderer.pipeline.frames.get(u);
            const x = u.px + u.physics.x, y = u.py + u.physics.y;
            e.renderer.camera.snapTo(x, y - 30, zoom);
            return { dbg: JSON.stringify({hp:u.hp,oob:u.outOfBounds,ban:u.banished,x:u.physics.x,z:u.physics.z,fv:f?.visible,st:u.stunTimer,run:e.isRunning}), gc: f?.ghostCount ?? 0, speed: Math.hypot(u.physics.vx, u.physics.vy), trail: u.trailHistory.length,
                ghosts: f ? f.ghosts.slice(0, f.ghostCount).map((g) => ({ dx: Math.round(g.dx), dy: Math.round(g.dy), a: +g.alpha.toFixed(2) })) : [] };
        }, { id: info.id, zoom: ZOOM });
        if (process.env.DBG && i < 12) console.log(kind, i, JSON.stringify({d: st.dbg, gc: st.gc, sp: Math.round(st.speed), tr: st.trail}));
        const spread = st.ghosts.length ? Math.abs(st.ghosts[st.ghosts.length - 1].dx) : 0;
        if (st.gc > best || spread >= MIN_SPREAD[kind]) {
            best = Math.max(best, st.gc);
            if (st.gc >= MIN_GHOSTS[kind] && spread >= MIN_SPREAD[kind]) {
                await page.evaluate(({ id, zoom }) => {
                    const e = window.__TACTICAL_ENGINE__;
                    const u = e.agents.find((a) => a.id === id);
                    e.renderer.camera.snapTo(u.px + u.physics.x, u.py + u.physics.y - 30, zoom);
                    window.__stepFrames(0);
                }, { id: info.id, zoom: ZOOM });
                console.log(kind, 'frame', i, JSON.stringify(st));
                break;
            }
        }
        if (i === 89) console.log(kind, 'no frame matched; best', best);
    }
    const file = join(outDir, `dash_${kind}_${BIOME}.png`);
    writeFileSync(file, await page.screenshot());
    console.log(file);
}

for (const kind of ['ground', 'knockback', 'flying']) {
    const info = await setup(kind);
    for (let i = 0; i < 120; i++) await page.evaluate(() => window.__stepFrames(1));
    await fire(kind, info);
    await capture(kind, info);
}
if (errors.length) console.warn('[warn] page errors:', errors.slice(0, 3).join(' | '));
await browser.close();
await server.close();
