/**
 * Lighting pass cost breakdown (ADR 0029 / 0030; plan docs/plans/lighting-cost.md, package C0).
 *
 * One deterministic frozen battle (the fidelity fixture: seeded clock, seeded roster, fixed map) is rendered for a
 * fixed number of frames with parts of the lighting pass switched off, one variant per fresh page, so every variant
 * renders exactly the same frames. Frames are stepped synchronously (no vsync, no rAF pacing); after each window the
 * GPU is forced to finish (the main canvas is uploaded to a 1x1 WebGL read-back), so the window time covers both the
 * Canvas 2D / JS work and the queued GPU work.
 *
 * Run:
 *   node tools/ui-e2e/lit-cost.mjs [--size 2560x1440] [--frames 120] [--windows 3] [--warmup 150] [--only a,b] [--repeat 1] [--no-warm-page]
 * An untimed 'full' page runs first (the first page of a run measures ~1 ms slow); full_again / direct_again repeat
 * the two references on later pages so one run shows its own page-to-page noise.
 * Output:
 *   tools/ui-e2e/out/lit-cost.json and a table: ms per frame for each variant, its noise (largest spread of one window
 *   position over the --repeat pages),
 *   and the difference from the full lighting pass.
 * Exit code 1 when: the GPU is not the RTX card, the lighting pass is not active, the scene differs between variants
 * (op counts), or any page logs an error.
 *
 * The variants patch the live LightingPass / RenderDispatcher by member name. A renamed member fails the run loudly
 * (the patch asserts the member exists) rather than silently measuring the unpatched path.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { assertMainGpu, clickDice, getEnvInfo, launchBrowser } from './lib/perf-common.mjs';
import { openFrozenPage, rebuildFrozenMap } from './lib/frozen-battle.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = join(here, 'out');
mkdirSync(out, { recursive: true });
const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const [W, H] = arg('--size', '2560x1440').split('x').map(Number);
const FRAMES = Number(arg('--frames', 120));
const WINDOWS = Number(arg('--windows', 3));
const WARMUP = Number(arg('--warmup', 150));
const only = arg('--only', '').split(',').filter(Boolean);
const REPEAT = Number(arg('--repeat', 1));
/** Roster seed: 20 units on the board (asserted below, so a changed dealer cannot silently shrink the scene). */
const ROSTER_SEED = 42;
const MIN_UNITS = 8;

/** id → what is switched off. 'full' is the shipped lighting pass; 'direct' is the Canvas 2D path (lit=0). */
const VARIANTS = {
    full: 'lighting as shipped',
    direct: 'no lighting: Canvas 2D direct path',
    offscreen_only: 'world drawn offscreen; no masks, no GL',
    no_gl: 'masks drawn; no uploads, no GL',
    no_tag: 'no masks (tag skipped): no lights, no casters',
    no_unit_tag: 'tag skips units',
    no_obstacle_tag: 'tag skips obstacles',
    no_terrain_tag: 'tag skips terrain ops (overlays, ground drape)',
    no_vfx_tag: 'tag skips VFX / projectile / hazard / aura / overlay ops',
    item_no_stamp: 'upright items: silhouette drawn in its scratch cell, not stamped (no source-in)',
    item_no_cut: 'upright items: not cut out of the VFX and info masks',
    item_no_info_cut: 'upright items: not cut out of the info mask (still cut out of the VFX mask)',
    item_no_glow_cut: 'upright items: not cut out of the VFX mask (still cut out of the info mask)',
    item_no_cell: 'upright items: no scratch cell work at all (cut-outs only)',
    no_upload: 'GL runs on stale textures: no canvas uploads',
    no_back_upload: 'only the background (main canvas) upload skipped',
    no_mask_upload: 'only the three mask uploads (geo, glow, info) skipped',
    no_world_upload: 'only the world canvas upload skipped',
    terrain_no_overlay: 'terrain tag: base overlays (status, zone, tile light) not drawn into the info mask',
    terrain_no_drape: 'terrain tag: ground drape not drawn into the VFX mask',
    mask_upload_twice: 'each of the three masks uploaded twice per frame (diagnosis: per-upload cost vs rasterising)',
    no_flip: 'uploads without UNPACK_FLIP_Y_WEBGL (picture upside down; diagnosis of the copy path)',
    drape_upload_only: 'VFX mask: no drape draws; instead every drape layer canvas used this frame is uploaded to a texture',
    drape_no_blit: 'VFX mask: ground drape flat-plane blits skipped (raised-plane pieces still drawn)',
    drape_no_plane: 'VFX mask: ground drape raised-plane pieces skipped (flat-plane blits still drawn)',
    drape_so: 'ground-drape blits into the VFX mask keep source-over (no blend switch per blit)',
    drape_so_first: 'drape_so, and terrain-op mask draws replayed first and contiguous',
    tag_terrain_first: 'mask draws replayed after the world: terrain ops first (contiguous drape blits), then the rest',
    tag_deferred: 'same mask draws in the same order, all replayed after the world (no interleaving)',
    no_lights: 'point-light pass gets 0 lights',
    full_no_vfx: 'lighting on; VFX-type ops not drawn at all',
    direct_no_vfx: 'direct path; VFX-type ops not drawn',
    full_again: 'lighting as shipped, measured again on a later page (page-to-page noise within one run)',
    direct_again: 'Canvas 2D direct path, measured again on a later page',
};
const ids = Object.keys(VARIANTS).filter((id) => !only.length || only.includes(id) || id === 'full');

/** Runs in the page: install the variant (or nothing for 'full' / 'direct'). */
async function install(id) {
    const { RenderDispatcher } = await import('/engine/renderers/RenderDispatcher.ts');
    const { RenderOpType: T } = await import('/engine/renderers/RenderList.ts');
    const isVfx = (op) => op.type === T.VFX || op.type === T.PROJECTILE || op.type === T.HAZARD || op.type === T.AURA || op.type === T.OVERLAY;
    const skipVfxDraws = () => {
        const dispatch = RenderDispatcher.dispatch;
        if (typeof dispatch !== 'function') throw new Error('RenderDispatcher.dispatch missing');
        RenderDispatcher.dispatch = function (ctx, op, ...rest) { if (isVfx(op)) return; return dispatch.call(this, ctx, op, ...rest); };
    };
    if (id === 'direct' || id === 'direct_again') return;
    if (id === 'direct_no_vfx') { skipVfxDraws(); return; }
    const { getLightingPass } = await import('/engine/renderers/lighting/LightingGate.ts');
    const pass = getLightingPass();
    if (!pass) throw new Error('lighting pass not loaded');
    const proto = Object.getPrototypeOf(pass);
    for (const m of ['tag', 'present', 'upload', 'blitUnlit']) if (typeof proto[m] !== 'function') throw new Error(`LightingPass.${m} missing`);
    const tagUnless = (skip) => { pass.tag = function (op, ...rest) { if (skip(op)) return; return proto.tag.call(this, op, ...rest); }; };
    const blitOnly = () => { pass.present = function (main) { this.blitUnlit(main); }; };
    switch (id) {
        case 'full': case 'full_again': break;
        case 'offscreen_only': pass.tag = () => {}; blitOnly(); break;
        case 'no_gl': blitOnly(); break;
        case 'no_tag': pass.tag = () => {}; break;
        case 'no_unit_tag': tagUnless((op) => op.type === T.UNIT); break;
        case 'no_obstacle_tag': tagUnless((op) => op.type === T.OBSTACLE); break;
        case 'no_terrain_tag': tagUnless((op) => op.type === T.TERRAIN); break;
        case 'no_vfx_tag': tagUnless(isVfx); break;
        case 'item_no_stamp':
            if (typeof proto.endItem !== 'function') throw new Error('LightingPass.endItem missing');
            pass.endItem = function () { this.scratchCtx.restore(); };
            break;
        case 'item_no_cell':
            if (typeof proto.beginItem !== 'function') throw new Error('LightingPass.beginItem missing');
            pass.beginItem = () => false;
            break;
        case 'item_no_cut': case 'item_no_info_cut': case 'item_no_glow_cut': {
            const cutCtxs = { item_no_cut: [pass.glowCtx, pass.infoCtx], item_no_info_cut: [pass.infoCtx], item_no_glow_cut: [pass.glowCtx] }[id];
            const isCut = (ctx) => cutCtxs.includes(ctx);
            const dispatch = RenderDispatcher.dispatch;
            RenderDispatcher.dispatch = function (ctx, op, ...rest) { if (op.type === T.OBSTACLE && isCut(ctx)) return; return dispatch.call(this, ctx, op, ...rest); };
            const units = window.__TACTICAL_ENGINE__.renderer.unit;
            const drawSilhouette = units.drawSilhouette;
            if (typeof drawSilhouette !== 'function') throw new Error('UnitRenderSystem.drawSilhouette missing');
            units.drawSilhouette = function (ctx, ...rest) { if (isCut(ctx)) return; return drawSilhouette.call(this, ctx, ...rest); };
            break;
        }
        case 'no_upload': {
            // Let the first frame upload so the textures have storage, then freeze them
            let n = 0;
            pass.upload = function (...a) { if (n++ < 5) return proto.upload.apply(this, a); };
            break;
        }
        case 'no_back_upload': case 'no_mask_upload': case 'no_world_upload': {
            // Skip the chosen textures after their first upload (so they have storage); the rest upload every frame
            const skip = { no_back_upload: ['backTex'], no_mask_upload: ['geoTex', 'glowTex', 'infoTex'], no_world_upload: ['worldTex'] }[id];
            for (const m of skip) if (!(m in pass)) throw new Error(`LightingPass.${m} missing`);
            const seen = new Set();
            pass.upload = function (tex, source) {
                if (skip.some((m) => this[m] === tex)) { if (seen.has(tex)) return; seen.add(tex); }
                return proto.upload.call(this, tex, source);
            };
            break;
        }
        case 'terrain_no_overlay': {
            const { GridOverlays } = await import('/engine/renderers/grid/GridOverlays.ts');
            const draw = GridOverlays.drawOverlays;
            if (typeof draw !== 'function') throw new Error('GridOverlays.drawOverlays missing');
            GridOverlays.drawOverlays = function (ctx, ...rest) { if (ctx === pass.infoCtx) return; return draw.call(this, ctx, ...rest); };
            break;
        }
        case 'terrain_no_drape': {
            const drape = window.__TACTICAL_ENGINE__.renderer.pipeline.groundDrape;
            const drawOnTile = drape?.drawOnTile;
            if (typeof drawOnTile !== 'function') throw new Error('GroundDrapeLayer.drawOnTile missing');
            drape.drawOnTile = function (ctx, ...rest) { if (ctx === pass.glowCtx) return; return drawOnTile.call(this, ctx, ...rest); };
            break;
        }
        case 'mask_upload_twice': {
            // Diagnosis: is a mask upload's cost per upload (doubles) or the rasterising of its recorded draws (second is free)?
            pass.upload = function (tex, source) {
                proto.upload.call(this, tex, source);
                if (tex === this.geoTex || tex === this.glowTex || tex === this.infoTex) proto.upload.call(this, tex, source);
            };
            break;
        }
        case 'no_flip': {
            // Diagnosis: does UNPACK_FLIP_Y_WEBGL force a slower canvas-to-texture copy? (picture upside down; timing only)
            const gl = pass.gl;
            pass.upload = function (tex, source) { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); proto.upload.call(this, tex, source); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); };
            break;
        }
        case 'drape_upload_only': {
            // Feasibility of drawing the drape into the VFX mask on the GL side: no drape draws into the VFX mask, but
            // every drape layer canvas used this frame is uploaded to a texture (what a GL path would have to pay)
            const drape = window.__TACTICAL_ENGINE__.renderer.pipeline.groundDrape;
            const drawOnTile = drape?.drawOnTile;
            if (typeof drawOnTile !== 'function' || !(drape.planes instanceof Map) || !Array.isArray(drape.entries)) throw new Error('GroundDrapeLayer internals missing');
            drape.drawOnTile = function (ctx, ...rest) { if (ctx === pass.glowCtx) return; return drawOnTile.call(this, ctx, ...rest); };
            const gl = pass.gl;
            const texs = [];
            let uploads = 0;
            window.__drapeUploads = () => uploads;
            pass.present = function (...a) {
                const layers = [];
                for (const plane of drape.planes.values()) plane.layers.forEach((c, k) => { if (c && plane.layerStamps[k] === drape.stamp) layers.push(c); });
                for (let i = 0; i < drape.count; i++) { const e = drape.entries[i]; if (!Number.isNaN(e.planeZ)) e.layers.forEach((c, k) => { if (c && e.layerStamps[k] === drape.stamp) layers.push(c); }); }
                layers.forEach((c, i) => {
                    if (!texs[i]) texs[i] = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, texs[i]);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
                    uploads++;
                });
                return proto.present.apply(this, a);
            };
            break;
        }
        case 'drape_no_blit': case 'drape_no_plane': {
            // Split of terrain_no_drape: skip only the flat-plane blits, or only the raised-plane (cast ring) pieces,
            // in the VFX mask
            const drape = window.__TACTICAL_ENGINE__.renderer.pipeline.groundDrape;
            const m = id === 'drape_no_blit' ? 'blitPlane' : 'drawPlaneOnTile';
            const f = drape?.[m];
            if (typeof f !== 'function') throw new Error(`GroundDrapeLayer.${m} missing`);
            drape[m] = function (ctx, ...rest) { if (ctx === pass.glowCtx) return; return f.call(this, ctx, ...rest); };
            break;
        }
        case 'drape_so': case 'drape_so_first': {
            // Hypothesis test: ground-drape blits into the VFX mask without switching the blend mode per blit
            // (screen and source-over give the same alpha), in order or grouped first
            const drape = window.__TACTICAL_ENGINE__.renderer.pipeline.groundDrape;
            const blit = drape?.blitPlane;
            if (typeof blit !== 'function') throw new Error('GroundDrapeLayer.blitPlane missing');
            drape.blitPlane = function (ctx, plane, ...rest) {
                if (ctx !== pass.glowCtx) return blit.call(this, ctx, plane, ...rest);
                const b = plane.blend; plane.blend = 'source-over';
                try { return blit.call(this, ctx, plane, ...rest); } finally { plane.blend = b; }
            };
            if (id === 'drape_so') break;
            const queue = [];
            pass.tag = function (...a) { queue.push(a); };
            pass.present = function (...a) {
                for (const args of queue) if (args[0].type === T.TERRAIN) proto.tag.apply(this, args);
                for (const args of queue) if (args[0].type !== T.TERRAIN) proto.tag.apply(this, args);
                queue.length = 0;
                return proto.present.apply(this, a);
            };
            break;
        }
        case 'tag_terrain_first': {
            // Hypothesis test: all terrain-op mask draws (ground drape blits, base overlays) contiguous and first, then
            // the other ops in order; measures whether contiguous same-source blits get cheaper (not the shipped order)
            const queue = [];
            pass.tag = function (...a) { queue.push(a); };
            pass.present = function (...a) {
                for (const args of queue) if (args[0].type === T.TERRAIN) proto.tag.apply(this, args);
                for (const args of queue) if (args[0].type !== T.TERRAIN) proto.tag.apply(this, args);
                queue.length = 0;
                return proto.present.apply(this, a);
            };
            break;
        }
        case 'tag_deferred': {
            // Hypothesis test: same mask draws, same order, but all of them after the world is drawn (no interleaving
            // of world-canvas and mask-canvas draws)
            const queue = [];
            pass.tag = function (...a) { queue.push(a); };
            pass.present = function (...a) {
                for (const args of queue) proto.tag.apply(this, args);
                queue.length = 0;
                return proto.present.apply(this, a);
            };
            break;
        }
        case 'no_lights': pass.present = function (...a) { this.lightCount = 0; return proto.present.apply(this, a); }; break;
        case 'full_no_vfx': skipVfxDraws(); break;
        default: throw new Error(`unknown variant ${id}`);
    }
}

/** Runs in the page: step `frames` frames, then wait for the GPU; returns ms per frame and the scene's op counts. */
async function timeWindow(frames) {
    const { RenderOpType: T } = await import('/engine/renderers/RenderList.ts');
    const main = document.querySelector('canvas');
    if (!window.__gpuSync) {
        // 1x1 read-back of the main canvas through a throwaway WebGL context: forces the queued 2D and GL work to
        // finish without getImageData (which would move the 2D canvas off the GPU).
        const gl = document.createElement('canvas').getContext('webgl2');
        const tex = gl.createTexture();
        const fbo = gl.createFramebuffer();
        const px = new Uint8Array(4);
        window.__gpuSync = () => {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, main);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        };
    }
    // The fixture replaces performance.now with its synthetic clock (an own property); the prototype's is the real one
    const realNow = () => Performance.prototype.now.call(performance);
    window.__gpuSync();
    const t0 = realNow();
    window.__stepFrames(frames);
    window.__gpuSync();
    const ms = (realNow() - t0) / frames;
    const engine = window.__TACTICAL_ENGINE__;
    const list = engine.renderer.pipeline.renderList;
    const ops = {};
    for (let i = 0; i < list.count; i++) { const k = T[list.ops[i].type]; ops[k] = (ops[k] ?? 0) + 1; }
    return { ms, ops, alive: engine.agents.filter((a) => a.hp > 0).length, particles: engine.renderer.vfx.state.particles.length, tick: engine.state.time.tick };
}

/** Runs in the page: director off, camera on the whole board (same framing as lit-shots). */
async function wholeBoard() {
    const [{ HexUtils }, { HEX_SIZE }, { VisualMath }] = await Promise.all([
        import('/engine/utils.ts'), import('/constants.ts'), import('/engine/math/VisualMath.ts'),
    ]);
    const engine = window.__TACTICAL_ENGINE__;
    const centers = [...engine.map.getMapKeys()].map((key) => {
        const [q, r] = key.split(',').map(Number);
        const { x, y } = HexUtils.toPx(q, r, engine.mapConfig);
        return { x, y: VisualMath.getIsoVisualY(y, engine.getTerrainHeight(q, r)) };
    });
    const xs = centers.map((p) => p.x), ys = centers.map((p) => p.y);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const padding = 4 * HEX_SIZE;
    engine.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: false });
    engine.bus.emit('UI_COMMAND', {
        type: 'CAMERA_SNAP', x: (left + right) / 2, y: (top + bottom) / 2,
        zoom: Math.min(engine.screenW / (right - left + padding), engine.screenH / (bottom - top + padding)),
    });
}

async function measure(browser, url, id) {
    const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const errors = [];
    try {
        const lit = !id.startsWith('direct');
        const page = await openFrozenPage(context, url, (p) => {
            p.on('pageerror', (e) => errors.push(String(e)));
            p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
        }, `&lit=${lit ? 1 : 0}`);
        if (lit) await page.waitForFunction(() => typeof window.__LIGHTING__ === 'string' && window.__LIGHTING__ !== 'loading', null, { timeout: 15000 });
        const state = await page.evaluate(() => window.__LIGHTING__ ?? null);
        if (lit && !String(state).startsWith('active')) throw new Error(`lighting pass not active: ${state}`);
        const env = await getEnvInfo(page, true);
        const sceneIds = await page.evaluate(async () => (await import('/data/scenes.ts')).SCENE_DB.map((scene) => scene.id));
        await rebuildFrozenMap(page, sceneIds[0], ROSTER_SEED);
        await page.evaluate(() => window.__stepFrames(5));
        await page.evaluate(async (seed) => (await import('/engine/math/rng.ts')).seedSetupStream(seed), ROSTER_SEED);
        await clickDice(page);
        await page.waitForTimeout(200);
        await page.evaluate(async () => {
            window.__stepFrames(5);
            const { spriteAtlasStore } = await import('/engine/renderers/units/SpriteAtlasStore.ts');
            await spriteAtlasStore.readyPromise;
            if (!window.__UNIT_ASSETS_READY__) throw new Error('Roster atlases not ready');
        });
        await page.evaluate(() => window.__TACTICAL_ENGINE__.play());
        await page.evaluate(wholeBoard);
        await page.evaluate((n) => window.__stepFrames(n), WARMUP);
        await page.evaluate(install, id);
        // One untimed window so caches a variant touches for the first time are built before timing
        await page.evaluate(timeWindow, 10);
        const windows = [];
        for (let i = 0; i < WINDOWS; i++) windows.push(await page.evaluate(timeWindow, FRAMES));
        return { id, env, state, windows, errors };
    } finally { await context.close(); }
}

console.log(`lit-cost pid=${process.pid}`);
const server = await createServer({ server: { port: 3197, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
let browser;
let failed = false;
try {
    await server.listen();
    const url = server.resolvedUrls.local[0];
    browser = await launchBrowser({ headed: true, unthrottled: true, extraArgs: [`--window-size=${W},${H}`] });
    // The first page of a run is ~1 ms slower than later pages with the same code (2026-11-28: full 7.66 / 8.01 / 12.87,
    // full_again 7.31 / 7.01 / 11.86 ms in one run): warm up on an untimed page so every measured page starts equal
    if (!argv.includes('--no-warm-page')) await measure(browser, url, 'full');
    // --repeat N: every variant on N pages, round-robin (drift over the run lands on all variants alike); its windows
    // from all pages are pooled
    const results = [];
    for (let rep = 0; rep < REPEAT; rep++) {
        for (const id of ids) {
            const r = await measure(browser, url, id);
            if (results.length === 0) { assertMainGpu(r.env); console.log(`GPU: ${r.env.gpu}; ${r.env.viewport.join('x')} DPR ${r.env.dpr}`); }
            const prev = results.find((x) => x.id === id);
            if (prev) { prev.windows.push(...r.windows); prev.errors.push(...r.errors); } else results.push(r);
            const ms = r.windows.map((w) => w.ms);
            console.log(`${id.padEnd(16)} ${ms.map((x) => x.toFixed(2)).join(' ')}`);
        }
    }
    const sceneKey = (w) => JSON.stringify([w.tick, w.alive]);
    const reference = results[0].windows.map(sceneKey).join('|');
    const rows = results.map((r) => {
        const ms = r.windows.map((w) => w.ms);
        const mean = ms.reduce((a, b) => a + b, 0) / ms.length;
        // noise: for each window position, the spread of that window over the pages (0 with --repeat 1); the windows
        // of one page differ by scene content, so their spread is not noise
        let noise = 0;
        for (let k = 0; k < WINDOWS; k++) {
            const same = ms.filter((_, j) => j % WINDOWS === k);
            noise = Math.max(noise, Math.max(...same) - Math.min(...same));
        }
        return { id: r.id, what: VARIANTS[r.id], msPerFrame: +mean.toFixed(3), noise: +noise.toFixed(3), sameScene: r.windows.map(sceneKey).join('|') === reference, errors: r.errors.length };
    });
    const full = rows.find((r) => r.id === 'full').msPerFrame;
    for (const r of rows) r.vsFull = +(r.msPerFrame - full).toFixed(3);
    console.table(rows.map(({ id, msPerFrame, vsFull, noise, sameScene, errors }) => ({ id, msPerFrame, vsFull, noise, sameScene, errors })));
    const direct = rows.find((r) => r.id === 'direct');
    if (direct) console.log(`lighting overhead (full - direct): ${(full - direct.msPerFrame).toFixed(2)} ms per frame`);
    const last = results[0].windows.at(-1);
    console.log(`scene (full, last window): tick ${last.tick}, alive ${last.alive}, particles ${last.particles}, ops ${JSON.stringify(last.ops)}`);
    writeFileSync(join(out, 'lit-cost.json'), JSON.stringify({
        gpu: results[0].env.gpu, viewport: results[0].env.viewport, dpr: results[0].env.dpr, lighting: results[0].state,
        frames: FRAMES, windows: WINDOWS, warmup: WARMUP, rows, scene: results[0].windows,
        detail: Object.fromEntries(results.map((r) => [r.id, r.windows.map((w) => +w.ms.toFixed(3))])),
    }, null, 2) + '\n');
    if (last.alive < MIN_UNITS) { console.error(`FAIL: only ${last.alive} units alive in the measured scene (need >= ${MIN_UNITS})`); failed = true; }
    if (rows.some((r) => !r.sameScene)) { console.error('FAIL: a variant rendered a different scene (tick / alive count differs from full)'); failed = true; }
    if (rows.some((r) => r.errors)) { console.error('FAIL: page errors'); for (const r of results) for (const e of r.errors.slice(0, 3)) console.error('  ', r.id, e); failed = true; }
} finally {
    await browser?.close();
    await server.close();
}
process.exit(failed ? 1 : 0);
