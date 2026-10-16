// Shared helpers for the performance-lifecycle investigation (terrain-float-probe.mjs, perf-lifecycle-soak.mjs).
// Evidence only: nothing here edits engine/ sources. Module-level Map/Set caches that are not exported are
// exposed through an in-memory Vite transform (dev server only, no file on disk is touched).

/** Vite plugin: append `globalThis.__CACHE_REG[file:name] = name` for every top-level `const x = new Map/Set`. */
export function cacheRegistryPlugin() {
    const re = /^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:\/\*[^*]*\*\/\s*)?new\s+(?:Map|Set)\b/gm;
    return {
        name: 'cache-registry',
        enforce: 'post',
        apply: 'serve',
        transform(code, id) {
            const clean = id.split('?')[0].replace(/\\/g, '/');
            if (!/\/(engine|data|components|hooks)\/.*\.(ts|tsx)$/.test(clean)) return null;
            const names = [];
            let m;
            re.lastIndex = 0;
            while ((m = re.exec(code))) names.push(m[1]);
            if (!names.length) return null;
            const rel = clean.split('/Group-Battler-FFT-Final/')[1] ?? clean;
            const footer = names
                .map((n) => `;(globalThis.__CACHE_REG ||= {})[${JSON.stringify(`${rel}:${n}`)}] = ${n};`)
                .join('\n');
            return { code: `${code}\n${footer}\n`, map: null };
        },
    };
}

/** Runs in the page before any script (addInitScript): counters for canvases, listeners, timers, rAF, audio nodes. */
export function installTrackers() {
    const PL = {
        canvasRefs: [],
        canvasCreated: 0,
        listeners: new Map(),
        listenerReg: new WeakMap(),
        timeouts: new Set(),
        intervals: new Set(),
        rafCalls: 0,
        audioCreated: {},
        audioRefs: [],
        bufferRefs: [],
    };
    window.__PL = PL;

    const origCreate = document.createElement.bind(document);
    document.createElement = function (tag, opts) {
        const el = origCreate(tag, opts);
        if (typeof tag === 'string' && tag.toLowerCase() === 'canvas') {
            PL.canvasCreated++;
            PL.canvasRefs.push(new WeakRef(el));
        }
        return el;
    };

    const targetName = (t) => {
        if (t === window) return 'window';
        if (t === document) return 'document';
        if (t && t.nodeName) return String(t.nodeName).toLowerCase();
        return (t && t.constructor && t.constructor.name) || 'target';
    };
    const addL = EventTarget.prototype.addEventListener;
    const remL = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
        try {
            const once = opts && typeof opts === 'object' && opts.once;
            if (fn && !once) {
                const cap = typeof opts === 'boolean' ? opts : !!(opts && opts.capture);
                let m = PL.listenerReg.get(this);
                if (!m) { m = new Map(); PL.listenerReg.set(this, m); }
                const k = `${type}|${cap}`;
                let s = m.get(k);
                if (!s) { s = new Set(); m.set(k, s); }
                if (!s.has(fn)) {
                    s.add(fn);
                    const name = `${targetName(this)}:${type}`;
                    PL.listeners.set(name, (PL.listeners.get(name) || 0) + 1);
                }
            }
        } catch { /* ignore */ }
        return addL.call(this, type, fn, opts);
    };
    EventTarget.prototype.removeEventListener = function (type, fn, opts) {
        try {
            const cap = typeof opts === 'boolean' ? opts : !!(opts && opts.capture);
            const m = PL.listenerReg.get(this);
            const s = m && m.get(`${type}|${cap}`);
            if (s && s.delete(fn)) {
                const name = `${targetName(this)}:${type}`;
                PL.listeners.set(name, (PL.listeners.get(name) || 1) - 1);
            }
        } catch { /* ignore */ }
        return remL.call(this, type, fn, opts);
    };

    const st = window.setTimeout.bind(window);
    const ct = window.clearTimeout.bind(window);
    const si = window.setInterval.bind(window);
    const ci = window.clearInterval.bind(window);
    window.setTimeout = function (fn, ms, ...a) {
        if (typeof fn !== 'function') return st(fn, ms, ...a);
        let id;
        id = st(function (...args) { PL.timeouts.delete(id); return fn.apply(this, args); }, ms, ...a);
        PL.timeouts.add(id);
        return id;
    };
    window.clearTimeout = function (id) { PL.timeouts.delete(id); return ct(id); };
    window.setInterval = function (fn, ms, ...a) {
        const id = si(fn, ms, ...a);
        PL.intervals.add(id);
        return id;
    };
    window.clearInterval = function (id) { PL.intervals.delete(id); return ci(id); };

    const rawRaf = window.requestAnimationFrame.bind(window);
    PL.rawRaf = rawRaf;
    window.requestAnimationFrame = function (cb) { PL.rafCalls++; return rawRaf(cb); };

    const BAC = window.BaseAudioContext && window.BaseAudioContext.prototype;
    if (BAC) {
        for (const name of Object.getOwnPropertyNames(BAC)) {
            if (!name.startsWith('create') || typeof BAC[name] !== 'function') continue;
            const orig = BAC[name];
            BAC[name] = function (...a) {
                const n = orig.apply(this, a);
                PL.audioCreated[name] = (PL.audioCreated[name] || 0) + 1;
                (name === 'createBuffer' ? PL.bufferRefs : PL.audioRefs).push(new WeakRef(n));
                return n;
            };
        }
    }

    // Frame collector uses the raw rAF so it does not count as an app rAF call.
    PL.frames = [];
    let last = performance.now();
    const loop = (now) => {
        PL.frames.push(now - last);
        last = now;
        rawRaf(loop);
    };
    rawRaf(loop);
}

/** Pull and clear the collected rAF deltas (runs in page). */
export function takeFrames() {
    const PL = window.__PL;
    const f = PL.frames;
    PL.frames = [];
    return { frames: f, rafCalls: PL.rafCalls };
}

/** Full snapshot. Runs in page. opts: { gc: boolean, walk: boolean } */
export async function collectSnapshot(opts) {
    const PL = window.__PL;
    const engine = window.__TACTICAL_ENGINE__;
    const out = { t: performance.now() };
    const mem = performance.memory;
    out.heapBefore = mem ? mem.usedJSHeapSize : null;
    if (opts.gc && typeof window.gc === 'function') {
        window.gc();
        window.gc();
    }
    out.heapAfter = mem ? mem.usedJSHeapSize : null;
    out.dom = document.getElementsByTagName('*').length;

    // canvases still alive after GC
    let live = 0;
    let pixels = 0;
    const alive = [];
    for (const r of PL.canvasRefs) {
        const c = r.deref();
        if (c) { live++; pixels += c.width * c.height; alive.push(r); }
    }
    PL.canvasRefs = alive;
    out.canvases = { created: PL.canvasCreated, live, livePixels: pixels };

    const lst = {};
    let lstTotal = 0;
    for (const [k, v] of PL.listeners) { if (v > 0) { lst[k] = v; lstTotal += v; } }
    out.listeners = { total: lstTotal, byKey: lst };
    out.timers = { timeouts: PL.timeouts.size, intervals: PL.intervals.size };
    out.rafCalls = PL.rafCalls;

    const aliveA = [];
    const liveByType = {};
    for (const r of PL.audioRefs) {
        const n = r.deref();
        if (n) { aliveA.push(r); const k = n.constructor.name; liveByType[k] = (liveByType[k] || 0) + 1; }
    }
    PL.audioRefs = aliveA;
    let liveBuf = 0;
    let liveBufBytes = 0;
    const aliveB = [];
    for (const r of PL.bufferRefs) {
        const b = r.deref();
        if (b) { aliveB.push(r); liveBuf++; liveBufBytes += b.length * b.numberOfChannels * 4; }
    }
    PL.bufferRefs = aliveB;
    out.audio = { created: { ...PL.audioCreated }, liveNodes: aliveA.length, liveByType, liveCreatedBuffers: liveBuf, liveCreatedBufferBytes: liveBufBytes };

    // module-level registry (non-exported Maps/Sets)
    const reg = {};
    for (const [k, v] of Object.entries(globalThis.__CACHE_REG || {})) reg[k] = v.size;
    out.registry = reg;

    // curated engine counters
    const cur = {};
    if (engine) {
        cur.agents = engine.agents.length;
        cur.initialRoster = engine.initialRoster.length;
        cur.projectiles = engine.projectiles.length;
        cur.spatialHazards = engine.state.spatialHazards.length;
        cur.events = engine.events.length;
        cur.logs = engine.logger?.logs?.length ?? 0;
        cur.running = engine.isRunning ? 1 : 0;
        cur.battleTime = +engine.battleTime.toFixed(2);
        cur.scene = engine.currentScene?.id;
        cur.winner = engine.victory?.winningTeam ?? null;
        const r = engine.renderer;
        if (r) {
            const st = r.vfx?.state;
            cur.vfxParticles = st?.particles?.length ?? null;
            cur.vfxDecals = st?.decals?.length ?? null;
            cur.vfxParticlePool = st?.particlePool?.length ?? null;
            cur.floatingTexts = r.hud?.damageNumbers?.length ?? null;
            cur.floatingTextPool = r.hud?.pool?.length ?? null;
            const rl = r.pipeline?.renderList;
            if (rl) { cur.renderListCount = rl.count; cur.renderListCapacity = rl.ops.length; }
            cur.cameraZoom = r.camera ? +r.camera.zoom.toFixed(3) : null;
        }
        const bus = {};
        const lm = engine.bus?.listeners;
        if (lm) for (const [k, v] of lm) bus[k] = v.size;
        out.bus = bus;
    }
    out.curated = cur;

    // singletons with stats APIs
    const caches = {};
    const tryImport = async (p) => { try { return await import(p); } catch { return null; } };
    const [tr, vf, gl, la, pt, sa, tt, es, rs] = await Promise.all([
        tryImport('/engine/renderers/grid/TerrainRenderer.ts'),
        tryImport('/engine/graphics/VFXFactory.ts'),
        tryImport('/engine/renderers/GlowSpriteCache.ts'),
        tryImport('/engine/renderers/grid/TerrainLoopAtlas.ts'),
        tryImport('/engine/renderers/ParticleTextureStore.ts'),
        tryImport('/engine/renderers/units/SpriteAtlasStore.ts'),
        tryImport('/engine/renderers/grid/TerrainTextureStore.ts'),
        tryImport('/engine/events/GameEventPool.ts'),
        tryImport('/engine/renderers/RenderStats.ts'),
    ]);
    if (tr) { const s = tr.TerrainRenderer.store.getStats(); caches.terrainSprites = s; }
    if (vf) caches.VFXFactory = vf.VFXFactory.cache.size;
    if (gl) caches.GlowSpriteCache = gl.GlowSpriteCache.getStats();
    if (la) caches.TerrainLoopAtlas = { liquid: la.TerrainLoopAtlas.getLiquidStats(), grassColors: la.TerrainLoopAtlas._grass.size, bakeCount: la.TerrainLoopAtlas.bakeCount };
    if (pt) caches.particleTint = pt.particleTextureStore.tintedCache.size;
    if (sa) caches.spriteAtlases = sa.spriteAtlasStore.atlases.size;
    if (tt) caches.terrainTexturePatterns = { top: tt.terrainTextureStore.topPatterns.size, side: tt.terrainTextureStore.sidePatterns.size };
    if (es) { const ep = es.EventPool; caches.eventPool = ep.pool?.length ?? null; }
    if (rs) {
        const R = rs.RenderStats;
        if (R.enabled) {
            const ph = {};
            for (const p of R.getPhases()) ph[p] = +R.getPhaseMs(p).toFixed(3);
            caches.phases = ph;
            const sp = {};
            for (const [k, v] of R.subPhaseEma) sp[k] = +v.toFixed(3);
            caches.subPhases = sp;
            caches.spikeCount = R.getSpikeCount();
        }
    }
    out.caches = caches;

    if (opts.walk && engine) {
        // generic container census over the live object graph
        const containers = {};
        const visited = new WeakSet();
        let budget = 60000;
        const isLeaf = (v) =>
            v instanceof EventTarget || v instanceof ArrayBuffer || ArrayBuffer.isView(v) ||
            v instanceof Promise || v instanceof WeakMap || v instanceof WeakSet ||
            (typeof WeakRef !== 'undefined' && v instanceof WeakRef) || v instanceof ImageBitmap ||
            (typeof CanvasPattern !== 'undefined' && v instanceof CanvasPattern) ||
            (typeof CanvasGradient !== 'undefined' && v instanceof CanvasGradient) ||
            (typeof DOMMatrix !== 'undefined' && v instanceof DOMMatrix) ||
            (typeof Path2D !== 'undefined' && v instanceof Path2D);
        const walk = (v, path, depth) => {
            if (v === null || typeof v !== 'object' || budget-- <= 0) return;
            if (visited.has(v)) return;
            visited.add(v);
            if (isLeaf(v)) {
                if (ArrayBuffer.isView(v)) containers[`${path}(typed)`] = v.length;
                return;
            }
            if (v instanceof Map) {
                containers[path] = v.size;
                if (depth < 7) { let i = 0; for (const x of v.values()) { walk(x, `${path}{}`, depth + 1); if (++i >= 2) break; } }
                return;
            }
            if (v instanceof Set) {
                containers[path] = v.size;
                if (depth < 7) { let i = 0; for (const x of v) { walk(x, `${path}<>`, depth + 1); if (++i >= 2) break; } }
                return;
            }
            if (Array.isArray(v)) {
                containers[path] = v.length;
                if (depth < 7) for (let i = 0; i < Math.min(2, v.length); i++) walk(v[i], `${path}[]`, depth + 1);
                return;
            }
            if (depth >= 7) return;
            for (const k of Object.keys(v)) {
                let c;
                try { c = v[k]; } catch { continue; }
                walk(c, `${path}.${k}`, depth + 1);
            }
        };
        walk(engine, 'engine', 0);
        for (const [name, mod, key] of [
            ['VFXFactory', vf, 'VFXFactory'], ['particleTextureStore', pt, 'particleTextureStore'],
            ['spriteAtlasStore', sa, 'spriteAtlasStore'], ['terrainTextureStore', tt, 'terrainTextureStore'],
            ['TerrainLoopAtlas', la, 'TerrainLoopAtlas'], ['RenderStats', rs, 'RenderStats'], ['EventPool', es, 'EventPool'],
        ]) {
            if (mod && mod[key]) walk(mod[key], name, 0);
        }
        out.containers = containers;
        out.walkNodes = 60000 - budget;
    }
    return out;
}

// ---------- node-side helpers ----------
export const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
export const pct = (a, q) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((q / 100) * (s.length - 1)))]; };
export const frameStats = (frames) => {
    const f = frames.slice(2);
    return {
        n: f.length,
        median: +median(f).toFixed(2),
        p95: +pct(f, 95).toFixed(2),
        p99: +pct(f, 99).toFixed(2),
        max: +(f.length ? Math.max(...f) : 0).toFixed(2),
        over20: f.filter((v) => v > 20).length,
    };
};
