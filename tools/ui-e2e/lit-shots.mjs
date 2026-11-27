/**
 * Lighting pass screenshots (ADR 0029): the same frozen frames with the pass off and on, side by side.
 *
 * Uses the fidelity fixture (seeded clock, seeded roster, fixed map) through lib/frozen-battle.mjs, so the off and on
 * pages reach the same simulation state. Scenes: the five biomes with a dealt roster (36 frames) and the frozen battle
 * frame (120 frames), camera snapped to the whole board.
 *
 * Run:
 *   node tools/ui-e2e/lit-shots.mjs [--scene FOREST ...] [--walk 60]
 * Output (tools/ui-e2e/out/lit-engine/):
 *   <scene>_off.png, <scene>_lit.png, <scene>_compare.png (off | lit), lit-shots.json (GPU string, page errors)
 *   --walk N: also <scene>_walk.png, a strip of N consecutive lit frames cropped around one moving unit
 *             (battle_frozen only), to check that lights and shadows follow units without jumping.
 * Exit code 1 when the lit page does not report an active pass, or any page logs an error.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { clickDice, launchBrowser } from './lib/perf-common.mjs';
import { desktopProbe, openFrozenPage, rebuildFrozenMap } from './lib/frozen-battle.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = join(here, 'out', 'lit-engine');
mkdirSync(out, { recursive: true });
const argv = process.argv.slice(2);
const argList = (name) => argv.flatMap((a, i) => (a === name && argv[i + 1] ? [argv[i + 1]] : []));
const wanted = argList('--scene');
const walkFrames = Number(argList('--walk')[0] ?? 0);

const BIOME_FRAMES = 36;
const BATTLE_FRAMES = 120;
const BATTLE = 'battle_frozen';
/** Walk strip: crop size around the tracked unit (device px) and columns per row. */
const WALK_CROP = { w: 200, h: 180 };
const WALK_COLUMNS = 10;

async function seedRoster(page) {
    await page.evaluate(async () => (await import('/engine/math/rng.ts')).seedSetupStream(42));
    await clickDice(page);
    await page.waitForTimeout(200);
    await page.evaluate(async () => {
        window.__stepFrames(5);
        const { spriteAtlasStore } = await import('/engine/renderers/units/SpriteAtlasStore.ts');
        await spriteAtlasStore.readyPromise;
        if (!window.__UNIT_ASSETS_READY__) throw new Error('Roster atlases not ready');
    });
}

/** Runs in the page: step to the freeze frame, snap the camera to the whole board, return the canvas as PNG base64. */
async function freezeAndGrab(frames) {
    const [{ HexUtils }, { HEX_SIZE }, { VisualMath }] = await Promise.all([
        import('/engine/utils.ts'), import('/constants.ts'), import('/engine/math/VisualMath.ts'),
    ]);
    window.__stepFrames(frames - 1);
    const engine = window.__TACTICAL_ENGINE__;
    const centers = [...engine.map.getMapKeys()].map(key => {
        const [q, r] = key.split(',').map(Number);
        const { x, y } = HexUtils.toPx(q, r, engine.mapConfig);
        return { x, y: VisualMath.getIsoVisualY(y, engine.getTerrainHeight(q, r)) };
    });
    const xs = centers.map(p => p.x), ys = centers.map(p => p.y);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const padding = 4 * HEX_SIZE;
    engine.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: false });
    engine.bus.emit('UI_COMMAND', {
        type: 'CAMERA_SNAP', x: (left + right) / 2, y: (top + bottom) / 2,
        zoom: Math.min(engine.screenW / (right - left + padding), engine.screenH / (bottom - top + padding)),
    });
    window.__stepFrames(1);
    return document.querySelector('canvas').toDataURL('image/png').split(',')[1];
}

/** Runs in the page: N more frames, each cropped around the first living unit that is moving; returns one strip PNG. */
async function walkStrip({ frames, crop, columns }) {
    const engine = window.__TACTICAL_ENGINE__;
    const canvas = document.querySelector('canvas');
    const strip = document.createElement('canvas');
    strip.width = crop.w * columns;
    strip.height = crop.h * Math.ceil(frames / columns);
    const sctx = strip.getContext('2d');
    const alive = engine.agents.filter(a => a.hp > 0);
    const start = alive.map(a => ({ x: a.px, y: a.py }));
    let tracked = null;
    for (let i = 0; i < frames; i++) {
        window.__stepFrames(1);
        if (!tracked) {
            const k = alive.findIndex((a, j) => Math.hypot(a.px - start[j].x, a.py - start[j].y) > 1);
            tracked = alive[k >= 0 ? k : 0];
        }
        const frame = engine.renderer.pipeline?.frames?.get?.(tracked);
        const cam = engine.renderer.camera;
        const dpr = canvas.width / engine.screenW;
        const fx = frame ? frame.footX : tracked.px, fy = frame ? frame.floorY : tracked.py;
        const sx = ((fx - cam.x) * cam.zoom + engine.screenW / 2) * dpr;
        const sy = ((fy - cam.y) * cam.zoom + engine.screenH / 2) * dpr;
        sctx.drawImage(canvas, Math.round(sx - crop.w / 2), Math.round(sy - crop.h * 0.7), crop.w, crop.h,
            (i % columns) * crop.w, Math.floor(i / columns) * crop.h, crop.w, crop.h);
    }
    return { png: strip.toDataURL('image/png').split(',')[1], unit: tracked?.id ?? null };
}

/** Runs in the page: off | lit side by side. */
async function sideBySide({ a, b }) {
    const load = (b64) => new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = `data:image/png;base64,${b64}`;
    });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas');
    c.width = ia.width + ib.width; c.height = Math.max(ia.height, ib.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(ia, 0, 0); ctx.drawImage(ib, ia.width, 0);
    return c.toDataURL('image/png').split(',')[1];
}

async function shoot(browser, url, lit) {
    const context = await browser.newContext(desktopProbe);
    const errors = [];
    const shots = new Map();
    let state = null, walk = null;
    const watch = (page) => {
        page.on('pageerror', (e) => errors.push(String(e)));
        page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
    };
    const open = async () => {
        const page = await openFrozenPage(context, url, watch, `&lit=${lit ? 1 : 0}`);
        if (lit) {
            await page.waitForFunction(() => typeof window.__LIGHTING__ === 'string' && window.__LIGHTING__ !== 'loading', null, { timeout: 15000 });
        }
        state = await page.evaluate(() => window.__LIGHTING__ ?? null);
        return page;
    };
    try {
        const page = await open();
        const sceneIds = await page.evaluate(async () => (await import('/data/scenes.ts')).SCENE_DB.map(scene => scene.id));
        for (const sceneId of sceneIds) {
            if (wanted.length && !wanted.includes(sceneId)) continue;
            await rebuildFrozenMap(page, sceneIds[0], 42);
            await page.evaluate(() => window.__stepFrames(5));
            await seedRoster(page);
            await rebuildFrozenMap(page, sceneId, 1337);
            await page.evaluate(() => window.__TACTICAL_ENGINE__.play());
            shots.set(sceneId, await page.evaluate(freezeAndGrab, BIOME_FRAMES));
            await page.evaluate(() => window.__TACTICAL_ENGINE__.stop());
        }
        await page.close();
        if (!wanted.length || wanted.includes(BATTLE)) {
            const battle = await open();
            await rebuildFrozenMap(battle, sceneIds[0], 42);
            await battle.evaluate(() => window.__stepFrames(5));
            await seedRoster(battle);
            await battle.evaluate(() => window.__TACTICAL_ENGINE__.play());
            shots.set(BATTLE, await battle.evaluate(freezeAndGrab, BATTLE_FRAMES));
            if (lit && walkFrames > 0) {
                walk = await battle.evaluate(walkStrip, { frames: walkFrames, crop: WALK_CROP, columns: WALK_COLUMNS });
            }
        }
        return { shots, state, errors, walk };
    } finally { await context.close(); }
}

console.log(`lit-shots pid=${process.pid}`);
const server = await createServer({ server: { port: 3198, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser;
let failed = false;
try {
    await server.listen();
    const url = server.resolvedUrls.local[0];
    browser = await launchBrowser({ headed: false });
    const off = await shoot(browser, url, false);
    const lit = await shoot(browser, url, true);
    const page = await (await browser.newContext()).newPage();
    await page.setContent('<!doctype html><title>lit-shots</title>');
    for (const [scene, b] of lit.shots) {
        const a = off.shots.get(scene);
        writeFileSync(join(out, `${scene}_off.png`), Buffer.from(a, 'base64'));
        writeFileSync(join(out, `${scene}_lit.png`), Buffer.from(b, 'base64'));
        writeFileSync(join(out, `${scene}_compare.png`), Buffer.from(await page.evaluate(sideBySide, { a, b }), 'base64'));
        console.log(`${scene}: ${scene}_off.png, ${scene}_lit.png, ${scene}_compare.png`);
    }
    if (lit.walk) {
        writeFileSync(join(out, `${BATTLE}_walk.png`), Buffer.from(lit.walk.png, 'base64'));
        console.log(`${BATTLE}_walk.png: ${walkFrames} frames around ${lit.walk.unit}`);
    }
    const report = {
        lighting: lit.state, lightingWhenOff: off.state, scenes: [...lit.shots.keys()],
        errors: { off: off.errors, lit: lit.errors }, walk: lit.walk ? { frames: walkFrames, unit: lit.walk.unit } : null,
    };
    writeFileSync(join(out, 'lit-shots.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`lighting (lit=1): ${lit.state}`);
    console.log(`lighting (lit=0): ${off.state}`);
    console.log(`page errors: off ${off.errors.length}, lit ${lit.errors.length}`);
    for (const e of [...off.errors, ...lit.errors].slice(0, 10)) console.log('  ', e);
    if (!String(lit.state).startsWith('active')) { console.error('FAIL: lighting pass is not active on the lit page'); failed = true; }
    if (off.state !== null) { console.error('FAIL: lighting pass was loaded with lit=0'); failed = true; }
    if (off.errors.length || lit.errors.length) { console.error('FAIL: page errors'); failed = true; }
} finally {
    await browser?.close();
    await server.close();
}
process.exit(failed ? 1 : 0);
