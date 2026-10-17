/**
 * tools/ui-e2e/sink-flicker-probe.mjs
 * Deterministic probe for two rendering bugs seen in battle-royale matches:
 *   1. SINK    — a unit's feet are drawn below the top of the tile it visually stands on, or covered by a tile
 *                that is drawn after it (depth sort).
 *   2. FLICKER — frame-to-frame instability of the scene (A-B-A pixel pattern, unit/tile sort flips,
 *                terrain sprite cache churn, quality tier changes).
 *
 * Usage:
 *   node tools/ui-e2e/sink-flicker-probe.mjs [--themes=ICE,VOID,MAGMA] [--seeds=3] [--sim=60]
 *        [--shrinkInterval=3] [--shots=6] [--label=before] [--realtime]
 *
 * Per rendered frame and per unit it records: logical hex, hex under the visual position, both terrain heights,
 * physics.z, feet level vs tile top, and the tiles sorted after the unit that cover its feet.
 * Output: tools/ui-e2e/out/sink-flicker/<label>_summary.json (+ _events.json, screenshots).
 *
 * Harness: same approach as br-soak.mjs (seeded Math.random, synthetic clock, manual rAF via window.__stepFrames).
 * --realtime additionally runs the page on the real clock to watch the quality governor (no determinism).
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, 'out', 'sink-flicker');
mkdirSync(OUT_DIR, { recursive: true });

const START_TEXT = '啟動戰術模擬';
const DICE_TITLE = '隨機生成戰場與陣容';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const THEMES = String(args.themes ?? 'ICE,VOID,MAGMA').split(',');
const SEEDS = parseInt(args.seeds ?? '3', 10);
const SIM_SEC = parseInt(args.sim ?? '60', 10);
const SHRINK = parseInt(args.shrinkInterval ?? '3', 10);
const MAX_SHOTS = parseInt(args.shots ?? '14', 10);
const LABEL = String(args.label ?? 'run');
const REALTIME = args.realtime === true;
const LEGACY_DRAG = args['legacy-drag'] === true; // re-introduce DEATH_VFX.PUFF_DRAG = 1.5 to reproduce the NaN sort corruption on fixed code
const QUALITY = args.quality === 'free' ? null : parseInt(args.quality ?? '0', 10);
const QS = QUALITY === null ? '' : `&quality=${QUALITY}`;

const launchBrowser = async () => {
    const launchArgs = ['--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--window-size=1280,720'];
    if (process.env.E2E_BROWSER_PATH) return chromium.launch({ executablePath: process.env.E2E_BROWSER_PATH, headless: true, args: launchArgs });
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true, args: launchArgs }); } catch { /* next */ }
    }
    throw new Error('No Edge or Chrome found. Set E2E_BROWSER_PATH.');
};

const server = await createServer({ server: { port: 3199, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.addInitScript((realtime) => {
    let seed = 1337;
    function mulberry32() {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    Math.random = mulberry32;
    if (realtime) return;
    let syntheticTime = 1000.0;
    window.__resetSeed = (s = 1337) => { window.__TACTICAL_ENGINE__?.seedSimulation?.(s); /* 模擬流與 Math.random 分離，需一併重設 */ seed = s; syntheticTime = 1000.0; };
    Date.now = () => Math.floor(syntheticTime);
    performance.now = () => syntheticTime;
    let rafId = 0;
    const rafCallbacks = new Map();
    window.requestAnimationFrame = (cb) => { const id = ++rafId; rafCallbacks.set(id, cb); return id; };
    window.cancelAnimationFrame = (id) => { rafCallbacks.delete(id); };
    window.__stepFrames = (n = 1) => {
        for (let i = 0; i < n; i++) {
            syntheticTime += 16.666666666666668;
            const cbs = Array.from(rafCallbacks.entries());
            rafCallbacks.clear();
            for (const [, cb] of cbs) cb(syntheticTime);
        }
    };
}, REALTIME);

await page.goto(`${baseUrl}?mute${QS}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ASSETS_READY__ === true, null, { timeout: 20000 }).catch(() => {});
if (!REALTIME) await page.evaluate(() => window.__stepFrames(10));
const startBtn = page.getByText(START_TEXT);
if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    if (!REALTIME) await page.evaluate(() => window.__stepFrames(10));
}

// ---- install the in-page probe (once)
await page.evaluate(async (legacyDrag) => {
    const [{ RenderList, RenderOpType }, { HexUtils }, { TerrainRenderer }, quality, { HexGeometry }, consts] = await Promise.all([
        import('/engine/renderers/RenderList.ts'),
        import('/engine/utils.ts'),
        import('/engine/renderers/grid/TerrainRenderer.ts'),
        import('/engine/renderers/RenderQuality.ts'),
        import('/engine/graphics/utils/HexGeometry.ts'),
        import('/constants.ts'),
    ]);
    const origSort = RenderList.prototype.sort;
    let lastList = null;
    RenderList.prototype.sort = function () { origSort.call(this); lastList = this; };

    if (legacyDrag) consts.DEATH_VFX.PUFF_DRAG = 1.5;
    const P = (window.__probe = {
        cfg: { sinkPx: 6 },
        frame: 0,
        events: [],
        counters: null,
        prevUnit: new Map(),
        prevCache: null,
        prevTier: null,
        lumHist: [],
        pixelEvents: [],
        reset() {
            this.frame = 0; this.events = []; this.prevUnit = new Map(); this.prevCache = null;
            this.prevTier = null; this.lumHist = []; this.pixelEvents = []; this.evCount = {};
            this.counters = {
                frames: 0, unitFrames: 0,
                sinkFrames: 0, sinkMax: 0, sinkByCause: {},
                coveredFrames: 0, coveredByCause: {}, coveredNoSilhouette: 0,
                sortFlips: 0, sortFlipsStationary: 0,
                tierChanges: 0, cacheEvictions: 0, cacheMisses: 0, cacheFallbacks: 0, cacheClears: 0,
                abaFrames: 0, abaBlocksMax: 0, abaBlocksTotal: 0,
                warnMax: 0,
            };
        },
        evCount: {},
        capOk(k) { const n = (this.evCount[k] = (this.evCount[k] || 0) + 1); return n <= 60; },
        lastList: () => lastList,
    });
    P.reset();

    const canvasEl = () => Array.from(document.querySelectorAll('canvas')).sort((a, b) => b.width * b.height - a.width * a.height)[0];
    const lumCv = document.createElement('canvas');
    lumCv.width = 160; lumCv.height = 90;
    const lumCtx = lumCv.getContext('2d', { willReadFrequently: true });
    const BX = 16, BY = 9; // blocks for localisation

    const ring = [];
    const ringCv = () => { const c = document.createElement('canvas'); c.width = 1280; c.height = 720; return c; };
    P.ringPush = function () {
        const src = canvasEl();
        if (!src) return;
        const c = ring.length >= 3 ? ring.shift() : ringCv();
        const g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(src, 0, 0, c.width, c.height);
        ring.push(c);
    };
    P.ringExport = function (idx) { return ring[idx] ? ring[idx].toDataURL('image/png') : null; };
    P.lumSample = function () {
        const src = canvasEl();
        if (!src) return null;
        lumCtx.drawImage(src, 0, 0, lumCv.width, lumCv.height);
        const d = lumCtx.getImageData(0, 0, lumCv.width, lumCv.height).data;
        const out = new Float32Array(lumCv.width * lumCv.height);
        for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
        return out;
    };

    // pointInHex for a flat/pointy hex polygon scaled with the iso projection
    function inPoly(px, py, verts) {
        let inside = false;
        for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
            const xi = verts[i].x, yi = verts[i].y, xj = verts[j].x, yj = verts[j].y;
            if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }

    P.sample = function (engine) {
        const list = lastList;
        if (!list) return;
        const C = this.counters;
        C.frames++;
        const layout = engine.mapConfig.layout;
        const verts = HexGeometry.getVertices(consts.HEX_SIZE, true, layout);
        const tiles = [];
        const units = [];
        for (let i = 0; i < list.count; i++) {
            const op = list.ops[i];
            op._i = i;
            if (op.type === RenderOpType.TERRAIN) tiles.push(op);
            else if (op.type === RenderOpType.UNIT || op.type === RenderOpType.CORPSE) units.push(op);
        }
        // sort integrity: NaN keys make the comparator inconsistent (undefined order), inversions mean a broken sort
        let nanOps = 0, inversions = 0, prevFinite = null;
        for (let i = 0; i < list.count; i++) {
            const k = list.ops[i].sortKey;
            if (!Number.isFinite(k)) { nanOps++; continue; }
            if (prevFinite !== null && prevFinite > k) inversions++;
            prevFinite = k;
        }
        this.lastNanOps = nanOps;
        const cam = engine.renderer.camera;
        this.lastTrauma = cam.getTrauma();
        this.lastZoom = cam.zoom;
        if (this.lastTrauma > 0) C.traumaFrames = (C.traumaFrames || 0) + 1;
        C.traumaMax = Math.max(C.traumaMax || 0, this.lastTrauma);
        C.nanOpFrames = (C.nanOpFrames || 0) + (nanOps > 0 ? 1 : 0);
        C.inversionFrames = (C.inversionFrames || 0) + (inversions > 0 ? 1 : 0);
        if ((nanOps > 0 || inversions > 0) && this.capOk('SORT_INTEGRITY')) {
            const bad = [];
            for (let i = 0; i < list.count && bad.length < 4; i++) { const o = list.ops[i]; if (!Number.isFinite(o.sortKey)) bad.push({ type: o.type, y: o.y, z: o.z, tx: o.tx, sortBias: o.sortBias, gHalfW: o.gHalfW, gHalfH: o.gHalfH, isGround: o.isGround, pIsUlt: o.pIsUlt, id: o.agent ? o.agent.id : null, particle: o.particle ? JSON.parse(JSON.stringify(o.particle, (k, v) => (typeof v === "number" && !Number.isFinite(v) ? "NaN_" + String(v) : v))) : null }); }
            this.events.push({ kind: 'SORT_INTEGRITY', frame: this.frame, nanOps, inversions, bad });
        }
        let terrainInv = 0;
        for (let i = 1; i < tiles.length; i++) if (tiles[i - 1].y > tiles[i].y + 0.01) terrainInv++;
        C.terrainInvFrames = (C.terrainInvFrames || 0) + (terrainInv > 0 ? 1 : 0);
        C.terrainInvMax = Math.max(C.terrainInvMax || 0, terrainInv);
        let decalCount = 0;
        for (let i = 0; i < list.count; i++) { const o = list.ops[i]; if (o.type === RenderOpType.VFX && o.isGround && o.gHalfH >= consts.VFX_RENDER.DECAL_LIFT_MIN_HALF_H) decalCount++; }
        const occluded = new Set(engine.renderer.grid.getOccludedAgents(engine).map((a) => a.id));
        const sortedAfter = new Map();

        for (const u of units) {
            const a = u.agent;
            if (!a) continue;
            C.unitFrames++;
            const hv = HexUtils.fromPx(u.tx, u.y, engine.mapConfig);
            const vKey = `${hv.q},${hv.r}`;
            const lKey = `${a.q},${a.r}`;
            const vValid = engine.map.mapKeys.has(vKey);
            const hVis = vValid ? engine.map.getTerrainHeight(hv.q, hv.r) : null;
            const hLog = u.th;
            const feet = hLog + u.z; // world-space feet level (terrain units)
            const isFly = a.movementType === 'FLYING' || a.movementType === 2;
            const alive = a.hp > 0;
            let cause = null;
            let sink = 0;
            if (alive && vValid && !isFly) {
                sink = hVis - feet;
                if (sink > this.cfg.sinkPx) {
                    const logicalValid = engine.map.mapKeys.has(lKey);
                    if (!logicalValid) cause = 'LOGICAL_TILE_REMOVED';
                    else if (hv.q !== a.q || hv.r !== a.r) cause = (hLog < hVis ? 'HEX_SWITCH_DOWN' : 'OTHER_HEX');
                    else cause = 'SAME_HEX_Z_NEG';
                }
            } else if (alive && !vValid && !isFly && engine.map.mapKeys.has(lKey)) {
                // visual position is over a void hex while logical hex still exists (edge): ignore
            }
            // dead/falling units whose tile collapsed: height under them dropped from the old tile height to 0
            if (!cause && !engine.map.mapKeys.has(lKey) && hLog === 0) {
                const prev = this.prevUnit.get(a.id);
                if (prev && prev.hLog > 0 && prev.lKey === lKey) {
                    cause = alive ? 'COLLAPSE_HEIGHT_POP_ALIVE' : 'COLLAPSE_HEIGHT_POP_DEAD';
                    sink = prev.hLog + prev.z - feet;
                }
            }
            if (cause) {
                C.sinkFrames++;
                C.sinkMax = Math.max(C.sinkMax, sink);
                C.sinkByCause[cause] = (C.sinkByCause[cause] || 0) + 1;
                if (this.capOk('SINK')) {
                    this.events.push({ kind: 'SINK', cause, frame: this.frame, id: a.id, role: a.role, hp: a.hp, q: a.q, r: a.r, visQ: hv.q, visR: hv.r, hLog, hVis, z: +u.z.toFixed(2), sink: +sink.toFixed(1), isMoving: a.isMoving, stun: +a.stunTimer.toFixed(2) });
                }
            }

            // covered by tiles sorted after the unit (feet point inside the tile column)
            const fx = u.tx, fy = u.ty - u.z; // feet screen position
            const covers = [];
            if (alive && !isFly) {
                for (const t of tiles) {
                    if (t._i < u._i) continue;
                    if (t.tq === a.q && t.tr === a.r) continue;
                    if (Math.abs(t.tx - fx) > consts.HEX_SIZE + 2) continue;
                    // column region = top polygon (centre t.ty - t.th) swept down to base (t.ty)
                    let hit = false;
                    for (let s = 0; s <= t.th && !hit; s += 4) hit = inPoly(fx - t.tx, fy - (t.ty - t.th + s), verts);
                    if (hit) covers.push(t);
                }
            }
            if (covers.length) {
                const worst = covers.reduce((m, t) => (t.th > m.th ? t : m), covers[0]);
                const dH = worst.th - hLog;
                C.coveredFrames++;
                const silhouette = occluded.has(a.id);
                if (!silhouette) C.coveredNoSilhouette++;
                // is the covering tile geometrically in front of the unit (larger world y)?
                const inFront = worst.y > u.y;
                const inVisHex = worst.tq === hv.q && worst.tr === hv.r;
                const c = `${inFront ? 'FRONT' : 'BEHIND_SORTED_AFTER'}${inVisHex ? '_IN_VISHEX' : ''}${silhouette ? '+SIL' : ''}`;
                C.coveredByCause[c] = (C.coveredByCause[c] || 0) + 1;
                if (this.capOk('COVERED:' + c)) {
                    this.events.push({ kind: 'COVERED', cause: c, frame: this.frame, id: a.id, role: a.role, q: a.q, r: a.r, hLog, tile: `${worst.tq},${worst.tr}`, tileH: worst.th, dH, unitY: +u.y.toFixed(1), tileY: +worst.y.toFixed(1), unitSortKey: u.sortKey, tileSortKey: worst.sortKey });
                }
            }

            // sort stability: set of near tiles sorted after this unit
            const near = [];
            for (const t of tiles) {
                if (Math.abs(t.tx - u.tx) < consts.HEX_SIZE * 3 && Math.abs(t.y - u.y) < consts.HEX_SIZE * 3 && t._i > u._i) near.push(t.tq * 1000 + t.tr);
            }
            near.sort((x, y) => x - y);
            const sig = near.join(',');
            const prev = this.prevUnit.get(a.id);
            const stationary = prev && Math.abs(prev.x - u.tx) < 0.01 && Math.abs(prev.y - u.y) < 0.01;
            if (prev && prev.sig !== sig) {
                C.sortFlips++;
                if (stationary) {
                    C.sortFlipsStationary++;
                    if (this.capOk('SORT_FLIP_STATIONARY')) this.events.push({ kind: 'SORT_FLIP_STATIONARY', decalCount, frame: this.frame, id: a.id, q: a.q, r: a.r, before: prev.sig, after: sig });
                }
            }
            this.prevUnit.set(a.id, { sig, x: u.tx, y: u.y, hLog, z: u.z, lKey });
            sortedAfter.set(a.id, near);
        }

        // terrain sprite cache
        const st = TerrainRenderer.store.getStats();
        if (this.prevCache) {
            C.cacheEvictions += st.evictions - this.prevCache.evictions;
            C.cacheMisses += st.misses - this.prevCache.misses;
            C.cacheFallbacks += st.fallbacks - this.prevCache.fallbacks;
            C.cacheClears += st.clears - this.prevCache.clears;
        }
        this.prevCache = st;

        const tier = quality.getQualityTier();
        if (this.prevTier !== null && tier !== this.prevTier) {
            C.tierChanges++;
            this.events.push({ kind: 'TIER_CHANGE', frame: this.frame, from: this.prevTier, to: tier });
        }
        this.prevTier = tier;
        C.warnMax = Math.max(C.warnMax, engine.map.warningTiles.size);
    };

    // A-B-A pixel flicker detector on a 160x90 luminance image (needs a deterministic synthetic clock)
    P.pixelCheck = function () {
        const cur = this.lumSample();
        if (!cur) return null;
        const h = this.lumHist;
        h.push(cur);
        if (h.length > 3) h.shift();
        if (h.length < 3) return null;
        const [a, b, c] = h; // a = f-2, b = f-1, c = f
        const W = 160, Hh = 90, cw = W / BX, ch = Hh / BY;
        let blocks = 0, total = 0;
        for (let by = 0; by < BY; by++) {
            for (let bx = 0; bx < BX; bx++) {
                let dAB = 0, dAC = 0, dBC = 0;
                for (let y = by * ch; y < (by + 1) * ch; y++) {
                    for (let x = bx * cw; x < (bx + 1) * cw; x++) {
                        const i = y * W + x;
                        dAB += Math.abs(a[i] - b[i]); dAC += Math.abs(a[i] - c[i]); dBC += Math.abs(b[i] - c[i]);
                    }
                }
                const n = cw * ch;
                dAB /= n; dAC /= n; dBC /= n;
                // B differs strongly from both neighbours while A ~ C: a one-frame blink
                if (dAB > 6 && dBC > 6 && dAC < 0.35 * Math.min(dAB, dBC)) blocks++;
                total++;
            }
        }
        return { blocks, total };
    };

    P.run = function (engine, maxFrames, opts) {
        // advances until `maxFrames` frames or the first new notable event (for screenshots)
        const startEvents = this.events.length;
        const C = this.counters;
        for (let i = 0; i < maxFrames; i++) {
            window.__stepFrames(1);
            this.frame++;
            this.prevNanOps = this.lastNanOps;
            this.sample(engine);
            if (opts.pixels) {
                this.ringPush();
                const r = this.pixelCheck();
                if (r && r.blocks > 0) {
                    this.events.push({ kind: 'ABA', frame: this.frame, blocks: r.blocks, nanOps: this.lastNanOps, trauma: +this.lastTrauma.toFixed(3), zoom: +this.lastZoom.toFixed(3), shrunk: this.lastShrunkFrame, sinceShrunk: this.frame - (this.lastShrunkFrame ?? -9999) });
                    C.abaFrames++;
                    if (this.lastTrauma > 0) C.abaWithShake = (C.abaWithShake || 0) + 1;
                    if (this.lastNanOps > 0 || this.prevNanOps > 0) C.abaWithNan = (C.abaWithNan || 0) + 1;
                    C.abaBlocksTotal += r.blocks;
                    C.abaBlocksMax = Math.max(C.abaBlocksMax, r.blocks);
                    if (this.pixelEvents.length < 200) this.pixelEvents.push({ frame: this.frame, blocks: r.blocks });
                }
            }
            if (engine.battleTime >= opts.simSec || engine.victory.winningTeam !== null) return { done: true, frames: i + 1, time: engine.battleTime };
            if (this.events.length > startEvents) {
                const skip = opts.skipKeys || [];
                const ev = this.events.slice(startEvents).find((e) => {
                    const key = e.kind + ':' + (e.cause || '');
                    return (e.kind === 'SINK' || (e.kind === 'ABA' && e.blocks >= 8) || e.kind === 'SORT_FLIP_STATIONARY' || (e.kind === 'COVERED' && e.cause.startsWith('FRONT') && !e.cause.endsWith('+SIL'))) && !skip.includes(key);
                });
                if (ev) {
                    const imgs = ev.kind === 'ABA' ? [this.ringExport(0), this.ringExport(1), this.ringExport(2)] : [];
                    return { done: false, frames: i + 1, time: engine.battleTime, ev, imgs };
                }
            }
        }
        return { done: false, frames: maxFrames, time: engine.battleTime, ev: null };
    };
}, LEGACY_DRAG);

const clickDice = async () => {
    const n = await page.evaluate((title) => {
        const btns = Array.from(document.querySelectorAll('button')).filter((b) => b.title === title);
        btns.forEach((b) => b.click());
        return btns.length;
    }, DICE_TITLE);
    if (n !== 1) throw new Error(`dice button matched ${n}`);
};

const summary = [];
const allEvents = [];
let shots = 0;
const shotQuota = new Map();

for (const theme of THEMES) {
    for (let k = 0; k < SEEDS; k++) {
        // roll until the scene matches the requested theme
        let seedUsed = 0, got = null;
        for (let attempt = 0; attempt < 60; attempt++) {
            seedUsed = 5000 + k * 97 + attempt;
            if (!REALTIME) await page.evaluate((s) => window.__resetSeed(s), seedUsed);
            await clickDice();
            await page.waitForTimeout(150);
            if (!REALTIME) await page.evaluate(() => window.__stepFrames(10));
            got = await page.evaluate(() => window.__TACTICAL_ENGINE__.currentScene.textureType);
            if (got === theme) break;
        }
        if (got !== theme) { console.log(`[${theme}] could not roll theme (got ${got})`); continue; }

        await page.evaluate(({ shrink }) => {
            const engine = window.__TACTICAL_ENGINE__;
            window.__probe.reset();
            if (!window.__probe.hooked) { window.__probe.hooked = true; engine.bus.on('ZONE_SHRUNK', () => { window.__probe.lastShrunkFrame = window.__probe.frame; }); engine.bus.on('CAMERA_SHAKE', (d) => { const C = window.__probe.counters; C.shakeEvents = (C.shakeEvents || 0) + 1; C.shakeSum = (C.shakeSum || 0) + d.intensity; C.shakeMax = Math.max(C.shakeMax || 0, d.intensity); }); }
            engine.bus.emit('UI_COMMAND', { type: 'SET_ZONE_CONFIG', config: { enabled: true, initialRadius: 12, shrinkInterval: shrink, minRadius: 1 } });
            engine.bus.emit('UI_COMMAND', { type: 'START_GAME' });
        }, { shrink: SHRINK });

        const startTime = await page.evaluate(() => window.__TACTICAL_ENGINE__.battleTime);
        let done = false, guard = 0;
        while (!done && guard++ < 400) {
            const res = await page.evaluate(({ simSec, realtime, skipKeys }) => {
                const engine = window.__TACTICAL_ENGINE__;
                if (realtime) return { done: engine.battleTime >= simSec, frames: 0, time: engine.battleTime, ev: null };
                return window.__probe.run(engine, 240, { simSec, pixels: true, skipKeys });
            }, { simSec: SIM_SEC, realtime: REALTIME, skipKeys: [...shotQuota.entries()].filter(([, n]) => n >= 2).map(([k]) => k) });
            if (REALTIME) { await page.waitForTimeout(1000); }
            done = res.done;
            if (res.ev) {
                const key = res.ev.kind + ':' + (res.ev.cause || '');
                const n = shotQuota.get(key) || 0;
                if (n < 2 && shots < MAX_SHOTS) {
                    shotQuota.set(key, n + 1);
                    shots++;
                    const tag = `${LABEL}_${theme}_s${k}_f${res.ev.frame}_${key.replace(/[^A-Za-z0-9_+-]/g, '_')}`;
                    await page.screenshot({ path: join(OUT_DIR, `${tag}.png`) });
                    (res.imgs || []).forEach((img, i) => { if (img) writeFileSync(join(OUT_DIR, `${tag}_${'abc'[i]}.png`), Buffer.from(img.split(',')[1], 'base64')); });
                    console.log(`  shot ${tag}`);
                } else if (n >= 2) shotQuota.set(key, n + 1);
            }
        }

        const out = await page.evaluate(() => {
            const P = window.__probe;
            return { counters: P.counters, events: P.events, pixelEvents: P.pixelEvents };
        });
        const alive = await page.evaluate(() => window.__TACTICAL_ENGINE__.agents.filter((a) => a.hp > 0).length);
        summary.push({ theme, seedIndex: k, seed: seedUsed, startTime, aliveAtEnd: alive, ...out.counters });
        for (const ev of out.events) allEvents.push({ theme, seedIndex: k, ...ev });
        const c = out.counters;
        console.log(`[${theme} #${k}] frames=${c.frames} unitFrames=${c.unitFrames} SINK=${c.sinkFrames} (max ${c.sinkMax.toFixed(1)}) ${JSON.stringify(c.sinkByCause)} | COVERED=${c.coveredFrames} ${JSON.stringify(c.coveredByCause)} noSil=${c.coveredNoSilhouette} | sortFlips=${c.sortFlips} stationary=${c.sortFlipsStationary} | ABA=${c.abaFrames} (max blocks ${c.abaBlocksMax}) | cache ev=${c.cacheEvictions} miss=${c.cacheMisses} fb=${c.cacheFallbacks} clr=${c.cacheClears} | tierChg=${c.tierChanges} | sortNaN=${c.nanOpFrames || 0} abaWithNan=${c.abaWithNan || 0} abaWithShake=${c.abaWithShake || 0} traumaFrames=${c.traumaFrames || 0}/${(c.traumaMax || 0).toFixed(2)} shakeEvents=${c.shakeEvents || 0} sum=${(c.shakeSum || 0).toFixed(1)} max=${(c.shakeMax || 0).toFixed(2)} sortInv=${c.inversionFrames || 0} terrainInvFrames=${c.terrainInvFrames || 0} (max ${c.terrainInvMax || 0})`);
    }
}

await browser.close();
await server.close();
writeFileSync(join(OUT_DIR, `${LABEL}_summary.json`), JSON.stringify(summary, null, 2));
writeFileSync(join(OUT_DIR, `${LABEL}_events.json`), JSON.stringify(allEvents.slice(0, 2000), null, 2));
const tot = (key) => summary.reduce((s, r) => s + (r[key] || 0), 0);
console.log(`\nTOTAL sinkFrames=${tot('sinkFrames')} coveredFrames=${tot('coveredFrames')} sortFlipsStationary=${tot('sortFlipsStationary')} abaFrames=${tot('abaFrames')} cacheEvictions=${tot('cacheEvictions')} tierChanges=${tot('tierChanges')}`);
