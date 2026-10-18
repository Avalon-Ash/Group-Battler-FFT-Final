/**
 * tools/ui-e2e/lib/coord-probes.mjs
 * Runtime probes for the render coordinate protocol (RenderSpec.ts). Evidence only: everything is monkey-patched
 * from the page, nothing in engine/ is touched.
 *
 *   floatAlign   VOID/MAGMA: unit draw Y minus its tile's draw Y must stay constant while the tiles bob.
 *   recorder     wraps RenderList.prototype.sort, so after every frame it sees the final dispatch order plus every sort
 *                input (op.y, op.sortBias, op.sortKey, op.z ...). It feeds
 *                  - the SINK check (unit feet vs the top of the tile under them) and
 *                  - the FLICKER check (pairs of overlapping ops whose relative order oscillates).
 * Sorting then dispatching in index order is exactly what RenderPipeline.drawWorld does, so the sorted list IS the draw order.
 */
import { createServer } from 'vite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export async function startServer(port) {
    const server = await createServer({ root, server: { port, strictPort: false, host: '127.0.0.1' }, logLevel: 'error' });
    await server.listen();
    return { server, port: server.config.server.port };
}

/** Seeded, steppable harness (same idea as br-soak.mjs / render-fidelity.mjs): rAF only advances through __stepFrames. */
export function seededHarnessInit() {
    let seed = 1337;
    function mulberry32() {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    Math.random = mulberry32;
    let syntheticTime = 1000.0;
    window.__resetSeed = (s = 1337) => {
        window.__TACTICAL_ENGINE__?.seedSimulation?.(s);
        seed = s;
        // br-soak also rewinds syntheticTime here; the game loop keeps `lastTime` from the previous battle, so a rewind gives a
        // negative dt and the simulation stalls (battleTime stays 0) until the clock catches up. Keep the clock monotonic.
    };
    Date.now = () => Math.floor(syntheticTime);
    performance.now = () => syntheticTime;
    let rafId = 0;
    const rafCallbacks = new Map();
    window.requestAnimationFrame = (cb) => { const id = ++rafId; rafCallbacks.set(id, cb); return id; };
    window.cancelAnimationFrame = (id) => { rafCallbacks.delete(id); };
    window.__stepFrames = (n = 1) => {
        for (let i = 0; i < n; i++) {
            syntheticTime += 16.666666666666668;
            const callbacks = Array.from(rafCallbacks.entries());
            rafCallbacks.clear();
            for (const [, cb] of callbacks) cb(syntheticTime);
        }
    };
}

/* ------------------------------------------------------------------ FLOAT */

/** Page-side: set up a small board on `biome`, hook dispatch, collect per-frame tile/unit draw Y. Returns setup info. */
export async function floatSetup(page, biome) {
    return page.evaluate(async ({ biome }) => {
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
    }, { biome });
}

export async function floatCollect(page, frames, { shot, shotPath } = {}) {
    if (shot) await page.screenshot({ path: shotPath('a') });
    await page.waitForFunction((n) => window.__ALIGN__.frames.length >= n, frames, { timeout: 60000 });
    if (shot) {
        await page.waitForTimeout(2100);
        await page.screenshot({ path: shotPath('b') });
    }
    return page.evaluate(() => window.__ALIGN__.frames);
}

/** per unit: tileY (hex under the logical q,r) - unitY must be constant; tileY itself must move on floating maps */
export function floatAnalyze(biome, frames) {
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
    return { biome, frames: frames.length, ok, bobbing, summary };
}

/** Full float check on an already-started app page (real rAF, no seeded harness). */
export async function runFloatAlign(page, biome, frames, opts = {}) {
    await floatSetup(page, biome);
    const data = await floatCollect(page, frames, opts);
    return floatAnalyze(biome, data);
}

/* --------------------------------------------------------------- RECORDER */

/**
 * Page-side: installs window.__CG__. One recorder instance serves many battles: call __CG__.begin(name), step frames,
 * call __CG__.end() to get { sink, flicker } for that run.
 * Serialised through page.evaluate, so it must stay self-contained.
 */
export async function installRecorder(page) {
    await page.evaluate(async () => {
        if (window.__CG__) return;
        const { RenderList, RenderOpType } = await import('/engine/renderers/RenderList.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const { HEX_SIZE, GROUND_DRAPE } = await import('/constants.ts');
        const engine = window.__TACTICAL_ENGINE__;
        const T = RenderOpType;
        const TNAME = ['TERRAIN', 'OBSTACLE', 'UNIT', 'VFX', 'PROJECTILE', 'HAZARD', 'AURA', 'OVERLAY', 'CORPSE'];
        const TCODE = { [T.TERRAIN]: 'T', [T.OBSTACLE]: 'O', [T.HAZARD]: 'H', [T.OVERLAY]: 'V', [T.UNIT]: 'U', [T.CORPSE]: 'C', [T.AURA]: 'A', [T.VFX]: 'X', [T.PROJECTILE]: 'P' };
        const DX = 1.6 * HEX_SIZE, DY = 2.5 * HEX_SIZE;
        const RING = 8, FIELDS = 15; // y, sortBias, sortKey, z, isGround, gHalfH, tx, ty, th, pos, type, decalLift, nearest-decal d2, its gHalfW, its ident id
        const FLIP_SPAN = 6; // two flips <= 6 frames apart => X,Y,X inside an 8-frame window
        const MOVE_PX = 2;
        const ORIG_SORT = RenderList.prototype.sort;
        const ORIG_LIFT_MIN = GROUND_DRAPE.MIN_HALF_H; // --no-decal-lift now means: no ground drape (large flat effects go back to being sorted ops)

        const S = { on: false, cfg: null, frame: 0 };
        const reset = () => {
            S.frame = 0;
            S.ids = new Map(); S.idNames = []; S.pSerial = new WeakMap(); S.serialN = 0;
            S.ring = Array.from({ length: RING }, () => ({ f: -1, idx: new Map(), buf: new Float64Array(2048 * FIELDS) }));
            S.pairs = new Map();
            S.groups = {}; S.meta = new Map(); S.decalLife = new Map(); S.decalFrames = 0; S.liftedUnitFrames = 0; S.unitFrames = 0;
            S.sink = { samples: 0, groundedSamples: 0, idleFrames: 0, nonIdleFrames: 0, violations: 0, movingViolations: 0, stationaryViolations: 0, footHexNotLogical: 0, voidSamples: 0, voidAgents: new Set(), fallingSamples: 0, worst: [], voidWorst: [], episodes: 0, violAgents: new Set(), lastViol: new Map() };
            S.battleFrames = 0; S.opsMax = 0; S.nonTerrainMax = 0; S.pairChecks = 0; S.flipsTotal = 0;
        };
        const intern = (s) => {
            let v = S.ids.get(s);
            if (v === undefined) { v = S.idNames.length; S.ids.set(s, v); S.idNames.push(s); }
            return v;
        };
        const groupOf = (n) => (S.groups[n] ||= { pairsSeen: new Set(), pairsFlipped: new Set(), pairsOsc: new Set(), flips: 0, events: 0, episodes: 0, staticEvents: 0, movedEvents: 0, ties: 0, keyGaps: [], drivers: { y: 0, sortBias: 0, zBoost: 0, decalLift: 0, other: 0 }, tiesBothLifted: 0, liftEvents: 0, liftEdge: 0, liftScaling: 0, liftDecalSwitch: 0, exStatic: [], exMoved: [] });

        function opIdent(op, occ) {
            switch (op.type) {
                case T.TERRAIN: return `T:${op.tq},${op.tr}`;
                case T.OBSTACLE: return `O:${op.tq},${op.tr}`;
                case T.OVERLAY: return `V:${op.tq},${op.tr}`;
                case T.HAZARD: { const k = `H:${op.tq},${op.tr}`; const n = occ.get(k) || 0; occ.set(k, n + 1); return n ? `${k}#${n}` : k; }
                case T.UNIT: return `U:${op.agent ? op.agent.id : '?'}`;
                case T.CORPSE: return `C:${op.agent ? op.agent.id : '?'}`;
                case T.AURA: return `A:${op.agent ? op.agent.id : '?'}`;
                case T.PROJECTILE: return `P:${op.proj ? op.proj.id : '?'}`;
                case T.VFX: {
                    const p = op.particle;
                    if (!p) return 'X:?';
                    let m = S.pSerial.get(p);
                    if (!m) { m = { s: ++S.serialN, g: 0, life: p.life, maxLife: p.maxLife, type: p.type }; S.pSerial.set(p, m); }
                    else if (p.life > m.life + 1e-6 || p.maxLife !== m.maxLife || p.type !== m.type) { m.g++; }
                    m.life = p.life; m.maxLife = p.maxLife; m.type = p.type;
                    return `X:${m.s}.${m.g}`;
                }
            }
            return '?';
        }

        function onFrame(list) {
            const f = ++S.frame;
            const n = list.count;
            const ops = list.ops;
            S.opsMax = Math.max(S.opsMax, n);
            if (engine.isRunning) S.battleFrames++;
            const slot = S.ring[f % RING];
            slot.f = f; slot.idx.clear();
            if (slot.buf.length < n * FIELDS) slot.buf = new Float64Array(n * FIELDS * 2);
            const occ = new Map();
            const idOf = new Int32Array(n);
            const decals = []; // large ground ops (since the drape change only appears with --no-decal-lift; the lift itself is gone)
            for (let i = 0; i < n; i++) { const op = ops[i]; if (op.type === T.VFX && op.isGround && op.gHalfH >= GROUND_DRAPE.MIN_HALF_H) decals.push(i); }
            const terrain = new Map();
            let terrainChecked = 0, terrainFlat = 0;
            const gridCells = new Map();
            const nonTerrain = [];
            for (let i = 0; i < n; i++) {
                const op = ops[i];
                const name = opIdent(op, occ);
                const id = intern(name);
                idOf[i] = id;
                const b = slot.buf, o = i * FIELDS;
                b[o] = op.y; b[o + 1] = op.sortBias; b[o + 2] = op.sortKey; b[o + 3] = op.z; b[o + 4] = op.isGround ? 1 : 0; b[o + 5] = op.gHalfH;
                b[o + 6] = op.tx; b[o + 7] = op.ty; b[o + 8] = op.th; b[o + 9] = i; b[o + 10] = op.type;
                // decal lift = what RenderList.sort added to a UNIT/CORPSE key beyond y + sortBias (+ tiebreak) + subLayer
                b[o + 11] = 0;
                if (op.type === T.UNIT || op.type === T.CORPSE) {
                    const expected = Math.floor((op.y + op.sortBias + (op.type === T.CORPSE ? 0.5 : 0) + 10000) * 100) + (op.type === T.UNIT ? 46 : 48);
                    const lift = op.sortKey - expected;
                    b[o + 11] = lift > 0.01 ? lift : 0;
                }
                b[o + 12] = -1; b[o + 13] = 0; b[o + 14] = -1;
                if ((op.type === T.UNIT || op.type === T.CORPSE) && decals.length) {
                    let best = Infinity, bi = -1;
                    for (let d = 0; d < decals.length; d++) {
                        const g = ops[decals[d]];
                        const dx = (op.tx - g.tx) / g.gHalfW, dy = (op.y - g.y) / g.gHalfH;
                        const d2 = dx * dx + dy * dy;
                        if (d2 < best) { best = d2; bi = decals[d]; }
                    }
                    b[o + 12] = best; b[o + 13] = ops[bi].gHalfW; b[o + 14] = bi; // bi is an op index; resolved to an ident after the loop
                }
                if (op.type === T.VFX && op.particle) S.meta.set(id, `${op.particle.type}${op.isGround ? '/ground' : '/air'}${op.particle.part ? '/part' : ''}`);
                slot.idx.set(id, i);
                if (op.type === T.TERRAIN) {
                    terrain.set(`${op.tq},${op.tr}`, op);
                    if (op.z === 0 && terrainChecked < 20) {
                        terrainChecked++;
                        const c = HexUtils.toPx(op.tq, op.tr, engine.mapConfig);
                        if (Math.abs(op.y - c.y) < 0.01) terrainFlat++;
                    }
                }
            }
            for (let i = 0; i < n; i++) { const o = i * FIELDS; if (slot.buf[o + 14] >= 0) slot.buf[o + 14] = idOf[slot.buf[o + 14]]; }
            if (decals.length) S.decalFrames++;
            for (let d = 0; d < decals.length; d++) {
                const id = idOf[decals[d]];
                const L = S.decalLife.get(id);
                if (L) { L.last = f; L.n++; } else S.decalLife.set(id, { first: f, last: f, n: 1, type: S.meta.get(id) });
            }
            for (let i = 0; i < n; i++) if (ops[i].type === T.UNIT) { S.unitFrames++; if (slot.buf[i * FIELDS + 11] > 0) S.liftedUnitFrames++; }
            const idle = terrainChecked === 0 || terrainFlat >= terrainChecked * 0.9; // transition offset is 0 in the IDLE phase

            /* ---- SINK ---- */
            if (S.cfg.sink) {
                if (!idle) S.sink.nonIdleFrames++;
                else {
                    S.sink.idleFrames++;
                    for (let i = 0; i < n; i++) {
                        const op = ops[i];
                        if (op.type !== T.UNIT || !op.agent) continue;
                        const a = op.agent;
                        if (S.cfg.injectSink) op.ty += S.cfg.injectSink; // negative control: proves the check can fire
                        S.sink.samples++;
                        const pz = a.physics.z;
                        if (pz < -1) { S.sink.fallingSamples++; continue; }
                        if (pz >= 1) continue;
                        S.sink.groundedSamples++;
                        const hex = HexUtils.fromPx(op.tx, op.y, engine.mapConfig);
                        const t = terrain.get(`${hex.q},${hex.r}`);
                        if (!t) {
                            S.sink.voidSamples++; S.sink.voidAgents.add(a.id);
                            if (S.sink.voidWorst.length < 5) S.sink.voidWorst.push({ agent: a.id, frame: f, hex: [hex.q, hex.r], logical: [a.q, a.r], physicsZ: +pz.toFixed(2), isMoving: !!a.isMoving, mapValid: engine.map.isValid(hex.q, hex.r), logicalValid: engine.map.isValid(a.q, a.r), collapsing: engine.zones.collapsingTiles.has(`${hex.q},${hex.r}`), deathTimer: a.deathTimer, hp: a.hp });
                            continue;
                        }
                        if (t.z < 0) continue; // collapsing tile still falling
                        // tile top surface at the unit's footprint: the foot is not at the hex centre, so add the footprint offset (op.y - t.y).
                        // Reduces to (tile.th - unit ground height) on a fixed map and also catches a bob mismatch on floating maps.
                        const tileTop = t.ty - t.th + (op.y - t.y);
                        const delta = op.ty - tileTop;
                        if (delta > 1) {
                            S.sink.violations++;
                            if (a.isMoving) S.sink.movingViolations++; else S.sink.stationaryViolations++;
                            const logical = hex.q === a.q && hex.r === a.r;
                            if (!logical) S.sink.footHexNotLogical++;
                            S.sink.violAgents.add(a.id);
                            const last = S.sink.lastViol.get(a.id);
                            if (last === undefined || f - last > 3) S.sink.episodes++;
                            S.sink.lastViol.set(a.id, f);
                            const rec = { agent: a.id, frame: f, q: hex.q, r: hex.r, logicalQ: a.q, logicalR: a.r, unitTy: +op.ty.toFixed(2), tileTopY: +tileTop.toFixed(2), delta: +delta.toFixed(2), tileTh: t.th, unitTh: op.th, isMoving: !!a.isMoving, moveProgress: +a.moveProgress.toFixed(3), pathLen: a.path ? a.path.length : 0, physicsZ: +pz.toFixed(2) };
                            const w = S.sink.worst;
                            if (w.length < 10 || delta > w[w.length - 1].delta) {
                                w.push(rec); w.sort((x, y) => y.delta - x.delta); if (w.length > 10) w.length = 10;
                            }
                        }
                    }
                }
            }

            /* ---- FLICKER ---- */
            if (!S.cfg.flicker) return;
            const cellKey = (cx, cy) => cx * 100003 + cy;
            const cx0 = (x) => Math.floor(x / DX), cy0 = (y) => Math.floor(y / DY);
            for (let i = 0; i < n; i++) {
                const op = ops[i];
                const ck = cellKey(cx0(op.tx), cy0(op.ty));
                let arr = gridCells.get(ck);
                if (!arr) { arr = []; gridCells.set(ck, arr); }
                arr.push(i);
                if (op.type !== T.TERRAIN) nonTerrain.push(i);
            }
            S.nonTerrainMax = Math.max(S.nonTerrainMax, nonTerrain.length);
            const isFx = (t) => t === T.VFX || t === T.PROJECTILE;
            for (let ni = 0; ni < nonTerrain.length; ni++) {
                const i = nonTerrain[ni];
                const a = ops[i];
                const cx = cx0(a.tx), cy = cy0(a.ty);
                for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
                    const arr = gridCells.get(cellKey(cx + ox, cy + oy));
                    if (!arr) continue;
                    for (let k = 0; k < arr.length; k++) {
                        const j = arr[k];
                        if (j === i) continue;
                        const b = ops[j];
                        if (b.type !== T.TERRAIN && j < i) continue; // non-terrain pairs counted once
                        if (!S.cfg.fxfx && isFx(a.type) && isFx(b.type)) continue;
                        if (Math.abs(a.tx - b.tx) >= DX || Math.abs(a.ty - b.ty) >= DY) continue;
                        const ia = idOf[i], ib = idOf[j];
                        const lo = ia < ib ? ia : ib, hi = ia < ib ? ib : ia;
                        const pk = lo * 4194304 + hi;
                        const posLo = ia < ib ? i : j, posHi = ia < ib ? j : i;
                        const bit = posLo < posHi ? 1 : 0; // 1: lo drawn before hi
                        S.pairChecks++;
                        let st = S.pairs.get(pk);
                        if (!st) {
                            st = { last: -99, bit, flips: [], lastEv: -99 };
                            S.pairs.set(pk, st);
                            st.lo = lo; st.hi = hi;
                        }
                        const tLo = (ia < ib ? a : b).type, tHi = (ia < ib ? b : a).type;
                        const gname = TNAME[tLo] <= TNAME[tHi] ? `${TNAME[tLo]}×${TNAME[tHi]}` : `${TNAME[tHi]}×${TNAME[tLo]}`;
                        groupOf(gname).pairsSeen.add(pk);
                        if (st.last === f - 1) {
                            if (st.bit !== bit) {
                                // a flip at frame f
                                S.flipsTotal++;
                                const g = groupOf(gname);
                                g.flips++; g.pairsFlipped.add(pk);
                                const prev = st.flips.length ? st.flips[st.flips.length - 1] : -99;
                                st.flips.push(f);
                                if (st.flips.length > 6) st.flips.shift();
                                if (f - prev <= FLIP_SPAN) {
                                    const f1 = prev, f2 = f;
                                    // positions of both ops at f1-1 and f2 (ring)
                                    const sA = S.ring[(f1 - 1 + RING * 4) % RING], sB = S.ring[f2 % RING];
                                    let movedA = 0, movedB = 0, d0 = null, d1 = null, d2 = null;
                                    const A = S.idNames[lo], B = S.idNames[hi];
                                    const rd = (slotX, id) => {
                                        if (slotX.f < 0) return null;
                                        const ix = slotX.idx.get(id);
                                        if (ix === undefined) return null;
                                        const o = ix * FIELDS, b = slotX.buf;
                                        return { y: b[o], sortBias: b[o + 1], sortKey: b[o + 2], z: b[o + 3], isGround: !!b[o + 4], gHalfH: b[o + 5], tx: b[o + 6], ty: b[o + 7], th: b[o + 8], pos: b[o + 9], type: TNAME[b[o + 10]], lift: b[o + 11], decalD2: b[o + 12], decalHalfW: b[o + 13], decalId: b[o + 14] >= 0 ? S.idNames[b[o + 14]] : null, decalType: b[o + 14] >= 0 ? S.meta.get(b[o + 14]) : null, vfxType: S.meta.get(id) || null };
                                    };
                                    const frameA0 = S.ring[(f1 - 1 + RING * 4) % RING], frameA1 = S.ring[f1 % RING], frameA2 = S.ring[f2 % RING];
                                    const okSlot = (sl, ff) => sl.f === ff;
                                    if (okSlot(frameA0, f1 - 1) && okSlot(frameA1, f1) && okSlot(frameA2, f2)) {
                                        const a0 = rd(frameA0, lo), a1 = rd(frameA1, lo), a2 = rd(frameA2, lo);
                                        const b0 = rd(frameA0, hi), b1 = rd(frameA1, hi), b2 = rd(frameA2, hi);
                                        if (a0 && a1 && a2 && b0 && b1 && b2) {
                                            const mv = (p, q) => Math.hypot(p.tx - q.tx, p.ty - q.ty);
                                            movedA = Math.max(mv(a0, a1), mv(a1, a2), mv(a0, a2));
                                            movedB = Math.max(mv(b0, b1), mv(b1, b2), mv(b0, b2));
                                            d0 = { A: a0, B: b0 }; d1 = { A: a1, B: b1 }; d2 = { A: a2, B: b2 };
                                            const moved = movedA > MOVE_PX || movedB > MOVE_PX;
                                            g.events++;
                                            g.pairsOsc.add(pk);
                                            if (f - st.lastEv > FLIP_SPAN) g.episodes++;
                                            st.lastEv = f;
                                            if (moved) g.movedEvents++; else g.staticEvents++;
                                            const gap = (d) => d.B.sortKey - d.A.sortKey;
                                            const minGap = Math.min(Math.abs(gap(d0)), Math.abs(gap(d1)), Math.abs(gap(d2)));
                                            if (minGap < 0.05) g.ties++;
                                            if ([d0, d1, d2].some((d) => Math.abs(d.B.sortKey - d.A.sortKey) < 0.05 && d.A.lift > 0 && d.B.lift > 0)) g.tiesBothLifted++;
                                            if (g.keyGaps.length < 4000) g.keyGaps.push(+minGap.toFixed(3));
                                            // which sort input moved the key gap B-A the most across the two flip transitions (in key units, 100 = 1 px of Y)
                                            // air VFX height no longer enters the key (RenderSpec §2): the zBoost driver stays 0; kept so the driver table keeps its columns
                                            const zb = () => 0;
                                            const comps = (d) => ({ y: d.y * 100, sortBias: d.sortBias * 100, zBoost: zb(d), decalLift: d.lift });
                                            let tag = 'other', best = 0;
                                            for (const [p, q] of [[d0, d1], [d1, d2]]) {
                                                const cp = [comps(p.A), comps(p.B)], cq = [comps(q.A), comps(q.B)];
                                                for (const k of ['y', 'sortBias', 'zBoost', 'decalLift']) {
                                                    const dd = Math.abs((cq[1][k] - cq[0][k]) - (cp[1][k] - cp[0][k]));
                                                    if (dd > best + 1e-6) { best = dd; tag = k; }
                                                }
                                            }
                                            g.drivers[tag]++;
                                            if (tag === 'decalLift') {
                                                g.liftEvents++;
                                                const side = ['A', 'B'].find((k) => new Set([d0, d1, d2].map((d) => d[k].lift > 0)).size > 1);
                                                if (side) {
                                                    const ds = [d0, d1, d2].map((d) => d[side]);
                                                    if (ds.some((d) => d.decalD2 >= 0 && Math.abs(d.decalD2 - 1) < 0.25)) g.liftEdge++;
                                                    const hw = ds.map((d) => d.decalHalfW), hmax = Math.max(...hw), hmin = Math.min(...hw);
                                                    if (hmax > 0 && (hmax - hmin) / hmax > 0.02) g.liftScaling++;
                                                    if (new Set(ds.map((d) => d.decalId)).size > 1) g.liftDecalSwitch++;
                                                }
                                            }
                                            const ex = { pair: [A, B], frames: [f1 - 1, f1, f2], moved: [+movedA.toFixed(2), +movedB.toFixed(2)], atFrames: [d0, d1, d2].map((d) => ({ A: d.A, B: d.B, keyGapBminusA: +(d.B.sortKey - d.A.sortKey).toFixed(3) })), battleFrame: S.battleFrames, engineBattleTime: +engine.battleTime.toFixed(3) };
                                            const arrEx = moved ? g.exMoved : g.exStatic;
                                            if (arrEx.length < 3) arrEx.push(ex);
                                        }
                                    }
                                }
                            }
                        }
                        st.last = f; st.bit = bit;
                    }
                }
            }
            if (f % 120 === 0) {
                for (const [k, st] of S.pairs) if (st.last < f - 30) S.pairs.delete(k);
            }
        }

        RenderList.prototype.sort = function () {
            ORIG_SORT.call(this);
            if (S.on) onFrame(this);
        };
        window.__CG__ = {
            begin(cfg) { S.cfg = { sink: true, flicker: true, fxfx: false, ...cfg }; reset(); GROUND_DRAPE.MIN_HALF_H = S.cfg.noDecalLift ? 1e9 : ORIG_LIFT_MIN; S.on = true; },
            frames() { return S.frame; },
            end() {
                S.on = false;
                const sk = S.sink;
                const groups = {};
                for (const [name, g] of Object.entries(S.groups)) {
                    if (!g.flips && !g.events) continue;
                    const gaps = g.keyGaps.slice().sort((a, b) => a - b);
                    groups[name] = { pairsSeen: g.pairsSeen.size, pairsFlipped: g.pairsFlipped.size, pairsOscillating: g.pairsOsc.size, flips: g.flips, events: g.events, episodes: g.episodes, staticEvents: g.staticEvents, movedEvents: g.movedEvents, ties: g.ties, medianMinKeyGap: gaps.length ? gaps[gaps.length >> 1] : null, drivers: g.drivers, tiesBothLifted: g.tiesBothLifted, liftEvents: g.liftEvents, liftEdge: g.liftEdge, liftScaling: g.liftScaling, liftDecalSwitch: g.liftDecalSwitch, exStatic: g.exStatic, exMoved: g.exMoved };
                }
                const lives = [...S.decalLife.values()].map((l) => ({ life: l.last - l.first + 1, n: l.n, type: l.type }));
                const bucket = (lo, hi) => lives.filter((l) => l.life >= lo && l.life <= hi).length;
                const byType = {};
                for (const l of lives) { const t = (byType[l.type] ||= { count: 0, frames: 0, withGaps: 0 }); t.count++; t.frames += l.n; if (l.life !== l.n) t.withGaps++; }
                const sortedLife = lives.map((l) => l.life).sort((a, b) => a - b);
                const decalStats = { decalFramesWithDecals: S.decalFrames, unitFrames: S.unitFrames, liftedUnitFrames: S.liftedUnitFrames, decalsSeen: lives.length, lifetimeFrames: { median: sortedLife.length ? sortedLife[sortedLife.length >> 1] : 0, le3: bucket(0, 3), f4to10: bucket(4, 10), f11to30: bucket(11, 30), gt30: bucket(31, 1e9) }, withGaps: lives.filter((l) => l.life !== l.n).length, byType };
                return {
                    decalStats,
                    frames: S.frame, battleFrames: S.battleFrames, opsMax: S.opsMax, nonTerrainMax: S.nonTerrainMax, pairChecks: S.pairChecks, flipsTotal: S.flipsTotal,
                    sink: { samples: sk.samples, groundedSamples: sk.groundedSamples, idleFrames: sk.idleFrames, nonIdleFrames: sk.nonIdleFrames, violations: sk.violations, episodes: sk.episodes, agentsAffected: sk.violAgents.size, movingViolations: sk.movingViolations, stationaryViolations: sk.stationaryViolations, footHexNotLogical: sk.footHexNotLogical, voidSamples: sk.voidSamples, voidAgents: sk.voidAgents.size, fallingSamples: sk.fallingSamples, worst: sk.worst, voidWorst: sk.voidWorst },
                    flicker: groups,
                };
            },
        };
    });
}

/* ------------------------------------------------------------- SCENARIOS */

/** Page-side: build a fresh battlefield on `biome` (seeded), optionally start the zone-shrink battle royale. */
export async function setupBattle(page, { biome, seed, units = 6, start = true, shrinkInterval = 3 }) {
    await page.evaluate((s) => window.__resetSeed(s), seed);
    return page.evaluate(async ({ biome, units, start, shrinkInterval }) => {
        const e = window.__TACTICAL_ENGINE__;
        const { Team, Role } = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        e.bus.emit('UI_COMMAND', { type: 'STOP_GAME' });
        e.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', w: 12, h: 10, layout: Math.random() > 0.5 ? 'FLAT' : 'POINTY', sceneId: biome, randomizeScene: false });
        e.bus.emit('UI_COMMAND', { type: 'CLEAR_BOARD', keepScene: true });
        e.bus.emit('UI_COMMAND', { type: 'SET_DIRECTOR_ENABLED', enabled: false });
        const valid = [...e.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
            .filter((h) => !e.hasObstacle(h.q, h.r) && HexUtils.dist({ q: 0, r: 0 }, h) <= 5);
        valid.sort((a, b) => a.q - b.q || a.r - b.r);
        const roles = Object.values(Role).filter((v) => typeof v === 'string');
        const left = valid.filter((h) => h.q < 0), right = valid.filter((h) => h.q > 0);
        const pick = (arr) => arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
        for (let i = 0; i < units; i++) {
            const a = pick(left), b = pick(right);
            if (a) e.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: a.q, r: a.r, hp: 1500 + Math.random() * 500, role: roles[Math.floor(Math.random() * roles.length)] });
            if (b) e.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.RED, q: b.q, r: b.r, hp: 1500 + Math.random() * 500, role: roles[Math.floor(Math.random() * roles.length)] });
        }
        if (start) {
            e.bus.emit('UI_COMMAND', { type: 'SET_ZONE_CONFIG', config: { enabled: true, initialRadius: 8, shrinkInterval, minRadius: 1 } });
            e.bus.emit('UI_COMMAND', { type: 'START_GAME' });
        }
        let hMin = 99, hMax = -99;
        for (const k of e.mapKeys) { const [q, r] = k.split(',').map(Number); const h = e.getTerrainHeight(q, r); hMin = Math.min(hMin, h); hMax = Math.max(hMax, h); }
        return { scene: e.currentScene.id, texture: e.currentScene.textureType, agents: e.agents.length, tiles: e.mapKeys.size, obstacles: e.obstacles.size, heightRange: [hMin, hMax], layout: e.mapConfig.layout };
    }, { biome, units, start, shrinkInterval });
}

/** Step `frames` seeded frames; `driveClock` advances battleTime so edit mode still bobs (the bob clock). */
export async function stepFrames(page, frames, { driveClock = false } = {}) {
    const chunk = 60;
    for (let done = 0; done < frames; done += chunk) {
        const n = Math.min(chunk, frames - done);
        await page.evaluate(({ n, driveClock }) => {
            const e = window.__TACTICAL_ENGINE__;
            for (let i = 0; i < n; i++) {
                if (driveClock && !e.isRunning) e.battleTime += 1 / 60;
                window.__stepFrames(1);
            }
        }, { n, driveClock });
    }
}
