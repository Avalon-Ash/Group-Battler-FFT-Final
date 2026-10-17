/**
 * tools/ui-e2e/lib/depth-oracle.mjs
 * STABLE wrong-draw-order detector (evidence only; everything is monkey-patched from the page, engine/ is not touched).
 * The flicker probe in coord-probes.mjs only sees order that oscillates; a pair drawn in the wrong order EVERY frame is
 * invisible to it. This module judges every overlapping pair against a geometric oracle instead.
 *
 * ── ORACLE RULE (ground-plane footprint order) ──────────────────────────────────────────────────────────────
 * Every judged op stands on the ground plane. Heights are NOT part of the rule (this is a painter's algorithm over
 * prisms whose footprints do not overlap: an object whose footprint is further from the camera must be drawn first, however
 * tall it is, because tall things behind never cover things in front, and tall things in front always cover things behind).
 *   - TERRAIN / OBSTACLE / HAZARD stand on their own hex (footprint polygon = the Voronoi hex cell, radius HEX_SIZE, ISO-projected).
 *   - UNIT / CORPSE stand on a FOOT POINT (op.tx, op.y). Their hex is fromPx(foot) (= UnitFrame.hexUnderFoot).
 *   Expected order of two ops A, B (the one listed first must be drawn first):
 *     1. same hex            TERRAIN < HAZARD < OBSTACLE/UNIT/CORPSE   (obstacle vs unit in one hex: no constraint)
 *     2. hex vs hex          smaller hex-center screen Y first. Equal Y (same row): no constraint.
 *                            Hexes whose footprints share no x-range (|dx| >= hex width) cannot occlude each other: no constraint.
 *     3. unit foot vs hex B  COLUMN RULE: cut B's footprint polygon with the vertical line x = foot.x.
 *                            foot.y above the polygon's top edge at that x  -> the unit is behind B  -> unit first.
 *                            foot.y below the bottom edge                   -> the unit is in front -> unit after.
 *                            foot.x outside B's x-range                     -> no constraint.
 *   The column rule is the refinement over "compare hex-center Y" (the first version of the oracle): a foot that is inside hex A
 *   but already below the CENTER line of a half-step neighbour B (FLAT: dy 20.8 px, foot can sit 25 px under A's centre) is NOT in
 *   front of B, because at the foot's x B's footprint is still entirely below it. Comparing against the centre would flag
 *   those (correct) cases. Hex-vs-hex needs no refinement: where two cells share an x-range the one with the smaller centre Y is behind.
 *   Unit x unit, VFX, decals, overlays, auras are out of scope.
 *
 * ── JUDGED PAIRS ───────────────────────────────────────────────────────────────────────────────────────────
 * Types TERRAIN, OBSTACLE, HAZARD, UNIT, CORPSE; at least one side UNIT/CORPSE/OBSTACLE; screen silhouettes must overlap (convex SAT):
 *   tile      convex hull of the top ring (ty - h) and the bottom ring (ty + foundation depth)  [TerrainRenderer.bakeBlock geometry]
 *   obstacle  alpha bounding box of the real sprite, placed at (tx - ENV_SPRITE.ANCHOR_X, ty - ENV_SPRITE.ANCHOR_Y)
 *   hazard    flat hex ring at ty
 *   unit      box: x ±22, y from (ty - physics.z - SpriteUnitRenderer.getHeadHeight - 4) to (ty + 14)   (pedestal + sprite)
 * Violation = expected-first op is sorted AFTER the expected-second op in the final dispatch order (RenderList.sort output).
 * STABLE = the same ordered pair is violated in >= 3 consecutive frames.
 *
 * ── DRIVER (which sort input is responsible) ──────────────────────────────────────────────────────────────
 * Counterfactual: recompute both ops' sort keys with subsets of {E = h*TERRAIN_SORT_SCALE term of OBSTACLE/HAZARD,
 * SB = unit sortBias, LIFT = decal lift} removed; the smallest subset that makes the pair right is the driver. If nothing
 * fixes it, the pure footprint keys decide: equal Y bucket -> 'subLayerTie', otherwise 'footprintY'.
 *
 * Does not depend on the decal-lift code: it only reads op fields after the sort (LIFT is inferred from sortKey - recomputed key).
 */

/** Page side. Installs window.__DO__ = { begin(cfg), end(), last() }. Self-contained: it is serialised through page.evaluate. */
export async function installDepthOracle(page) {
    await page.evaluate(async () => {
        if (window.__DO__) return;
        const { RenderList, RenderOpType } = await import('/engine/renderers/RenderList.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const { HexGeometry } = await import('/engine/graphics/utils/HexGeometry.ts');
        const { SpriteManager } = await import('/engine/sprites.ts');
        const { SpriteUnitRenderer } = await import('/engine/renderers/units/factions/SpriteUnitRenderer.ts');
        const K = await import('/constants.ts');
        const engine = window.__TACTICAL_ENGINE__;
        const T = RenderOpType;
        const R = K.HEX_SIZE;
        const EXPANSION_BIAS = 0.6;   // TerrainRenderer.EXPANSION_BIAS
        const PEDESTAL_DEPTH = 45;    // TerrainRenderer.PEDESTAL_DEPTH
        const SUB = { [T.TERRAIN]: 10, [T.HAZARD]: 30, [T.OBSTACLE]: 44, [T.UNIT]: 46, [T.CORPSE]: 48 }; // RenderList SUB_LAYER
        const TNAME = { [T.TERRAIN]: 'TERRAIN', [T.HAZARD]: 'HAZARD', [T.OBSTACLE]: 'OBSTACLE', [T.UNIT]: 'UNIT', [T.CORPSE]: 'CORPSE' };
        const RANK = { [T.TERRAIN]: 0, [T.HAZARD]: 1, [T.OBSTACLE]: 2, [T.UNIT]: 2, [T.CORPSE]: 2 };
        const UNIT_HALF_W = 22, UNIT_PAD_TOP = 4, UNIT_PAD_BOTTOM = 14, UNIT_FALLBACK_H = K.UNIT_SPRITE.targetHeightCanvasUnits;
        const MIN_STABLE = 3;
        const EX_PER_GROUP = 4, EP_CAP = 6000;

        const S = { on: false, cfg: {}, frame: 0 };
        const ringCache = new Map();
        const ring = (layout, r) => {
            const k = `${layout}:${r}`;
            let v = ringCache.get(k);
            if (!v) { v = HexGeometry.getVertices(r, true, layout); ringCache.set(k, v); }
            return v;
        };
        const obsBoxCache = new Map();
        function obstacleBox(type, layout) {
            const key = `${type}:${layout}`;
            let b = obsBoxCache.get(key);
            if (b) return b;
            const cv = SpriteManager.getObstacleSprite(type, layout);
            const w = cv.width, h = cv.height;
            const d = cv.getContext('2d').getImageData(0, 0, w, h).data;
            let x0 = w, x1 = -1, y0 = h, y1 = -1;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                if (d[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            }
            b = x1 < 0 ? { x0: 0, y0: 0, x1: w, y1: h } : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
            // opaque sample points (every 3rd px) to measure how much of the sprite really covers another silhouette
            const pts = [];
            for (let y = y0; y <= y1; y += 3) for (let x = x0; x <= x1; x += 3) if (d[(y * w + x) * 4 + 3] > 64) pts.push(x, y);
            b.pts = pts;
            obsBoxCache.set(key, b);
            return b;
        }
        function hull(pts) {
            const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
            const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
            const lo = [];
            for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
            const up = [];
            for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
            lo.pop(); up.pop();
            return lo.concat(up);
        }
        function satOverlap(A, B) {
            for (const P of [A, B]) {
                for (let i = 0; i < P.length; i++) {
                    const a = P[i], b = P[(i + 1) % P.length];
                    const nx = b.y - a.y, ny = a.x - b.x;
                    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
                    for (const q of A) { const v = q.x * nx + q.y * ny; if (v < aMin) aMin = v; if (v > aMax) aMax = v; }
                    for (const q of B) { const v = q.x * nx + q.y * ny; if (v < bMin) bMin = v; if (v > bMax) bMax = v; }
                    if (aMax <= bMin || bMax <= aMin) return false;
                }
            }
            return true;
        }
        /** px^2 of `it`'s opaque obstacle pixels that fall inside the other op's silhouette (sampled every 3 px) */
        function opaqueOverlap(it, other) {
            const { b, ox, oy } = it.sprite;
            const P = other.poly, n = P.length;
            let sign = 0;
            { const a = P[0], c = P[1], d = P[2]; sign = Math.sign((c.x - a.x) * (d.y - a.y) - (c.y - a.y) * (d.x - a.x)) || 1; }
            let hit = 0;
            for (let k = 0; k < b.pts.length; k += 2) {
                const x = ox + b.pts[k], y = oy + b.pts[k + 1];
                let inside = true;
                for (let i = 0; i < n; i++) {
                    const a = P[i], c = P[(i + 1) % n];
                    if (sign * ((c.x - a.x) * (y - a.y) - (c.y - a.y) * (x - a.x)) < 0) { inside = false; break; }
                }
                if (inside) hit++;
            }
            return hit * 9;
        }
        /** y-range of the convex polygon `poly` on the vertical line x, or null when x is outside it */
        function yRangeAt(poly, x) {
            let lo = Infinity, hi = -Infinity;
            for (let i = 0; i < poly.length; i++) {
                const a = poly[i], b = poly[(i + 1) % poly.length];
                if ((a.x <= x && x <= b.x) || (b.x <= x && x <= a.x)) {
                    if (a.x === b.x) { lo = Math.min(lo, a.y, b.y); hi = Math.max(hi, a.y, b.y); }
                    else { const y = a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x); lo = Math.min(lo, y); hi = Math.max(hi, y); }
                }
            }
            return lo === Infinity ? null : [lo, hi];
        }
        function terrainDepth(op) {
            const cur = Math.max(PEDESTAL_DEPTH, op.th + 15);
            if (!(op.tBase > 0)) return cur;
            const f = K.TERRAIN_SKIN.foundation;
            const prof = f.profiles[op.ttype] ?? f.defaultProfile;
            const levelT = (Math.min(op.tBase, f.levels) - 1) / Math.max(1, f.levels - 1);
            return Math.max(cur, prof.minDepth + (prof.maxDepth - prof.minDepth) * levelT);
        }
        const rect = (x0, y0, x1, y1) => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
        const aabb = (poly) => {
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (const p of poly) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
            return { x0, y0, x1, y1 };
        };
        function identOf(it) {
            const op = it.op;
            if (it.t === T.UNIT || it.t === T.CORPSE) return `${it.t === T.UNIT ? 'U' : 'C'}:${op.agent ? op.agent.id : '?'}`;
            return `${TNAME[it.t][0]}:${op.tq},${op.tr}`;
        }

        function buildItems(list) {
            const cfg = engine.mapConfig, layout = cfg.layout;
            const items = [];
            const ops = list.ops;
            const footRing = ring(layout, R);
            const wHalf = Math.max(...footRing.map((v) => v.x));
            for (let i = 0; i < list.count; i++) {
                const op = ops[i], t = op.type;
                if (t !== T.TERRAIN && t !== T.OBSTACLE && t !== T.HAZARD && t !== T.UNIT && t !== T.CORPSE) continue;
                if (t === T.TERRAIN && op.z < 0) continue; // collapsing tile: not on the ground plane any more
                const it = { i, op, t, hex: t === T.TERRAIN || t === T.OBSTACLE || t === T.HAZARD, wHalf, E: 0, headH: 0 };
                if (it.hex) {
                    const c = HexUtils.toPx(op.tq, op.tr, cfg);
                    it.q = op.tq; it.r = op.tr; it.cx = c.x; it.cy = c.y;
                    if (t === T.TERRAIN) {
                        const rr = ring(layout, R + EXPANSION_BIAS), depth = terrainDepth(op), pts = [];
                        for (const v of rr) { pts.push({ x: op.tx + v.x, y: op.ty - op.th + v.y }); pts.push({ x: op.tx + v.x, y: op.ty + depth + v.y }); }
                        it.poly = hull(pts);
                    } else if (t === T.OBSTACLE) {
                        const b = obstacleBox(op.ttype, layout);
                        const ox = Math.round(op.tx) - K.ENV_SPRITE.ANCHOR_X, oy = Math.round(op.ty) - K.ENV_SPRITE.ANCHOR_Y;
                        it.poly = rect(ox + b.x0, oy + b.y0, ox + b.x1, oy + b.y1);
                        it.sprite = { b, ox, oy };
                        it.E = op.y - c.y;
                    } else {
                        it.poly = ring(layout, R).map((v) => ({ x: op.tx + v.x, y: op.ty + v.y }));
                        it.E = op.y - c.y;
                    }
                } else {
                    it.fx = op.tx; it.fy = op.y;
                    const hx = HexUtils.fromPx(it.fx, it.fy, cfg);
                    const c = HexUtils.toPx(hx.q, hx.r, cfg);
                    it.q = hx.q; it.r = hx.r; it.cx = c.x; it.cy = c.y;
                    let H = UNIT_FALLBACK_H;
                    try { const hh = op.agent ? SpriteUnitRenderer.getHeadHeight(op.agent) : null; if (hh) H = hh; } catch { /* atlas not ready */ }
                    it.headH = H;
                    const lift = op.agent && op.agent.physics && op.agent.physics.z > 0 ? op.agent.physics.z : 0;
                    it.poly = rect(op.tx - UNIT_HALF_W, op.ty - lift - H - UNIT_PAD_TOP, op.tx + UNIT_HALF_W, op.ty + UNIT_PAD_BOTTOM);
                }
                it.box = aabb(it.poly);
                it.id = identOf(it);
                items.push(it);
            }
            return items;
        }

        /** -1: a must be drawn first, +1: b must be drawn first, 0: no constraint; also returns the rule used */
        function expectOrder(a, b) {
            if (!a.hex && !b.hex) return [0, ''];
            if (a.hex && b.hex) {
                if (a.q === b.q && a.r === b.r) { const ra = RANK[a.t], rb = RANK[b.t]; return ra === rb ? [0, ''] : [ra < rb ? -1 : 1, 'sameHex']; }
                if (Math.abs(a.cx - b.cx) >= 2 * a.wHalf - 0.5) return [0, ''];
                const d = a.cy - b.cy;
                return Math.abs(d) < 0.5 ? [0, ''] : [d < 0 ? -1 : 1, 'hexRow'];
            }
            const u = a.hex ? b : a, g = a.hex ? a : b;
            let unitFirst; // true: unit must be drawn first
            let rule;
            if (u.q === g.q && u.r === g.r) {
                if (RANK[g.t] === RANK[u.t]) return [0, ''];
                unitFirst = RANK[u.t] < RANK[g.t]; rule = 'sameHex';
            } else {
                const poly = ring(engine.mapConfig.layout, R).map((v) => ({ x: g.cx + v.x, y: g.cy + v.y }));
                if (u.fx <= g.cx - g.wHalf || u.fx >= g.cx + g.wHalf) return [0, ''];
                const yr = yRangeAt(poly, u.fx);
                if (!yr) return [0, ''];
                if (u.fy < yr[0]) unitFirst = true; else if (u.fy > yr[1]) unitFirst = false; else return [0, ''];
                rule = 'column';
            }
            // translate "unit first?" into a-relative sign
            const aIsUnit = a === u;
            return [unitFirst === aIsUnit ? -1 : 1, rule];
        }

        function keyOf(it, drop) {
            const op = it.op;
            const sb = op.sortBias || 0;
            const tb = it.t === T.CORPSE ? 0.5 : 0;
            const full = Math.floor((op.y + sb + tb + 10000) * 100) + SUB[it.t];
            const lift = (it.t === T.UNIT || it.t === T.CORPSE) && op.sortKey - full > 0.5 ? op.sortKey - full : 0;
            const y = op.y - (drop.E ? it.E : 0) + (drop.SB ? 0 : sb) + tb;
            return Math.floor((y + 10000) * 100) + SUB[it.t] + (drop.LIFT ? 0 : lift);
        }
        function pureKeys(first, second) {
            const k = (it) => Math.floor((it.op.y - it.E + (it.t === T.CORPSE ? 0.5 : 0) + 10000) * 100);
            return [k(first), k(second)];
        }
        /** smallest subset of {E, SB, LIFT} whose removal makes first<second again */
        function driverOf(first, second) {
            const subsets = [['LIFT'], ['E'], ['SB'], ['E', 'SB'], ['E', 'LIFT'], ['SB', 'LIFT'], ['E', 'SB', 'LIFT']];
            for (const s of subsets) {
                const drop = { E: s.includes('E'), SB: s.includes('SB'), LIFT: s.includes('LIFT') };
                if (keyOf(first, drop) < keyOf(second, drop)) return s.map((x) => ({ E: 'hTerm', SB: 'sortBias', LIFT: 'decalLift' })[x]).join('+');
            }
            const [a, b] = pureKeys(first, second);
            return a === b ? 'subLayerTie' : 'footprintY';
        }

        const reset = () => {
            S.frame = 0; S.judged = 0; S.judgedByGroup = {}; S.open = new Map(); S.episodes = []; S.episodesDropped = 0;
            S.shortByGroup = {}; S.wrongPairFramesByGroup = {}; S.wrongFramesTotal = 0; S.framesWithWrong = 0; S.last = null; S.opsFrames = 0;
        };
        reset();
        const groupName = (a, b) => [TNAME[a.t], TNAME[b.t]].sort().join('×');

        function onFrame(list) {
            const f = ++S.frame;
            const judged0 = S.judged;
            const items = buildItems(list);
            const special = [];
            for (let i = 0; i < items.length; i++) { const t = items[i].t; if (t === T.UNIT || t === T.CORPSE || t === T.OBSTACLE) special.push(i); }
            const touched = new Set();
            const frameViol = S.cfg.keepLast ? [] : null;
            const framePairs = S.cfg.keepLast ? [] : null;
            let anyWrong = false;
            const cfg = engine.mapConfig;
            const rowStep = cfg.layout === 'FLAT' ? R * Math.sqrt(3) * 0.5 * 0.5 : R * 1.5 * 0.5; // vertical hex-row step in px (ISO applied)
            for (const si of special) {
                const a = items[si];
                for (let j = 0; j < items.length; j++) {
                    if (j === si) continue;
                    const b = items[j];
                    if ((b.t === T.UNIT || b.t === T.CORPSE || b.t === T.OBSTACLE) && j < si) continue; // each special pair once
                    if (a.box.x1 <= b.box.x0 || b.box.x1 <= a.box.x0 || a.box.y1 <= b.box.y0 || b.box.y1 <= a.box.y0) continue;
                    if (!satOverlap(a.poly, b.poly)) continue;
                    const [exp, rule] = expectOrder(a, b);
                    if (exp === 0) continue;
                    const gname = groupName(a, b);
                    S.judged++;
                    S.judgedByGroup[gname] = (S.judgedByGroup[gname] || 0) + 1;
                    const first = exp < 0 ? a : b, second = exp < 0 ? b : a;
                    if (framePairs) framePairs.push([first.id, second.id, first.i < second.i ? 1 : 0]);
                    if (first.i < second.i) continue; // drawn in the expected order
                    anyWrong = true;
                    S.wrongFramesTotal++;
                    const key = `${first.id} < ${second.id}`;
                    touched.add(key);
                    const drv = driverOf(first, second);
                    const g = (S.wrongPairFramesByGroup[gname] ||= {});
                    g[drv] = (g[drv] || 0) + 1;
                    let ep = S.open.get(key);
                    const ox0 = Math.max(a.box.x0, b.box.x0), ox1 = Math.min(a.box.x1, b.box.x1), oy0 = Math.max(a.box.y0, b.box.y0), oy1 = Math.min(a.box.y1, b.box.y1);
                    const area = Math.max(0, ox1 - ox0) * Math.max(0, oy1 - oy0);
                    let pix = null;
                    if (!ep || frameViol) { const sp = a.sprite ? a : b.sprite ? b : null; if (sp) pix = opaqueOverlap(sp, sp === a ? b : a); }
                    if (!ep) {
                        const inp = (it) => ({ id: it.id, type: TNAME[it.t], hex: `${it.q},${it.r}`, hexH: it.hex ? it.op.th : null, y: +it.op.y.toFixed(2), centerY: +it.cy.toFixed(2), E: +it.E.toFixed(2), sortBias: +(it.op.sortBias || 0).toFixed(2), subLayer: SUB[it.t], sortKey: +it.op.sortKey.toFixed(2), sortedIndex: it.i, otype: it.op.ttype || undefined, headH: it.headH ? +it.headH.toFixed(1) : undefined, footX: it.fx !== undefined ? +it.fx.toFixed(1) : undefined, footY: it.fy !== undefined ? +it.fy.toFixed(1) : undefined });
                        ep = { key, group: gname, firstType: TNAME[first.t], secondType: TNAME[second.t], rule, startFrame: f, last: f, len: 0, drivers: {}, maxArea: 0, ex: inp, exFirst: inp(first), exSecond: inp(second), dyPx: +(second.cy - first.cy).toFixed(2), rowDiff: +((second.cy - first.cy) / rowStep).toFixed(2), pixOverlap: pix };
                        S.open.set(key, ep);
                    }
                    ep.len++; ep.last = f; ep.drivers[drv] = (ep.drivers[drv] || 0) + 1; if (area > ep.maxArea) ep.maxArea = area;
                    if (frameViol) frameViol.push({ key, group: gname, rule, driver: drv, area: Math.round(area), first: { id: first.id, y: first.op.y, E: first.E, sb: first.op.sortBias || 0, key: first.op.sortKey, h: first.hex ? first.op.th : null, idx: first.i }, second: { id: second.id, y: second.op.y, E: second.E, sb: second.op.sortBias || 0, key: second.op.sortKey, h: second.hex ? second.op.th : null, idx: second.i }, dyPx: +(second.cy - first.cy).toFixed(2), rowDiff: +((second.cy - first.cy) / rowStep).toFixed(2), pixOverlap: pix });
                }
            }
            if (anyWrong) S.framesWithWrong++;
            // close episodes that were not violated this frame
            for (const [key, ep] of S.open) {
                if (touched.has(key)) continue;
                S.open.delete(key);
                closeEp(ep);
            }
            if (S.cfg.keepLast) S.last = { frame: f, judgedFrame: S.judged - judged0, violations: frameViol, judgedPairs: framePairs, items: items.length };
        }
        function closeEp(ep) {
            if (ep.len >= MIN_STABLE) {
                if (S.episodes.length < EP_CAP) S.episodes.push(ep); else S.episodesDropped++;
            } else {
                const g = (S.shortByGroup[ep.group] ||= { episodes: 0, frames: 0 });
                g.episodes++; g.frames += ep.len;
            }
        }
        const ORIG_SORT = RenderList.prototype.sort;
        const ORIG_LIFT_MIN = K.VFX_RENDER.DECAL_LIFT_MIN_HALF_H;
        const TSS = K.TERRAIN_SORT_SCALE;
        /** what-if sorts (evidence for a proposed rule change): perturb op.y only while RenderList.sort computes keys, then restore */
        function sortWithSim(list, sim) {
            const saved = [];
            const cfg = engine.mapConfig;
            for (let i = 0; i < list.count; i++) {
                const op = list.ops[i];
                if (sim.includes('noE') && (op.type === T.OBSTACLE || op.type === T.HAZARD)) { saved.push(op, op.y); op.y = HexUtils.toPx(op.tq, op.tr, cfg).y; }
                else if (sim.includes('unitE') && (op.type === T.UNIT || op.type === T.CORPSE)) { saved.push(op, op.y); op.y += (op.y - op.ty) * TSS; }
            }
            ORIG_SORT.call(list);
            for (let i = 0; i < saved.length; i += 2) saved[i].y = saved[i + 1];
        }
        RenderList.prototype.sort = function () {
            const sim = S.on && S.cfg.sim && S.cfg.sim.length ? S.cfg.sim : null;
            if (sim) sortWithSim(this, sim); else ORIG_SORT.call(this);
            if (S.on) onFrame(this);
        };
        window.__DO__ = {
            begin(cfg) {
                reset(); S.cfg = cfg || {}; S.on = true;
                K.VFX_RENDER.DECAL_LIFT_MIN_HALF_H = S.cfg.sim && S.cfg.sim.includes('noLift') ? 1e9 : ORIG_LIFT_MIN;
            },
            end() {
                S.on = false;
                K.VFX_RENDER.DECAL_LIFT_MIN_HALF_H = ORIG_LIFT_MIN;
                for (const [, ep] of S.open) closeEp(ep);
                S.open.clear();
                const out = { frames: S.frame, judged: S.judged, judgedByGroup: S.judgedByGroup, wrongFramesTotal: S.wrongFramesTotal, framesWithWrong: S.framesWithWrong, episodes: S.episodes, episodesDropped: S.episodesDropped, shortByGroup: S.shortByGroup, wrongPairFramesByGroup: S.wrongPairFramesByGroup, last: S.last };
                return out;
            },
            last() { return S.last; },
            /** crafted boards: oracle over the most recent frame only, no 3-frame rule */
            stop() { S.on = false; K.VFX_RENDER.DECAL_LIFT_MIN_HALF_H = ORIG_LIFT_MIN; },
        };
    });
}

/* ------------------------------------------------------------------ aggregation (Node side) */

const STABLE_DRIVER_ORDER = ['hTerm', 'sortBias', 'hTerm+sortBias', 'decalLift', 'subLayerTie', 'footprintY'];

/** Dominant driver of an episode (most violated frames) */
export function dominantDriver(ep) {
    return Object.entries(ep.drivers).sort((a, b) => b[1] - a[1])[0][0];
}

/** Merge per-run results into groups by type pair x driver */
export function aggregateOrder(runs) {
    const byGroup = {};
    const totals = { frames: 0, battleFrames: 0, judged: 0, stableEpisodes: 0, stablePairFrames: 0, shortEpisodes: 0, wrongFrames: 0, framesWithWrong: 0 };
    for (const r of runs) {
        totals.frames += r.frames; totals.judged += r.judged; totals.wrongFrames += r.wrongFramesTotal; totals.framesWithWrong += r.framesWithWrong;
        for (const g of Object.values(r.shortByGroup)) totals.shortEpisodes += g.episodes;
        for (const ep of r.episodes) {
            const drv = dominantDriver(ep);
            const key = `${ep.group}|${drv}`;
            const g = (byGroup[key] ||= { group: ep.group, driver: drv, episodes: 0, pairFrames: 0, maxLen: 0, rules: {}, order: {}, areaSum: 0, pixEpisodes: 0, pixSum: 0, pixVisible: 0, runs: new Set(), examples: [] });
            if (ep.pixOverlap !== null && ep.pixOverlap !== undefined) { g.pixEpisodes++; g.pixSum += ep.pixOverlap; if (ep.pixOverlap >= 100) g.pixVisible++; }
            g.episodes++; g.pairFrames += ep.len; g.maxLen = Math.max(g.maxLen, ep.len); g.areaSum += ep.maxArea;
            g.rules[ep.rule] = (g.rules[ep.rule] || 0) + 1;
            const ok = `${ep.firstType}<${ep.secondType}`;
            g.order[ok] = (g.order[ok] || 0) + 1;
            g.runs.add(r.label);
            g.examples.push({ ...ep, run: r.label, drv });
            totals.stableEpisodes++; totals.stablePairFrames += ep.len;
        }
    }
    const groups = Object.values(byGroup).map((g) => {
        g.examples.sort((a, b) => b.maxArea * Math.min(b.len, 60) - a.maxArea * Math.min(a.len, 60));
        return { ...g, runs: [...g.runs], examples: g.examples.slice(0, 4), meanArea: Math.round(g.areaSum / g.episodes), meanPix: g.pixEpisodes ? Math.round(g.pixSum / g.pixEpisodes) : null };
    }).sort((a, b) => b.pairFrames - a.pairFrames);
    return { totals, groups };
}

export function printOrderSummary(agg, runs) {
    const t = agg.totals;
    console.log(`ORDER oracle: runs=${runs.length} frames=${t.frames} judged pair-frames=${t.judged} wrong pair-frames=${t.wrongFrames} (frames with a wrong pair: ${t.framesWithWrong})`);
    console.log(`      STABLE (>=3 consecutive frames) episodes=${t.stableEpisodes} (${t.stablePairFrames} pair-frames); transient (<3 frames) episodes=${t.shortEpisodes}`);
    console.log('  group                driver            episodes  pair-frames  maxLen  meanBoxOverlap(px2)  obstacle-opaque-overlap(mean px2, episodes>=100px2)  rules / expected order');
    for (const g of agg.groups) {
        console.log(`  ${g.group.padEnd(20)} ${g.driver.padEnd(17)} ${String(g.episodes).padStart(8)} ${String(g.pairFrames).padStart(12)} ${String(g.maxLen).padStart(7)} ${String(g.meanArea).padStart(19)}  ${(g.meanPix === null ? '-' : `${g.meanPix}, ${g.pixVisible}/${g.pixEpisodes}`).padStart(14)}  ${JSON.stringify(g.rules)} ${JSON.stringify(g.order)}`);
    }
    for (const g of agg.groups.slice(0, 5)) {
        const e = g.examples[0];
        if (!e) continue;
        const f = (x) => `${x.id}[${x.type}${x.hexH !== null ? ` hexH=${x.hexH}` : ''} y=${x.y} centerY=${x.centerY} E=${x.E} sb=${x.sortBias} sub=${x.subLayer} key=${x.sortKey} idx=${x.sortedIndex}]`;
        console.log(`  e.g. ${g.group}/${g.driver} ${e.run} f${e.startFrame}+${e.len} rule=${e.rule} rowDiff=${e.rowDiff} (${e.dyPx}px) overlap=${Math.round(e.maxArea)}px2`);
        console.log(`       must be drawn first : ${f(e.exFirst)}`);
        console.log(`       but is drawn after  : ${f(e.exSecond)}  (sorted ${e.exSecond.sortedIndex < e.exFirst.sortedIndex ? 'before' : 'after'} it)`);
    }
}

/* ------------------------------------------------------------------ seeded battles */

/**
 * Seeded battle-royale scenes (same setup as the flicker probe) under the oracle.
 * deps = { openApp(seeded) -> {ctx,page}, setupBattle, stepFrames } from coord-guard / coord-probes.
 */
export async function runOrderScenes(deps, { biomes, seeds, seedStart, seconds, sim = [], log = console.log }) {
    const { ctx, page } = await deps.openApp(true);
    await installDepthOracle(page);
    const runs = [];
    for (const biome of biomes) for (let i = 0; i < seeds; i++) {
        const seed = 1000 + seedStart + i;
        const label = `battle ${biome} seed=${seed}${sim.length ? ' sim=' + sim.join('+') : ''}`;
        const t0 = Date.now();
        const info = await deps.setupBattle(page, { biome, seed, start: true });
        await deps.stepFrames(page, 6);
        await page.evaluate((sim) => window.__DO__.begin({ sim }), sim);
        await deps.stepFrames(page, Math.round(seconds * 60));
        const rec = await page.evaluate(() => window.__DO__.end());
        runs.push({ label, biome, seed, setup: info, ...rec });
        log(`  ${label}: ${((Date.now() - t0) / 1000).toFixed(1)}s frames=${rec.frames} judged=${rec.judged} wrongPairFrames=${rec.wrongFramesTotal} stableEpisodes=${rec.episodes.length} heights=${JSON.stringify(info.heightRange)} layout=${info.layout} obstacles=${info.obstacles}`);
    }
    await ctx.close();
    return runs;
}

/* ------------------------------------------------------------------ crafted board */

/** Page side: window.__CRAFT__.init(layout) builds a flat board; apply(cfg) places one unit at the anchor + one feature on a neighbour. */
export async function installCraft(page) {
    await page.evaluate(async () => {
        if (window.__CRAFT__) return;
        const { Team, Role } = await import('/types.ts');
        const { HexUtils } = await import('/engine/utils.ts');
        const e = window.__TACTICAL_ENGINE__;
        const cmd = (c) => e.bus.emit('UI_COMMAND', c);
        const C = { anchor: null, dirs: [] };
        const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
        const flatten = () => {
            cmd({ type: 'CLEAR_BOARD', keepScene: true });
            for (const k of e.mapKeys) e.map.setHeight(k, 0);
            for (const k of [...e.obstacles.keys()]) { const [q, r] = k.split(',').map(Number); e.map.removeObstacle(q, r); }
            e.state.spatialHazards.length = 0;
        };
        window.__CRAFT__ = {
            init(layout) {
                cmd({ type: 'STOP_GAME' });
                cmd({ type: 'RANDOMIZE_MAP', w: 11, h: 9, layout, sceneId: 'DESERT', randomizeScene: false }); // plain top texture, no per-tile tree decoration
                cmd({ type: 'SET_DIRECTOR_ENABLED', enabled: false });
                cmd({ type: 'SET_ZONE_CONFIG', config: { enabled: false } });
                flatten();
                C.anchor = { q: 0, r: 0 }; // the generated map is a hex-radius blob centred on (0,0)
                const a = HexUtils.toPx(C.anchor.q, C.anchor.r, e.mapConfig);
                C.dirs = DIRS.map(([dq, dr]) => {
                    const h = { q: C.anchor.q + dq, r: C.anchor.r + dr };
                    const p = HexUtils.toPx(h.q, h.r, e.mapConfig);
                    return { ...h, dx: Math.round(p.x - a.x), dy: Math.round(p.y - a.y) };
                });
                for (const d of C.dirs) {
                    const v = d.dy < -1 ? 'back' : d.dy > 1 ? 'front' : 'side';
                    const hz = Math.abs(d.dx) < 1 ? '' : d.dx < 0 ? 'L' : 'R';
                    d.label = v + hz;
                }
                return { anchor: C.anchor, dirs: C.dirs, layout: e.mapConfig.layout };
            },
            /** cfg: { hu, dir (label), ho, kind: 'PILLAR'|'WALL'|'TREE'|'TILE'|'HAZARD'|'NONE', frames } */
            apply(cfg) {
                flatten();
                const nb = C.dirs.find((d) => d.label === cfg.dir);
                e.map.setHeight(`${C.anchor.q},${C.anchor.r}`, cfg.hu);
                e.map.setHeight(`${nb.q},${nb.r}`, cfg.ho);
                e.mapVersion++;
                const obstacleType = { PILLAR: 'OBSIDIAN_PILLAR', WALL: 'WALL', TREE: 'TREE' }[cfg.kind];
                if (obstacleType) cmd({ type: 'SET_OBSTACLE', q: nb.q, r: nb.r, obstacleType });
                cmd({ type: 'PLACE_AGENT', team: Team.BLUE, q: C.anchor.q, r: C.anchor.r, hp: 20000, role: Role.TANK });
                const unit = e.agents[e.agents.length - 1];
                unit.spawnTimer = 0; // CooldownSystem only counts the spawn animation down while the battle runs; edit mode would leave the sprite scaled to nothing
                if (cfg.kind === 'HAZARD') {
                    e.hazardSystem.registerHazard({
                        id: `depth_hz_${cfg.dir}`, type: 'FIRE', cells: [{ q: nb.q, r: nb.r }], duration: 600, sourceId: unit.id, team: Team.RED,
                        color: '#ffffff', power: 0, tickInterval: 999, lastTickTime: 0, centerQ: nb.q, centerR: nb.r,
                    }, e);
                }
                for (let i = 0; i < (cfg.frames ?? 6); i++) window.__stepFrames(1);
                return { unitId: unit.id, nb: { q: nb.q, r: nb.r } };
            },
            /** every (dir, hu, ho) for one feature kind; returns compact cells judged on the last frame of each config */
            matrix(kind, hus, hos) {
                const out = [];
                for (const d of C.dirs) for (const hu of hus) for (const ho of hos) {
                    window.__DO__.begin({ keepLast: true });
                    const info = this.apply({ hu, dir: d.label, ho, kind, frames: 4 });
                    const rec = window.__DO__.end();
                    const L = rec.last || { violations: [], judgedPairs: [], judgedFrame: 0 };
                    const feat = { PILLAR: 'O', WALL: 'O', TREE: 'O', HAZARD: 'H', TILE: 'T' }[kind] + `:${info.nb.q},${info.nb.r}`;
                    const uid = `U:${info.unitId}`;
                    const has = (a, b) => (a === feat && b === uid) || (a === uid && b === feat);
                    const featJudged = L.judgedPairs.some((p) => has(p[0], p[1]));
                    const fv = L.violations.filter((v) => has(v.first.id, v.second.id));
                    out.push({ kind, dir: d.label, hu, ho, featJudged, featWrong: fv.length > 0, otherWrong: L.violations.length - fv.length,
                        detail: fv.map((v) => ({ driver: v.driver, rule: v.rule, rowDiff: v.rowDiff, dyPx: v.dyPx, area: v.area, pix: v.pixOverlap, E: v.first.E || v.second.E })),
                        otherDetail: L.violations.filter((v) => !has(v.first.id, v.second.id)).map((v) => `${v.group}/${v.driver}`) });
                }
                return out;
            },
            snap(zoom) {
                const a = HexUtils.toPx(C.anchor.q, C.anchor.r, e.mapConfig);
                const h = e.getTerrainHeight(C.anchor.q, C.anchor.r);
                e.renderer.camera.snapTo(a.x, a.y - h, zoom);
                window.__stepFrames(3);
            },
        };
    });
}

const MATRIX_HEIGHTS = [0, 24, 48, 72, 96, 120, 144];
const MATRIX_UNIT_H = [0, 24, 48, 72, 96, 144];
const MATRIX_KINDS = ['PILLAR', 'WALL', 'TREE', 'TILE', 'HAZARD'];

/** Screenshot cases. "back"/"front" exist for FLAT (straight up/down), "backL/backR/frontL/frontR" for both layouts. */
function craftedCases(layout) {
    const back = layout === 'FLAT' ? 'back' : 'backR';
    const front = layout === 'FLAT' ? 'front' : 'frontL';
    return [
        { id: '1_pillar_behind_unit_low', desc: '高柱 (OBSIDIAN_PILLAR, 格高 96) 在低地單位正後方', cfg: { hu: 0, dir: back, ho: 96, kind: 'PILLAR' } },
        { id: '1b_pillar_behind_unit_mid', desc: '同上但格高 48', cfg: { hu: 0, dir: back, ho: 48, kind: 'PILLAR' } },
        { id: '1c_pillar_backL_unit_low', desc: '高柱 (格高 72) 在左後方鄰格', cfg: { hu: 0, dir: 'backL', ho: 72, kind: 'PILLAR' } },
        { id: '2_unit_high_behind_low_obstacle', desc: '高地單位 (格高 96) 在低矮牆 (WALL, 格高 0) 後方', cfg: { hu: 96, dir: front, ho: 0, kind: 'WALL' } },
        { id: '3_unit_behind_taller_tile', desc: '單位在較高地塊 (格高 96) 後方（地塊在前）', cfg: { hu: 0, dir: front, ho: 96, kind: 'TILE' } },
        { id: '4_unit_front_of_pillar_low', desc: '單位在柱子 (格高 0) 前方', cfg: { hu: 0, dir: back, ho: 0, kind: 'PILLAR' } },
        { id: '4b_unit_front_of_tall_tile', desc: '單位在高地塊 (格高 96，無障礙物) 前方', cfg: { hu: 0, dir: back, ho: 96, kind: 'TILE' } },
        { id: '5a_hazard_high_behind_unit', desc: '危害 (FIRE) 在高地 (96) 後方，單位在低地', cfg: { hu: 0, dir: back, ho: 96, kind: 'HAZARD' } },
        { id: '6_tree_on_plateau_behind_unit_on_plateau', desc: '樹 (格高 72) 在同高台地單位 (格高 72) 正後方（戰場常見：同一高台上的鄰格）', cfg: { hu: 72, dir: back, ho: 72, kind: 'TREE' } },
        { id: '7_hazard_on_plateau_behind_unit', desc: '危害 (FIRE, 格高 72) 在台地單位 (格高 48) 正後方', cfg: { hu: 48, dir: back, ho: 72, kind: 'HAZARD' } },
        { id: '8_pillar_plateau_backL', desc: '高柱 (格高 48) 在同高台地單位 (格高 48) 左後方鄰格', cfg: { hu: 48, dir: 'backL', ho: 48, kind: 'PILLAR' } },
        { id: '5b_hazard_low_front_of_high_unit', desc: '危害 (FIRE) 在低地前方，單位站高地 (96)', cfg: { hu: 96, dir: front, ho: 0, kind: 'HAZARD' } },
    ];
}

/**
 * Crafted deterministic board: screenshots for the required cases + a (kind x direction x heights) matrix judged by the oracle.
 * Returns { layouts: [{ layout, board, cases:[{id,desc,cfg,violations,judgedFrame,shot}], matrix:[...] }] }.
 */
export async function runCrafted(deps, { outDir, layouts = ['FLAT', 'POINTY'], log = console.log }) {
    const { ctx, page } = await deps.openApp(true);
    await installDepthOracle(page);
    await installCraft(page);
    const result = { layouts: [] };
    for (const layout of layouts) {
        const board = await page.evaluate((l) => window.__CRAFT__.init(l), layout);
        await page.evaluate(() => window.__stepFrames(4));
        const L = { layout, board, cases: [], matrix: [] };

        for (const c of craftedCases(layout)) {
            await page.evaluate(() => window.__DO__.begin({ keepLast: true }));
            await page.evaluate((cfg) => window.__CRAFT__.apply(cfg), c.cfg);
            await page.evaluate(() => window.__CRAFT__.snap(2.0));
            await page.evaluate(() => window.__stepFrames(3));
            const rec = await page.evaluate(() => window.__DO__.end());
            const file = `${outDir}/depth_${c.id}_${layout}.png`;
            const vp = page.viewportSize();
            await page.screenshot({ path: file, clip: { x: vp.width / 2 - 200, y: vp.height / 2 - 230, width: 400, height: 330 } });
            const v = rec.last ? rec.last.violations : [];
            L.cases.push({ ...c, shot: file, judgedFrame: rec.last ? rec.last.judgedFrame : 0, violations: v });
            log(`  ${layout} ${c.id}: judged=${rec.last?.judgedFrame} violations=${v.length}${v.length ? ' ' + v.map((x) => `${x.group}/${x.driver}`).join(',') : ''}`);
        }

        await page.evaluate(() => window.__CRAFT__.snap(1.0));
        for (const kind of MATRIX_KINDS) {
            L.matrix.push(...await page.evaluate(({ kind, hus, hos }) => window.__CRAFT__.matrix(kind, hus, hos), { kind, hus: MATRIX_UNIT_H, hos: MATRIX_HEIGHTS }));
        }
        const bad = L.matrix.filter((m) => m.featWrong);
        log(`  ${layout} matrix: ${L.matrix.length} configs, ${L.matrix.filter((m) => m.featJudged).length} with the feature x unit pair judged (silhouettes overlap), ${bad.length} of those drawn in the wrong order`);
        result.layouts.push(L);
    }
    await ctx.close();
    return result;
}

/** Compact matrix tables. cell: '.' feature x unit silhouettes do not overlap, 'ok' overlap and drawn right, 'W' overlap and drawn wrong */
export function printMatrix(craft, log = console.log) {
    for (const L of craft.layouts) {
        log(`
  crafted matrix ${L.layout}: rows = feature tile height ho, columns = direction of the feature relative to the unit, one block per unit tile height hu`);
        const dirs = L.board.dirs.map((d) => d.label);
        for (const kind of MATRIX_KINDS) {
            log(`   ${kind}   ${dirs.map((d) => d.padEnd(8)).join('')}`);
            for (const hu of MATRIX_UNIT_H) {
                for (const ho of MATRIX_HEIGHTS) {
                    const cells = dirs.map((d) => {
                        const m = L.matrix.find((x) => x.kind === kind && x.dir === d && x.hu === hu && x.ho === ho);
                        return (!m ? '?' : m.featWrong ? 'W' : m.featJudged ? 'ok' : '.').padEnd(8);
                    });
                    log(`     hu=${String(hu).padEnd(4)} ho=${String(ho).padEnd(4)} ${cells.join('')}`);
                }
            }
        }
    }
}
